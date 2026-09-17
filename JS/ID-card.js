/* ==========================================
   LIBRAX - DIGITAL ID CARD
========================================== */

import { auth, db } from "../../JS/firebase/firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


/* ==========================================
   DOM ELEMENTS
========================================== */

const memberPhoto = document.getElementById("memberPhoto");
const memberName = document.getElementById("memberName");
const memberId = document.getElementById("memberId");
const memberDepartment = document.getElementById("memberDepartment");
const memberEmail = document.getElementById("memberEmail");
const memberPhone = document.getElementById("memberPhone");
const memberJoinDate = document.getElementById("memberJoinDate");
const memberStatus = document.getElementById("memberStatus");

const qrCodeContainer = document.getElementById("qrcode");

const downloadCardBtn = document.getElementById("downloadCardBtn");
const printCardBtn = document.getElementById("printCardBtn");
const logoutBtn = document.getElementById("logoutBtn");

const membershipCard = document.getElementById("membershipCard");


/* ==========================================
   DEFAULT IMAGE
========================================== */

const defaultProfileImage = "../../images/default-profile.png";


/* ==========================================
   FORMAT DATE
========================================== */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not Available";
    }

    try {

        if (dateValue.toDate) {
            return dateValue.toDate().toLocaleDateString("en-GB");
        }

        if (dateValue.seconds) {
            return new Date(
                dateValue.seconds * 1000
            ).toLocaleDateString("en-GB");
        }

        return new Date(dateValue).toLocaleDateString("en-GB");

    } catch (error) {

        console.error("Date formatting error:", error);

        return "Not Available";
    }
}


/* ==========================================
   LOAD MEMBER DATA
========================================== */

async function loadMemberData(user) {

    try {

        const membersRef = collection(db, "members");

        const memberQuery = query(
            membersRef,
            where("email", "==", user.email),
            limit(1)
        );

        const querySnapshot = await getDocs(memberQuery);

        if (querySnapshot.empty) {

            alert("Member record not found in Firebase.");

            return;
        }

        const memberDocument = querySnapshot.docs[0];

        const memberData = memberDocument.data();

        console.log("Member Data:", memberData);


        /* ==========================================
           DISPLAY MEMBER INFORMATION
        ========================================== */

        if (memberName) {
            memberName.textContent =
                memberData.name || "Member Name";
        }

        if (memberId) {
            memberId.textContent =
                memberData.memberId || memberDocument.id;
        }

        if (memberDepartment) {
            memberDepartment.textContent =
                memberData.department || "Not Available";
        }

        if (memberEmail) {
            memberEmail.textContent =
                memberData.email || user.email;
        }

        if (memberPhone) {
            memberPhone.textContent =
                memberData.phone || "Not Available";
        }

        if (memberJoinDate) {
            memberJoinDate.textContent =
                formatDate(memberData.joinDate);
        }

        if (memberStatus) {

            memberStatus.textContent =
                memberData.status || "Active Member";

        }

        if (memberPhoto) {

            memberPhoto.src =
                memberData.photoURL || defaultProfileImage;

            memberPhoto.onerror = function () {
                memberPhoto.src = defaultProfileImage;
            };

        }


        /* ==========================================
           GENERATE QR CODE
        ========================================== */

        generateQRCode(
            memberData.memberId || memberDocument.id
        );


    } catch (error) {

        console.error("Error loading member data:", error);

        alert(
            "Member data load nahi ho saka. Console check karein."
        );

    }

}


/* ==========================================
   GENERATE QR CODE
========================================== */

function generateQRCode(memberIdValue) {

    if (!qrCodeContainer) {
        return;
    }

    if (typeof QRCode === "undefined") {

        console.error(
            "QRCode library load nahi hui."
        );

        return;
    }

    qrCodeContainer.innerHTML = "";

    new QRCode(qrCodeContainer, {

        text: String(memberIdValue),

        width: 125,

        height: 125,

        colorDark: "#06285c",

        colorLight: "#ffffff",

        correctLevel: QRCode.CorrectLevel.H

    });

}


/* ==========================================
   DOWNLOAD CARD AS PDF
========================================== */

if (downloadCardBtn) {

    downloadCardBtn.addEventListener(
        "click",
        async function () {

            if (
                typeof html2canvas === "undefined" ||
                typeof window.jspdf === "undefined"
            ) {

                alert(
                    "PDF libraries load nahi hui hain."
                );

                return;
            }

            try {

                downloadCardBtn.disabled = true;

                downloadCardBtn.innerHTML =
                    '<i class="fas fa-spinner fa-spin me-2"></i>Preparing...';


                const canvas = await html2canvas(
                    membershipCard,
                    {
                        scale: 2,

                        useCORS: true,

                        backgroundColor: "#ffffff"
                    }
                );

                const imageData =
                    canvas.toDataURL("image/png");

                const {
                    jsPDF
                } = window.jspdf;

                const pdf = new jsPDF({

                    orientation: "portrait",

                    unit: "mm",

                    format: "a4"

                });

                const pageWidth =
                    pdf.internal.pageSize.getWidth();

                const pageHeight =
                    pdf.internal.pageSize.getHeight();

                const imageWidth = pageWidth - 30;

                const imageHeight =
                    canvas.height * imageWidth / canvas.width;

                const xPosition = 15;

                const yPosition =
                    (pageHeight - imageHeight) / 2;

                pdf.addImage(
                    imageData,
                    "PNG",
                    xPosition,
                    yPosition,
                    imageWidth,
                    imageHeight
                );

                pdf.save("LibraX-Digital-ID-Card.pdf");


            } catch (error) {

                console.error(
                    "PDF download error:",
                    error
                );

                alert(
                    "Card download nahi ho saka."
                );


            } finally {

                downloadCardBtn.disabled = false;

                downloadCardBtn.innerHTML =
                    '<i class="fas fa-download me-2"></i>Download Card';

            }

        }
    );

}


/* ==========================================
   PRINT CARD
========================================== */

if (printCardBtn) {

    printCardBtn.addEventListener(
        "click",
        function () {

            const cardContent =
                membershipCard.outerHTML;

            const printWindow =
                window.open(
                    "",
                    "_blank",
                    "width=900,height=700"
                );

            printWindow.document.write(`

                <!DOCTYPE html>

                <html>

                <head>

                    <title>LibraX Digital ID Card</title>

                    <style>

                        * {
                            box-sizing: border-box;
                        }

                        body {
                            margin: 0;
                            padding: 30px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            font-family: Arial, sans-serif;
                            background: #ffffff;
                        }

                        img {
                            max-width: 100%;
                        }

                        @media print {

                            body {
                                padding: 0;
                            }

                        }

                    </style>

                </head>

                <body>

                    ${cardContent}

                </body>

                </html>

            `);

            printWindow.document.close();

            printWindow.focus();

            setTimeout(function () {

                printWindow.print();

                printWindow.close();

            }, 500);

        }
    );

}


/* ==========================================
   LOGOUT
========================================== */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function () {

            try {

                await signOut(auth);

                // Correct path:
                // html/member/ID-card.html
                // html/login.html

                window.location.replace("../login.html");

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Logout nahi ho saka."
                );

            }

        }
    );

}


/* ==========================================
   AUTH CHECK
========================================== */

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            console.log(
                "Logged-in user:",
                user.email
            );

            loadMemberData(user);

        } else {

            // Correct login path
        window.location.replace("../../login.html");

        }

    }
);