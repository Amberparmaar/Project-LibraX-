import { db, auth } from '../../JS/firebase/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const notificationsContainer = document.querySelector('.notifications-container');

// Notification types ke hisab se icon aur background colors
function getNotificationStyle(type) {
    switch (type) {
        case 'due':
            return { bg: '#fff3e6', color: '#f97316', icon: 'fa-regular fa-clock' };
        case 'returned':
            return { bg: '#e6f7ed', color: '#10b981', icon: 'fa-regular fa-circle-check' };
        case 'issued':
            return { bg: '#eef2ff', color: '#3b82f6', icon: 'fa-solid fa-rotate-left' };
        case 'fine':
            return { bg: '#fef2f2', color: '#ef4444', icon: 'fa-solid fa-triangle-exclamation' };
        case 'announcement':
            return { bg: '#f3e8ff', color: '#a855f7', icon: 'fa-solid fa-book-open' };
        default:
            return { bg: '#eff6ff', color: '#3b82f6', icon: 'fa-regular fa-address-card' };
    }
}

// Firestore se Real-time notifications load karne ka function
function loadNotifications(userId) {
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        let cardsHTML = `
            <div class="d-flex align-items-center justify-content-between mb-4">
                <h5 class="fw-bold mb-0 text-dark">Notifications</h5>
            </div>
        `;

        if (snapshot.empty) {
            cardsHTML += `<p class="text-muted text-center py-4">No notifications found.</p>`;
        } else {
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const style = getNotificationStyle(data.type);
                const isUnread = !data.isRead;

                cardsHTML += `
                    <div class="notification-card p-3 mb-3" data-id="${docSnap.id}">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-3">
                                <div class="icon-box" style="background-color: ${style.bg}; color: ${style.color};">
                                    <i class="${style.icon}"></i>
                                </div>
                                <div>
                                    <h6 class="mb-1 fw-semibold text-dark">${data.title}</h6>
                                    <p class="mb-0 text-muted small">${data.message}</p>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-3 ms-2">
                                <span class="text-muted small text-nowrap">${data.timeAgo || ''}</span>
                                <span class="unread-dot ${isUnread ? 'dot-unread' : 'dot-read'}" 
                                      style="cursor: pointer;" 
                                      title="${isUnread ? 'Mark as Read' : 'Read'}"></span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        notificationsContainer.innerHTML = cardsHTML;
        attachUnreadClickEvents();
    }, (error) => {
        console.error("Error fetching notifications:", error);
    });
}

// Unread dot par click karne se Firestore document ko `isRead: true` karna
function attachUnreadClickEvents() {
    document.querySelectorAll('.unread-dot.dot-unread').forEach((dot) => {
        dot.addEventListener('click', async (e) => {
            const card = e.target.closest('.notification-card');
            const notifId = card.getAttribute('data-id');

            try {
                const notifRef = doc(db, "notifications", notifId);
                await updateDoc(notifRef, { isRead: true });
            } catch (err) {
                console.error("Error updating status:", err);
            }
        });
    });
}

// Authenticated user check
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadNotifications(user.uid);
    } else {
        console.log("No user logged in.");
    }
});