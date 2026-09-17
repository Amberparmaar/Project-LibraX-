// ======================================================
// ISSUE BOOK - ALL FUNCTIONALITY
// ======================================================

// Firebase Imports
import { db } from "../../JS/firebase/firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    runTransaction,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ======================================================
// DOM ELEMENTS
// ======================================================
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const issueBookForm = document.getElementById("issueBookForm");
const selectMember = document.getElementById("selectMember");
const selectBook = document.getElementById("selectBook");

const issueDateInput = document.getElementById("issueDate");
const returnDateInput = document.getElementById("returnDate");

const issueDateIcon = document.getElementById("issueDateIcon");
const returnDateIcon = document.getElementById("returnDateIcon");

const remarksInput = document.getElementById("remarks");
const issueBtn = document.getElementById("issueBtn");
const issueMessage = document.getElementById("issueMessage");

const memberAvatar = document.getElementById("memberAvatar");
const memberName = document.getElementById("memberName");
const memberId = document.getElementById("memberId");
const memberDept = document.getElementById("memberDept");

const borrowedCount = document.getElementById("borrowedCount");
const overdueCount = document.getElementById("overdueCount");

const issuedBooksTable = document.getElementById("issuedBooksTable");

// ======================================================
// SIDEBAR
// ======================================================
if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    });
}

// ======================================================
// FLATPICKR INITIALIZATION
// ======================================================
let issuePicker;
let returnPicker;

function initializeCalendar() {
    issuePicker = flatpickr("#issueDate", {
        dateFormat: "d/m/Y",
        allowInput: true,
        defaultDate: new Date(),
        onChange: function (selectedDates) {
            if (selectedDates.length > 0) {
                returnPicker.set("minDate", selectedDates[0]);
            }
        }
    });

    returnPicker = flatpickr("#returnDate", {
        dateFormat: "d/m/Y",
        allowInput: true
    });

    if (issueDateIcon) issueDateIcon.addEventListener("click", () => issuePicker.open());
    if (returnDateIcon) returnDateIcon.addEventListener("click", () => returnPicker.open());
}

// ======================================================
// MEMBERS & BOOKS DATA FETCHING
// ======================================================
let members = [];
let books = [];

