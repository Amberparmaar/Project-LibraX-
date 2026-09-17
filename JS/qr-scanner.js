
/* ==========================================
   LIBRAX QR SCANNER
   CAMERA + FIREBASE
========================================== */


// ==========================================
// FIREBASE IMPORT
// ==========================================

import { db } from "../../JS/firebase/firebase-config.js";

import {

    collection,
    query,
    where,
    getDocs,
    limit

} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";



// ==========================================
// DOM ELEMENTS
// ==========================================

const reader = document.getElementById("reader");

const startScannerBtn = document.getElementById("startScannerBtn");

const stopScannerBtn = document.getElementById("stopScannerBtn");

const scannerStatus = document.getElementById("scannerStatus");

const scannerError = document.getElementById("scannerError");

const emptyResult = document.getElementById("emptyResult");

const memberResult = document.getElementById("memberResult");

const clearResultBtn = document.getElementById("clearResultBtn");



// ==========================================
// MEMBER ELEMENTS
// ==========================================

const memberPhoto = document.getElementById("memberPhoto");

const memberName = document.getElementById("memberName");

const memberId = document.getElementById("memberId");

const memberStatus = document.getElementById("memberStatus");

const memberDepartment = document.getElementById("memberDepartment");

const memberEmail = document.getElementById("memberEmail");

const memberPhone = document.getElementById("memberPhone");

const memberBorrowed = document.getElementById("memberBorrowed");

const memberOverdue = document.getElementById("memberOverdue");

const memberFine = document.getElementById("memberFine");



// ==========================================
// VARIABLES
// ==========================================

let html5QrCode = null;

let scannerRunning = false;

let scanInProgress = false;



// ==========================================
// SHOW ERROR
// ==========================================

function showError(message) {

    scannerError.textContent = message;

    scannerError.classList.remove("d-none");

}



// ==========================================
// HIDE ERROR
// ==========================================

function hideError() {

    scannerError.textContent = "";

    scannerError.classList.add("d-none");

}



// ==========================================
// STATUS MESSAGE
// ==========================================

function setStatus(message) {

    scannerStatus.textContent = message;

}



// ==========================================
// START SCANNER
// ==========================================

async function startScanner() {

    hideError();

    if (scannerRunning) {

        return;

    }


    if (typeof Html5Qrcode === "undefined") {

        showError(

            "QR Scanner library load nahi hui. Internet check karo."

        );

        return;

    }


    try {

        html5QrCode = new Html5Qrcode("reader");


        await html5QrCode.start(

            {
                facingMode: "environment"
            },


            {

                fps: 10,

                qrbox: {

                    width: 220,

                    height: 220

                }

            },


            async (decodedText) => {

                await handleQRCode(decodedText);

            },


            () => {

                // QR code not found yet.
                // No error required.

            }

        );


        scannerRunning = true;


        startScannerBtn.style.display = "none";

        stopScannerBtn.style.display = "block";


        setStatus("Camera active. QR code scan karo.");


    } catch (error) {

        console.error("Scanner start error:", error);


        showError(

            "Camera start nahi ho saka. Camera permission allow karo."

        );


        setStatus("Scanner failed");


        html5QrCode = null;

    }

}



// ==========================================
// STOP SCANNER
// ==========================================

async function stopScanner() {

    if (!html5QrCode || !scannerRunning) {

        return;

    }


    try {

        await html5QrCode.stop();

        html5QrCode.clear();


    } catch (error) {

        console.error("Scanner stop error:", error);

    }


    html5QrCode = null;

    scannerRunning = false;


    startScannerBtn.style.display = "block";

    stopScannerBtn.style.display = "none";


    setStatus("Scanner stopped");

}



// ==========================================
// HANDLE QR CODE
// ==========================================

async function handleQRCode(decodedText) {

    if (scanInProgress) {

        return;

    }


    scanInProgress = true;


    setStatus("Member data loading...");


    try {

        await stopScanner();

        await findMember(decodedText);


    } catch (error) {

        console.error("QR handling error:", error);


        showError(

            "QR process karte waqt error aa gaya."

        );

    } finally {

        scanInProgress = false;

    }

}



// ==========================================
// FIND MEMBER FROM FIRESTORE
// ==========================================

async function findMember(qrValue) {

    hideError();


    /*
        QR CODE EXAMPLE:

        M001

        OR JSON:

        {
            "memberId": "M001"
        }
    */


    let memberIdValue = qrValue.trim();



    // If QR contains JSON, read memberId

    try {

        const parsedData = JSON.parse(qrValue);


        if (parsedData.memberId) {

            memberIdValue = parsedData.memberId;

        }

    } catch (error) {

        // Plain text QR.
        // Continue normally.

    }



    if (!memberIdValue) {

        showError(

            "QR code mein member ID nahi mili."

        );

        return;

    }



    try {


        /*
            FIRESTORE COLLECTION:

            members

            FIELD:

            memberId
        */


        const membersRef = collection(db, "members");


        const memberQuery = query(

            membersRef,

            where("memberId", "==", memberIdValue),

            limit(1)

        );


        const snapshot = await getDocs(memberQuery);



        if (snapshot.empty) {

            showError(

                "Is QR code se koi member nahi mila: "

                + memberIdValue

            );


            setStatus("Member not found");

            return;

        }



        // First matching member

        const memberDoc = snapshot.docs[0];

        const memberData = memberDoc.data();



        // Display member details

        displayMember(memberData);



        setStatus("Member found successfully");



    } catch (error) {

        console.error(

            "Firebase member lookup error:",

            error

        );


        showError(

            "Firebase se member data load nahi ho saka. Firestore rules aur collection check karo."

        );


        setStatus("Firebase error");

    }

}



// ==========================================
// DISPLAY MEMBER DETAILS
// ==========================================

function displayMember(data) {


    emptyResult.classList.add("d-none");

    memberResult.classList.remove("d-none");



    // Basic Details

    memberName.textContent = data.name || "Unknown Member";

    memberId.textContent = data.memberId || "—";

    memberStatus.textContent = data.status || "Active Member";

    memberDepartment.textContent = data.department || "—";

    memberEmail.textContent = data.email || "—";

    memberPhone.textContent = data.phone || "—";



    // Library Details

    memberBorrowed.textContent = data.booksBorrowed ?? 0;

    memberOverdue.textContent = data.overdueBooks ?? 0;

    memberFine.textContent = "Rs. " + (data.totalFine ?? 0);



    // Profile Image

    if (data.photoURL) {

        memberPhoto.src = data.photoURL;

    } else {

        memberPhoto.src = "../../images/default-profile.png";

    }

}



// ==========================================
// BUTTON EVENTS
// ==========================================

startScannerBtn.addEventListener(

    "click",

    startScanner

);


stopScannerBtn.addEventListener(

    "click",

    stopScanner

);



// ==========================================
// CLEAR RESULT
// ==========================================

clearResultBtn.addEventListener(

    "click",

    () => {

        memberResult.classList.add("d-none");

        emptyResult.classList.remove("d-none");

        setStatus("Ready to scan");

        hideError();

    }

);



// ==========================================
// CLEANUP
// ==========================================

window.addEventListener(

    "beforeunload",

    () => {

        if (html5QrCode && scannerRunning) {

            html5QrCode.stop().catch(() => {});

        }

    }

);