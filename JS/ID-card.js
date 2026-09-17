import { auth, db } from "../JS/firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM ELEMENTS
const cardAvatar = document.getElementById("cardAvatar");
const memberName = document.getElementById("memberName");
const memberId = document.getElementById("memberId");
const memberDepartment = document.getElementById("memberDepartment");
const memberEmail = document.getElementById("memberEmail");
const memberPhone = document.getElementById("memberPhone");
const memberJoinDate = document.getElementById("memberJoinDate");
const memberStatus = document.getElementById("memberStatus");
const qrcodeContainer = document.getElementById("qrcode");

const downloadCardBtn = document.getElementById("downloadCardBtn");
const printCardBtn = document.getElementById("printCardBtn");
const membershipCard = document.getElementById("membershipCard");

async function renderIDCard(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let data = {};
        if (userSnap.exists()) {
            data = userSnap.data();
        }

        const nameVal = data.fullName || data.name || user.displayName || "Member Name";
        const emailVal = data.email || user.email || "N/A";
        const phoneVal = data.phone || "N/A";
        const memberIdVal = data.memberId || user.uid.substring(0, 8).toUpperCase();
        const departmentVal = data.department || data.role || "General";
        const joinDateVal = data.createdAt || data.joinDate || "N/A";
        const statusVal = data.status || "Active";

        let photoVal = data.photoURL || data.profilePic || data.cloudinaryUrl || user.photoURL;
        if (photoVal && photoVal.startsWith("http://")) {
            photoVal = photoVal.replace("http://", "https://");
        }
        if (!photoVal) {
            photoVal = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=0D8ABC&color=fff`;
        }

        if (memberName) memberName.textContent = nameVal;
        if (memberId) memberId.textContent = memberIdVal;
        if (memberDepartment) memberDepartment.textContent = departmentVal;
        if (memberEmail) memberEmail.textContent = emailVal;
        if (memberPhone) memberPhone.textContent = phoneVal;
        if (memberJoinDate) memberJoinDate.textContent = joinDateVal;
        if (memberStatus) memberStatus.textContent = statusVal;

        if (cardAvatar) {
            cardAvatar.crossOrigin = "anonymous";
            cardAvatar.onerror = () => {
                cardAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=0D8ABC&color=fff`;
            };
            cardAvatar.src = photoVal;
        }

        // QR Code Generation
        if (qrcodeContainer && typeof QRCode !== "undefined") {
            qrcodeContainer.innerHTML = "";
            new QRCode(qrcodeContainer, {
                text: memberIdVal,
                width: 100,
                height: 100,
            });
        }

    } catch (error) {
        console.error("Error fetching ID Card Data:", error);
    }
}

// 1. DOWNLOAD PDF LOGIC
if (downloadCardBtn) {
    downloadCardBtn.addEventListener("click", async () => {
        if (!membershipCard) return;

        try {
            downloadCardBtn.disabled = true;
            downloadCardBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...`;

            // Convert Card HTML to Canvas (useCORS handles Cloudinary/External images)
            const canvas = await html2canvas(membershipCard, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            const imgData = canvas.toDataURL("image/png");
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save("LibraX-ID-Card.pdf");

        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to download ID Card. Please check console errors.");
        } finally {
            downloadCardBtn.disabled = false;
            downloadCardBtn.innerHTML = `<i class="fa-solid fa-download"></i> Download Card (PDF)`;
        }
    });
}

// 2. PRINT CARD LOGIC
if (printCardBtn) {
    printCardBtn.addEventListener("click", () => {
        window.print();
    });
}

// AUTH GUARD
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "../../login.html";
        return;
    }
    renderIDCard(user);
});