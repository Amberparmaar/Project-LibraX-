import { db, auth } from "../JS/firebase/firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Stat Elements
const statTotalBooks = document.getElementById("statTotalBooks");
const statTotalMembers = document.getElementById("statTotalMembers");
const statBooksIssued = document.getElementById("statBooksIssued");
const statOverdueBooks = document.getElementById("statOverdueBooks");
const activityGrid = document.getElementById("activityGrid");
const currentDateDisplay = document.getElementById("currentDateDisplay");
const adminName = document.getElementById("adminName");
const adminRole = document.getElementById("adminRole");
const adminAvatar = document.getElementById("adminAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const globalSearchInput = document.getElementById("globalSearchInput");

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  statTotalBooks,
  statTotalMembers,
  statBooksIssued,
  statOverdueBooks,
  activityGrid,
  currentDateDisplay,
  adminName,
  adminRole,
  adminAvatar,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

// Chart Instances
let monthlyBarChart = null;
let categoryDoughnutChart = null;

// Global Data Holders for dynamic charts
let booksData = [];
let issuedBooksData = [];

const FINE_PER_DAY = 50; // baaki files ke saath consistent

// ==========================================
// 1. INITIALIZATION & AUTH CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  setCurrentDate();

  // Check Auth State
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Redirect to Login if not authenticated
      window.location.href = "../auth/login.html";
      return;
    }

    // Verify Admin Role — SIRF Firestore role field se, koi aur heuristic nahi
    // (email/displayName mein "admin" word hone se access nahi milna chahiye — security risk)
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      const isAdmin = userData && userData.role === "admin";

      if (!isAdmin) {
        alert("Access Denied! Only Administrators can access this dashboard.");
        window.location.href = "../member/member-dashboard.html";
        return;
      }

      // Set Admin Info in UI
      if (adminName)
        adminName.textContent =
          userData?.name || user.displayName || user.email.split("@")[0];
      if (adminRole) adminRole.textContent = "Administrator";

      if (adminAvatar) {
        const photoURL =
          userData?.photoURL || userData?.avatar || user.photoURL;
        if (photoURL) {
          adminAvatar.src = photoURL;
        }
        // Agar photo load fail ho (broken URL/CORS/deleted file) to default pe wapas aa jao
        adminAvatar.onerror = () => {
          adminAvatar.onerror = null; // infinite loop se bachne ke liye
          adminAvatar.src = "../../images/admin.webp";
        };
      }

      // Initialize Real-time Data Listeners
      initRealTimeListeners();
    } catch (error) {
      console.error("Auth verification error:", error);
      alert("Admin verify karne mein masla aaya. Dobara login karein.");
      window.location.href = "../auth/login.html";
    }
  });

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
        window.location.href = "../auth/login.html";
      });
    });
  }

  // Global Search Bar Handler
  if (globalSearchInput) {
    globalSearchInput.addEventListener("input", (e) => {
      const queryVal = e.target.value.toLowerCase();
      filterActivities(queryVal);
    });
  }
});

function setCurrentDate() {
  if (currentDateDisplay) {
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    currentDateDisplay.textContent = new Date().toLocaleDateString(
      "en-US",
      options,
    );
  }
}

// ==========================================
// 2. REAL-TIME FIRESTORE LISTENERS
// ==========================================
function initRealTimeListeners() {
  listenTotalBooks();
  listenTotalMembers();
  listenIssuedBooks();
  listenRecentActivities();
}

// Real-time Books Count & Category Data
function listenTotalBooks() {
  onSnapshot(
    collection(db, "books"),
    (snapshot) => {
      if (statTotalBooks) statTotalBooks.textContent = snapshot.size || 0;

      booksData = [];
      snapshot.forEach((doc) => booksData.push(doc.data()));

      renderCategoryChart(booksData);
    },
    (error) => {
      console.error("Books Listener Error:", error);
    },
  );
}

// Real-time Members Count — sirf role == "member" wale, admin exclude
function listenTotalMembers() {
  const usersRef = collection(db, "users");
  const membersQuery = query(usersRef, where("role", "==", "member"));

  onSnapshot(
    membersQuery,
    (snapshot) => {
      if (statTotalMembers) statTotalMembers.textContent = snapshot.size || 0;
    },
    (error) => {
      console.error("Members Listener Error:", error);

      // Fallback: agar role field query fail ho (index missing waghera),
      // sab users le kar client-side admin exclude karo
      onSnapshot(usersRef, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          if (doc.data().role !== "admin") count++;
        });
        if (statTotalMembers) statTotalMembers.textContent = count;
      });
    },
  );
}

// Real-time Issued & Overdue Books Count — "issuedBooks" collection se
// (status "Issued"/"Returned" — issue-book.js/return-book.js ke schema ke mutabiq)
function listenIssuedBooks() {
  onSnapshot(
    collection(db, "issuedBooks"),
    (snapshot) => {
      let issuedCount = 0;
      let overdueCount = 0;
      issuedBooksData = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        issuedBooksData.push(data);

        if (data.status === "Issued") {
          issuedCount++;

          // returnDate field yahan DUE DATE hai ("DD/MM/YYYY" string)
          const dueDate = parseDate(data.returnDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (dueDate && dueDate < today) {
            overdueCount++;
          }
        }
      });

      if (statBooksIssued) statBooksIssued.textContent = issuedCount;
      if (statOverdueBooks) statOverdueBooks.textContent = overdueCount;

      renderMonthlyChart(issuedBooksData);
    },
    (error) => {
      console.error("Issued Books Listener Error:", error);
    },
  );
}

