// JS/firebase/notifications-service.js
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  doc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// type: "info" | "success" | "warning" | "danger"
// key: agar diya to same key ki notification dobara create nahi hogi (duplicate se bachao)
export async function createNotification({
  memberId,
  type = "info",
  message,
  detail = "",
  key = null,
}) {
  if (!memberId || !message) return { success: false, error: "missing data" };

  const payload = {
    memberId,
    type,
    message,
    detail,
    read: false,
    createdAt: serverTimestamp(),
  };

  try {
    if (key) {
      const ref = doc(db, "notifications", key);
      const existing = await getDoc(ref);
      if (existing.exists()) return { success: true, skipped: true };
      await setDoc(ref, payload);
    } else {
      await addDoc(collection(db, "notifications"), payload);
    }
    return { success: true };
  } catch (err) {
    // Notification fail hone se main kaam (issue/return) nahi rukna chahiye
    console.error("Notification create error:", err);
    return { success: false, error: err.message };
  }
}

export async function markAsRead(notificationId) {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (err) {
    console.error("Mark read error:", err);
  }
}

export async function markAllAsRead(memberId) {
  try {
    const q = query(
      collection(db, "notifications"),
      where("memberId", "==", memberId),
      where("read", "==", false),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
  } catch (err) {
    console.error("Mark all read error:", err);
  }
}

// Firestore Timestamp -> "5 minutes ago"
export function timeAgo(value) {
  const date =
    value && typeof value.toDate === "function" ? value.toDate() : null;
  if (!date) return "Just now";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function parseDMY(str) {
  if (!str || typeof str !== "string") return null;
  const p = str.split("/");
  if (p.length !== 3) return null;
  const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  d.setHours(0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// Member ki currently-issued books dekh kar due-soon / overdue notifications banata hai.
// Har book ke liye sirf ek baar (key ki wajah se), isliye dashboard kitni bar bhi load ho, duplicate nahi.
export async function generateDueNotifications(memberId, issuedRecords, settings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rec of issuedRecords) {
    if (rec.status !== "Issued") continue;
    const due = parseDMY(rec.returnDate);
    if (!due) continue;

    const diffDays = Math.ceil((due - today) / 86400000);

    if (diffDays < 0) {
      const days = Math.abs(diffDays);
      await createNotification({
        memberId,
        type: "danger",
        message: `"${rec.bookTitle}" is overdue by ${days} day${days > 1 ? "s" : ""}.`,
        detail: `Fine: Rs. ${days * settings.finePerDay} (Rs. ${settings.finePerDay}/day). Please return it soon.`,
        key: `overdue_${rec.id}`,
      });
    } else if (diffDays <= settings.dueSoonDays) {
      await createNotification({
        memberId,
        type: "warning",
        message: `"${rec.bookTitle}" is due ${diffDays === 0 ? "today" : `in ${diffDays} day${diffDays > 1 ? "s" : ""}`}.`,
        detail: `Return by ${rec.returnDate} to avoid Rs. ${settings.finePerDay}/day late fine.`,
        key: `duesoon_${rec.id}`,
      });
    }
  }
}
