// 1. IMPORTS ALWAYS AT THE TOP
import { db } from "../JS/firebase/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const memberSelect = document.getElementById("memberSelect");
const bookSelect = document.getElementById("bookSelect");

document.addEventListener("DOMContentLoaded", () => {
    loadMembers();
    loadBooks();
});

// 2. Members Fetch Logic
async function loadMembers() {
    if (!memberSelect) return;
    try {
        let snapshot = await getDocs(collection(db, "members"));
        
        // Agar members collection khali ho toh users check karein
        if (snapshot.empty) {
            snapshot = await getDocs(collection(db, "users"));
        }

        if (snapshot.empty) {
            memberSelect.innerHTML = `<option value="">No members found</option>`;
            return;
        }

        let html = `<option value="">Select Member</option>`;
        snapshot.forEach((doc) => {
            const data = doc.data();
            const name = data.name || data.fullName || data.email || "Unnamed Member";
            html += `<option value="${doc.id}" data-name="${name}" data-email="${data.email || ''}">${name}</option>`;
        });
        memberSelect.innerHTML = html;

    } catch (err) {
        console.error("Members load error:", err);
        memberSelect.innerHTML = `<option value="">Error loading members</option>`;
    }
}

// 3. Books Fetch Logic (With Auto-Select Fix)
async function loadBooks() {
    if (!bookSelect) return;
    try {
        const snapshot = await getDocs(collection(db, "books"));
        if (snapshot.empty) {
            bookSelect.innerHTML = `<option value="">No books found</option>`;
            return;
        }

        let html = `<option value="">Select Book</option>`;
        snapshot.forEach((doc) => {
            const data = doc.data();
            html += `<option value="${doc.id}">${data.title || data.bookName}</option>`;
        });
        
        // Step A: Dropdown options fill karein
        bookSelect.innerHTML = html;

        // Step B: Options fill hone ke BAAD URL se bookId check karke select karein
        const urlParams = new URLSearchParams(window.location.search);
        const autoBookId = urlParams.get('bookId');

        if (autoBookId) {
            bookSelect.value = autoBookId;
        }

    } catch (err) {
        console.error("Books load error:", err);
        bookSelect.innerHTML = `<option value="">Error loading books</option>`;
    }
}