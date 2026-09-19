import { db } from "../JS/firebase/firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ================= ELEMENT REFERENCES =================
const memberSelect = document.getElementById("memberSelect");
const bookSelect = document.getElementById("bookSelect");
const issueDateInput = document.getElementById("issueDate");
const returnDateInput = document.getElementById("returnDate");
const remarksInput = document.getElementById("remarks");
const issueBookForm = document.getElementById("issueBookForm");
const issueBtn = document.getElementById("issueBtn");
const issueMessage = document.getElementById("issueMessage");

const memberAvatar = document.getElementById("memberAvatar");
const memberNameEl = document.getElementById("memberName");
const memberIdEl = document.getElementById("memberId");
const memberDeptEl = document.getElementById("memberDept");
const borrowedCountEl = document.getElementById("borrowedCount");
const overdueCountEl = document.getElementById("overdueCount");

const issuedBooksTable = document.getElementById("issuedBooksTable");

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  memberSelect,
  bookSelect,
  issueDateInput,
  returnDateInput,
  remarksInput,
  issueBookForm,
  issueBtn,
  issueMessage,
  memberAvatar,
  memberNameEl,
  memberIdEl,
  memberDeptEl,
  borrowedCountEl,
  overdueCountEl,
  issuedBooksTable,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

// Local cache
let membersMap = {};
let booksMap = {};

const defaultAvatar = "https://via.placeholder.com/60";
const FINE_PER_DAY = 50; // return-book.js ke saath consistent rakha

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  loadMembers();
  loadBooks();
  loadIssuedBooksTable();
  initDatePickers();
  resetMemberInfoPanel();
});

// ================= DATE PICKERS =================
function initDatePickers() {
  if (typeof flatpickr === "undefined" || !issueDateInput || !returnDateInput)
    return;

  const issueFp = flatpickr(issueDateInput, {
    dateFormat: "d/m/Y",
    defaultDate: new Date(),
    onChange: function (selectedDates) {
      if (selectedDates[0]) {
        returnFp.set("minDate", selectedDates[0]);
      }
    },
  });

  const returnFp = flatpickr(returnDateInput, {
    dateFormat: "d/m/Y",
    minDate: new Date(),
  });

  document
    .getElementById("issueDateIcon")
    ?.addEventListener("click", () => issueFp.open());
  document
    .getElementById("returnDateIcon")
    ?.addEventListener("click", () => returnFp.open());
}

// ================= MEMBERS (USERS) FETCH LOGIC =================
// Member = User. "users" collection mein hi role == "member" wale users hain.
async function loadMembers() {
  if (!memberSelect) return;

  memberSelect.innerHTML = `<option value="">Loading members...</option>`;
  membersMap = {};

  try {
    const usersRef = collection(db, "users");
    const membersQuery = query(usersRef, where("role", "==", "member"));

    let snapshot = await getDocs(membersQuery);

    if (snapshot.empty) {
      snapshot = await getDocs(usersRef);
    }

    if (snapshot.empty) {
      memberSelect.innerHTML = `<option value="">No members found</option>`;
      return;
    }

    let html = `<option value="" disabled selected>Select Member</option>`;
    let count = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (data.role === "admin") return;

      membersMap[docSnap.id] = { id: docSnap.id, ...data };

      const name = data.name || data.fullName || data.email || "Unnamed Member";
      html += `<option value="${docSnap.id}">${name}</option>`;
      count++;
    });

    memberSelect.innerHTML =
      count > 0 ? html : `<option value="">No members found</option>`;
  } catch (err) {
    console.error("Members load error:", err);
    memberSelect.innerHTML = `<option value="">Error loading members</option>`;
  }
}

