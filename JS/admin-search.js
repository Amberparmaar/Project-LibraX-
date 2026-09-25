// JS/admin-search.js
import { db } from "./firebase/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const searchInput = document.getElementById("searchBooksInput");
const searchResults = document.getElementById("searchResults");

searchInput?.addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase().trim();

  if (!term) {
    searchResults.style.display = "none";
    return;
  }

  searchResults.style.display = "block";
  searchResults.innerHTML = '<div class="p-3 text-muted">Searching...</div>';

  try {
    // Books search
    const booksSnap = await getDocs(collection(db, "books"));
    const books = booksSnap.docs
      .filter((d) => d.data().title?.toLowerCase().includes(term))
      .slice(0, 5)
      .map((d) => ({ id: d.id, ...d.data() }));

    // Members search
    const membersSnap = await getDocs(collection(db, "members"));
    const members = membersSnap.docs
      .filter((d) => d.data().name?.toLowerCase().includes(term))
      .slice(0, 5)
      .map((d) => ({ id: d.id, ...d.data() }));

    if (books.length === 0 && members.length === 0) {
      searchResults.innerHTML = '<div class="p-3 text-center text-muted">No Result/div>';
      return;
    }

    let html = "";

    books.forEach((b) => {
      html += `
        <div class="search-result-item p-2 mb-1" style="cursor:pointer; border-bottom: 1px solid #eee;">
          <div style="font-size: 0.75rem; color: #666;">Book/div>
          <div class="fw-semibold">${b.title}</div>
          <small class="text-muted">${b.author}</small>
        </div>
      `;
    });

    members.forEach((m) => {
      html += `
        <div class="search-result-item p-2 mb-1" style="cursor:pointer; border-bottom: 1px solid #eee;">
          <div style="font-size: 0.75rem; color: #666;">👤 User/div>
          <div class="fw-semibold">${m.name}</div>
          <small class="text-muted">${m.email || m.phone || ""}</small>
        </div>
      `;
    });

    searchResults.innerHTML = html;
  } catch (err) {
    console.error("Search error:", err);
  }
});

// Close on outside click
document.addEventListener("click", (e) => {
  if (searchInput && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.style.display = "none";
  }
});