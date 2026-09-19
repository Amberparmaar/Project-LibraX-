import { db, auth } from "../JS/firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const tableBody = document.getElementById("myBooksTableBody");
const logoutBtn = document.getElementById("logoutBtn");

const FINE_PER_DAY = 50; // issue-book.js / return-book.js ke saath consistent

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
if (!tableBody) {
  console.error(
    `⚠️ MISSING ELEMENT: "tableBody" (myBooksTableBody) is null — HTML mein ID check karein.`,
  );
}

function parseToDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "string") {
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

// Date Formatter Helper
function formatDate(value) {
  const date = parseToDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


function calculateFine(dueDateValue) {
  const dueDate = parseToDate(dueDateValue);
  if (!dueDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  if (today <= dueDate) return 0;

  const diffDays = Math.ceil(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays * FINE_PER_DAY;
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// Status Badges Generator
function getStatusBadge(status, dueDateValue) {
  if (status === "Returned") {
    return `<span class="badge bg-secondary-subtle text-secondary fw-semibold px-3 py-2 rounded-2">Returned</span>`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseToDate(dueDateValue);

  if (!dueDate) {
    return `<span class="badge bg-success-subtle text-success fw-semibold px-3 py-2 rounded-2">Issued</span>`;
  }

  if (dueDate < today) {
    return `<span class="badge bg-danger-subtle text-danger fw-semibold px-3 py-2 rounded-2">Overdue</span>`;
  }

  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 3) {
    return `<span class="badge bg-warning-subtle text-warning fw-semibold px-3 py-2 rounded-2">Due Soon</span>`;
  }

  return `<span class="badge bg-success-subtle text-success fw-semibold px-3 py-2 rounded-2">Issued</span>`;
}

// Fetch Logged-In Member's Issued Books from Firestore
function loadUserIssuedBooks(userId) {
  const q = query(
    collection(db, "issuedBooks"),
    where("memberId", "==", userId),
  );

  onSnapshot(
    q,
    (snapshot) => {
      if (!tableBody) return;

      if (snapshot.empty) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">No issued books found.</td>
                </tr>`;
        return;
      }

      // Currently-issued books pehle, phir returned history
      const docs = snapshot.docs
        .map((d) => d.data())
        .sort(
          (a, b) =>
            (a.status === "Issued" ? -1 : 1) - (b.status === "Issued" ? -1 : 1),
        );

      let rowsHTML = "";
      docs.forEach((data) => {
        const bookTitle = data.bookTitle || "Untitled Book";
        const issueDate = formatDate(data.issueDate);
        const dueDate = formatDate(data.returnDate); // "returnDate" field yahan due date hai
        const badge = getStatusBadge(data.status, data.returnDate);

        // Returned ho chuki book ka finalized fine dikhao; abhi tak issue wali book ka
        // dynamically calculate karo (kyunke uska fine field abhi set hi nahi hua)
        let fineAmount = 0;
        if (data.status === "Returned") {
          fineAmount = Number(data.fine) || 0;
        } else {
          fineAmount = calculateFine(data.returnDate);
        }
        const fine = `Rs. ${fineAmount.toLocaleString()}`;

        rowsHTML += `
                <tr>
                    <td class="py-3 px-3 fw-bold text-secondary">${escapeHTML(bookTitle)}</td>
                    <td class="py-3 px-3 text-secondary">${issueDate}</td>
                    <td class="py-3 px-3 text-secondary">${dueDate}</td>
                    <td class="py-3 px-3">${badge}</td>
                    <td class="py-3 px-3 text-secondary${fineAmount > 0 ? " text-danger fw-semibold" : ""}">${fine}</td>
                </tr>
            `;
      });

      tableBody.innerHTML = rowsHTML;
    },
    (error) => {
      console.error("Error fetching books:", error);
      if (tableBody) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-danger">Failed to load issued books. Check Firestore Index / Security Rules.</td>
                </tr>`;
      }
    },
  );
}

// Auth Guard & Dynamic Fetching
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserIssuedBooks(user.uid);
  } else {
    window.location.href = "../../login.html";
  }
});

// Logout Mechanism
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => {
        window.location.href = "../../login.html";
      })
      .catch((err) => {
        console.error("Logout Error:", err);
      });
  });
}