// Real-time Activities Feed Listener
// NOTE: "activities" collection abhi kahin bhi likhi nahi ja rahi
// (issue-book.js / return-book.js / books.js mein koi activity log create nahi hoti).
// Isliye ye hamesha "No recent activity" dikhayega jab tak activity-logging add na ki jaye.
function listenRecentActivities() {
  if (!activityGrid) return;

  const q = query(
    collection(db, "activities"),
    orderBy("timestamp", "desc"),
    limit(5),
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        activityGrid.innerHTML = `
                <div class="activity-card p-3 border rounded-3 mb-2 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="activity-icon text-primary"><i class="fa-solid fa-info-circle fa-lg"></i></div>
                        <div>
                            <h6 class="m-0 fw-bold">System Active</h6>
                            <p class="m-0 text-muted small">No recent activity logs found.</p>
                        </div>
                    </div>
                    <span class="time small text-muted">Just now</span>
                </div>`;
        return;
      }

      let html = "";
      snapshot.forEach((doc) => {
        const data = doc.data();

        let timeStr = "Recently";
        if (data.timestamp) {
          const date = data.timestamp.toDate
            ? data.timestamp.toDate()
            : new Date(data.timestamp);
          timeStr = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        html += `
                <div class="activity-card p-3 border rounded-3 mb-2 d-flex align-items-center justify-content-between activity-item">
                    <div class="d-flex align-items-center gap-3">
                        <div class="activity-icon ${data.color || "text-primary"}">
                            <i class="fa-solid ${data.icon || "fa-bell"} fa-lg"></i>
                        </div>
                        <div>
                            <h6 class="m-0 fw-bold act-title">${escapeHTML(data.title || "Activity")}</h6>
                            <p class="m-0 text-muted small act-desc">${escapeHTML(data.description || "-")}</p>
                        </div>
                    </div>
                    <span class="time small text-muted">${timeStr}</span>
                </div>`;
      });
      activityGrid.innerHTML = html;
    },
    (error) => {
      console.error("Activities Listener Error:", error);
    },
  );
}

// ==========================================
// 3. CHARTS CALCULATION & RENDER (Chart.js)
// ==========================================

function renderCategoryChart(books) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx || typeof Chart === "undefined") return;

  const categoryCounts = {};
  books.forEach((b) => {
    const cat = b.category || "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const labels = Object.keys(categoryCounts);
  const dataValues = Object.values(categoryCounts);

  if (categoryDoughnutChart) categoryDoughnutChart.destroy();

  categoryDoughnutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length > 0 ? labels : ["No Data"],
      datasets: [
        {
          data: dataValues.length > 0 ? dataValues : [1],
          backgroundColor: [
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
            "#6b7280",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

// Monthly Bar Chart (Dynamic Last 6 Months) — "issuedBooks" schema ke mutabiq
function renderMonthlyChart(issuedBooks) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx || typeof Chart === "undefined") return;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonthIdx = new Date().getMonth();

  const labels = [];
  const issuedData = [0, 0, 0, 0, 0, 0];
  const returnedData = [0, 0, 0, 0, 0, 0];

  for (let i = 5; i >= 0; i--) {
    let m = (currentMonthIdx - i + 12) % 12;
    labels.push(months[m]);
  }

  issuedBooks.forEach((book) => {
    // issueDate "DD/MM/YYYY" string hai — parseDate() se sahi parse karo
    const date = parseDate(book.issueDate);
    if (!date) return;

    const mName = months[date.getMonth()];
    const idx = labels.indexOf(mName);
    if (idx === -1) return;

    // "Issued" aur "Returned" dono ko "issued in that month" mein count karo
    if (book.status === "Issued" || book.status === "Returned") {
      issuedData[idx]++;
    }
    if (book.status === "Returned") {
      returnedData[idx]++;
    }
  });

  if (monthlyBarChart) monthlyBarChart.destroy();

  monthlyBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Issued",
          data: issuedData,
          backgroundColor: "#2563eb",
          borderRadius: 6,
        },
        {
          label: "Returned",
          data: returnedData,
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

// ==========================================
// 4. HELPERS
// ==========================================

// "DD/MM/YYYY" string ko reliably Date object mein parse karna
// (new Date("15/03/2025") use nahi karte kyunke wo US format samajhta hai aur galat result deta hai)
function parseDate(dateString) {
  if (!dateString) return null;

  // Agar Firestore Timestamp ho to bhi handle karo (backward safety)
  if (typeof dateString.toDate === "function") {
    return dateString.toDate();
  }

  if (typeof dateString !== "string") return null;

  const parts = dateString.split("/");
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;

  return date;
}

function filterActivities(term) {
  const items = document.querySelectorAll(".activity-item");
  items.forEach((item) => {
    const title =
      item.querySelector(".act-title")?.textContent.toLowerCase() || "";
    const desc =
      item.querySelector(".act-desc")?.textContent.toLowerCase() || "";
    if (title.includes(term) || desc.includes(term)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
