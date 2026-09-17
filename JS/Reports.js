
// ============================================================
// LIBRAX - REPORTS & ANALYTICS
// Firebase Firestore + Chart.js + Flatpickr
// ============================================================

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "../../JS/firebase/firebase-config.js";


// ============================================================
// DOM ELEMENTS
// ============================================================

const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");

const fromDateIcon = document.getElementById("fromDateIcon");
const toDateIcon = document.getElementById("toDateIcon");

const generateReportBtn = document.getElementById("generateReportBtn");

const reportLoading = document.getElementById("reportLoading");
const reportError = document.getElementById("reportError");

const totalIssuedElement = document.getElementById("totalIssued");
const totalReturnedElement = document.getElementById("totalReturned");
const newMembersElement = document.getElementById("newMembers");
const fineCollectedElement = document.getElementById("fineCollected");


// ============================================================
// FIRESTORE COLLECTIONS
// ============================================================

const ISSUED_BOOKS_COLLECTION = "issuedBooks";
const MEMBERS_COLLECTION = "members";


// ============================================================
// CHART VARIABLES
// ============================================================

let issueReportChart = null;
let topBooksChart = null;


// ============================================================
// FLATPICKR
// ============================================================

const fromPicker = flatpickr("#fromDate", {
    dateFormat: "d/m/Y",
    allowInput: true
});

const toPicker = flatpickr("#toDate", {
    dateFormat: "d/m/Y",
    allowInput: true
});


// Calendar buttons
fromDateIcon.addEventListener("click", () => {
    fromPicker.open();
});

toDateIcon.addEventListener("click", () => {
    toPicker.open();
});


// ============================================================
// DATE HELPERS
// ============================================================

// Convert DD/MM/YYYY into JavaScript Date
function parseDate(dateString) {

    if (!dateString) {
        return null;
    }

    const parts = dateString.split("/");

    if (parts.length !== 3) {
        return null;
    }

    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
}


// Convert Firestore Timestamp / Date / String into Date
function convertToDate(value) {

    if (!value) {
        return null;
    }

    // Firestore Timestamp
    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    // JavaScript Date
    if (value instanceof Date) {
        return value;
    }

    // Firestore timestamp object
    if (value.seconds) {
        return new Date(value.seconds * 1000);
    }

    // String
    if (typeof value === "string") {

        // DD/MM/YYYY
        if (value.includes("/")) {
            return parseDate(value);
        }

        const date = new Date(value);

        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    return null;
}


// ============================================================
// NORMALIZE DATE
// ============================================================

function getIssueDate(book) {

    return convertToDate(
        book.issueDate ||
        book.issuedDate ||
        book.borrowDate ||
        book.createdAt
    );
}


function getReturnDate(book) {

    return convertToDate(
        book.returnDate ||
        book.returnedDate
    );
}


// ============================================================
// FINE HELPER
// ============================================================

function getFine(book) {

    const fine =
        book.fine ??
        book.totalFine ??
        book.lateFine ??
        0;

    const number = Number(fine);

    return isNaN(number) ? 0 : number;
}


// ============================================================
// BOOK NAME HELPER
// ============================================================

function getBookName(book) {

    return (
        book.bookName ||
        book.title ||
        book.bookTitle ||
        "Unknown Book"
    );
}


// ============================================================
// STATUS HELPER
// ============================================================

function getStatus(book) {

    return String(
        book.status ||
        book.borrowStatus ||
        ""
    ).toLowerCase().trim();
}


// ============================================================
// MEMBER DATE HELPER
// ============================================================

function getMemberDate(member) {

    return convertToDate(
        member.createdAt ||
        member.joinDate ||
        member.registrationDate ||
        member.registeredAt
    );
}


// ============================================================
// LOAD ISSUED BOOKS
// ============================================================

async function loadIssuedBooks() {

    const snapshot = await getDocs(
        collection(db, ISSUED_BOOKS_COLLECTION)
    );

    const books = [];

    snapshot.forEach((doc) => {

        books.push({
            id: doc.id,
            ...doc.data()
        });

    });

    return books;
}


// ============================================================
// LOAD MEMBERS
// ============================================================

async function loadMembers() {

    const snapshot = await getDocs(
        collection(db, MEMBERS_COLLECTION)
    );

    const members = [];

    snapshot.forEach((doc) => {

        members.push({
            id: doc.id,
            ...doc.data()
        });

    });

    return members;
}


// ============================================================
// FILTER BY DATE
// ============================================================

function isDateInRange(date, fromDate, toDate) {

    if (!date) {
        return false;
    }

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (fromDate && checkDate < fromDate) {
        return false;
    }

    if (toDate && checkDate > toDate) {
        return false;
    }

    return true;
}


// ============================================================
// CALCULATE REPORT
// ============================================================

function calculateReport(issuedBooks, members, fromDate, toDate) {

    // --------------------------------------------------------
    // ISSUED BOOKS
    // --------------------------------------------------------

    const issuedInRange = issuedBooks.filter((book) => {

        const issueDate = getIssueDate(book);

        return isDateInRange(
            issueDate,
            fromDate,
            toDate
        );

    });


    // --------------------------------------------------------
    // RETURNED BOOKS
    // --------------------------------------------------------

    const returnedInRange = issuedBooks.filter((book) => {

        const returnDate = getReturnDate(book);

        if (!returnDate) {
            return false;
        }

        return isDateInRange(
            returnDate,
            fromDate,
            toDate
        );

    });


    // --------------------------------------------------------
    // NEW MEMBERS
    // --------------------------------------------------------

    const membersInRange = members.filter((member) => {

        const memberDate = getMemberDate(member);

        return isDateInRange(
            memberDate,
            fromDate,
            toDate
        );

    });


    // --------------------------------------------------------
    // TOTAL FINE
    // --------------------------------------------------------

    let totalFine = 0;

    returnedInRange.forEach((book) => {

        totalFine += getFine(book);

    });


    // --------------------------------------------------------
    // TOP BOOKS
    // --------------------------------------------------------

    const bookCounts = {};

    issuedInRange.forEach((book) => {

        const bookName = getBookName(book);

        if (!bookCounts[bookName]) {
            bookCounts[bookName] = 0;
        }

        bookCounts[bookName]++;

    });


    const topBooks = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);


    // --------------------------------------------------------
    // MONTHLY ISSUES
    // --------------------------------------------------------

    const monthlyIssues = {};

    issuedInRange.forEach((book) => {

        const date = getIssueDate(book);

        if (!date) {
            return;
        }

        const monthKey =
            date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0");

        if (!monthlyIssues[monthKey]) {
            monthlyIssues[monthKey] = 0;
        }

        monthlyIssues[monthKey]++;

    });


    return {

        totalIssued: issuedInRange.length,

        totalReturned: returnedInRange.length,

        newMembers: membersInRange.length,

        totalFine,

        topBooks,

        monthlyIssues

    };

}


