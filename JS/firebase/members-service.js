// firebase/members-service.js
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function addMember(memberData) {
  try {
    const docRef = await addDoc(collection(db, "members"), {
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      address: memberData.address,
      joinDate: new Date(),
      membershipStatus: "active",
      membershipExpiry: memberData.membershipExpiry || null,
      booksIssued: 0,
      fineAmount: 0,
      profilePicture: memberData.profilePicture || null
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function getAllMembers() {
  try {
    const q = query(collection(db, "members"), orderBy("name"));
    const snapshot = await getDocs(q);
    const members = [];
    snapshot.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, members };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function searchMembers(searchTerm) {
  try {
    const allMembersResult = await getAllMembers();
    if (!allMembersResult.success) return allMembersResult;
    
    const filtered = allMembersResult.members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)
    );
    
    return { success: true, members: filtered };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function updateMember(memberId, memberData) {
  try {
    const memberRef = doc(db, "members", memberId);
    await updateDoc(memberRef, {
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      address: memberData.address,
      membershipStatus: memberData.membershipStatus
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function deleteMember(memberId) {
  try {
    await deleteDoc(doc(db, "members", memberId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function getActiveMembers() {
  try {
    const allMembersResult = await getAllMembers();
    if (!allMembersResult.success) return allMembersResult;
    
    const active = allMembersResult.members.filter(m => m.membershipStatus === "active");
    return { success: true, members: active };
  } catch (error) {
    return { success: false, error: error.message };
  }
}