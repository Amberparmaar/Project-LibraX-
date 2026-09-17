

// ===========================================
// search baar & notification 
// =============================================



/**
 * LibraX - Top Bar Features (Global Search Bar & Notification Bell System)
 */

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------
    // 1. DATA ACCESSORS (From LocalStorage)
    // -------------------------------------------------------------
    const getBooks = () => JSON.parse(localStorage.getItem('librax_books')) || [];
    const getMembers = () => JSON.parse(localStorage.getItem('librax_members')) || [];
    const getIssued = () => JSON.parse(localStorage.getItem('librax_issued_books')) || [];

    // -------------------------------------------------------------
    // 2. DYNAMIC NOTIFICATION BELL SYSTEM
    // -------------------------------------------------------------
    function setupNotificationBell() {
        // Select Bell Icon (Supports class or icon element)
        const bellBtn = document.querySelector('.fa-bell, .bell-icon, .notification-btn')?.parentElement || document.querySelector('.fa-bell');
        
        if (!bellBtn) return;

        // Make Bell Relative for Badge Position
        bellBtn.style.position = 'relative';
        bellBtn.style.cursor = 'pointer';

        // Calculate System Alerts (e.g. Overdue books)
        const issued = getIssued();
        const overdueBooks = issued.filter(item => item.status === 'Overdue' || item.fine > 0);
        
        const notifications = [
            ...overdueBooks.map(b => ({
                title: 'Overdue Book Alert',
                desc: `"${b.bookTitle}" is overdue by ${b.studentName}`,
                time: 'Action Required',
                type: 'danger'
            })),
            {
                title: 'New Member Registered',
                desc: 'Nishat Afza joined as a Student',
                time: 'Today',
                type: 'info'
            },
            {
                title: 'System Maintenance',
                desc: 'Library database synced with LocalStorage',
                time: 'Just now',
                type: 'success'
            }
        ];

        // Add Red Badge to Bell Icon
        const badge = document.createElement('span');
        badge.id = 'notif-badge';
        badge.innerText = notifications.length;
        badge.style.cssText = `
            position: absolute; top: -5px; right: -5px;
            background: #ef4444; color: #fff; font-size: 11px;
            font-weight: bold; border-radius: 50%; padding: 2px 6px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        bellBtn.appendChild(badge);

        // Create Dropdown Menu Container
        const dropdown = document.createElement('div');
        dropdown.id = 'notif-dropdown';
        dropdown.style.cssText = `
            display: none; position: absolute; top: 45px; right: 0;
            width: 320px; background: #ffffff; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
            z-index: 10000; overflow: hidden; animation: fadeIn 0.2s ease-in-out;
        `;

        // Render Notifications List
        let listHTML = `
            <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 14px; color: #0f172a;">Notifications</strong>
                <span style="font-size: 11px; background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 10px;">${notifications.length} New</span>
            </div>
            <div style="max-height: 280px; overflow-y: auto;">
        `;

        notifications.forEach(item => {
            const color = item.type === 'danger' ? '#ef4444' : item.type === 'info' ? '#2563eb' : '#10b981';
            listHTML += `
                <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 10px; align-items: start;">
                    <span style="height: 8px; width: 8px; background: ${color}; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></span>
                    <div>
                        <h6 style="margin: 0; font-size: 13px; font-weight: 600; color: #1e293b;">${item.title}</h6>
                        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">${item.desc}</p>
                        <small style="font-size: 10px; color: #94a3b8;">${item.time}</small>
                    </div>
                </div>
            `;
        });

        listHTML += `</div>`;
        dropdown.innerHTML = listHTML;
        bellBtn.appendChild(dropdown);

        // Toggle Bell Dropdown
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) {
                badge.style.display = 'none'; // Mark as read
            }
        });

        // Close on outside click
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }

    // -------------------------------------------------------------
    // 3. GLOBAL SEARCH BAR SYSTEM
    // -------------------------------------------------------------
    function setupGlobalSearch() {
        const searchInput = document.querySelector('.toprow .input.srch, input[type="search"], .search-input');
        if (!searchInput) return;

        // Create Search Results Dropdown Overlay
        const searchContainer = searchInput.parentElement;
        if (searchContainer) searchContainer.style.position = 'relative';

        const searchResultsBox = document.createElement('div');
        searchResultsBox.id = 'search-results-box';
        searchResultsBox.style.cssText = `
            display: none; position: absolute; top: 100%; left: 0; width: 100%;
            background: #ffffff; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            border: 1px solid #e2e8f0; z-index: 9999; max-height: 300px; overflow-y: auto; margin-top: 5px;
        `;
        searchContainer.appendChild(searchResultsBox);

        // Real-Time Filter Listener
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (!query) {
                searchResultsBox.style.display = 'none';
                return;
            }

            const books = getBooks();
            const members = getMembers();

            // Filter Matching Records
            const matchedBooks = books.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));
            const matchedMembers = members.filter(m => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query));

            if (matchedBooks.length === 0 && matchedMembers.length === 0) {
                searchResultsBox.innerHTML = `<div style="padding: 12px; font-size: 13px; color: #64748b; text-align: center;">No results found for "${query}"</div>`;
            } else {
                let html = '';

                if (matchedBooks.length > 0) {
                    html += `<div style="padding: 8px 12px; background: #f8fafc; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Books (${matchedBooks.length})</div>`;
                    matchedBooks.forEach(b => {
                        html += `
                            <div style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                                 onclick="alert('Book Details:\\nTitle: ${b.title}\\nAuthor: ${b.author}\\nStatus: ${b.status}')">
                                <div>
                                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${b.title}</div>
                                    <div style="font-size: 11px; color: #64748b;">${b.author} • ${b.category}</div>
                                </div>
                                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${b.status === 'Available' ? '#dcfce7' : '#fef3c7'}; color: ${b.status === 'Available' ? '#15803d' : '#b45309'}; font-weight: 600;">${b.status}</span>
                            </div>
                        `;
                    });
                }

                if (matchedMembers.length > 0) {
                    html += `<div style="padding: 8px 12px; background: #f8fafc; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Members (${matchedMembers.length})</div>`;
                    matchedMembers.forEach(m => {
                        html += `
                            <div style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer;"
                                 onclick="alert('Member Details:\\nName: ${m.name}\\nRole: ${m.role}\\nEmail: ${m.email}')">
                                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${m.name}</div>
                                <div style="font-size: 11px; color: #64748b;">${m.email} (${m.role})</div>
                            </div>
                        `;
                    });
                }

                searchResultsBox.innerHTML = html;
            }

            searchResultsBox.style.display = 'block';
        });

        // Close search results box on click outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                searchResultsBox.style.display = 'none';
            }
        });
    }

    // -------------------------------------------------------------
    // 4. INITIALIZATION
    // -------------------------------------------------------------
    setupNotificationBell();
    setupGlobalSearch();
});



















