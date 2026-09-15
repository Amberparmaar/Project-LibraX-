// js/members.js
import { 
  addMember, 
  getAllMembers, 
  updateMember, 
  deleteMember, 
  searchMembers 
} from "../firebase/members-service.js";

let currentMembers = [];

// صفحہ لوڈ ہو تو تمام اراکین دکھائیں
async function loadMembers() {
  const result = await getAllMembers();
  if (result.success) {
    currentMembers = result.members;
    displayMembers(currentMembers);
  }
}

// اراکین ٹیبل میں دکھائیں
function displayMembers(members) {
  const tbody = document.getElementById("membersTableBody");
  tbody.innerHTML = "";
  
  members.forEach(member => {
    const row = `
      <tr>
        <td>${member.name}</td>
        <td>${member.email}</td>
        <td>${member.phone}</td>
        <td>${member.membershipStatus}</td>
        <td>${member.booksIssued}</td>
        <td>
          <button onclick="editMember('${member.id}')" class="btn btn-sm btn-warning">Edit</button>
          <button onclick="deleteMemberHandler('${member.id}')" class="btn btn-sm btn-danger">Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// نیا رکن شامل کریں
document.getElementById("addMemberForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const memberData = {
    name: document.getElementById("memberName").value,
    email: document.getElementById("memberEmail").value,
    phone: document.getElementById("memberPhone").value,
    address: document.getElementById("memberAddress").value
  };
  
  const result = await addMember(memberData);
  if (result.success) {
    alert("رکن شامل کیا گیا!");
    loadMembers();
    document.getElementById("addMemberForm").reset();
  } else {
    alert("خرابی: " + result.error);
  }
});

// رکن تلاش کریں
document.getElementById("searchMembersInput")?.addEventListener("keyup", async (e) => {
  const searchTerm = e.target.value;
  
  if (searchTerm.length > 0) {
    const result = await searchMembers(searchTerm);
    if (result.success) {
      displayMembers(result.members);
    }
  } else {
    displayMembers(currentMembers);
  }
});

// رکن DELETE کریں
async function deleteMemberHandler(memberId) {
  if (confirm("کیا آپ یہ رکن حذف کرنا چاہتے ہیں?")) {
    const result = await deleteMember(memberId);
    if (result.success) {
      alert("رکن حذف کیا گیا!");
      loadMembers();
    } else {
      alert("خرابی: " + result.error);
    }
  }
}

// صفحہ لوڈ ہوتے وقت
document.addEventListener("DOMContentLoaded", loadMembers);