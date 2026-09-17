import { db, auth } from "../JS/firebase/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Stat Elements
const statTotalBooks = document.getElementById("statTotalBooks");
const statTotalMembers = document.getElementById("statTotalMembers");
const statBooksIssued = document.getElementById("statBooksIssued");
const statOverdueBooks = document.getElementById("statOverdueBooks");
const activityGrid = document.getElementById("activityGrid");
const currentDateDisplay = document.getElementById("currentDateDisplay");
const adminName = document.getElementById("adminName");
const adminRole = document.getElementById("adminRole");
const logoutBtn = document.getElementById("logoutBtn");
const globalSearchInput = document.getElementById("globalSearchInput");

// Chart Instances
let monthlyBarChart = null;
let categoryDoughnutChart = null;

// Global Data Holders for dynamic charts
let booksData = [];
let transactionsData = [];

// ==========================================
// 1. INITIALIZATION & AUTH CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setCurrentDate();

    // Check Auth State
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect to Login if not authenticated
            window.location.href = "../../login.html";
            return;
        }

        // Verify Admin Role from Firestore Users collection or Email
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            const isAdmin = (userData && userData.role === 'admin') || 
                            user.email?.includes("admin") || 
                            user.displayName?.toLowerCase().includes("admin");

            if (!isAdmin) {
                alert("Access Denied! Only Administrators can access this dashboard.");
                window.location.href = "../member/dashboard.html";
                return;
            }

            // Set Admin Info in UI
            if (adminName) adminName.textContent = user.displayName || userData?.name || user.email.split('@')[0];
            if (adminRole) adminRole.textContent = userData?.role ? userData.role.toUpperCase() : "Administrator";

            // Initialize Real-time Data Listeners
            initRealTimeListeners();

        } catch (error) {
            console.error("Auth verification error:", error);
            initRealTimeListeners(); // Fallback load
        }
    });

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = "../../login.html";
            });
        });
    }

    // Global Search Bar Handler
    if (globalSearchInput) {
        globalSearchInput.addEventListener("input", (e) => {
            const queryVal = e.target.value.toLowerCase();
            // Optional: Filter Activity list or display search dropdown
            filterActivities(queryVal);
        });
    }
});

function setCurrentDate() {
    if (currentDateDisplay) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// ==========================================
// 2. REAL-TIME FIRESTORE LISTENERS
// ==========================================
function initRealTimeListeners() {
    listenTotalBooks();
    listenTotalMembers();
    listenTransactions();
    listenRecentActivities();
}

// Real-time Books Count & Category Data
function listenTotalBooks() {
    onSnapshot(collection(db, "books"), (snapshot) => {
        if (statTotalBooks) statTotalBooks.textContent = snapshot.size || 0;
        
        booksData = [];
        snapshot.forEach(doc => booksData.push(doc.data()));
        
        // Dynamic Chart Render on Book Data Change
        renderCategoryChart(booksData);
    }, (error) => {
        console.error("Books Listener Error:", error);
    });
}

// Real-time Members Count
function listenTotalMembers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        if (statTotalMembers) statTotalMembers.textContent = snapshot.size || 0;
    }, (error) => {
        console.error("Members Listener Error:", error);
    });
}

// Real-time Issued & Overdue Transactions Count
function listenTransactions() {
    onSnapshot(collection(db, "transactions"), (snapshot) => {
        let issuedCount = 0;
        let overdueCount = 0;
        transactionsData = [];

        const today = new Date();

        snapshot.forEach(doc => {
            const data = doc.data();
            transactionsData.push(data);

            if (data.status === "issued") {
                issuedCount++;
                // Check if Overdue
                if (data.dueDate && new Date(data.dueDate.seconds * 1000) < today) {
                    overdueCount++;
                }
            } else if (data.status === "overdue") {
                overdueCount++;
            }
        });

        if (statBooksIssued) statBooksIssued.textContent = issuedCount;
        if (statOverdueBooks) statOverdueBooks.textContent = overdueCount;

        // Dynamic Monthly Issued/Return Chart Render
        renderMonthlyChart(transactionsData);
    }, (error) => {
        console.error("Transactions Listener Error:", error);
    });
}

