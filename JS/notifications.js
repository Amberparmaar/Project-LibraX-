
import { db, auth } from "./firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  timeAgo,
  markAsRead,
  markAllAsRead,
} from "./firebase/notifications-service.js";

const listEl = document.getElementById("notificationsList");
const markAllBtn = document.getElementById("markAllReadBtn");

const TYPE_STYLES = {
  info: { bg: "#eef2ff", color: "#3b82f6", icon: "fa-solid fa-book-open" },
  success: { bg: "#e6f7ed", color: "#10b981", icon: "fa-regular fa-circle-check" },
  warning: { bg: "#fff3e6", color: "#f97316", icon: "fa-regular fa-clock" },
  danger: { bg: "#fef2f2", color: "#ef4444", icon: "fa-solid fa-triangle-exclamation" },
};

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function render(items) {
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = `<p class="text-muted text-center py-4 mb-0">No notifications yet.</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((n) => {
      const s = TYPE_STYLES[n.type] || TYPE_STYLES.info;
      return `
      <div class="notification-card p-3 mb-3" data-id="${n.id}" data-read="${n.read}" style="cursor:pointer">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <div class="icon-box" style="background-color:${s.bg};color:${s.color}">
              <i class="${s.icon}"></i>
            </div>
            <div>
              <h6 class="mb-1 fw-semibold text-dark">${escapeHTML(n.message)}</h6>
              ${n.detail ? `<p class="mb-0 text-muted small">${escapeHTML(n.detail)}</p>` : ""}
            </div>
          </div>
          <div class="d-flex align-items-center gap-3 ms-2">
            <span class="text-muted small text-nowrap">${timeAgo(n.createdAt)}</span>
            <span class="unread-dot ${n.read ? "dot-read" : "dot-unread"}"></span>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../../login.html";
    return;

  }


  const q = query(collection(db, "notifications"), where("memberId", "==", user.uid));
  

  onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
         
          
      render(items);
    },
    (err) => {
      console.error("Notifications error:", err);
      if (listEl)
        listEl.innerHTML = `<p class="text-danger text-center py-4 mb-0">Failed to load notifications.</p>`;
    },
  );

  listEl?.addEventListener("click", (e) => {
    const card = e.target.closest(".notification-card");
    if (card && card.dataset.read === "false") markAsRead(card.dataset.id);
  });

  markAllBtn?.addEventListener("click", () => markAllAsRead(user.uid));
});
