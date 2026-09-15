// JS/books.js
import { 
  addBook, 
  getAllBooks, 
  updateBook, 
  deleteBook, 
  searchBooks 
} from "../JS/firebase/books-service.js"; 
import { uploadImageToCloudinary } from '../JS/cloudinary.js';

let currentBooks = [];

// ================= 1. FIREBASE SE BOOKS FETCH KARNA =================
async function loadBooks() {
  const container = document.querySelector(".books-container");
  const tableBody = document.getElementById("booksTableBody");

  if (container) {
    container.innerHTML = `<div class="text-center w-100 py-5"><h3>Loading Books...</h3></div>`;
  }
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Loading Books...</td></tr>`;
  }

  const result = await getAllBooks();
  if (result.success) {
    currentBooks = result.books;
    displayBooks(currentBooks);
    setupSearchAndFilters(); // Books load hone ke baad search setup karein
  } else {
    console.error("Error loading books:", result.error);
    if (container) {
      container.innerHTML = `<div class="text-center w-100 py-5 text-danger">Failed to load books!</div>`;
    }
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load books!</td></tr>`;
    }
  }
}

// ================= 2. DYNAMIC RENDERING (CARDS & TABLE SUPPORT) =================
function displayBooks(books) {
  const container = document.querySelector(".books-container");
  const tableBody = document.getElementById("booksTableBody");
  const defaultImg = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn76n4M7gBWQAT28M5jrXgYixN62L11b6SymBpmGW64zd18tRxM8t6Ra-H&s=10";

  // --- A. CARD LAYOUT RENDER (FOR BOOKS PAGE) ---
  if (container) {
    if (books.length === 0) {
      container.innerHTML = `<div class="text-center w-100 py-5"><h3>No Books Found</h3></div>`;
    } else {
      container.innerHTML = "";
      books.forEach((book) => {
        const availableCount = book.availableCopies ?? book.available ?? 0;
        const totalCount = book.totalCopies ?? book.quantity ?? 0;
        const isAvailable = availableCount > 0;
        const coverUrl = book.coverImage || book.imageUrl || defaultImg;

        const cardHTML = `
          <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6">
            <div class="book">
              <div class="book-details">
                <h3>${book.title || 'Untitled'}</h3>
                <p><i class="fa-solid fa-user"></i> ${book.author || 'Unknown'}</p>
                <p><i class="fa-solid fa-tag"></i> ${book.category || 'General'}</p>
                <p><i class="fa-solid fa-book"></i> Total Copies : ${totalCount}</p>
                <p>
                  <i class="fa-solid ${isAvailable ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i>
                  Available : ${availableCount}
                </p>

                <span class="status ${isAvailable ? 'available' : 'unavailable'}">
                  ${isAvailable ? 'Available' : 'Out of Stock'}
                </span>
                

                <button class="view-btn mt-2" onclick="viewBookDetails('${book.id}')">
                  <i class="fa-solid fa-eye"></i> View Details
                </button>
              
                <button class="btn btn-sm btn-danger w-100 mt-2" onclick="deleteBookHandler('${book.id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>

              <div class="cover">
                <div class="book-cover">
                  <img src="${coverUrl}" alt="${book.title}" />
                  <div class="book-overlay">
                    <i class="fa-solid fa-book-open"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += cardHTML;
      });
    }
  }

  // --- B. TABLE LAYOUT RENDER (FOR BOOK MANAGEMENT PAGE) ---
  if (tableBody) {
    if (books.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No books found.</td></tr>`;
    } else {
      tableBody.innerHTML = "";
      books.forEach((book) => {
        const availableCount = book.availableCopies ?? book.available ?? 0;
        const totalCount = book.totalCopies ?? book.quantity ?? 0;
        const coverUrl = book.coverImage || book.imageUrl || defaultImg;
        
        let statusClass = availableCount > 2 ? "available" : availableCount > 0 ? "low" : "out-of-stock";
        let statusText = availableCount > 2 ? "Available" : availableCount > 0 ? "Low Stock" : "Out of Stock";

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="book-info">
              <div class="book-img" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${coverUrl}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
              </div>
              <span>${book.title || 'Untitled'}</span>
            </div>
          </td>
          <td>${book.author || 'Unknown'}</td>
          <td>${book.category || 'General'}</td>
          <td>${totalCount}</td>
          <td>${availableCount}</td>
          <td><span class="status ${statusClass}">${statusText}</span></td>
          <td>
            <div class="actions">
              <button class="edit" onclick="openEditModal('${book.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="delete" onclick="deleteBookHandler('${book.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }
}

// ================= 3. ADD BOOK FORM SUBMISSION HANDLER =================
const addBookForm = document.getElementById('addBookForm');
if (addBookForm) {
  addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('bookTitleInput')?.value.trim() || "";
    const author = document.getElementById('bookAuthorInput')?.value.trim() || "";
    const category = document.getElementById('bookCategoryInput')?.value.trim() || "";
    const isbn = document.getElementById('bookIsbnInput')?.value.trim() || "";
    const totalCopies = parseInt(document.getElementById('totalCopiesInput')?.value) || 0;
    const imageFile = document.getElementById('bookImageInput')?.files[0];

    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    submitBtn.innerText = "Uploading & Saving...";
    submitBtn.disabled = true;

    try {
      let coverImage = "";
      if (imageFile) {
        coverImage = await uploadImageToCloudinary(imageFile);
      }

      const newBook = {
        title: title,
        author: author,
        category: category,
        isbn: isbn,
        description: "", 
        totalCopies: totalCopies,
        availableCopies: totalCopies,
        coverImage: coverImage || "",
        createdAt: new Date()
      };

      const res = await addBook(newBook);

      if (res.success) {
        alert("Book successfully add ho gayi!");
        addBookForm.reset();
        
        const modalElement = document.getElementById('addBookModal');
        if (modalElement) {
          const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
          if (bootstrapModal) bootstrapModal.hide();
        }

        loadBooks();
      } else {
        alert("Error: " + res.error);
      }
    } catch (err) {
      console.error("Add Book Error:", err);
      alert("Book save karne mein masla aaya!");
    } finally {
      submitBtn.innerText = "Save & Upload";
      submitBtn.disabled = false;
    }
  });
}

// ================= 4. SEARCH & CATEGORY FILTER (BOTH PAGES SUPPORT) =================
function setupSearchAndFilters() {
  // Multiple Selectors check karna dono pages ke liye
  const searchInputs = document.querySelectorAll(".search-box input, #searchInput, input[type='search'], input[placeholder*='Search']");
  const categorySelects = document.querySelectorAll(".filter-btn, #categoryFilter, select");

  searchInputs.forEach(input => {
    input.removeEventListener("input", filterAndSearchBooks);
    input.addEventListener("input", filterAndSearchBooks);
  });

  categorySelects.forEach(select => {
    select.removeEventListener("change", filterAndSearchBooks);
    select.addEventListener("change", filterAndSearchBooks);
  });
}

function filterAndSearchBooks(e) {
  // Kisi bhi active search input ki value le lena
  const searchInput = document.querySelector(".search-box input") || document.getElementById("searchInput") || e?.target;
  const categorySelect = document.querySelector(".filter-btn") || document.getElementById("categoryFilter");

  const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : "";
  const selectedCategory = categorySelect && categorySelect.value ? categorySelect.value.trim() : "All Categories";

  const filtered = currentBooks.filter((book) => {
    const titleMatch = book.title ? book.title.toLowerCase().includes(searchTerm) : false;
    const authorMatch = book.author ? book.author.toLowerCase().includes(searchTerm) : false;
    const isbnMatch = book.isbn ? book.isbn.toLowerCase().includes(searchTerm) : false;
    
    const matchesSearch = titleMatch || authorMatch || isbnMatch;

    const matchesCategory = 
      selectedCategory === "All Categories" || 
      selectedCategory === "Filter" || 
      selectedCategory === "" ||
      (book.category && book.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  displayBooks(filtered);
}

// ================= 5. GLOBAL HANDLERS FOR WINDOW =================
window.deleteBookHandler = async function (bookId) {
  if (confirm("Kya aap yeh book delete karna chahte hain?")) {
    const result = await deleteBook(bookId);
    if (result.success) {
      alert("Book successfully delete ho gayi!");
      loadBooks();
    } else {
      alert("Error: " + result.error);
    }
  }
};

window.viewBookDetails = function (bookId) {
  window.location.href = `../member/bookdetail.html?id=${bookId}`;
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
});

// 1. Modal Mein Data Load Karna
window.openEditModal = function (bookId) {
  const book = currentBooks.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('editBookIdInput').value = book.id;
  document.getElementById('editBookTitleInput').value = book.title || "";
  document.getElementById('editBookAuthorInput').value = book.author || "";
  document.getElementById('editBookCategoryInput').value = book.category || "";
  document.getElementById('editTotalCopiesInput').value = book.totalCopies ?? book.quantity ?? 0;

  const modal = new bootstrap.Modal(document.getElementById('editBookModal'));
  modal.show();
};

// 2. Updated Data Save Karna
const editBookForm = document.getElementById('editBookForm');
if (editBookForm) {
  editBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookId = document.getElementById('editBookIdInput')?.value;
    const title = document.getElementById('editBookTitleInput')?.value;
    const author = document.getElementById('editBookAuthorInput')?.value;
    const category = document.getElementById('editBookCategoryInput')?.value;
    const totalCopies = parseInt(document.getElementById('editTotalCopiesInput')?.value) || 0;
    const newImageFile = document.getElementById('editBookImageInput')?.files[0];

    try {
      const oldBook = currentBooks.find(b => b.id === bookId);
      let coverImage = oldBook?.coverImage || "";

      if (newImageFile) {
        coverImage = await uploadImageToCloudinary(newImageFile);
      }

      const updatedData = {
        title, author, category, totalCopies,
        availableCopies: totalCopies,
        coverImage
      };

      const res = await updateBook(bookId, updatedData);
      if (res.success) {
        alert("Book Updated!");
        bootstrap.Modal.getInstance(document.getElementById('editBookModal')).hide();
        loadBooks();
      }
    } catch (err) {
      alert("Error updating book!");
    }
  });
}