import { db, auth } from '../JS/firebase/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const tableBody = document.getElementById('myBooksTableBody');
const logoutBtn = document.getElementById('logoutBtn');

// Date Formatter Helper
function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Status Badges Generator
function getStatusBadge(status, dueDateObj) {
    if (status === 'returned') {
        return `<span class="badge bg-secondary-subtle text-secondary fw-semibold px-3 py-2 rounded-2">Returned</span>`;
    }

    const today = new Date();
    const dueDate = dueDateObj?.toDate ? dueDateObj.toDate() : new Date(dueDateObj);

    if (dueDate < today) {
        return `<span class="badge bg-danger-subtle text-danger fw-semibold px-3 py-2 rounded-2">Overdue</span>`;
    }

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
        return `<span class="badge bg-warning-subtle text-warning fw-semibold px-3 py-2 rounded-2">Due Soon</span>`;
    }

    return `<span class="badge bg-success-subtle text-success fw-semibold px-3 py-2 rounded-2">Issued</span>`;
}

// Fetch Logged-In User's Issued Books from Firestore
function loadUserIssuedBooks(userId) {
    const q = query(
        collection(db, "issued_books"),
        where("userId", "==", userId)
    );

    onSnapshot(q, (snapshot) => {
        if (!tableBody) return;

        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">No issued books found.</td>
                </tr>`;
            return;
        }

        let rowsHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const bookTitle = data.bookTitle || 'Untitled Book';
            const issueDate = formatDate(data.issueDate);
            const dueDate = formatDate(data.dueDate);
            const badge = getStatusBadge(data.status, data.dueDate);
            const fine = data.fine ? `Rs. ${data.fine}` : 'Rs. 0';

            rowsHTML += `
                <tr>
                    <td class="py-3 px-3 fw-bold text-secondary">${bookTitle}</td>
                    <td class="py-3 px-3 text-secondary">${issueDate}</td>
                    <td class="py-3 px-3 text-secondary">${dueDate}</td>
                    <td class="py-3 px-3">${badge}</td>
                    <td class="py-3 px-3 text-secondary">${fine}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = rowsHTML;
    }, (error) => {
        console.error("Error fetching books:", error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-danger">Failed to load issued books. Check Firestore Index / Security Rules.</td>
                </tr>`;
        }
    });
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
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "../../login.html";
        }).catch((err) => {
            console.error("Logout Error:", err);
        });
    });
}