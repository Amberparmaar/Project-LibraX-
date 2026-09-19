import { db } from "../JS/firebase/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ================= ELEMENT REFERENCES =================
const scannerError = document.getElementById("scannerError");
const scannerStatus = document.getElementById("scannerStatus");
const readerEl = document.getElementById("reader");

const startScannerBtn = document.getElementById("startScannerBtn");
const stopScannerBtn = document.getElementById("stopScannerBtn");
const clearResultBtn = document.getElementById("clearResultBtn");

const emptyResult = document.getElementById("emptyResult");
const memberResult = document.getElementById("memberResult");

const memberPhoto = document.getElementById("memberPhoto");
const memberNameEl = document.getElementById("memberName");
const memberIdEl = document.getElementById("memberId");
const memberStatusEl = document.getElementById("memberStatus");
const memberDepartmentEl = document.getElementById("memberDepartment");
const memberEmailEl = document.getElementById("memberEmail");
const memberPhoneEl = document.getElementById("memberPhone");
const memberBorrowedEl = document.getElementById("memberBorrowed");
const memberOverdueEl = document.getElementById("memberOverdue");
const memberFineEl = document.getElementById("memberFine");

const defaultPhoto = "../../images/default-profile.png";
const FINE_PER_DAY = 50;

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  scannerError,
  scannerStatus,
  readerEl,
  startScannerBtn,
  stopScannerBtn,
  clearResultBtn,
  emptyResult,
  memberResult,
  memberPhoto,
  memberNameEl,
  memberIdEl,
  memberStatusEl,
  memberDepartmentEl,
  memberEmailEl,
  memberPhoneEl,
  memberBorrowedEl,
  memberOverdueEl,
  memberFineEl,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

let html5QrCode = null;
let isScanning = false;
let isProcessingScan = false;

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Html5Qrcode === "undefined") {
    showScannerError(
      "QR Scanner library load nahi hui. Internet connection check karein.",
    );
    if (startScannerBtn) startScannerBtn.disabled = true;
    return;
  }
  html5QrCode = new Html5Qrcode("reader");
  console.log("✅ QR Scanner initialized");
});

// ================= START SCANNER =================
startScannerBtn?.addEventListener("click", async () => {
  if (!html5QrCode || isScanning) return;

  startScannerBtn.disabled = true;

  hideScannerError();
  setStatus("Requesting camera access...");

  try {
    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
    };

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure,
    );

    isScanning = true;
    setStatus("Scanning... QR code ko frame ke andar rakhein");

    startScannerBtn.style.display = "none";
    stopScannerBtn.style.display = "block";

    console.log("📷 Scanner started successfully");
  } catch (err) {
    console.error("Camera start error:", err);
    showScannerError(
      "Camera start nahi ho saka. Permission allow karein ya check karein ke koi doosri app camera use to nahi kar rahi.",
    );
    setStatus("Click below to start camera");
  } finally {
    startScannerBtn.disabled = false;
  }
});

// ================= STOP SCANNER =================
stopScannerBtn?.addEventListener("click", async () => {
  await stopScanning();
});

async function stopScanning() {
  if (!html5QrCode || !isScanning) return;

  try {
    await html5QrCode.stop();
    html5QrCode.clear();
  } catch (err) {
    console.warn("Scanner stop warning:", err);
  }

  isScanning = false;
  setStatus("Camera stopped");

  if (startScannerBtn) startScannerBtn.style.display = "block";
  if (stopScannerBtn) stopScannerBtn.style.display = "none";

  console.log("🛑 Scanner stopped");
}

// ================= SCAN CALLBACKS =================
function onScanFailure() {}

async function onScanSuccess(decodedText) {
  if (isProcessingScan) return;
  isProcessingScan = true;

  console.log("📷 QR Decoded Raw Text:", decodedText);

  setStatus("Member dhoonda ja raha hai...");

  await stopScanning();

  try {
    const memberData = await resolveMemberFromQR(decodedText);

    if (!memberData) {
      showScannerError(
        "Ye QR kisi member se match nahi hua. Dobara scan karein.",
      );
      setStatus("Click below to start camera");
      isProcessingScan = false;
      return;
    }

    console.log("✅ Member Found:", memberData);

    await displayMemberResult(memberData);
    setStatus("Click below to start camera");
  } catch (err) {
    console.error("Scan processing error:", err);
    showScannerError("Scan process karne mein masla aaya. Dobara try karein.");
    setStatus("Click below to start camera");
  } finally {
    isProcessingScan = false;
  }
}

