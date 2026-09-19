import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase/firebase-config.js";

const contactForm = document.getElementById("contactForm");

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const subject = document.getElementById("subject")?.value.trim();
  const message = document.getElementById("message")?.value.trim();

  // Validation
  if (!name || !email || !subject || !message) {
    alert("All fields are required!");
    return;
  }

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "continue..";

  try {
    console.log("send in firebase");

    const docRef = await addDoc(collection(db, "contactMessages"), {
      name: name,
      email: email,
      subject: subject,
      message: message,
      status: "unread",
      createdAt: serverTimestamp(),
    });

    console.log("✅ Document ID:", docRef.id);
    alert("Message has send");
    contactForm.reset();
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Message Send";
  }
});
