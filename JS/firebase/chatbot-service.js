import { getAllBooks, searchBooks } from "./books-service.js";
import { GEMINI_API_KEY } from "./chatbot.config.js";


const GEMINI_MODEL = "gemini-3.1-flash-lite"; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;


function buildContext(books) {
  if (!books || books.length === 0) {
    return "No book records found.";
  }
  return books
    .map(
      (b) =>
        `- "${b.title}" by ${b.author} | Category: ${b.category || "N/A"} | ISBN: ${
          b.isbn || "N/A"
        } | Available copies: ${b.availableCopies ?? 0}/${b.totalCopies ?? 0} ${b.price}`
    )
    .join("\n");
}


async function getRelevantBooks(userQuestion) {
  const searchResult = await searchBooks(userQuestion);
  if (searchResult.success && searchResult.books.length > 0) {
    return searchResult.books.slice(0, 15);
  }

  const allResult = await getAllBooks();
  if (allResult.success) {
    return allResult.books.slice(0, 15);
  }

  return [];
}


export async function askLibraryAssistant(userQuestion) {
  const books = await getRelevantBooks(userQuestion);
  const context = buildContext(books);

  const systemPrompt = `You are a helpful library assistant for the "Librax" library management system.
Use the library's Firestore data context given below to answer the user's question.
Answer only based on this context. If the answer is not in the context, clearly state that no record was found.
Give clear, concise, and friendly answers in English.
Do not use any Markdown formatting in the answer (such as **bold**, *, #, - bullet points, etc.) - write only in plain simple sentences..

Library Data:
${context}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser ka sawal: ${userQuestion}` }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply || "Sorry, I couldn't generate a response.";
}
