import { auth, db } from "../../JS/firebase/firebase-config.js"; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentBooks = [];

document.addEventListener("DOMContentLoaded", () => {
    // Auth Protection
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "../../index.html";
            return;
        }

        loadUserProfile(user.uid);
        syncBorrowedBooks(user.uid);
        syncNotifications(user.uid);
        setupSearch();
        setupLogout();
    });
});

// Profile Loading
async function loadUserProfile(uid) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            const name = data.fullName || "Member";
            
            const profileName = document.querySelector(".user-profile h6");
            const welcomeText = document.querySelector(".welcome-section h3");
            const memberIdSpan = document.querySelector(".user-profile span");

            if (profileName) profileName.textContent = name;
            if (welcomeText) welcomeText.textContent = `Welcome Back, ${name}`;
            if (memberIdSpan && data.memberId) memberIdSpan.textContent = `ID: ${data.memberId}`;
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
    }
}

// Realtime Books & Dynamic Stats
function syncBorrowedBooks(uid) {
    const q = query(
        collection(db, "issuedBooks"),
        where("userId", "==", uid),
        where("returned", "==", false)
    );

    onSnapshot(q, (snapshot) => {
        currentBooks = [];
        let total = 0, dueSoon = 0, overdue = 0, fine = 0;
        const today = new Date();
        today.setHours(0,0,0,0);

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const dueDate = item.dueDate?.toDate ? item.dueDate.toDate() : new Date(item.dueDate);
            const issueDate = item.issueDate?.toDate ? item.issueDate.toDate() : new Date(item.issueDate);
            
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let status = "Issued";
            let statusClass = "issued";

            total++;

            if (diffDays < 0) {
                status = "OverDue";
                statusClass = "overdue";
                overdue++;
                fine += Math.abs(diffDays) * 10;
            } else if (diffDays <= 3) {
                status = "Due Soon";
                statusClass = "due";
                dueSoon++;
            }

            currentBooks.push({
                name: item.bookName || "Untitled Book",
                issue: issueDate.toLocaleDateString('en-GB'),
                due: dueDate.toLocaleDateString('en-GB'),
                status,
                statusClass
            });
        });

        const cardElements = document.querySelectorAll(".dashboard-card h2");
        if(cardElements.length >= 4) {
            cardElements[0].textContent = total;
            cardElements[1].textContent = dueSoon;
            cardElements[2].textContent = overdue;
            cardElements[3].textContent = `Rs.${fine}`;
        }

        renderTable(currentBooks);
    }, (err) => {
        console.error("Books Sync Error:", err);
    });
}

function renderTable(books) {
    const tbody = document.querySelector(".table tbody");
    if (!tbody) return;

    if (books.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">No books currently borrowed.</td></tr>`;
        return;
    }

    tbody.innerHTML = books.map(b => `
        <tr>
            <td>${b.name}</td>
            <td>${b.issue}</td>
            <td>${b.due}</td>
            <td><span class="status ${b.statusClass}">${b.status}</span></td>
        </tr>
    `).join("");
}

function syncNotifications(uid) {
    const q = query(collection(db, "notifications"), where("userId", "==", uid));
    
    onSnapshot(q, (snapshot) => {
        const container = document.querySelector(".col-lg-4 .dashboard-box");
        const dot = document.querySelector(".badge-dot");
        
        if (dot) dot.style.display = snapshot.empty ? "none" : "block";
        if (!container) return;

        const title = container.querySelector(".box-title");
        container.innerHTML = "";
        if (title) container.appendChild(title);

        if (snapshot.empty) {
            container.innerHTML += `<div class="p-3 text-muted">No notifications.</div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const n = docSnap.data();
            const color = n.type === 'warning' ? 'text-warning' : n.type === 'success' ? 'text-success' : 'text-primary';
            
            container.insertAdjacentHTML('beforeend', `
                <div class="notification-item">
                    <i class="fa-solid fa-circle ${color}"></i>
                    <div>
                        <h6>${n.message || ''}</h6>
                        <span>Recently</span>
                    </div>
                </div>
            `);
        });
    }, (err) => {
        console.error("Notification Sync Error:", err);
    });
}

function setupSearch() {
    const input = document.querySelector(".search-box input");
    if (input) {
        input.addEventListener("input", (e) => {
            const val = e.target.value.toLowerCase().trim();
            const filtered = currentBooks.filter(b => b.name.toLowerCase().includes(val));
            renderTable(filtered);
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = "../../index.html";
            }).catch(err => console.error("Logout Error:", err));
        });
    }
}