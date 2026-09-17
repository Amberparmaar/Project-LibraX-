
import { db } from "../JS/firebase/firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// ======================================================
// DOM ELEMENTS
// ======================================================

const menuBtn =
    document.getElementById("menuBtn");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");


const searchInput =
    document.getElementById("searchInput");


const returnBooksTable =
    document.getElementById("returnBooksTable");


const totalOverdueBooks =
    document.getElementById("totalOverdueBooks");


const totalFineCollected =
    document.getElementById("totalFineCollected");


const returnMessage =
    document.getElementById("returnMessage");


// ======================================================
// SETTINGS
// ======================================================

// Fine per overdue day
const FINE_PER_DAY = 50;


// ======================================================
// SIDEBAR
// ======================================================

if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle("show");

            overlay.classList.toggle("show");

        }
    );

}


if (overlay) {

    overlay.addEventListener(
        "click",
        () => {

            sidebar.classList.remove("show");

            overlay.classList.remove("show");

        }
    );

}


// ======================================================
// VARIABLES
// ======================================================

let issuedBooks = [];


// ======================================================
// LOAD ISSUED BOOKS
// ======================================================

async function loadIssuedBooks() {

    try {

        returnBooksTable.innerHTML = `
        
            <tr>
                <td colspan="7"
                    class="text-center text-secondary py-4">

                    Loading...

                </td>
            </tr>

        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "issuedBooks"
                )
            );


        issuedBooks = [];


        snapshot.forEach(
            (document) => {

                const data =
                    document.data();


                // Only currently issued books
                if (
                    data.status === "Issued"
                ) {

                    issuedBooks.push({

                        id:
                            document.id,

                        ...data

                    });

                }

            }
        );


        renderTable(
            issuedBooks
        );


        updateSummary(
            issuedBooks
        );


    } catch (error) {

        console.error(
            "Error loading issued books:",
            error
        );


        returnBooksTable.innerHTML = `

            <tr>

                <td colspan="7"
                    class="text-center text-danger py-4">

                    Unable to load issued books.

                </td>

            </tr>

        `;

    }

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable(
    books
) {

    if (books.length === 0) {

        returnBooksTable.innerHTML = `

            <tr>

                <td colspan="7"
                    class="text-center text-secondary py-4">

                    No books currently issued.

                </td>

            </tr>

        `;

        return;

    }


    returnBooksTable.innerHTML = "";


    books.forEach(
        (book) => {

            const fineInfo =
                calculateFine(
                    book.returnDate
                );


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        book.memberName ||
                        book.memberCode ||
                        "Unknown Member"
                    )}

                    ${
                        book.memberCode
                            ? `<small class="d-block text-secondary">
                                ${escapeHTML(book.memberCode)}
                               </small>`
                            : ""
                    }

                </td>


                <td>
                    ${escapeHTML(
                        book.bookTitle ||
                        "Unknown Book"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        book.issueDate ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        book.returnDate ||
                        "—"
                    )}
                </td>


                <td class="${
                    fineInfo.fine > 0
                        ? "text-fine"
                        : ""
                }">

                    Rs. ${fineInfo.fine}

                </td>


                <td>

                    <span class="${
                        fineInfo.fine > 0
                            ? "text-overdue"
                            : "text-ontime"
                    }">

                        ${fineInfo.status}

                    </span>

                </td>


                <td class="text-end">

                    <button
                        class="btn btn-return"
                        data-id="${book.id}">

                        Return

                    </button>

                </td>

            `;


            returnBooksTable.appendChild(
                row
            );

        }
    );

}


// ======================================================
// RETURN BUTTON
// ======================================================