// Real-time Activities Feed Listener
function listenRecentActivities() {
    if (!activityGrid) return;

    const q = query(collection(db, "activities"), orderBy("timestamp", "desc"), limit(5));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            activityGrid.innerHTML = `
                <div class="activity-card p-3 border rounded-3 mb-2 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="activity-icon text-primary"><i class="fa-solid fa-info-circle fa-lg"></i></div>
                        <div>
                            <h6 class="m-0 fw-bold">System Active</h6>
                            <p class="m-0 text-muted small">No recent activity logs found.</p>
                        </div>
                    </div>
                    <span class="time small text-muted">Just now</span>
                </div>`;
            return;
        }

        let html = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Format Time Ago
            let timeStr = "Recently";
            if (data.timestamp) {
                const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            html += `
                <div class="activity-card p-3 border rounded-3 mb-2 d-flex align-items-center justify-content-between activity-item">
                    <div class="d-flex align-items-center gap-3">
                        <div class="activity-icon ${data.color || 'text-primary'}">
                            <i class="fa-solid ${data.icon || 'fa-bell'} fa-lg"></i>
                        </div>
                        <div>
                            <h6 class="m-0 fw-bold act-title">${data.title || 'Activity'}</h6>
                            <p class="m-0 text-muted small act-desc">${data.description || '-'}</p>
                        </div>
                    </div>
                    <span class="time small text-muted">${timeStr}</span>
                </div>`;
        });
        activityGrid.innerHTML = html;
    }, (error) => {
        console.error("Activities Listener Error:", error);
    });
}

// ==========================================
// 3. CHARTS CALCULATION & RENDER (Chart.js)
// ==========================================

// Category Doughnut Chart (100% Dynamic from Firestore Books)
function renderCategoryChart(books) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Count Books per Category dynamically
    const categoryCounts = {};
    books.forEach(b => {
        const cat = b.category || "Uncategorized";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const dataValues = Object.values(categoryCounts);

    if (categoryDoughnutChart) categoryDoughnutChart.destroy();

    categoryDoughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: dataValues.length > 0 ? dataValues : [1],
                backgroundColor: [
                    '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
                    '#8b5cf6', '#ec4899', '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Monthly Bar Chart (Dynamic Last 6 Months)
function renderMonthlyChart(transactions) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    
    // Get Last 6 Months Labels
    const labels = [];
    const issuedData = [0, 0, 0, 0, 0, 0];
    const returnedData = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
        let m = (currentMonthIdx - i + 12) % 12;
        labels.push(months[m]);
    }

    // Populate data based on transaction dates
    transactions.forEach(t => {
        if (t.issueDate) {
            const date = t.issueDate.toDate ? t.issueDate.toDate() : new Date(t.issueDate);
            const mName = months[date.getMonth()];
            const idx = labels.indexOf(mName);
            if (idx !== -1) {
                if (t.status === "issued" || t.status === "returned") issuedData[idx]++;
                if (t.status === "returned") returnedData[idx]++;
            }
        }
    });

    if (monthlyBarChart) monthlyBarChart.destroy();

    monthlyBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Issued',
                    data: issuedData,
                    backgroundColor: '#2563eb',
                    borderRadius: 6
                },
                {
                    label: 'Returned',
                    data: returnedData,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// Filter Recent Activities Feed via Search
function filterActivities(term) {
    const items = document.querySelectorAll('.activity-item');
    items.forEach(item => {
        const title = item.querySelector('.act-title')?.textContent.toLowerCase() || '';
        const desc = item.querySelector('.act-desc')?.textContent.toLowerCase() || '';
        if (title.includes(term) || desc.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}