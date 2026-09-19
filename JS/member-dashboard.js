import { db, auth } from "../JS/firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const userProfileImg = document.getElementById("userProfileImg");
const headerUserName = document.getElementById("headerUserName");
const welcomeHeading = document.getElementById("welcomeHeading");

const cardBorrowedCount = document.getElementById("cardBorrowedCount");
const cardDueSoonCount = document.getElementById("cardDueSoonCount");
const cardOverdueCount = document.getElementById("cardOverdueCount");
const cardTotalFine = document.getElementById("cardTotalFine");

const tableBody = document.getElementById("dashboardBooksTableBody");
const notificationsContainer = document.getElementById(
  "dashboardNotificationsContainer",
);
const logoutBtn = document.getElementById("logoutBtn");

const FINE_PER_DAY = 50; // issue-book.js / return-book.js ke saath consistent

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  userProfileImg,
  headerUserName,
  welcomeHeading,
  cardBorrowedCount,
  cardDueSoonCount,
  cardOverdueCount,
  cardTotalFine,
  tableBody,
  notificationsContainer,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

// Helper: "DD/MM/YYYY" string / Firestore Timestamp — dono ko reliably Date mein convert karna
function parseToDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "string") {
    // "DD/MM/YYYY" format — seedha new Date() ko nahi dena, US format samajh leta hai
    if (value.includes("/")) {
      const parts = value.split("/");
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

// Helper: Date Formatter (display ke liye)
function formatDate(value) {
  const date = parseToDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Helper: Fine calculation (issue-book.js / return-book.js ke saath consistent)
function calculateFine(dueDateValue) {
  const dueDate = parseToDate(dueDateValue);
  if (!dueDate) return { fine: 0, overdueDays: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  if (today <= dueDate) return { fine: 0, overdueDays: 0 };

  const diffDays = Math.ceil(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return { fine: diffDays * FINE_PER_DAY, overdueDays: diffDays };
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// Fetch Profile Information
async function loadUserProfile(userId, authUser) {
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    let fullName = authUser.displayName || "Member";
    let profilePic = authUser.photoURL || "../../images/profile.jpg";

    if (userSnap.exists()) {
      const userData = userSnap.data();
      fullName = userData.name || userData.fullName || fullName;
      if (userData.photoURL || userData.avatar || userData.profileImage) {
        profilePic =
          userData.photoURL || userData.avatar || userData.profileImage;
      }
    }

    if (headerUserName) headerUserName.textContent = fullName;
    if (welcomeHeading)
      welcomeHeading.textContent = `Welcome Back, ${fullName}`;
    if (userProfileImg) {
      userProfileImg.src = profilePic;
      userProfileImg.onerror = () => {
        userProfileImg.src = "../../images/profile.jpg";
      };
    }
  } catch (err) {
    console.error("Error loading user profile:", err);
  }
}

// Fetch Issued Books and Calculate Stats
function loadDashboardData(userId) {
  const q = query(
    collection(db, "issuedBooks"),
    where("memberId", "==", userId),
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (cardBorrowedCount) cardBorrowedCount.textContent = "0";
        if (cardDueSoonCount) cardDueSoonCount.textContent = "0";
        if (cardOverdueCount) cardOverdueCount.textContent = "0";
        if (cardTotalFine) cardTotalFine.textContent = "Rs. 0";

        if (tableBody) {
          tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-3 text-muted">No borrowed books currently.</td>
                    </tr>`;
        }
        return;
      }

      let totalBorrowed = 0;
      let dueSoonCount = 0;
      let overdueCount = 0;
      let totalFine = 0;
      let rowsHTML = "";

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Currently-issued books ko pehle dikhao, phir returned history
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            (a.status === "Issued" ? -1 : 1) - (b.status === "Issued" ? -1 : 1),
        );

      docs.forEach((data) => {
        // "returnDate" field yahan DUE DATE hai (jab tak return na ho)
        const dueDate = parseToDate(data.returnDate);

        if (data.status === "Issued") {
          totalBorrowed++;

          if (dueDate) {
            if (dueDate < today) {
              overdueCount++;
              totalFine += calculateFine(data.returnDate).fine; // dynamic, kyunke abhi return nahi hui
            } else {
              const diffDays = Math.ceil(
                (dueDate - today) / (1000 * 60 * 60 * 24),
              );
              if (diffDays <= 3) dueSoonCount++;
            }
          }
        } else if (data.status === "Returned" && data.fine) {
          // Pehle se finalize ho chuka fine (agar late return hua tha)
          totalFine += Number(data.fine) || 0;
        }

        // Table Row
        const bookTitle = data.bookTitle || "Untitled Book";
        const issueDateFormatted = formatDate(data.issueDate);
        const dueDateFormatted = formatDate(data.returnDate);

        let statusTag = `<span class="badge bg-secondary">Returned</span>`;
        if (data.status === "Issued") {
          if (dueDate && dueDate < today) {
            statusTag = `<span class="status overdue">Overdue</span>`;
          } else if (dueDate) {
            const diffDays = Math.ceil(
              (dueDate - today) / (1000 * 60 * 60 * 24),
            );
            statusTag =
              diffDays <= 3
                ? `<span class="status due">Due Soon</span>`
                : `<span class="status issued">Issued</span>`;
          } else {
            statusTag = `<span class="status issued">Issued</span>`;
          }
        }

        rowsHTML += `
                <tr>
                    <td>${escapeHTML(bookTitle)}</td>
                    <td>${issueDateFormatted}</td>
                    <td>${dueDateFormatted}</td>
                    <td>${statusTag}</td>
                </tr>
            `;
      });

      if (cardBorrowedCount) cardBorrowedCount.textContent = totalBorrowed;
      if (cardDueSoonCount) cardDueSoonCount.textContent = dueSoonCount;
      if (cardOverdueCount) cardOverdueCount.textContent = overdueCount;
      if (cardTotalFine)
        cardTotalFine.textContent = `Rs. ${totalFine.toLocaleString()}`;

      if (tableBody)
        tableBody.innerHTML =
          rowsHTML ||
          `<tr><td colspan="4" class="text-center py-3 text-muted">No borrowed books currently.</td></tr>`;
    },
    (err) => {
      console.error("Error loading dashboard data:", err);
      if (tableBody) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-3 text-danger">Failed to load books. Check Firestore Index/Rules.</td>
                </tr>`;
      }
    },
  );
}

function loadNotifications(userId) {
  const q = query(
    collection(db, "notifications"),
    where("memberId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(5),
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (!notificationsContainer) return;

      if (snapshot.empty) {
        notificationsContainer.innerHTML = `<p class="text-muted text-center py-3 mb-0">No new notifications.</p>`;
        return;
      }

      let notifHTML = "";
      snapshot.forEach((docSnap) => {
        const notif = docSnap.data();
        const message = notif.message || "Notification received.";
        const timeAgo = notif.timeAgo || "Recently";
        const typeClass =
          notif.type === "warning"
            ? "text-warning"
            : notif.type === "success"
              ? "text-success"
              : "text-primary";

        notifHTML += `
                <div class="notification-item">
                    <i class="fa-solid fa-circle ${typeClass}"></i>
                    <div>
                        <h6>${escapeHTML(message)}</h6>
                        <span>${escapeHTML(timeAgo)}</span>
                    </div>
                </div>
            `;
      });

      notificationsContainer.innerHTML = notifHTML;
    },
    (err) => {
      console.warn(
        "Notifications collection error (Optional index required):",
        err,
      );
      if (notificationsContainer) {
        notificationsContainer.innerHTML = `<p class="text-muted text-center py-3 mb-0">No notifications found.</p>`;
      }
    },
  );
}

// Authentication Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserProfile(user.uid, user);
    loadDashboardData(user.uid);
    loadNotifications(user.uid);
  } else {
    window.location.href = "./login.html";
  }
});

// Handle Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => {
        window.location.href = "./login.html";
      })
      .catch((err) => {
        console.error("Logout Error:", err);
      });
  });
}
