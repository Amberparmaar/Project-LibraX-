import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "../JS/firebase/firebase-config.js";

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
const membersPerPage = 10;
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

// ================= DIAGNOSTIC: MISSING ELEMENT CHECK =================
const requiredElements = {
  memberTableBody,
  memberSearchInput,
  memberStatusFilter,
  memberPagination,
  memberResultText,
  openMemberModalBtn,
  memberForm,
  memberModalTitle,
  memberSaveBtn,
  memberNameInput,
  memberEmailInput,
  memberPhoneInput,
  memberDepartmentInput,
  memberStatusInput,
  modalEl,
};

for (const [name, el] of Object.entries(requiredElements)) {
  if (!el) {
    console.error(
      `⚠️ MISSING ELEMENT: "${name}" is null — is ID ka element HTML mein nahi mila.`,
    );
  }
}

async function loadMembers() {
  if (!memberTableBody) return;

  try {
    memberTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 mb-0">Loading registered members...</p>
        </td>
      </tr>
    `;

    const membersQuery = query(
      membersCollection,
      where("role", "==", "member"),
    );
    let snapshot = await getDocs(membersQuery);

    if (snapshot.empty) {
      snapshot = await getDocs(membersCollection);
    }

    allMembers = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.role === "admin") return;

      allMembers.push({
        firebaseId: docSnap.id,
        ...data,
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
          <p class="mb-0">No registered members found.</p>
        </td>
      </tr>
    `;
    if (memberResultText) memberResultText.textContent = "Showing 0 members";
    if (memberPagination) memberPagination.innerHTML = "";
    return;
  }

  memberTableBody.innerHTML = "";

  pageMembers.forEach((member) => {
    const isActive = member.status
      ? member.status === "Active"
      : member.isActive !== false;
    const memberStatus = isActive ? "Active" : "Inactive";
    const statusClass = isActive ? "badge bg-success" : "badge bg-secondary";
    const displayId =
      member.memberId ||
      member.memberCode ||
      "MEM-" + member.firebaseId.substring(0, 5);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHTML(displayId)}</strong></td>
      <td><strong>${escapeHTML(member.name || member.fullName || "N/A")}</strong></td>
      <td>${escapeHTML(member.email || "N/A")}</td>
      <td>${escapeHTML(member.phone || member.contact || "N/A")}</td>
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

// Add/Update Member Event
if (memberForm) {
  memberForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const memberData = {
      name: memberNameInput.value.trim(),
      email: memberEmailInput.value.trim(),
      phone: memberPhoneInput.value.trim(),
      department: memberDepartmentInput.value.trim(),
      role: "member",
      status: memberStatusInput.value,
      isActive: memberStatusInput.value === "Active",
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
    if (memberModalTitle) memberModalTitle.textContent = "Add New Member";
    if (memberSaveBtn) memberSaveBtn.textContent = "Save Member";
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
      if (memberPhoneInput)
        memberPhoneInput.value = member.phone || member.contact || "";
      if (memberDepartmentInput)
        memberDepartmentInput.value = member.department || "";
      if (memberStatusInput)
        memberStatusInput.value =
          member.status || (member.isActive !== false ? "Active" : "Inactive");

      if (memberModalTitle) memberModalTitle.textContent = "Edit Member";
      if (memberSaveBtn) memberSaveBtn.textContent = "Update Member";
      if (memberModal) memberModal.show();
    }

    if (action === "delete") {
      const member = allMembers.find((m) => m.firebaseId === id);

      try {
        const issuedRef = collection(db, "issuedBooks");
        const activeIssuesQuery = query(
          issuedRef,
          where("memberId", "==", id),
          where("status", "==", "Issued"),
        );
        const activeSnapshot = await getDocs(activeIssuesQuery);

        if (!activeSnapshot.empty) {
          alert(
            `Ye member delete nahi ho sakta — iske paas ${activeSnapshot.size} book(s) abhi issue hain. Pehle wo return karwayein.`,
          );
          return;
        }
      } catch (err) {
        console.error("Active issues check error:", err);

        alert("Member ke issued books check nahi ho sake. Dobara try karein.");
        return;
      }

      if (
        confirm(
          `Kya aap "${member?.name || "is member"}" ko delete karna chahte hain?`,
        )
      ) {
        await deleteDoc(doc(db, "users", id));
        await loadMembers();
      }
    }
  });
}

// Filter and Pagination Functions
if (memberSearchInput) memberSearchInput.addEventListener("input", filterData);
if (memberStatusFilter)
  memberStatusFilter.addEventListener("change", filterData);

function filterData() {
  const queryText = memberSearchInput.value.toLowerCase().trim();
  const statusVal = memberStatusFilter.value;

  filteredMembers = allMembers.filter((m) => {
    const searchText =
      `${m.name || ""} ${m.email || ""} ${m.department || ""}`.toLowerCase();
    const matchesSearch = searchText.includes(queryText);

    const isActive = m.status ? m.status === "Active" : m.isActive !== false;
    const matchesStatus =
      statusVal === "all" ||
      (statusVal === "Active" && isActive) ||
      (statusVal === "Inactive" && !isActive);

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
    if (memberResultText)
      memberResultText.textContent = `Showing ${filteredMembers.length} members`;
    return;
  }

  const start = (currentPage - 1) * membersPerPage + 1;
  const end = Math.min(currentPage * membersPerPage, filteredMembers.length);
  if (memberResultText)
    memberResultText.textContent = `Showing ${start} to ${end} of ${filteredMembers.length} members`;

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