// ================================================
// =================================================



//  * LibraX - Library Management System
//  * Admin Dashboard Functional Controller
//  * Tech Stack: Vanilla JS (ES6+) & Chart.js
//  */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. INITIALIZE SEED / DUMMY DATA IN LOCALSTORAGE
    // -------------------------------------------------------------
    function initLocalStorageData() {
        if (!localStorage.getItem('librax_books')) {
            const initialBooks = [
                { id: 'BK101', title: 'Atomic Habits', author: 'James Clear', category: 'Productivity', status: 'Available', isIssued: false },
                { id: 'BK102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', status: 'Available', isIssued: false },
                { id: 'BK103', title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Finance', status: 'Issued', isIssued: true },
                { id: 'BK104', title: 'Deep Work', author: 'Cal Newport', category: 'Productivity', status: 'Available', isIssued: false },
                { id: 'BK105', title: 'You Don\'t Know JS', author: 'Kyle Simpson', category: 'Programming', status: 'Issued', isIssued: true },
                { id: 'BK106', title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', category: 'Finance', status: 'Issued', isIssued: true },
                { id: 'BK107', title: 'Think and Grow Rich', author: 'Napoleon Hill', category: 'Personal Growth', status: 'Available', isIssued: false },
                { id: 'BK108', title: 'The 7 Habits of Highly Effective People', author: 'Stephen Covey', category: 'Self Help', status: 'Available', isIssued: false }
            ];
            localStorage.setItem('librax_books', JSON.stringify(initialBooks));
        }

        if (!localStorage.getItem('librax_members')) {
            const initialMembers = [
                { id: 'MEM001', name: 'Ali Raza', email: 'ali@example.com', role: 'Student' },
                { id: 'MEM002', name: 'Sara Khan', email: 'sara@example.com', role: 'Student' },
                { id: 'MEM003', name: 'Usman Ahmed', email: 'usman@example.com', role: 'Student' },
                { id: 'MEM004', name: 'Nishat Afza', email: 'nishat@example.com', role: 'Student' }
            ];
            localStorage.setItem('librax_members', JSON.stringify(initialMembers));
        }

        if (!localStorage.getItem('librax_issued_books')) {
            const today = new Date();
            const pastDue = new Date();
            pastDue.setDate(today.getDate() - 5); // 5 days overdue

            const initialIssues = [
                {
                    issueId: 'ISS001',
                    bookId: 'BK103',
                    bookTitle: 'The Psychology of Money',
                    studentId: 'MEM001',
                    studentName: 'Ali Raza',
                    issueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    returnDate: null,
                    status: 'Issued',
                    fine: 0
                },
                {
                    issueId: 'ISS002',
                    bookId: 'BK105',
                    bookTitle: 'You Don\'t Know JS',
                    studentId: 'MEM002',
                    studentName: 'Sara Khan',
                    issueDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dueDate: pastDue.toISOString().split('T')[0],
                    returnDate: null,
                    status: 'Overdue',
                    fine: 50 // 5 days * 10
                }
            ];
            localStorage.setItem('librax_issued_books', JSON.stringify(initialIssues));
        }

        if (!localStorage.getItem('librax_activities')) {
            const initialActivities = [
                { action: 'New book added', detail: 'Atomic Habits', time: '2 min ago', type: 'blue', icon: 'fa-arrow-trend-up' },
                { action: 'Book issued to', detail: 'Ali Raza', time: '15 min ago', type: 'green', icon: 'fa-book-open' },
                { action: 'New member registered', detail: 'Sara Khan', time: '1 hour ago', type: 'purple', icon: 'fa-users' },
                { action: 'Book returned by', detail: 'Usman Ahmed', time: '2 hours ago', type: 'red', icon: 'fa-circle-left' }
            ];
            localStorage.setItem('librax_activities', JSON.stringify(initialActivities));
        }

        if (!localStorage.getItem('librax_fines')) {
            localStorage.setItem('librax_fines', '150'); // Rs. 150 default collected
        }
    }

    initLocalStorageData();

    // -------------------------------------------------------------
    // 2. HELPER DATA ACCESSORS
    // -------------------------------------------------------------
    const getBooks = () => JSON.parse(localStorage.getItem('librax_books')) || [];
    const getMembers = () => JSON.parse(localStorage.getItem('librax_members')) || [];
    const getIssuedBooks = () => JSON.parse(localStorage.getItem('librax_issued_books')) || [];
    const getActivities = () => JSON.parse(localStorage.getItem('librax_activities')) || [];
    const getFines = () => parseFloat(localStorage.getItem('librax_fines')) || 0;

    // -------------------------------------------------------------
    // 3. TOAST NOTIFICATIONS HELPER
    // -------------------------------------------------------------
    function createToastContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
    }

    function showToast(message, type = 'success') {
        createToastContainer();
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.style.cssText = `
            min-width: 250px;
            padding: 12px 20px;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add activity log
    function logActivity(action, detail, type = 'blue', icon = 'fa-arrow-trend-up') {
        const activities = getActivities();
        activities.unshift({ action, detail, time: 'Just now', type, icon });
        if (activities.length > 5) activities.pop();
        localStorage.setItem('librax_activities', JSON.stringify(activities));
        renderActivities();
    }

    // -------------------------------------------------------------
    // 4. REAL-TIME STATS UPDATE
    // -------------------------------------------------------------
    function updateDashboardStats() {
        const books = getBooks();
        const members = getMembers();
        const issued = getIssuedBooks();
        const fines = getFines();

        const totalBooks = books.length;
        const totalMembers = members.length;
        const totalIssued = issued.filter(i => i.status === 'Issued' || i.status === 'Overdue').length;
        const totalOverdue = issued.filter(i => i.status === 'Overdue').length;

        // Calculate Success Rate (Returned vs Total Transactions)
        const totalReturned = issued.filter(i => i.status === 'Returned').length;
        const totalTransactions = issued.length;
        const successRate = totalTransactions > 0 ? Math.round((totalReturned / totalTransactions) * 100) : 100;

        // Map to DOM Cards in exact order
        const dashCards = document.querySelectorAll('.dashboardcards .dash-card');
        if (dashCards.length >= 6) {
            // Card 1: Total Books
            dashCards[0].querySelector('h2').innerText = `${totalBooks}`;
            dashCards[0].querySelector('p').innerText = 'Total Books';

            // Card 2: Total Members
            dashCards[1].querySelector('h2').innerText = `${totalMembers}`;
            dashCards[1].querySelector('p').innerText = 'Total Members';

            // Card 3: Books Issued
            dashCards[2].querySelector('h2').innerText = `${totalIssued}`;
            dashCards[2].querySelector('p').innerText = 'Books Issued';

            // Card 4: Overdue Books
            dashCards[3].querySelector('h2').innerText = `${totalOverdue}`;
            dashCards[3].querySelector('p').innerText = 'Overdue Books';

            // Card 5: Fines Collected
            dashCards[4].querySelector('h2').innerText = `Rs. ${fines}`;
            dashCards[4].querySelector('p').innerText = 'Fines Collected';

            // Card 6: Success Rate
            dashCards[5].querySelector('h2').innerText = `${successRate}%`;
            dashCards[5].querySelector('p').innerText = 'Return Rate';
        }
    }

    // -------------------------------------------------------------
    // 5. CHART.JS IMPLEMENTATION FOR REPORTS
    // -------------------------------------------------------------
    function setupCharts() {
        const books = getBooks();

        // --- Chart 1: Replace Mock Bar Chart with Chart.js Canvas ---
        const barWrapper = document.querySelector('.mock-bar-chart');
        if (barWrapper) {
            barWrapper.innerHTML = '<canvas id="activityBarChart" style="max-height: 200px; width: 100%;"></canvas>';
            const ctxBar = document.getElementById('activityBarChart').getContext('2d');
            new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Issued',
                            data: [60, 85, 45, 75, 90, 65],
                            backgroundColor: '#2563eb',
                            borderRadius: 4
                        },
                        {
                            label: 'Returned',
                            data: [40, 70, 55, 60, 80, 50],
                            backgroundColor: '#f43f5e',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
                    }
                }
            });
        }

        // --- Chart 2: Replace Mock Donut Chart with Chart.js ---
        const donutWrapper = document.querySelector('.chart-donut-wrapper');
        if (donutWrapper) {
            donutWrapper.innerHTML = '<canvas id="categoryDonutChart" style="max-height: 180px; width: 100%;"></canvas>';

            // Count category distribution dynamically
            const categories = ['Programming', 'Finance', 'Productivity', 'Self Help', 'Personal Growth'];
            const categoryCounts = categories.map(cat => books.filter(b => b.category === cat).length);

            const ctxDonut = document.getElementById('categoryDonutChart').getContext('2d');
            new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: categoryCounts,
                        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '70%'
                }
            });
        }
    }

    // -------------------------------------------------------------
    // 6. RENDER RECENT ACTIVITIES
    // -------------------------------------------------------------
    function renderActivities() {
        const activityGrid = document.querySelector('.activity-grid');
        if (!activityGrid) return;

        const activities = getActivities();
        activityGrid.innerHTML = activities.map(act => `
            <div class="activity-card">
              <div class="activity-icon ${act.type || 'blue'}">
                <i class="fa-solid ${act.icon || 'fa-arrow-trend-up'}"></i>
              </div>
              <div class="activity-content">
                <h6>${act.action}</h6>
                <p>${act.detail}</p>
              </div>
              <span class="time">${act.time}</span>
            </div>
        `).join('');
    }

    // -------------------------------------------------------------
    // 7. ISSUE & RETURN SYSTEM SIMULATOR / HANDLERS
    // -------------------------------------------------------------
    function issueBook(studentId, bookId) {
        const books = getBooks();
        const members = getMembers();

        const book = books.find(b => b.id === bookId);
        const member = members.find(m => m.id === studentId);

        if (!book) return showToast('Book ID not found!', 'error');
        if (book.isIssued) return showToast('Book is already issued!', 'error');
        if (!member) return showToast('Student ID not found!', 'error');

        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 14);

        const newIssue = {
            issueId: 'ISS' + Math.floor(1000 + Math.random() * 9000),
            bookId: book.id,
            bookTitle: book.title,
            studentId: member.id,
            studentName: member.name,
            issueDate: today.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            returnDate: null,
            status: 'Issued',
            fine: 0
        };

        // Update Book Status
        book.isIssued = true;
        book.status = 'Issued';

        const issuedList = getIssuedBooks();
        issuedList.push(newIssue);

        localStorage.setItem('librax_books', JSON.stringify(books));
        localStorage.setItem('librax_issued_books', JSON.stringify(issuedList));

        logActivity('Book issued to', member.name, 'green', 'fa-book-open');
        showToast(`Book "${book.title}" successfully issued to ${member.name}`);
        updateDashboardStats();
    }

    function returnBook(issueId) {
        const issuedList = getIssuedBooks();
        const issueRecord = issuedList.find(i => i.issueId === issueId && i.status !== 'Returned');

        if (!issueRecord) return showToast('Active record not found!', 'error');

        const today = new Date();
        const dueDate = new Date(issueRecord.dueDate);
        let fine = 0;

        if (today > dueDate) {
            const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            fine = diffDays * 10; // Rs. 10 per day
        }

        issueRecord.status = 'Returned';
        issueRecord.returnDate = today.toISOString().split('T')[0];
        issueRecord.fine = fine;

        // Release Book
        const books = getBooks();
        const book = books.find(b => b.id === issueRecord.bookId);
        if (book) {
            book.isIssued = false;
            book.status = 'Available';
            localStorage.setItem('librax_books', JSON.stringify(books));
        }

        if (fine > 0) {
            const currentFines = getFines();
            localStorage.setItem('librax_fines', (currentFines + fine).toString());
        }

        localStorage.setItem('librax_issued_books', JSON.stringify(issuedList));

        logActivity('Book returned by', issueRecord.studentName, 'red', 'fa-circle-left');
        showToast(`Book returned successfully.${fine > 0 ? ' Fine collected: Rs. ' + fine : ''}`);
        updateDashboardStats();
    }

    // Global Top Bar Search Action
    const topSearchInput = document.querySelector('.toprow .input.srch');
    if (topSearchInput) {
        topSearchInput.addEventListener('keyup', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) return;

            const books = getBooks();
            const filtered = books.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));

            if (e.key === 'Enter') {
                if (filtered.length > 0) {
                    showToast(`Found ${filtered.length} matching books in database.`);
                } else {
                    showToast('No matching records found.', 'error');
                }
            }
        });
    }

    // -------------------------------------------------------------
    // 8. INITIAL RENDERS
    // -------------------------------------------------------------
    updateDashboardStats();
    renderActivities();
    setupCharts();
});


/**
 * LibraX - Admin Dashboard Complete Functional Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. DATA INITIALIZATION & LOCALSTORAGE
    // -------------------------------------------------------------
    let books = JSON.parse(localStorage.getItem('librax_books')) || [
        { id: 'BK101', title: 'Atomic Habits', author: 'James Clear', category: 'Productivity', status: 'Available' },
        { id: 'BK102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', status: 'Available' },
        { id: 'BK103', title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Finance', status: 'Issued' },
        { id: 'BK104', title: 'Deep Work', author: 'Cal Newport', category: 'Productivity', status: 'Available' }
    ];

    let members = JSON.parse(localStorage.getItem('librax_members')) || [
        { id: 'MEM001', name: 'Ali Raza', email: 'ali@example.com', role: 'Student' },
        { id: 'MEM002', name: 'Sara Khan', email: 'sara@example.com', role: 'Student' }
    ];

    let issuedBooks = JSON.parse(localStorage.getItem('librax_issued_books')) || [
        { issueId: 'ISS101', bookId: 'BK103', studentName: 'Ali Raza', issueDate: '2026-09-01', status: 'Issued' }
    ];

    function saveData() {
        localStorage.setItem('librax_books', JSON.stringify(books));
        localStorage.setItem('librax_members', JSON.stringify(members));
        localStorage.setItem('librax_issued_books', JSON.stringify(issuedBooks));
        updateDashboardCounters();
    }

    // -------------------------------------------------------------
    // 2. DASHBOARD COUNTERS UPDATE
    // -------------------------------------------------------------
    function updateDashboardCounters() {
        const totalBooksEl = document.querySelector('#total-books-count, .dash-card:nth-child(1) h2');
        const totalMembersEl = document.querySelector('#total-members-count, .dash-card:nth-child(2) h2');
        const issuedCountEl = document.querySelector('#issued-books-count, .dash-card:nth-child(3) h2');
        const overdueCountEl = document.querySelector('#overdue-books-count, .dash-card:nth-child(4) h2');

        const activeIssued = issuedBooks.filter(i => i.status === 'Issued').length;
        const overdue = issuedBooks.filter(i => i.status === 'Overdue').length;

        if (totalBooksEl) totalBooksEl.innerText = books.length;
        if (totalMembersEl) totalMembersEl.innerText = members.length;
        if (issuedCountEl) issuedCountEl.innerText = activeIssued;
        if (overdueCountEl) overdueCountEl.innerText = overdue;
    }

    // -------------------------------------------------------------
    // 3. UPPER BUTTONS & MODAL FUNCTIONALITY
    // -------------------------------------------------------------
    // Button selectors matching top action bar
    const btnAddBook = document.querySelector('#btnAddBook, .btn-add-book, button[data-action="add-book"]');
    const btnIssueBook = document.querySelector('#btnIssueBook, .btn-issue-book, button[data-action="issue-book"]');
    const btnAddMember = document.querySelector('#btnAddMember, .btn-add-member, button[data-action="add-member"]');

    // Generic Modal triggers
    if (btnAddBook) {
        btnAddBook.addEventListener('click', () => {
            const title = prompt("Enter Book Title:");
            const author = prompt("Enter Author Name:");
            const category = prompt("Enter Category:");
            if (title && author) {
                const newBook = {
                    id: 'BK' + Math.floor(100 + Math.random() * 900),
                    title,
                    author,
                    category: category || 'General',
                    status: 'Available'
                };
                books.push(newBook);
                saveData();
                alert(`Book "${title}" added successfully!`);
            }
        });
    }

    if (btnIssueBook) {
        btnIssueBook.addEventListener('click', () => {
            const bookId = prompt("Enter Book ID to Issue (e.g. BK101):");
            const studentName = prompt("Enter Student Name:");
            const book = books.find(b => b.id === bookId && b.status === 'Available');

            if (book) {
                book.status = 'Issued';
                issuedBooks.push({
                    issueId: 'ISS' + Math.floor(100 + Math.random() * 900),
                    bookId: book.id,
                    studentName: studentName || 'Student',
                    issueDate: new Date().toISOString().split('T')[0],
                    status: 'Issued'
                });
                saveData();
                alert(`Book "${book.title}" issued to ${studentName}!`);
            } else {
                alert("Book not available or invalid Book ID.");
            }
        });
    }

    if (btnAddMember) {
        btnAddMember.addEventListener('click', () => {
            const name = prompt("Enter Member Name:");
            const email = prompt("Enter Member Email:");
            if (name) {
                members.push({
                    id: 'MEM' + Math.floor(100 + Math.random() * 900),
                    name,
                    email: email || 'N/A',
                    role: 'Student'
                });
                saveData();
                alert(`Member "${name}" registered successfully!`);
            }
        });
    }

    // -------------------------------------------------------------
    // 4. TOP SEARCH BAR FILTERING
    // -------------------------------------------------------------
    const searchInput = document.querySelector('.toprow .input.srch, input[type="search"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const matchedBooks = books.filter(b => 
                b.title.toLowerCase().includes(query) || 
                b.author.toLowerCase().includes(query) ||
                b.id.toLowerCase().includes(query)
            );
            
            // Console check or update dynamic UI table if exists
            console.log("Search Results:", matchedBooks);
        });
    }

    // Initial Load Call
    saveData();
});












/**
 * LibraX - Fully Interactive Admin Dashboard Controller
 * Smart Library Management System
 */

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------
    // 1. DATA INITIALIZATION (LocalStorage Persistence)
    // -------------------------------------------------------------
    function initData() {
        if (!localStorage.getItem('librax_books')) {
            const initialBooks = [
                { id: 'BK101', title: 'Atomic Habits', author: 'James Clear', category: 'Productivity', status: 'Available' },
                { id: 'BK102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', status: 'Available' },
                { id: 'BK103', title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Finance', status: 'Issued' },
                { id: 'BK104', title: 'Deep Work', author: 'Cal Newport', category: 'Productivity', status: 'Available' },
                { id: 'BK105', title: 'You Dont Know JS', author: 'Kyle Simpson', category: 'Programming', status: 'Issued' },
                { id: 'BK106', title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', category: 'Finance', status: 'Available' }
            ];
            localStorage.setItem('librax_books', JSON.stringify(initialBooks));
        }

        if (!localStorage.getItem('librax_members')) {
            const initialMembers = [
                { id: 'MEM001', name: 'Ali Raza', email: 'ali@example.com', role: 'Student', joinDate: '2026-09-01' },
                { id: 'MEM002', name: 'Sara Khan', email: 'sara@example.com', role: 'Student', joinDate: '2026-09-05' },
                { id: 'MEM003', name: 'Usman Ahmed', email: 'usman@example.com', role: 'Student', joinDate: '2026-09-10' },
                { id: 'MEM004', name: 'Nishat Afza', email: 'nishat@example.com', role: 'Student', joinDate: '2026-09-12' }
            ];
            localStorage.setItem('librax_members', JSON.stringify(initialMembers));
        }

        if (!localStorage.getItem('librax_issued_books')) {
            const initialIssues = [
                { issueId: 'ISS001', bookId: 'BK103', bookTitle: 'The Psychology of Money', studentName: 'Ali Raza', date: '2026-09-02', month: 'Sep', status: 'Issued' },
                { issueId: 'ISS002', bookId: 'BK105', bookTitle: 'You Dont Know JS', studentName: 'Sara Khan', date: '2026-09-08', month: 'Sep', status: 'Issued' }
            ];
            localStorage.setItem('librax_issued_books', JSON.stringify(initialIssues));
        }

        if (!localStorage.getItem('librax_returned_books')) {
            const initialReturns = [
                { returnId: 'RET001', bookId: 'BK101', bookTitle: 'Atomic Habits', studentName: 'Usman Ahmed', date: '2026-09-11', month: 'Sep' }
            ];
            localStorage.setItem('librax_returned_books', JSON.stringify(initialReturns));
        }

        if (!localStorage.getItem('librax_activities')) {
            const initialActivities = [
                { id: 'act-books', action: 'New book added', detail: 'Atomic Habits added', time: 'Recently', type: 'blue', icon: 'fa-plus' },
                { id: 'act-issued', action: 'Book issued to', detail: 'Ali Raza & Sara Khan', time: 'Active', type: 'green', icon: 'fa-book-open' },
                { id: 'act-members', action: 'New member registered', detail: '4 Active Members', time: 'This Month', type: 'purple', icon: 'fa-users' },
                { id: 'act-returned', action: 'Book returned by', detail: 'Usman Ahmed', time: 'Yesterday', type: 'red', icon: 'fa-rotate-left' }
            ];
            localStorage.setItem('librax_activities', JSON.stringify(initialActivities));
        }
    }

    initData();

    // Data Accessors
    const getBooks = () => JSON.parse(localStorage.getItem('librax_books')) || [];
    const getMembers = () => JSON.parse(localStorage.getItem('librax_members')) || [];
    const getIssued = () => JSON.parse(localStorage.getItem('librax_issued_books')) || [];
    const getReturns = () => JSON.parse(localStorage.getItem('librax_returned_books')) || [];

    let barChartInstance = null;
    let donutChartInstance = null;

    // -------------------------------------------------------------
    // 2. DYNAMIC CHARTS (Monthly Issue/Return & Category Breakdown)
    // -------------------------------------------------------------
    function renderCharts() {
        const books = getBooks();
        const issued = getIssued();
        const returns = getReturns();

        // --- Monthly Issue & Return Bar Chart ---
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const issuedMonthlyCount = new Array(12).fill(0);
        const returnedMonthlyCount = new Array(12).fill(0);

        // Count per month dynamically
        issued.forEach(item => {
            const monthIdx = months.indexOf(item.month || 'Sep');
            if (monthIdx !== -1) issuedMonthlyCount[monthIdx]++;
        });

        returns.forEach(item => {
            const monthIdx = months.indexOf(item.month || 'Sep');
            if (monthIdx !== -1) returnedMonthlyCount[monthIdx]++;
        });

        const barWrapper = document.querySelector('.mock-bar-chart');
        if (barWrapper) {
            barWrapper.innerHTML = '<canvas id="monthlyActivityChart" style="max-height: 220px; width: 100%;"></canvas>';
            const ctxBar = document.getElementById('monthlyActivityChart').getContext('2d');
            
            if (barChartInstance) barChartInstance.destroy();
            barChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        { label: 'Books Issued', data: issuedMonthlyCount, backgroundColor: '#2563eb', borderRadius: 5 },
                        { label: 'Books Returned', data: returnedMonthlyCount, backgroundColor: '#10b981', borderRadius: 5 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top' } },
                    scales: { y: { beginAtZero: true, stepSize: 1 } }
                }
            });
        }

        // --- Books by Category Donut Chart ---
        const categoryMap = {};
        books.forEach(b => {
            categoryMap[b.category] = (categoryMap[b.category] || 0) + 1;
        });

        const catLabels = Object.keys(categoryMap);
        const catCounts = Object.values(categoryMap);

        const donutWrapper = document.querySelector('.chart-donut-wrapper');
        if (donutWrapper) {
            donutWrapper.innerHTML = '<canvas id="categoryChart" style="max-height: 200px; width: 100%;"></canvas>';
            const ctxDonut = document.getElementById('categoryChart').getContext('2d');
            
            if (donutChartInstance) donutChartInstance.destroy();
            donutChartInstance = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{
                        data: catCounts,
                        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' } },
                    cutout: '65%'
                }
            });
        }
    }

    // -------------------------------------------------------------
    // 3. POPUP MODAL COMPONENT (For Detailed Activity Card Views)
    // -------------------------------------------------------------
    function createModalHTML() {
        if (document.getElementById('librax-detail-modal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'librax-detail-modal';
        modalDiv.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;
        `;

        modalDiv.innerHTML = `
            <div style="background: #fff; border-radius: 12px; width: 90%; max-width: 550px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
                    <h5 id="modal-title" style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">Details</h5>
                    <button id="close-modal-btn" style="background: transparent; border: none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
                </div>
                <div id="modal-body" style="max-height: 350px; overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            modalDiv.style.display = 'none';
        });

        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) modalDiv.style.display = 'none';
        });
    }

    function openDetailModal(title, htmlContent) {
        createModalHTML();
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = htmlContent;
        document.getElementById('librax-detail-modal').style.display = 'flex';
    }

    // -------------------------------------------------------------
    // 4. CLICKABLE ACTIVITY CARDS LOGIC
    // -------------------------------------------------------------
    function attachActivityCardClicks() {
        const cards = document.querySelectorAll('.activity-card');
        
        cards.forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const text = card.innerText.toLowerCase();

                // Card 1: New Member Registered
                if (text.includes('member') || text.includes('user')) {
                    const members = getMembers();
                    let listHTML = `<ul style="list-style: none; padding: 0;">`;
                    members.forEach(m => {
                        listHTML += `
                            <li style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                <div><strong>${m.name}</strong> (${m.role})<br><small style="color:#64748b;">${m.email}</small></div>
                                <span style="font-size: 12px; color: #10b981; font-weight: 600;">ID: ${m.id}</span>
                            </li>`;
                    });
                    listHTML += `</ul>`;
                    openDetailModal('Registered Members List', listHTML);
                }
                
                // Card 2: Book Issued To
                else if (text.includes('issued') || text.includes('issue')) {
                    const issued = getIssued();
                    let listHTML = `<ul style="list-style: none; padding: 0;">`;
                    if (issued.length === 0) listHTML = `<p>No active issued books.</p>`;
                    issued.forEach(i => {
                        listHTML += `
                            <li style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                <div><strong>${i.bookTitle}</strong><br><small style="color:#64748b;">Issued to: ${i.studentName}</small></div>
                                <span style="font-size: 12px; color: #2563eb; font-weight: 600;">Date: ${i.date}</span>
                            </li>`;
                    });
                    listHTML += `</ul>`;
                    openDetailModal('Books Issued List', listHTML);
                }

                // Card 3: Book Returned By
                else if (text.includes('returned') || text.includes('return')) {
                    const returns = getReturns();
                    let listHTML = `<ul style="list-style: none; padding: 0;">`;
                    if (returns.length === 0) listHTML = `<p>No returned books recorded yet.</p>`;
                    returns.forEach(r => {
                        listHTML += `
                            <li style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                <div><strong>${r.bookTitle}</strong><br><small style="color:#64748b;">Returned by: ${r.studentName}</small></div>
                                <span style="font-size: 12px; color: #10b981; font-weight: 600;">${r.date}</span>
                            </li>`;
                    });
                    listHTML += `</ul>`;
                    openDetailModal('Books Returned History', listHTML);
                }

                // Card 4: New Book Added
                else if (text.includes('book added') || text.includes('book')) {
                    const books = getBooks();
                    let listHTML = `<ul style="list-style: none; padding: 0;">`;
                    books.forEach(b => {
                        listHTML += `
                            <li style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                                <div><strong>${b.title}</strong><br><small style="color:#64748b;">By ${b.author} | Category: ${b.category}</small></div>
                                <span style="font-size: 12px; color: ${b.status === 'Available' ? '#10b981' : '#f59e0b'}; font-weight: 600;">${b.status}</span>
                            </li>`;
                    });
                    listHTML += `</ul>`;
                    openDetailModal('All Library Books', listHTML);
                }
            });
        });
    }

    // -------------------------------------------------------------
    // 5. UPDATE DASHBOARD NUMBERS & INITIALIZE
    // -------------------------------------------------------------
    function updateCounters() {
        const books = getBooks();
        const members = getMembers();
        const issued = getIssued();

        const dashCards = document.querySelectorAll('.dash-card h2');
        if (dashCards.length >= 4) {
            dashCards[0].innerText = books.length;
            dashCards[1].innerText = members.length;
            dashCards[2].innerText = issued.filter(i => i.status === 'Issued').length;
            dashCards[3].innerText = issued.filter(i => i.status === 'Overdue').length;
        }
    }

    updateCounters();
    renderCharts();
    attachActivityCardClicks();
});