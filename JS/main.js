



document.addEventListener("DOMContentLoaded", function () {
  // Hero section ke buttons select ho rahe hain
  const signUpBtn = document.querySelector('.hero-content a[href="./ragister.html"]');
  const booksBtn = document.querySelector('.hero-content a[href="./html/admin/books.html"]');

  // Sign Up Button Click Handler
  if (signUpBtn) {
    signUpBtn.addEventListener("click", function (e) {
      e.preventDefault(); // Default instant jump ko rok kar dynamic action
      window.location.href = "./ragister.html"; // Register page redirect
    });
  }

  // Books Button Click Handler
  if (booksBtn) {
    booksBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "./html/admin/books.html"; // Books page redirect
    });
  }

  
});




//========================================================
// =======================================================




document.addEventListener("DOMContentLoaded", function () {
  // Select all flip cards on index.html
  const flipCards = document.querySelectorAll(".flip-card");

  // Page mapping based on card titles/order
  const pageLinks = [
    "./html/admin/books.html", // Card 1: Large Collection
    "./html/member/members.html",        // Card 2: Member Management
    "./html/admin/return-book.html",        // Card 3: Issue and return
    "./dashboard.html"         // Card 4: Smart Dashboard
  ];

  flipCards.forEach((card, index) => {
    card.style.cursor = "pointer";
    
    card.addEventListener("click", function () {
      if (pageLinks[index]) {
        window.location.href = pageLinks[index];
      }
    });
  });
});



function checkDashboardAccess() {
  // Simple check: Kya user logged in hai?
  let userLoggedIn = localStorage.getItem("isLoggedIn");

  if (userLoggedIn === "true") {
    // Agar login hai toh Dashboard par bhej do
    window.location.href = "./html/admin/dashboard.html";
  } else {
    // Agar login nahi hai toh simple message dikhao aur Login page par bhej do
    alert("Pehle login ya register karein!");
    window.location.href = "register.html";
  }
}


// ========================================
// ========================================




// Firebase Imports (Relative path from JS/main.js to JS/firebase/firebase-config.js)
import { auth, db } from "./firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 1. HERO SECTION & NAV BUTTONS HANDLERS
  // ==========================================
  const signUpBtn = document.querySelector('.hero-content a[href*="register"]') || 
                    document.querySelector('.hero-content a[href*="ragister"]');
  const booksBtn = document.querySelector('.hero-content a[href*="books.html"]');

  if (signUpBtn) {
    signUpBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./register.html";
    });
  }

  if (booksBtn) {
    booksBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./html/admin/books.html";
    });
  }

  // ==========================================
  // 2. FLIP CARDS CLICK LOGIC
  // ==========================================
  const flipCards = document.querySelectorAll(".flip-card");

  flipCards.forEach((card, index) => {
    card.style.cursor = "pointer";

    card.addEventListener("click", (e) => {
      e.preventDefault();

      // Card 1: Large Collection
      if (index === 0) {
        window.location.href = "./html/admin/books.html";
      } 
      // Card 2: Member Management
      else if (index === 1) {
        window.location.href = "./html/member/members.html";
      } 
      // Card 3: Issue & Return Book
      else if (index === 2) {
        window.location.href = "./html/admin/return-book.html";
      } 
      // Card 4: Smart Dashboard (Dynamic Firebase Logic)
      else if (index === 3) {
        handleSmartDashboardClick(card);
      }
    });
  });
});

// ==========================================
// 3. SMART DASHBOARD FIREBASE AUTH LOGIC
// ==========================================
async function handleSmartDashboardClick(cardElement) {
  // Step A: Card Par Spinner / Loading Visual Show Karein
  showCardLoader(cardElement);

  // Step B: Firebase Auth State Check
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    // Unsubscribe immediately to prevent multiple triggers
    unsubscribe();

    // -----------------------------------------------------------
    // CASE A: User IS NOT Logged In (user == null)
    // -----------------------------------------------------------
    if (!user) {
      window.location.href = "./register.html";
      return;
    }

    // -----------------------------------------------------------
    // CASE B: User IS Logged In (user != null)
    // -----------------------------------------------------------
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      // Agar Profile Document Incomplete Hai
      if (!userSnap.exists()) {
        window.location.href = "./register.html";
        return;
      }

      // Role Verification from Firestore
      const userData = userSnap.data();
      const role = userData.role ? userData.role.toLowerCase() : "member";

      if (role === "admin") {
        // Admin Redirect
        window.location.href = "./html/admin/dashboard.html";
      } else {
        // Member Redirect
        window.location.href = "./html/member/member-dashboard.html";
      }
    } catch (error) {
      console.error("Firestore Check Error:", error);
      hideCardLoader(cardElement);
      // Fallback redirect to login
      window.location.href = "./login.html";
    }
  });
}

// ==========================================
// 4. UI SPINNER HELPER FUNCTIONS
// ==========================================
function showCardLoader(card) {
  if (!card) return;
  card.style.pointerEvents = "none";
  card.style.opacity = "0.7";

  if (!card.querySelector(".card-loader")) {
    const loader = document.createElement("div");
    loader.className = "card-loader";
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
    `;
    loader.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    `;
    card.appendChild(loader);
  }
}

function hideCardLoader(card) {
  if (!card) return;
  card.style.pointerEvents = "auto";
  card.style.opacity = "1";
  const loader = card.querySelector(".card-loader");
  if (loader) loader.remove();
}








