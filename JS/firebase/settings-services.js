// JS/firebase/settings-service.js
// Library rules (late fine per day, loan days) ek hi jagah se manage hote hain:
// Firestore document  ->  settings/library
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DEFAULT_SETTINGS = {
  finePerDay: 50, // Rs. per overdue day
  loanDays: 14, // default issue period
  dueSoonDays: 3, // kitne din pehle "due soon" reminder
};

let cache = null;

export async function getLibrarySettings(force = false) {
  if (cache && !force) return cache;

  try {
    const snap = await getDoc(doc(db, "settings", "library"));
    cache = snap.exists()
      ? { ...DEFAULT_SETTINGS, ...snap.data() }
      : { ...DEFAULT_SETTINGS };
  } catch (err) {
    console.error("Settings load error, defaults use ho rahe hain:", err);
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

export async function saveLibrarySettings({ finePerDay, loanDays, dueSoonDays }) {
  const data = {
    finePerDay: Math.max(0, Number(finePerDay) || 0),
    loanDays: Math.max(1, Number(loanDays) || DEFAULT_SETTINGS.loanDays),
    dueSoonDays: Math.max(1, Number(dueSoonDays) || DEFAULT_SETTINGS.dueSoonDays),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "settings", "library"), data, { merge: true });
  cache = { ...DEFAULT_SETTINGS, ...data };
  return cache;
}