async function resolveMemberFromQR(decodedText) {
  let docId = null;
  let memberCode = null;

  try {
    const parsed = JSON.parse(decodedText);
    docId = parsed.id || null;
    memberCode = parsed.memberId || null;
    console.log("🔍 Parsed as JSON:", { docId, memberCode }); // DEBUG
  } catch {
    memberCode = decodedText.trim();
    console.log("🔍 Not JSON, treating as plain text memberCode:", memberCode); // DEBUG
  }

  if (docId) {
    try {
      const userSnap = await getDoc(doc(db, "users", docId));
      console.log(
        "🔍 Direct doc lookup with ID:",
        docId,
        "— found:",
        userSnap.exists(),
      ); // DEBUG
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
    } catch (err) {
      console.warn("Direct doc lookup error:", err);
    }
  }

  // 2. memberId/memberCode field se query karo
  if (memberCode) {
    const usersRef = collection(db, "users");

    try {
      let snapshot = await getDocs(
        query(usersRef, where("memberId", "==", memberCode)),
      );
      console.log(
        `🔍 Query where memberId == "${memberCode}" — results:`,
        snapshot.size,
      ); // DEBUG

      if (snapshot.empty) {
        snapshot = await getDocs(
          query(usersRef, where("memberCode", "==", memberCode)),
        );
        console.log(
          `🔍 Query where memberCode == "${memberCode}" — results:`,
          snapshot.size,
        ); // DEBUG
      }

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
      }

      const directSnap = await getDoc(doc(db, "users", memberCode));
      console.log(
        `🔍 Direct doc lookup with code "${memberCode}" — found:`,
        directSnap.exists(),
      ); // DEBUG
      if (directSnap.exists()) {
        return { id: directSnap.id, ...directSnap.data() };
      }
    } catch (err) {
      console.error("Query error:", err);
    }
  }

  console.warn(
    "❌ Koi lookup method member match nahi kar saka. 'users' collection mein data verify karo.",
  ); // DEBUG
  return null;
}

// ================= DISPLAY MEMBER RESULT =================
async function displayMemberResult(member) {
  const name =
    member.name || member.fullName || member.email || "Unnamed Member";
  const memberCode = member.memberId || member.memberCode || member.id;
  const status =
    member.status || (member.isActive === false ? "Inactive" : "Active");

  if (memberNameEl) memberNameEl.innerText = name;
  if (memberIdEl) memberIdEl.innerText = memberCode;
  if (memberDepartmentEl)
    memberDepartmentEl.innerText = member.department || member.dept || "—";
  if (memberEmailEl) memberEmailEl.innerText = member.email || "—";
  if (memberPhoneEl)
    memberPhoneEl.innerText = member.phone || member.phoneNumber || "—";

  if (memberStatusEl) {
    memberStatusEl.innerText = status === "Active" ? "Active Member" : status;
    memberStatusEl.className =
      status === "Active"
        ? "badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-2 small fw-semibold"
        : "badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-2 small fw-semibold";
  }

  if (memberPhoto) {
    memberPhoto.src = member.photoURL || member.avatar || defaultPhoto;
    memberPhoto.onerror = () => {
      memberPhoto.src = defaultPhoto;
    };
  }

  // Borrowed / Overdue / Fine stats — "issuedBooks" collection se live calculate
  await loadMemberStats(member.id);

  emptyResult?.classList.add("d-none");
  memberResult?.classList.remove("d-none");
}

// ================= LOAD MEMBER STATS =================
async function loadMemberStats(memberId) {
  if (memberBorrowedEl) memberBorrowedEl.innerText = "...";
  if (memberOverdueEl) memberOverdueEl.innerText = "...";
  if (memberFineEl) memberFineEl.innerText = "...";

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
    let totalFine = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      borrowed++;

      const fineInfo = calculateFine(data.returnDate);
      if (fineInfo.fine > 0) {
        overdue++;
        totalFine += fineInfo.fine;
      }
    });

    if (memberBorrowedEl) memberBorrowedEl.innerText = borrowed;
    if (memberOverdueEl) memberOverdueEl.innerText = overdue;
    if (memberFineEl)
      memberFineEl.innerText = `Rs. ${totalFine.toLocaleString()}`;

    console.log("📊 Member stats loaded:", { borrowed, overdue, totalFine });
  } catch (err) {
    console.error("Member stats load error:", err);
    if (memberBorrowedEl) memberBorrowedEl.innerText = "0";
    if (memberOverdueEl) memberOverdueEl.innerText = "0";
    if (memberFineEl) memberFineEl.innerText = "Rs. 0";
  }
}

// ================= FINE CALCULATION (issue-book.js / return-book.js ke saath consistent) =================
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

// ================= CLEANUP: CAMERA PAGE CHHODNE PE BAND HO =================

window.addEventListener("beforeunload", () => {
  if (isScanning && html5QrCode) {
    html5QrCode.stop().catch(() => {});
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isScanning) {
    stopScanning();
  }
});

// ================= CLEAR RESULT =================
clearResultBtn?.addEventListener("click", () => {
  memberResult?.classList.add("d-none");
  emptyResult?.classList.remove("d-none");
  hideScannerError();
  console.log("🔄 Results cleared");
});

// ================= UI HELPERS =================
function setStatus(text) {
  if (scannerStatus) scannerStatus.innerText = text;
}

function showScannerError(message) {
  if (!scannerError) return;
  scannerError.innerText = message;
  scannerError.classList.remove("d-none");
  console.error("❌ Scanner Error:", message);
}

function hideScannerError() {
  if (!scannerError) return;
  scannerError.innerText = "";
  scannerError.classList.add("d-none");
}