async function loadMembers() {
    try {
        selectMember.innerHTML = `<option value="">Select Member</option>`;
        const snapshot = await getDocs(collection(db, "members"));

        members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (members.length === 0) {
            selectMember.innerHTML = `<option value="">No members found</option>`;
            return;
        }

        members.forEach(member => {
            const option = document.createElement("option");
            option.value = member.id;
            option.textContent = `${member.name || "Unnamed"} (${member.memberId || "No ID"})`;
            selectMember.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading members:", error);
        selectMember.innerHTML = `<option value="">Unable to load members</option>`;
        showMessage("Unable to load members list.", "danger");
    }
}

async function loadBooks() {
    try {
        selectBook.innerHTML = `<option value="">Select Book</option>`;
        
        // Firestore filter query for better performance
        const q = query(collection(db, "books"), where("availableCopies", ">", 0));
        const snapshot = await getDocs(q);

        books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (books.length === 0) {
            selectBook.innerHTML = `<option value="">No available books</option>`;
            return;
        }

        books.forEach(book => {
            const option = document.createElement("option");
            option.value = book.id;
            option.textContent = `${book.title || "Untitled"} - ${book.author || "Unknown"} (${book.availableCopies} available)`;
            selectBook.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading books:", error);
        selectBook.innerHTML = `<option value="">Unable to load books</option>`;
        showMessage("Unable to load books list.", "danger");
    }
}

// ======================================================
// MEMBER SELECTION & STATS (OPTIMIZED)
// ======================================================
selectMember.addEventListener("change", async function () {
    const selectedMemberId = this.value;

    if (!selectedMemberId) {
        resetMemberInfo();
        return;
    }

    const member = members.find(item => item.id === selectedMemberId);
    if (!member) {
        resetMemberInfo();
        return;
    }

    memberName.textContent = member.name || "Unknown Member";
    memberId.textContent = member.memberId || "—";
    memberDept.textContent = member.department || "—";
    memberAvatar.src = member.photoURL || "https://via.placeholder.com/60";

    await loadMemberStats(selectedMemberId);
});

async function loadMemberStats(selectedMemberId) {
    try {
        borrowedCount.textContent = "0";
        overdueCount.textContent = "0";

        // Query only active issued books for this specific member
        const q = query(
            collection(db, "issuedBooks"),
            where("memberId", "==", selectedMemberId),
            where("status", "==", "Issued")
        );

        const snapshot = await getDocs(q);
        
        let borrowed = snapshot.size;
        let overdue = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        snapshot.forEach((document) => {
            const data = document.data();
            if (data.returnDate) {
                const dueDate = parseDate(data.returnDate);
                if (dueDate && dueDate < today) overdue++;
            }
        });

        borrowedCount.textContent = borrowed;
        overdueCount.textContent = overdue;

    } catch (error) {
        console.error("Error loading member stats:", error);
        borrowedCount.textContent = "0";
        overdueCount.textContent = "0";
    }
}

// ======================================================
// ISSUE BOOK SUBMISSION
// ======================================================
issueBookForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessage();

    const selectedMemberId = selectMember.value;
    const selectedBookId = selectBook.value;
    const issueDateStr = issueDateInput.value.trim();
    const returnDateStr = returnDateInput.value.trim();
    const remarks = remarksInput.value.trim();

    if (!selectedMemberId || !selectedBookId || !issueDateStr || !returnDateStr) {
        showMessage("Please complete all required fields.", "danger");
        return;
    }

    const issueDateObject = issuePicker.selectedDates[0] || parseDate(issueDateStr);
    const returnDateObject = returnPicker.selectedDates[0] || parseDate(returnDateStr);

    if (!issueDateObject || !returnDateObject) {
        showMessage("Please select valid dates.", "danger");
        return;
    }

    if (returnDateObject < issueDateObject) {
        showMessage("Return date cannot be earlier than issue date.", "danger");
        return;
    }

    const selectedMember = members.find(m => m.id === selectedMemberId);
    const selectedBook = books.find(b => b.id === selectedBookId);

    if (!selectedMember || !selectedBook) {
        showMessage("Selected record details missing.", "danger");
        return;
    }

    issueBtn.disabled = true;
    issueBtn.textContent = "Issuing...";

    try {
        const bookRef = doc(db, "books", selectedBookId);
        const issueRef = doc(collection(db, "issuedBooks"));

        await runTransaction(db, async (transaction) => {
            const bookSnapshot = await transaction.get(bookRef);

            if (!bookSnapshot.exists()) {
                throw new Error("Book does not exist.");
            }

            const bookData = bookSnapshot.data();
            const availableCopies = Number(bookData.availableCopies || 0);

            if (availableCopies <= 0) {
                throw new Error("This book is out of stock.");
            }

            const newAvailableCopies = availableCopies - 1;

            // Updates & Writes
            transaction.update(bookRef, {
                availableCopies: newAvailableCopies,
                available: newAvailableCopies > 0
            });

            transaction.set(issueRef, {
                memberId: selectedMemberId,
                memberName: selectedMember.name || "",
                memberCode: selectedMember.memberId || "",
                bookId: selectedBookId,
                bookTitle: bookData.title || "",
                bookAuthor: bookData.author || "",
                issueDate: issueDateStr,
                returnDate: returnDateStr,
                remarks: remarks,
                status: "Issued",
                createdAt: serverTimestamp()
            });
        });

        showMessage("Book issued successfully!", "success");

        issueBookForm.reset();
        issuePicker.setDate(new Date());
        resetMemberInfo();

        await Promise.all([loadMembers(), loadBooks(), loadIssuedBooks()]);

    } catch (error) {
        console.error("Error issuing book:", error);
        showMessage(error.message || "Failed to process issue request.", "danger");
    } finally {
        issueBtn.disabled = false;
        issueBtn.textContent = "Issue Book";
    }
});

// ======================================================
// RECENT ISSUED BOOKS TABLE
// ======================================================
async function loadIssuedBooks() {
    try {
        issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">Loading...</td></tr>`;

        const issuedQuery = query(
            collection(db, "issuedBooks"),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        const snapshot = await getDocs(issuedQuery);

        if (snapshot.empty) {
            issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">No issued books found.</td></tr>`;
            return;
        }

        issuedBooksTable.innerHTML = "";

        snapshot.forEach((document) => {
            const data = document.data();
            const row = document.createElement("tr");
            const status = data.status || "Issued";

            row.innerHTML = `
                <td class="fw-medium text-dark">${escapeHTML(data.bookTitle || "Unknown Book")}</td>
                <td class="text-secondary">${escapeHTML(data.memberName || "Unknown Member")}</td>
                <td class="text-secondary">${escapeHTML(data.issueDate || "—")}</td>
                <td class="text-secondary">${escapeHTML(data.returnDate || "—")}</td>
                <td class="text-center">
                    <span class="status-badge status-issued">${escapeHTML(status)}</span>
                </td>
            `;

            issuedBooksTable.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading issued books:", error);
        issuedBooksTable.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Unable to load table data.</td></tr>`;
    }
}

// ======================================================
// HELPERS
// ======================================================
function resetMemberInfo() {
    memberAvatar.src = "https://via.placeholder.com/60";
    memberName.textContent = "Select Member";
    memberId.textContent = "—";
    memberDept.textContent = "—";
    borrowedCount.textContent = "0";
    overdueCount.textContent = "0";
}

function parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;

    const date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    date.setHours(0, 0, 0, 0);
    return date;
}

function showMessage(message, type) {
    issueMessage.innerHTML = `<div class="alert alert-${type}" role="alert">${escapeHTML(message)}</div>`;
    setTimeout(clearMessage, 4000);
}

function clearMessage() {
    issueMessage.innerHTML = "";
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

// ======================================================
// INITIALIZATION
// ======================================================
async function initializePage() {
    try {
        initializeCalendar();
        await Promise.all([loadMembers(), loadBooks(), loadIssuedBooks()]);
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

initializePage();