import { db, auth } from './firebase/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const userProfileImg = document.getElementById('userProfileImg');
const headerUserName = document.getElementById('headerUserName');
const welcomeHeading = document.getElementById('welcomeHeading');

const cardBorrowedCount = document.getElementById('cardBorrowedCount');
const cardDueSoonCount = document.getElementById('cardDueSoonCount');
const cardOverdueCount = document.getElementById('cardOverdueCount');
const cardTotalFine = document.getElementById('cardTotalFine');

const tableBody = document.getElementById('dashboardBooksTableBody');
const notificationsContainer = document.getElementById('dashboardNotificationsContainer');
const logoutBtn = document.getElementById('logoutBtn');

// Helper: Date Formatter
function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Fetch Profile Information
async function loadUserProfile(userId, authUser) {
    try {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        let fullName = authUser.displayName || 'Member';
        let profilePic = authUser.photoURL || '../../images/profile.jpg';

        if (userSnap.exists()) {
            const userData = userSnap.data();
            fullName = userData.fullName || userData.name || fullName;
            if (userData.photoURL || userData.profileImage) {
                profilePic = userData.photoURL || userData.profileImage;
            }
        }

        if (headerUserName) headerUserName.textContent = fullName;
        if (welcomeHeading) welcomeHeading.textContent = `Welcome Back, ${fullName}`;
        if (userProfileImg) userProfileImg.src = profilePic;

    } catch (err) {
        console.error("Error loading user profile:", err);
    }
}

// Fetch Issued Books and Calculate Stats
function loadDashboardData(userId) {
    const q = query(
        collection(db, "issued_books"),
        where("userId", "==", userId)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            if (cardBorrowedCount) cardBorrowedCount.textContent = '0';
            if (cardDueSoonCount) cardDueSoonCount.textContent = '0';
            if (cardOverdueCount) cardOverdueCount.textContent = '0';
            if (cardTotalFine) cardTotalFine.textContent = 'Rs. 0';

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
        let rowsHTML = '';

        const today = new Date();

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Only consider currently issued or overdue items for counts
            if (data.status !== 'returned') {
                totalBorrowed++;

                const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (dueDate < today) {
                    overdueCount++;
                } else if (diffDays <= 3 && diffDays >= 0) {
                    dueSoonCount++;
                }

                if (data.fine) {
                    totalFine += Number(data.fine) || 0;
                }
            }

            // Render Table Data (Limit preview dynamically)
            const bookTitle = data.bookTitle || 'Untitled Book';
            const issueDate = formatDate(data.issueDate);
            const dueDateFormatted = formatDate(data.dueDate);

            let statusTag = `<span class="status issued">Issued</span>`;
            if (data.status === 'returned') {
                statusTag = `<span class="badge bg-secondary">Returned</span>`;
            } else {
                const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
                if (dueDate < today) {
                    statusTag = `<span class="status overdue">Overdue</span>`;
                } else {
                    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 3) statusTag = `<span class="status due">Due Soon</span>`;
                }
            }

            rowsHTML += `
                <tr>
                    <td>${bookTitle}</td>
                    <td>${issueDate}</td>
                    <td>${dueDateFormatted}</td>
                    <td>${statusTag}</td>
                </tr>
            `;
        });

        // Update Stats Counters
        if (cardBorrowedCount) cardBorrowedCount.textContent = totalBorrowed;
        if (cardDueSoonCount) cardDueSoonCount.textContent = dueSoonCount;
        if (cardOverdueCount) cardOverdueCount.textContent = overdueCount;
        if (cardTotalFine) cardTotalFine.textContent = `Rs. ${totalFine}`;

        // Render Table Rows
        if (tableBody) tableBody.innerHTML = rowsHTML;

    }, (err) => {
        console.error("Error loading dashboard data:", err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-3 text-danger">Failed to load books. Check Firestore Index/Rules.</td>
                </tr>`;
        }
    });
}

// Fetch Notifications Dynamic List
function loadNotifications(userId) {
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(5)
    );

    onSnapshot(q, (snapshot) => {
        if (!notificationsContainer) return;

        if (snapshot.empty) {
            notificationsContainer.innerHTML = `<p class="text-muted text-center py-3 mb-0">No new notifications.</p>`;
            return;
        }

        let notifHTML = '';
        snapshot.forEach((docSnap) => {
            const notif = docSnap.data();
            const message = notif.message || 'Notification received.';
            const timeAgo = notif.timeAgo || 'Recently';
            const typeClass = notif.type === 'warning' ? 'text-warning' : (notif.type === 'success' ? 'text-success' : 'text-primary');

            notifHTML += `
                <div class="notification-item">
                    <i class="fa-solid fa-circle ${typeClass}"></i>
                    <div>
                        <h6>${message}</h6>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            `;
        });

        notificationsContainer.innerHTML = notifHTML;

    }, (err) => {
        console.warn("Notifications collection error (Optional index required):", err);
        if (notificationsContainer) {
            notificationsContainer.innerHTML = `<p class="text-muted text-center py-3 mb-0">No notifications found.</p>`;
        }
    });
}

// Authentication Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserProfile(user.uid, user);
        loadDashboardData(user.uid);
        loadNotifications(user.uid);
    } else {
        window.location.href = "../../login.html";
    }
});

// Handle Logout
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