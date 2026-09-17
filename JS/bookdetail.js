// JS/bookdetail.js
import { db } from "../JS/firebase/firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get("id");

let currentQuantity = 1;
let bookImages = [];      // gallery images array (from Firestore)
let currentImageIndex = 0; // index of image currently shown in main view
let basePrice = 0;         // per-copy price from Firestore

// Recalculates displayed price as basePrice * currentQuantity
function updatePriceDisplay() {
  const priceEl = document.getElementById("bookPrice");
  if (!priceEl) return;
  const total = basePrice * currentQuantity;
  priceEl.innerText = `Rs. ${total.toLocaleString("en-PK")}`;
}

// ================= LOAD BOOK DATA =================
async function loadBookDetail() {
  if (!bookId) {
    console.error("Book ID not found in URL!");
    alert("Error: Book not found!");
    return;
  }

  try {
    console.log("Loading book ID:", bookId);

    const bookRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(bookRef);

    if (bookSnap.exists()) {
      const book = bookSnap.data();
      console.log("Book data loaded:", book);

      // Title & Subtitle
      document.getElementById("detailTitle").innerText = book.title || "No Title";
      document.getElementById("bookSubtitle").innerText = book.description || "No Description";

      // Author
      document.getElementById("detailAuthor").innerText = book.author || "Unknown";

      // Category, Language, ISBN
      document.getElementById("bookCategory").innerText = book.category || "General";
      document.getElementById("bookLanguage").innerText = book.language || "English";
      document.getElementById("bookISBN").innerText = book.isbn || "N/A";

      // Year
      document.getElementById("bookYear").innerText = book.year || "2024";

      // Price (store base price, then render with current quantity)
      basePrice = Number(book.price) || 0;
      updatePriceDisplay();

      // Rating
      document.getElementById("bookRating").innerText = book.rating || "4.5";
      document.getElementById("reviewCount").innerText = `(${book.reviews || 0} reviews)`;

      // Copies Cards
      const cards = document.querySelectorAll(".dashboard-card h6");
      if (cards[0]) cards[0].innerText = book.totalCopies ?? 0;
      if (cards[1]) cards[1].innerText = book.availableCopies ?? 0;
      if (cards[2]) cards[2].innerText = book.issuedCopies ?? 0;
      if (cards[3]) cards[3].innerText = book.reservedCopies ?? 0;

      // Stock Badge
      const stockBadgeEl = document.querySelector(".stock-badge");
      if (stockBadgeEl) {
        const available = Number(book.availableCopies) || 0;
        stockBadgeEl.innerText = available > 0 ? "In Stock" : "Out of Stock";
        stockBadgeEl.style.backgroundColor = available > 0 ? "#28a745" : "#dc3545";
      }

      // Best Seller Badge (dynamic show/hide)
      const bestSellerEl = document.querySelector(".best-seller");
      if (bestSellerEl) {
        bestSellerEl.style.display = book.bestSeller ? "flex" : "none";
      }

      // ============ GALLERY IMAGES ============
      // Build the images array: prefer book.images[], fallback to book.coverImage
      if (Array.isArray(book.images) && book.images.length > 0) {
        bookImages = book.images;
      } else if (book.coverImage) {
        bookImages = [book.coverImage];
      } else {
        bookImages = ["https://via.placeholder.com/300x400?text=No+Image"];
      }

      currentImageIndex = 0;
      renderGallery();

    } else {
      alert("Book not found!");
    }
  } catch (error) {
    console.error("Error loading book:", error);
    alert("Error loading data: " + error.message);
  }
}

// ================= RENDER GALLERY (thumbnails + dots + main image) =================
function renderGallery() {
  const mainImg = document.getElementById("mainBookImage");
  const thumbContainer = document.querySelector(".thumbnails");
  const dotsContainer = document.querySelector(".gallery-dots");

  if (!mainImg || !thumbContainer || !dotsContainer) return;

  // Main image
  mainImg.src = bookImages[currentImageIndex];

  // Thumbnails
  thumbContainer.innerHTML = "";
  bookImages.forEach((imgUrl, index) => {
    const thumbBtn = document.createElement("button");
    thumbBtn.className = `thumbnail ${index === currentImageIndex ? "active" : ""}`;
    thumbBtn.type = "button";
    thumbBtn.innerHTML = `<img src="${imgUrl}" alt="Thumbnail ${index + 1}">`;

    thumbBtn.addEventListener("click", () => {
      currentImageIndex = index;
      renderGallery();
    });

    thumbContainer.appendChild(thumbBtn);
  });

  // Dots
  dotsContainer.innerHTML = "";
  bookImages.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = `dot ${index === currentImageIndex ? "active" : ""}`;
    dot.addEventListener("click", () => {
      currentImageIndex = index;
      renderGallery();
    });
    dotsContainer.appendChild(dot);
  });
}