// ================= BOOKS FETCH LOGIC (With Auto-Select Fix) =================
async function loadBooks() {
  if (!bookSelect) return;

  bookSelect.innerHTML = `<option value="">Loading books...</option>`;
  booksMap = {};

  try {
    const snapshot = await getDocs(collection(db, "books"));
    if (snapshot.empty) {
      bookSelect.innerHTML = `<option value="">No books found</option>`;
      return;
    }

    let html = `<option value="" disabled selected>Select Book</option>`;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      booksMap[docSnap.id] = { id: docSnap.id, ...data };

      const availableCopies = data.availableCopies ?? data.available ?? 0;
      const disabledAttr = availableCopies <= 0 ? "disabled" : "";
      const label =
        availableCopies <= 0
          ? `${data.title || data.bookName} (Out of Stock)`
          : `${data.title || data.bookName}`;

      html += `<option value="${docSnap.id}" ${disabledAttr}>${label}</option>`;
    });

    bookSelect.innerHTML = html;

    const urlParams = new URLSearchParams(window.location.search);
    const autoBookId = urlParams.get("bookId");

    if (autoBookId) {
      const matchingOption = bookSelect.querySelector(
        `option[value="${autoBookId}"]`,
      );
      if (matchingOption && !matchingOption.disabled) {
        bookSelect.value = autoBookId;
      }
    }
  } catch (err) {
    console.error("Books load error:", err);
    bookSelect.innerHTML = `<option value="">Error loading books</option>`;
  }
}

// ================= MEMBER INFO PANEL =================
function resetMemberInfoPanel() {
  if (memberNameEl) memberNameEl.innerText = "Select Member";
  if (memberIdEl) memberIdEl.innerText = "—";
  if (memberDeptEl) memberDeptEl.innerText = "—";
  if (memberAvatar) memberAvatar.src = defaultAvatar;
  if (borrowedCountEl) borrowedCountEl.innerText = "0";
  if (overdueCountEl) overdueCountEl.innerText = "0";
}

memberSelect?.addEventListener("change", async () => {
  const selectedId = memberSelect.value;

  if (!selectedId) {
    resetMemberInfoPanel();
    return;
  }

  const member = membersMap[selectedId];
  if (!member) {
    resetMemberInfoPanel();
    return;
  }

  if (memberNameEl)
    memberNameEl.innerText =
      member.name || member.fullName || member.email || "Unnamed Member";
  if (memberIdEl)
    memberIdEl.innerText = member.memberId || member.memberCode || member.id;
  if (memberDeptEl)
    memberDeptEl.innerText = member.department || member.dept || "—";
  if (memberAvatar)
    memberAvatar.src = member.photoURL || member.avatar || defaultAvatar;

  await updateBorrowStats(selectedId);
});

// "issuedBooks" collection se selected member ke borrowed/overdue books count karna
async function updateBorrowStats(memberId) {
  if (borrowedCountEl) borrowedCountEl.innerText = "...";
  if (overdueCountEl) overdueCountEl.innerText = "...";

  try {
    const issuedRef = collection(db, "issuedBooks");
    const activeQuery = query(
      issuedRef,
      where("memberId", "==", memberId),
      where("status", "==", "Issued"),
    );

    const snapshot = await getDocs(activeQuery);

    let borrowed = 0;
    let overdue = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      borrowed++;

      const fineInfo = calculateFine(data.returnDate);
      if (fineInfo.fine > 0) {
        overdue++;
      }
    });

    if (borrowedCountEl) borrowedCountEl.innerText = borrowed;
    if (overdueCountEl) overdueCountEl.innerText = overdue;
  } catch (err) {
    console.error("Borrow stats error:", err);
    if (borrowedCountEl) borrowedCountEl.innerText = "0";
    if (overdueCountEl) overdueCountEl.innerText = "0";
  }
}

// ================= ISSUED BOOKS TABLE (Recent Records) =================
async function loadIssuedBooksTable() {
  if (!issuedBooksTable) return;

  issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">Loading issued records...</td></tr>`;

  try {
    const issuedRef = collection(db, "issuedBooks");
    const recentQuery = query(
      issuedRef,
      orderBy("createdAt", "desc"),
      limit(10),
    );

    const snapshot = await getDocs(recentQuery);

    if (snapshot.empty) {
      issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">No issued records yet.</td></tr>`;
      return;
    }

    let html = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const fineInfo = calculateFine(data.returnDate);
      const statusText =
        data.status === "Returned" ? "Returned" : fineInfo.status;
      const statusClass =
        data.status === "Returned"
          ? "status-returned"
          : fineInfo.fine > 0
            ? "status-overdue"
            : "status-ontime";

      html += `
                <tr>
                    <td>${escapeHTML(data.bookTitle || "—")}</td>
                    <td>${escapeHTML(data.memberName || "—")}</td>
                    <td>${escapeHTML(data.issueDate || "—")}</td>
                    <td>${escapeHTML(data.returnDate || "—")}</td>
                    <td class="text-center"><span class="status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
    });

    issuedBooksTable.innerHTML = html;
  } catch (err) {
    console.error("Issued table load error:", err);
    issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load issued records!</td></tr>`;
  }
}

