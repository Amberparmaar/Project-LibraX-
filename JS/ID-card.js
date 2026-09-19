// ================= IMPORTS =================
import { auth, db } from "../JS/firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ================= ELEMENT REFERENCES =================
const membershipCard = document.getElementById("membershipCard");
const cardAvatar = document.getElementById("cardAvatar");
const memberNameEl = document.getElementById("memberName");
const memberIdEl = document.getElementById("memberId");
const memberDepartmentEl = document.getElementById("memberDepartment");
const memberEmailEl = document.getElementById("memberEmail");
const memberPhoneEl = document.getElementById("memberPhone");
const memberJoinDateEl = document.getElementById("memberJoinDate");
const memberStatusEl = document.getElementById("memberStatus");
const qrcodeContainer = document.getElementById("qrcode");

const downloadCardBtn = document.getElementById("downloadCardBtn");
const printCardBtn = document.getElementById("printCardBtn");

const defaultAvatar = "https://via.placeholder.com/140?text=Profile";

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  membershipCard,
  cardAvatar,
  memberNameEl,
  memberIdEl,
  memberDepartmentEl,
  memberEmailEl,
  memberPhoneEl,
  memberJoinDateEl,
  memberStatusEl,
  qrcodeContainer,
  downloadCardBtn,
  printCardBtn,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

// Current member ka data yahan store hota hai (PDF filename, QR content ke liye)
let currentMemberData = null;

// ================= AUTH STATE: LOGGED-IN MEMBER KA DATA LOAD KARNA =================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Login nahi hai — login page pe bhej do
    window.location.href = "../auth/login.html";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showLoadError("Member ka record nahi mila. Admin se contact karein.");
      return;
    }

    const data = { id: userSnap.id, ...userSnap.data() };
    currentMemberData = data;

    renderMemberInfo(data);
    generateQRCode(data);
  } catch (err) {
    console.error("Member data load error:", err);
    showLoadError("Data load karne mein masla aaya. Page refresh karein.");
  }
});

// ================= RENDER MEMBER INFO ON CARD =================
function renderMemberInfo(data) {
  const name = data.name || data.fullName || data.email || "Unnamed Member";
  const memberCode = data.memberId || data.memberCode || data.id;
  const department = data.department || data.dept || "—";
  const email = data.email || "—";
  const phone = data.phone || data.phoneNumber || "—";
  const status =
    data.status || (data.isActive === false ? "Inactive" : "Active");

  if (memberNameEl) memberNameEl.innerText = name;
  if (memberIdEl) memberIdEl.innerText = memberCode;
  if (memberDepartmentEl) memberDepartmentEl.innerText = department;
  if (memberEmailEl) memberEmailEl.innerText = email;
  if (memberPhoneEl) memberPhoneEl.innerText = phone;
  if (memberJoinDateEl)
    memberJoinDateEl.innerText = formatJoinDate(
      data.createdAt || data.joinDate || data.registrationDate,
    );

  if (memberStatusEl) {
    memberStatusEl.innerText =
      status === "Active" ? "● Active Member" : "● " + status;
    memberStatusEl.className =
      status === "Active" ? "text-success fw-bold" : "text-danger fw-bold";
  }

  if (cardAvatar) {
    cardAvatar.src = data.photoURL || data.avatar || defaultAvatar;
    cardAvatar.onerror = () => {
      cardAvatar.src = defaultAvatar;
    };
  }
}

// Firestore Timestamp / string / Date — sab ko DD/MM/YYYY mein convert karna
function formatJoinDate(value) {
  if (!value) return "—";

  let dateObj;
  if (typeof value.toDate === "function") {
    dateObj = value.toDate();
  } else if (value.seconds) {
    dateObj = new Date(value.seconds * 1000);
  } else {
    dateObj = new Date(value);
  }

  if (isNaN(dateObj)) return "—";
  return dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

// ================= QR CODE GENERATION =================
function generateQRCode(data) {
  if (!qrcodeContainer) return;
  if (typeof QRCode === "undefined") {
    console.error(
      "QRCode library load nahi hui. qrcode.min.js script check karein.",
    );
    return;
  }

  qrcodeContainer.innerHTML = "";

  let memberCode = data.memberId || data.memberCode || data.id;

  // ⚠️ DIAGNOSTIC: Check if memberId exists in Firestore
  if (!data.memberId && !data.memberCode) {
    console.warn(
      "⚠️ WARNING: Member document mein 'memberId' ya 'memberCode' field nahi mila!",
    );
    console.warn(
      "   Admin ko ye field add karna padega taake scanner kaam kare.",
    );
    console.warn("   Abhi ke liye fallback use kar rahe hain: document ID");
  }

  // ✅ FIXED: QR mein document ID (id) bhejo, NOT uid
  // QR mein member verify karne layak basic info encode kar rahe hain
  const qrPayload = JSON.stringify({
    memberId: memberCode,
    name: data.name || data.fullName || "",
    id: data.id, // Firestore document ID — qr-scanner.js mein use hoga
  });

  console.log("📱 QR Payload:", qrPayload); // DEBUG — console mein verify karo
  console.log("🔍 QR Contents:", {
    memberId: memberCode,
    hasDocumentId: !!data.id,
    documentId: data.id,
  });

  new QRCode(qrcodeContainer, {
    text: qrPayload,
    width: 120,
    height: 120,
    colorDark: "#0045c4",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// ================= DOWNLOAD CARD AS PDF =================
downloadCardBtn?.addEventListener("click", async () => {
  if (!membershipCard) return;

  if (typeof html2canvas === "undefined" || !window.jspdf) {
    alert(
      "PDF export library load nahi hui. Page refresh karke dobara try karein.",
    );
    return;
  }

  const originalText = downloadCardBtn.innerHTML;
  downloadCardBtn.disabled = true;
  downloadCardBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

  try {
    const canvas = await html2canvas(membershipCard, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

    const fileName = currentMemberData
      ? `LibraX-ID-${currentMemberData.memberId || currentMemberData.id}.pdf`
      : "LibraX-ID-Card.pdf";

    pdf.save(fileName);
  } catch (err) {
    console.error("PDF generation error:", err);
    alert("PDF banane mein masla aaya. Dobara try karein.");
  } finally {
    downloadCardBtn.disabled = false;
    downloadCardBtn.innerHTML = originalText;
  }
});

// ================= PRINT CARD =================
printCardBtn?.addEventListener("click", async () => {
  if (!membershipCard) return;

  if (typeof html2canvas === "undefined") {
    alert("Print feature load nahi hui. Page refresh karke dobara try karein.");
    return;
  }

  const originalText = printCardBtn.innerHTML;
  printCardBtn.disabled = true;
  printCardBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing...`;

  try {
    const canvas = await html2canvas(membershipCard, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const dataUrl = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked hai! Browser settings mein popup allow karein.");
      return;
    }

    printWindow.document.write(`
            <html>
                <head><title>LibraX ID Card</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                    <img src="${dataUrl}" style="max-width:90%;" />
                </body>
            </html>
        `);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } catch (err) {
    console.error("Print error:", err);
    alert("Print karne mein masla aaya. Dobara try karein.");
  } finally {
    printCardBtn.disabled = false;
    printCardBtn.innerHTML = originalText;
  }
});

// ================= LOAD ERROR HELPER =================
function showLoadError(message) {
  if (memberNameEl) memberNameEl.innerText = "Error";
  console.error(message);
  alert(message);
}
