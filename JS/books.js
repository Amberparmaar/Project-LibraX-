import { 
  addBook, 
  getAllBooks, 
  updateBook, 
  deleteBook, 
  searchBooks 
} from "../JS/firebase/books-service.js"; 
import { uploadImageToCloudinary } from '../JS/cloudinary.js';
import { auth } from "../JS/firebase/firebase-config.js";
let currentBooks = [];
let filteredBooks = []; 
let currentPage = 1;
const rowsPerPage = 6; 

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
    filteredBooks = [...currentBooks]; // Initial setting
    currentPage = 1;
    renderPaginatedBooks();
    setupSearchAndFilters(); 
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

// ================= 2. PAGINATION CONTROLLER =================
function renderPaginatedBooks() {
  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const booksToDisplay = filteredBooks.slice(startIndex, endIndex);

  // Books Display
  displayBooks(booksToDisplay);

  // Pagination UI Update
  updatePaginationUI(totalItems, startIndex, endIndex, totalPages);
}

function updatePaginationUI(totalItems, startIndex, endIndex, totalPages) {
  const tableFooter = document.querySelector(".table-footer");
  if (!tableFooter) return;

  const actualEndIndex = Math.min(endIndex, totalItems);
  const actualStartIndex = totalItems === 0 ? 0 : startIndex + 1;

  // Entries Count Info
  let entriesInfo = tableFooter.querySelector("p");
  if (entriesInfo) {
    entriesInfo.innerText = `Showing ${actualStartIndex} to ${actualEndIndex} of ${totalItems} entries`;
  }

  // Page Buttons Container
  let paginationContainer = tableFooter.querySelector(".pagination");
  if (!paginationContainer) return;

  paginationContainer.innerHTML = "";

  // Dynamic Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = i;
      renderPaginatedBooks();
    });
    paginationContainer.appendChild(btn);
  }

  // Next Chevron Button
  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
  if (currentPage >= totalPages) nextBtn.disabled = true;

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPaginatedBooks();
    }
  });

  paginationContainer.appendChild(nextBtn);
}

// ================= 3. DYNAMIC RENDERING (CARDS & TABLE SUPPORT) =================
function displayBooks(books) {
  const container = document.querySelector(".books-container");
  const tableBody = document.getElementById("booksTableBody");
  const defaultImg = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn76n4M7gBWQAT28M5jrXgYixN62L11b6SymBpmGW64zd18tRxM8t6Ra-H&s=10";

  // --- A. CARD LAYOUT RENDER ---
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
                 <p><i class="fa-solid fa-user"></i> ${book.price || 'Unknown'}</p>
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

  // --- B. TABLE LAYOUT RENDER ---
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

// ================= 4. ADD BOOK FORM SUBMISSION HANDLER =================
const addBookForm = document.getElementById('addBookForm');
if (addBookForm) {
  addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('bookTitleInput')?.value.trim() || "";
    const desc = document.getElementById('bookdesc')?.value.trim() || "";
    const author = document.getElementById('bookAuthorInput')?.value.trim() || "";
    const price = document.getElementById('bookPriceInput')?.value.trim() || "";
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
        price:price,
        category: category,
        isbn: isbn,
        description: desc, 
        totalCopies: totalCopies,
        availableCopies: totalCopies,
        coverImage: coverImage || "",
        createdAt: new Date()
      };
console.log("Current Firebase User:", auth.currentUser);
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

// ================= 5. SEARCH & CATEGORY FILTER =================


function setupSearchAndFilters() {

    const searchInput = document.querySelector(".search-box input");
    const categoryFilter = document.getElementById("categoryFilter");

    if (searchInput) {
        searchInput.removeEventListener("input", filterAndSearchBooks);
        searchInput.addEventListener("input", filterAndSearchBooks);
    }

    if (categoryFilter) {
        categoryFilter.removeEventListener("change", filterAndSearchBooks);
        categoryFilter.addEventListener("change", filterAndSearchBooks);
    }
}


function filterAndSearchBooks() {

    const searchInput = document.querySelector(".search-box input");
    const categoryFilter = document.getElementById("categoryFilter");

    const searchTerm = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const selectedCategory = categoryFilter
        ? categoryFilter.value
        : "All Categories";


    filteredBooks = currentBooks.filter((book) => {

        const title = (book.title || "").toLowerCase();
        const author = (book.author || "").toLowerCase();
        const isbn = (book.isbn || "").toLowerCase();
        const category = (book.category || "").toLowerCase();


        const matchesSearch =
            title.includes(searchTerm) ||
            author.includes(searchTerm) ||
            isbn.includes(searchTerm);


        const matchesCategory =
            selectedCategory === "All Categories" ||
            category === selectedCategory.toLowerCase();


        return matchesSearch && matchesCategory;
    });


    currentPage = 1;
    renderPaginatedBooks();
}

// ================= 6. GLOBAL HANDLERS FOR WINDOW =================
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
// edit modal
window.openEditModal = function (bookId) {

  console.log("Edit clicked:", bookId);

  const book = currentBooks.find(b => b.id === bookId);

  if (!book) {
    console.error("Book not found:", bookId);
    return;
  }

  document.getElementById('editBookIdInput').value = book.id;

  document.getElementById('editBookTitleInput').value =
    book.title || "";

  document.getElementById('editBookAuthorInput').value =
    book.author || "";
    

  document.getElementById('editBookCategoryInput').value =
    book.category || "";

  document.getElementById('editTotalCopiesInput').value =
    book.totalCopies ?? 0;

  const modalElement = document.getElementById('editBookModal');

  if (!modalElement) {
    console.error("editBookModal HTML mein nahi mila!");
    return;
  }

  const modal = new bootstrap.Modal(modalElement);
  modal.show();
};

// Edit Form Submit
const editBookForm = document.getElementById('editBookForm');

if (editBookForm) {

  editBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookId = document.getElementById('editBookIdInput')?.value;

    const title = document.getElementById('editBookTitleInput')?.value.trim() || "";
    const author = document.getElementById('editBookAuthorInput')?.value.trim() || "";
    const category = document.getElementById('editBookCategoryInput')?.value.trim() || "";
    const totalCopies =
      parseInt(document.getElementById('editTotalCopiesInput')?.value) || 0;

    const newImageFile =
      document.getElementById('editBookImageInput')?.files[0];

    console.log("Editing Book ID:", bookId);

    if (!bookId) {
      alert("Book ID nahi mila!");
      return;
    }

    try {

      // Current book
      const oldBook = currentBooks.find(book => book.id === bookId);

      if (!oldBook) {
        alert("Book nahi mili!");
        return;
      }

      // Old image
      let coverImage = oldBook.coverImage || "";

      // New image upload
      if (newImageFile) {
        coverImage = await uploadImageToCloudinary(newImageFile);
      }

      const updatedData = {
        title: title,
        author: author,
        category: category,
        isbn: oldBook.isbn || "",
        price: oldBook.price || "",
        description: oldBook.description || "",
        totalCopies: totalCopies,
        availableCopies: totalCopies,
        coverImage: coverImage
      };

      console.log("Updated Data:", updatedData);

      const res = await updateBook(bookId, updatedData);

      console.log("Update Result:", res);

      if (res.success) {

        alert("Book successfully updated!");

        const modalElement =
          document.getElementById('editBookModal');

        const modal =
          bootstrap.Modal.getInstance(modalElement);

        if (modal) {
          modal.hide();
        }

        await loadBooks();

      } else {

        alert("Update Error: " + res.error);

      }

    } catch (err) {

      console.error("Edit Book Error:", err);

      alert("Error updating book: " + err.message);

    }

  });

}
