// JS/bookdetail.js
import { db } from "../JS/firebase/firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. URL Parameter se Book ID nikalna (?id=xxx)
const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get("id");

async function loadBookDetail() {
  if (!bookId) {
    console.error("URL mein Book ID nahi mili!");
    return;
  }

  try {
    // 2. Firestore se Data Fetch karna
    const bookRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(bookRef);

    if (bookSnap.exists()) {
      const book = bookSnap.data();

      // --- Title & Author (Existing IDs / Selectors) ---
      const titleEl = document.getElementById("detailTitle");
      const authorEl = document.getElementById("detailAuthor");
      
      if (titleEl) titleEl.innerText = book.title || "No Title";
      if (authorEl) authorEl.innerText = book.author || "Unknown Author";

      // --- Category & ISBN (Classes ke zariye select kar rahe hain) ---
      const categoryEl = document.querySelector(".category-value");
      const isbnEl = document.querySelector(".isbn-value");

      if (categoryEl) categoryEl.innerText = book.category || "General";
      if (isbnEl) isbnEl.innerText = book.isbn || "N/A";

      // --- Total & Available Copies (Cards ke h6 tags) ---
      const totalCopiesEl = document.querySelector(".dashboard-card h6.orange");
      const availableCopiesEl = document.querySelector(".dashboard-card h6.green");

      if (totalCopiesEl) totalCopiesEl.innerText = book.totalCopies ?? 0;
      if (availableCopiesEl) availableCopiesEl.innerText = book.availableCopies ?? 0;

      // --- Cover Image ---
      const imageEl = document.getElementById("mainBookImage") || document.querySelector(".main-cover img");
      if (imageEl && book.coverImage) {
        imageEl.src = book.coverImage;
        imageEl.alt = book.title;
      }

      // --- Stock Badge Status ---
      const stockBadgeEl = document.querySelector(".stock-badge");
      if (stockBadgeEl) {
        if (Number(book.availableCopies) > 0) {
          stockBadgeEl.innerText = "In Stock";
          stockBadgeEl.style.backgroundColor = "#28a745"; // Green
        } else {
          stockBadgeEl.innerText = "Out of Stock";
          stockBadgeEl.style.backgroundColor = "#dc3545"; // Red
        }
      }

    } else {
      alert("Database mein yeh book nahi mili!");
    }
  } catch (error) {
    console.error("Data load karte hue error aaya:", error);
  }
}

// Page Load hone par run karein
document.addEventListener("DOMContentLoaded", loadBookDetail);