// ================= QUANTITY CONTROL + GALLERY ARROWS =================
document.addEventListener("DOMContentLoaded", () => {
  loadBookDetail();

  const quantityEl = document.getElementById("quantity");
  const increaseBtn = document.getElementById("increaseBtn");
  const decreaseBtn = document.getElementById("decreaseBtn");

  increaseBtn?.addEventListener("click", () => {
    currentQuantity++;
    quantityEl.innerText = currentQuantity;
    updatePriceDisplay();
  });

  decreaseBtn?.addEventListener("click", () => {
    if (currentQuantity > 1) {
      currentQuantity--;
      quantityEl.innerText = currentQuantity;
      updatePriceDisplay();
    }
  });

  // ================= MAIN GALLERY PREV/NEXT =================
  const galleryPrevBtn = document.querySelector(".gallery-prev");
  const galleryNextBtn = document.querySelector(".gallery-next");

  galleryPrevBtn?.addEventListener("click", () => {
    if (bookImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + bookImages.length) % bookImages.length;
    renderGallery();
  });

  galleryNextBtn?.addEventListener("click", () => {
    if (bookImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % bookImages.length;
    renderGallery();
  });

  // ================= THUMBNAIL ROW SCROLL ARROWS =================
  const thumbnailArrows = document.querySelectorAll(".thumbnail-arrow");
  const thumbnailsEl = document.querySelector(".thumbnails");

  if (thumbnailArrows.length >= 2 && thumbnailsEl) {
    const [leftArrow, rightArrow] = thumbnailArrows;

    leftArrow.addEventListener("click", () => {
      thumbnailsEl.scrollBy({ left: -100, behavior: "smooth" });
    });

    rightArrow.addEventListener("click", () => {
      thumbnailsEl.scrollBy({ left: 100, behavior: "smooth" });
    });
  }

  // ================= ISSUE BOOK =================
  const issueBtn = document.getElementById("issueBookBtn");
  issueBtn?.addEventListener("click", async () => {
    if (!bookId) return alert("Book ID not found!");
    const available = Number(document.querySelectorAll(".dashboard-card h6")[1]?.innerText) || 0;
  if (currentQuantity > available) {
    return alert(`Not enough copies! Only ${available} available.`);
  }

    try {
      issueBtn.disabled = true;
      issueBtn.innerText = "Processing...";

      const bookRef = doc(db, "books", bookId);
      await updateDoc(bookRef, {
        availableCopies: increment(-currentQuantity),
        issuedCopies: increment(currentQuantity)
      });

      alert(`Success! ${currentQuantity} book(s) issued!`);
      currentQuantity = 1;
      quantityEl.innerText = 1;
      loadBookDetail();

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      issueBtn.disabled = false;
      issueBtn.innerText = "Issue Book";
    }
  });

  // ================= RESERVE BOOK =================
  const reserveBtn = document.getElementById("reserveBookBtn");
  reserveBtn?.addEventListener("click", async () => {
    if (!bookId) return alert("Book ID not found!");

    try {
      reserveBtn.disabled = true;
      reserveBtn.innerText = "Reserving...";

      const bookRef = doc(db, "books", bookId);
      await updateDoc(bookRef, {
        reservedCopies: increment(currentQuantity),
        availableCopies: increment(-currentQuantity)
      });

      alert(`Success! ${currentQuantity} book(s) reserved!`);
      currentQuantity = 1;
      quantityEl.innerText = 1;
      loadBookDetail();

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      reserveBtn.disabled = false;
      reserveBtn.innerText = "Reserve Book";
    }
  });

  // ================= FAVORITE BOOK =================
  const favoriteBtn = document.getElementById("favoriteBtn");
  favoriteBtn?.addEventListener("click", () => {
    favoriteBtn.classList.toggle("active");
    const isFavorite = favoriteBtn.classList.contains("active");

    if (isFavorite) {
      favoriteBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
      favoriteBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
  });
});




const issueBookBtn = document.getElementById("issueBookBtn");

if (issueBookBtn) {
    issueBookBtn.addEventListener("click", () => {
        if (!bookId) {
            alert("Book ID not found!");
            return;
        }
        // Admin ko Issue Book page par bhejega aur Book ID URL mein saath le jayega
        window.location.href = `../admin/issue-book.html?bookId=${currentBookId}`;
    });
}