// ================= ISSUE BOOK FORM SUBMIT =================
issueBookForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const memberId = memberSelect.value;
  const bookId = bookSelect.value;
  const issueDateVal = issueDateInput.value;
  const returnDateVal = returnDateInput.value;
  const remarksVal = remarksInput.value.trim();

  // ----- Validation -----
  if (!memberId) {
    showMessage("Pehle member select karein!", "danger");
    return;
  }
  if (!bookId) {
    showMessage("Pehle book select karein!", "danger");
    return;
  }
  if (!issueDateVal || !returnDateVal) {
    showMessage("Issue date aur Return date dono zaroori hain!", "danger");
    return;
  }

  const memberData = membersMap[memberId];
  const bookData = booksMap[bookId];

  if (!bookData || !memberData) {
    showMessage(
      "Member ya Book ka data nahi mila, page reload karein!",
      "danger",
    );
    return;
  }

  issueBtn.disabled = true;
  issueBtn.innerText = "Issuing...";

  try {
    const bookRef = doc(db, "books", bookId);

    // Transaction: stock check + decrement + issue record — sab ek saath atomic
    await runTransaction(db, async (transaction) => {
      const bookSnapshot = await transaction.get(bookRef);

      if (!bookSnapshot.exists()) {
        throw new Error("Book record not found.");
      }

      const liveBookData = bookSnapshot.data();
      const currentAvailable = Number(
        liveBookData.availableCopies ?? liveBookData.available ?? 0,
      );

      if (currentAvailable <= 0) {
        throw new Error("Ye book abhi available nahi hai!");
      }

      const newAvailable = currentAvailable - 1;

      transaction.update(bookRef, {
        availableCopies: newAvailable,
      });

      // "issuedBooks" collection mein naya record — return-book.js isi collection/format ko padhta hai
      const newIssueRef = doc(collection(db, "issuedBooks"));
      transaction.set(newIssueRef, {
        bookId: bookId,
        bookTitle: liveBookData.title || liveBookData.bookName || "Untitled",
        memberId: memberId,
        memberName:
          memberData.name ||
          memberData.fullName ||
          memberData.email ||
          "Unnamed Member",
        memberCode: memberData.memberId || memberData.memberCode || memberId,
        issueDate: issueDateVal, // "DD/MM/YYYY" string — return-book.js isi format ko parse karta hai
        returnDate: returnDateVal, // "DD/MM/YYYY" string
        remarks: remarksVal,
        status: "Issued",
        createdAt: serverTimestamp(),
      });
    });

    showMessage("Book successfully issue ho gayi!", "success");

    issueBookForm.reset();
    resetMemberInfoPanel();
    await loadBooks();
    await loadIssuedBooksTable();
  } catch (err) {
    console.error("Issue Book Error:", err);
    showMessage(err.message || "Book issue karne mein error aaya!", "danger");
  } finally {
    issueBtn.disabled = false;
    issueBtn.innerText = "Issue Book";
  }
});

// ================= FINE CALCULATION (return-book.js ke saath consistent) =================
function calculateFine(dueDateString) {
  if (!dueDateString) {
    return { fine: 0, overdueDays: 0, status: "On Time" };
  }

  const dueDate = parseDate(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dueDate || today <= dueDate) {
    return { fine: 0, overdueDays: 0, status: "On Time" };
  }

  const difference = today.getTime() - dueDate.getTime();
  const overdueDays = Math.ceil(difference / (1000 * 60 * 60 * 24));
  const fine = overdueDays * FINE_PER_DAY;

  return { fine, overdueDays, status: "Overdue" };
}

// DD/MM/YYYY string ko Date object mein parse karna
function parseDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split("/");
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

function showMessage(text, type = "success") {
  if (!issueMessage) return;
  issueMessage.innerHTML = `<div class="alert alert-${type} py-2">${escapeHTML(text)}</div>`;
  setTimeout(() => {
    issueMessage.innerHTML = "";
  }, 4000);
}


function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