returnBooksTable.addEventListener(
    "click",
    async function (event) {

        const button =
            event.target.closest(
                ".btn-return"
            );


        if (!button) {
            return;
        }


        const issuedBookId =
            button.dataset.id;


        if (!issuedBookId) {
            return;
        }


        const selectedBook =
            issuedBooks.find(
                book =>
                    book.id === issuedBookId
            );


        if (!selectedBook) {

            showMessage(
                "Issued book not found.",
                "danger"
            );

            return;

        }


        const confirmReturn =
            confirm(
                `Return "${selectedBook.bookTitle}" for ${selectedBook.memberName}?`
            );


        if (!confirmReturn) {
            return;
        }


        button.disabled = true;

        button.textContent =
            "Returning...";


        try {

            const issuedBookRef =
                doc(
                    db,
                    "issuedBooks",
                    issuedBookId
                );


            const bookRef =
                doc(
                    db,
                    "books",
                    selectedBook.bookId
                );


            // ==================================================
            // TRANSACTION
            // ==================================================

            await runTransaction(
                db,
                async (transaction) => {


                    // Get issued book
                    const issuedSnapshot =
                        await transaction.get(
                            issuedBookRef
                        );


                    if (
                        !issuedSnapshot.exists()
                    ) {

                        throw new Error(
                            "Issued book record not found."
                        );

                    }


                    const issuedData =
                        issuedSnapshot.data();


                    if (
                        issuedData.status !==
                        "Issued"
                    ) {

                        throw new Error(
                            "This book has already been returned."
                        );

                    }


                    // Get actual book
                    const bookSnapshot =
                        await transaction.get(
                            bookRef
                        );


                    if (
                        !bookSnapshot.exists()
                    ) {

                        throw new Error(
                            "Book record not found."
                        );

                    }


                    const bookData =
                        bookSnapshot.data();


                    const currentCopies =
                        Number(
                            bookData.availableCopies || 0
                        );


                    const totalCopies =
                        Number(
                            bookData.totalCopies || 0
                        );


                    let newAvailableCopies =
                        currentCopies + 1;


                    // Don't exceed total copies
                    if (
                        totalCopies > 0 &&
                        newAvailableCopies >
                        totalCopies
                    ) {

                        newAvailableCopies =
                            totalCopies;

                    }


                    // Update book stock
                    transaction.update(
                        bookRef,
                        {

                            availableCopies:
                                newAvailableCopies,

                            available:
                                newAvailableCopies > 0

                        }
                    );


                    // Calculate fine
                    const fineInfo =
                        calculateFine(
                            issuedData.returnDate
                        );


                    // Update issued book
                    transaction.update(
                        issuedBookRef,
                        {

                            status:
                                "Returned",

                            actualReturnDate:
                                getTodayDate(),

                            fine:
                                fineInfo.fine,

                            returnedAt:
                                serverTimestamp()

                        }
                    );

                }
            );


            showMessage(
                "Book returned successfully!",
                "success"
            );


            // Reload data
            await loadIssuedBooks();


        } catch (error) {

            console.error(
                "Error returning book:",
                error
            );


            showMessage(
                error.message ||
                "Unable to return book.",
                "danger"
            );


            button.disabled = false;

            button.textContent =
                "Return";

        }

    }
);


// ======================================================
// SEARCH
// ======================================================

searchInput.addEventListener(
    "input",
    function () {

        const searchValue =
            this.value
                .trim()
                .toLowerCase();


        if (!searchValue) {

            renderTable(
                issuedBooks
            );

            return;

        }


        const filteredBooks =
            issuedBooks.filter(
                (book) => {

                    const memberName =
                        (
                            book.memberName ||
                            ""
                        ).toLowerCase();


                    const memberCode =
                        (
                            book.memberCode ||
                            ""
                        ).toLowerCase();


                    const bookTitle =
                        (
                            book.bookTitle ||
                            ""
                        ).toLowerCase();


                    return (

                        memberName.includes(
                            searchValue
                        )

                        ||

                        memberCode.includes(
                            searchValue
                        )

                        ||

                        bookTitle.includes(
                            searchValue
                        )

                    );

                }
            );


        renderTable(
            filteredBooks
        );

    }
);


// ======================================================
// FINE CALCULATION
// ======================================================

function calculateFine(
    dueDateString
) {

    if (!dueDateString) {

        return {

            fine: 0,

            overdueDays: 0,

            status: "On Time"

        };

    }


    const dueDate =
        parseDate(
            dueDateString
        );


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    if (!dueDate) {

        return {

            fine: 0,

            overdueDays: 0,

            status: "On Time"

        };

    }


    // Not overdue
    if (
        today <= dueDate
    ) {

        return {

            fine: 0,

            overdueDays: 0,

            status: "On Time"

        };

    }


    // Difference in days
    const difference =
        today.getTime() -
        dueDate.getTime();


    const overdueDays =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );


    const fine =
        overdueDays *
        FINE_PER_DAY;


    return {

        fine:
            fine,

        overdueDays:
            overdueDays,

        status:
            "Overdue"

    };

}


// ======================================================
// UPDATE SUMMARY
// ======================================================

function updateSummary(
    books
) {

    let overdueBooks = 0;

    let totalFine = 0;


    books.forEach(
        (book) => {

            const fineInfo =
                calculateFine(
                    book.returnDate
                );


            if (
                fineInfo.fine > 0
            ) {

                overdueBooks++;

                totalFine +=
                    fineInfo.fine;

            }

        }
    );


    totalOverdueBooks.textContent =
        overdueBooks;


    totalFineCollected.textContent =
        `Rs. ${totalFine.toLocaleString()}`;

}


// ======================================================
// DATE PARSER
// DD/MM/YYYY
// ======================================================

function parseDate(
    dateString
) {

    if (!dateString) {
        return null;
    }


    const parts =
        dateString.split("/");


    if (
        parts.length !== 3
    ) {

        return null;

    }


    const day =
        Number(parts[0]);

    const month =
        Number(parts[1]) - 1;

    const year =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month,
            day
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


// ======================================================
// TODAY
// ======================================================

function getTodayDate() {

    const today =
        new Date();


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const year =
        today.getFullYear();


    return `${day}/${month}/${year}`;

}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(
    message,
    type
) {

    returnMessage.innerHTML = `

        <div class="alert alert-${type}"
            role="alert">

            ${escapeHTML(message)}

        </div>

    `;


    setTimeout(
        () => {

            returnMessage.innerHTML =
                "";

        },
        4000
    );

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value;


    return div.innerHTML;

}


// ======================================================
// START PAGE
// ======================================================

loadIssuedBooks();