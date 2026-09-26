// JS/admin-notifications.js
import { db } from "./firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { timeAgo } from "./firebase/notifications-service.js"; 

const notificationBell = document.getElementById("notificationBell");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationsList = document.getElementById("adminNotificationsList");
const notificationCount = document.getElementById("notificationCount");


const q = query(
  collection(db, "notifications"),
  where("read", "==", false)
);

onSnapshot(q, (snap) => {
  const items = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // Count
  notificationCount.textContent = items.length;
  notificationCount.style.display = items.length > 0 ? "flex" : "none";

  // Render
  if (!notificationsList) return;
  
  if (items.length === 0) {
    notificationsList.innerHTML = `
      <div class="text-center py-4 text-muted">
        <p>No notification received</p>
      </div>
    `;
    return;
  }

  notificationsList.innerHTML = items
    .map((n) => `
      <div class="notification-item p-3 unread" data-id="${n.id}" data-read="${n.read}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <p class="mb-1 fw-semibold">${n.message}</p>
            <small class="text-muted">${n.detail || ""}</small>
            <br>
            <small class="text-muted">${timeAgo(n.createdAt)}</small>
          </div>
          <span class="badge bg-primary">New</span>
        </div>
      </div>
    `)
    .join("");

  // Mark as read on click
  document.querySelectorAll(".notification-item").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id;
      await updateDoc(doc(db, "notifications", id), { read: true });
    });
  });
});

// Bell icon click
notificationBell?.addEventListener("click", () => {
  notificationDropdown.style.display =
    notificationDropdown.style.display === "none" ? "block" : "none";
});

// Close button
document.getElementById("closeNotifications")?.addEventListener("click", () => {
  notificationDropdown.style.display = "none";
});