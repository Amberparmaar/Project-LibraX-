import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "../JS/firebase/firebase-config.js";

// Helper function for safe HTML string rendering
function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const membersCollection = collection(db, "users");
let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const membersPerPage = 3;
let editingMemberId = null;

// DOM Selectors
const memberTableBody = document.getElementById("memberTableBody");
const memberSearchInput = document.getElementById("memberSearchInput");
const memberStatusFilter = document.getElementById("memberStatusFilter");
const memberPagination = document.getElementById("memberPagination");
const memberResultText = document.getElementById("memberResultText");
const openMemberModalBtn = document.getElementById("openMemberModalBtn");
const memberForm = document.getElementById("memberForm");
const memberModalTitle = document.getElementById("memberModalTitle");
const memberSaveBtn = document.getElementById("memberSaveBtn");
const memberDocumentId = document.getElementById("memberDocumentId");
const memberNameInput = document.getElementById("memberNameInput");
const memberEmailInput = document.getElementById("memberEmailInput");
const memberPhoneInput = document.getElementById("memberPhoneInput");
const memberDepartmentInput = document.getElementById("memberDepartmentInput");
const memberStatusInput = document.getElementById("memberStatusInput");

const modalEl = document.getElementById("memberFormModal");
const memberModal = modalEl ? new bootstrap.Modal(modalEl) : null;

// Load Users from Firestore (Query filtered by role == "user")
async function loadMembers() {
  if (!memberTableBody) return;

  try {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 mb-0">Loading registered users...</p>
        </td>
      </tr>
    `;

    // Updated Query: Matching role == "user" directly
    const membersQuery = query(membersCollection, where("role", "==", "user"));
    const snapshot = await getDocs(membersQuery);

    allMembers = [];
    snapshot.forEach((docSnap) => {
      allMembers.push({
        firebaseId: docSnap.id,
        ...docSnap.data()
      });
    });

    allMembers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    filteredMembers = [...allMembers];
    currentPage = 1;

    displayMembers();
  } catch (error) {
    console.error("Error loading members:", error);
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i>
          <p class="m-0">Failed to load data.</p>
        </td>
      </tr>
    `;
  }
}

// Display Data in Dynamic Table
function displayMembers() {
  if (!memberTableBody) return;

  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const pageMembers = filteredMembers.slice(startIndex, endIndex);

  if (pageMembers.length === 0) {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <p class="mb-0">No registered users found.</p>
        </td>
      </tr>
    `;
    if (memberResultText) memberResultText.textContent = "Showing 0 users";
    if (memberPagination) memberPagination.innerHTML = "";
    return;
  }

  memberTableBody.innerHTML = "";

  pageMembers.forEach((member) => {
    const isActive = member.isActive !== false;
    const memberStatus = isActive ? "Active" : "Inactive";
    const statusClass = isActive ? "badge bg-success" : "badge bg-secondary";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHTML(member.uid ? member.uid.substring(0, 8) : "MEM-" + member.firebaseId.substring(0, 5))}</strong></td>
      <td><strong>${escapeHTML(member.name || "N/A")}</strong></td>
      <td>${escapeHTML(member.email || "N/A")}</td>
      <td>${escapeHTML(member.contact || "N/A")}</td>
      <td>${escapeHTML(member.department || "N/A")}</td>
      <td><span class="${statusClass}">${memberStatus}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary member-action-btn me-1" data-action="edit" data-id="${member.firebaseId}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger member-action-btn" data-action="delete" data-id="${member.firebaseId}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    memberTableBody.appendChild(row);
  });

  updatePagination();
}

// Add/Update User Event
if (memberForm) {
  memberForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const memberData = {
      name: memberNameInput.value.trim(),
      email: memberEmailInput.value.trim(),
      contact: memberPhoneInput.value.trim(),
      department: memberDepartmentInput.value.trim(),
      role: "user", // Consistently saving role as "user"
      isActive: memberStatusInput.value === "Active"
    };

    try {
      memberSaveBtn.disabled = true;

      if (editingMemberId) {
        await updateDoc(doc(db, "users", editingMemberId), memberData);
      } else {
        memberData.createdAt = serverTimestamp();
        await addDoc(membersCollection, memberData);
      }

      memberForm.reset();
      editingMemberId = null;
      if (memberModal) memberModal.hide();
      await loadMembers();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      memberSaveBtn.disabled = false;
    }
  });
}

// Modal Toggle Trigger
if (openMemberModalBtn) {
  openMemberModalBtn.addEventListener("click", () => {
    editingMemberId = null;
    if (memberForm) memberForm.reset();
    if (memberDocumentId) memberDocumentId.value = "";
    if (memberModalTitle) memberModalTitle.textContent = "Add New User";
    if (memberSaveBtn) memberSaveBtn.textContent = "Save User";
    if (memberModal) memberModal.show();
  });
}

// Action Handlers (Edit & Delete)
if (memberTableBody) {
  memberTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".member-action-btn");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "edit") {
      const member = allMembers.find((m) => m.firebaseId === id);
      if (!member) return;

      editingMemberId = id;
      if (memberDocumentId) memberDocumentId.value = id;
      if (memberNameInput) memberNameInput.value = member.name || "";
      if (memberEmailInput) memberEmailInput.value = member.email || "";
      if (memberPhoneInput) memberPhoneInput.value = member.contact || "";
      if (memberDepartmentInput) memberDepartmentInput.value = member.department || "";
      if (memberStatusInput) memberStatusInput.value = member.isActive !== false ? "Active" : "Inactive";

      if (memberModalTitle) memberModalTitle.textContent = "Edit User";
      if (memberSaveBtn) memberSaveBtn.textContent = "Update User";
      if (memberModal) memberModal.show();
    }

    if (action === "delete") {
      if (confirm("Are you sure you want to delete this record?")) {
        await deleteDoc(doc(db, "users", id));
        await loadMembers();
      }
    }
  });
}

// Filter and Pagination Functions
if (memberSearchInput) memberSearchInput.addEventListener("input", filterData);
if (memberStatusFilter) memberStatusFilter.addEventListener("change", filterData);

function filterData() {
  const queryText = memberSearchInput.value.toLowerCase().trim();
  const statusVal = memberStatusFilter.value;

  filteredMembers = allMembers.filter((m) => {
    const searchText = `${m.name || ""} ${m.email || ""} ${m.department || ""}`.toLowerCase();
    const matchesSearch = searchText.includes(queryText);
    const matchesStatus =
      statusVal === "all" ||
      (statusVal === "Active" && m.isActive !== false) ||
      (statusVal === "Inactive" && m.isActive === false);

    return matchesSearch && matchesStatus;
  });

  currentPage = 1;
  displayMembers();
}

function updatePagination() {
  if (!memberPagination) return;
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  memberPagination.innerHTML = "";

  if (totalPages <= 1) {
    if (memberResultText) memberResultText.textContent = `Showing ${filteredMembers.length} users`;
    return;
  }

  const start = (currentPage - 1) * membersPerPage + 1;
  const end = Math.min(currentPage * membersPerPage, filteredMembers.length);
  if (memberResultText) memberResultText.textContent = `Showing ${start} to ${end} of ${filteredMembers.length} users`;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === currentPage ? "btn-primary" : "btn-outline-primary"}`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      displayMembers();
    };
    memberPagination.appendChild(btn);
  }
}

// Run Query
loadMembers();