// ============================================================
// UPDATE KPI CARDS
// ============================================================

function updateKPICards(report) {

    totalIssuedElement.textContent =
        report.totalIssued;

    totalReturnedElement.textContent =
        report.totalReturned;

    newMembersElement.textContent =
        report.newMembers;

    fineCollectedElement.textContent =
        "Rs. " +
        report.totalFine.toLocaleString();

}


// ============================================================
// MONTH NAME
// ============================================================

function getMonthName(monthNumber) {

    const date = new Date(
        2000,
        monthNumber - 1,
        1
    );

    return date.toLocaleString(
        "en-US",
        {
            month: "short"
        }
    );

}


// ============================================================
// CREATE MONTHLY ISSUE CHART
// ============================================================

function createIssueChart(monthlyIssues) {

    const canvas =
        document.getElementById("issueReportChart");

    if (issueReportChart) {

        issueReportChart.destroy();

    }


    const sortedMonths =
        Object.keys(monthlyIssues).sort();


    const labels =
        sortedMonths.map((month) => {

            const [year, monthNumber] =
                month.split("-");

            return (
                getMonthName(Number(monthNumber)) +
                " " +
                year
            );

        });


    const data =
        sortedMonths.map((month) => {

            return monthlyIssues[month];

        });


    issueReportChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {

                labels: labels,

                datasets: [
                    {
                        label: "Books Issued",

                        data: data,

                        borderWidth: 1,

                        borderRadius: 6
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {
                            precision: 0
                        }

                    }

                }

            }

        }
    );

}


// ============================================================
// CREATE TOP BOOKS CHART
// ============================================================

function createTopBooksChart(topBooks) {

    const canvas =
        document.getElementById("topBooksChart");

    if (topBooksChart) {

        topBooksChart.destroy();

    }


    const labels =
        topBooks.map((book) => book[0]);

    const data =
        topBooks.map((book) => book[1]);


    topBooksChart = new Chart(
        canvas,
        {
            type: "doughnut",

            data: {

                labels: labels,

                datasets: [
                    {
                        data: data,

                        borderWidth: 1
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: "bottom"

                    }

                }

            }

        }
    );

}


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

    reportError.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-circle-exclamation me-2"></i>
            ${message}
        </div>
    `;}