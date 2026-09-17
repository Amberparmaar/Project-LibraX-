import { auth, db } from "../JS/firebase/firebase-config.js";
import { uploadImageToCloudinary } from "./cloudinary.js";

import {
    onAuthStateChanged,
    signOut,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM ELEMENTS
const logoutBtn = document.getElementById("logoutBtn");
const settingsMessage = document.getElementById("settingsMessage");

const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileMemberId = document.getElementById("profileMemberId");
const profileInfoForm = document.getElementById("profileInfoForm");
const fullName = document.getElementById("fullName");
const emailAddr = document.getElementById("emailAddr");
const phoneNum = document.getElementById("phoneNum");
const profileImageInput = document.getElementById("profileImageInput");

const changePasswordForm = document.getElementById("changePasswordForm");
const currentPassword = document.getElementById("currentPasswordInput");
const newPassword = document.getElementById("newPasswordInput");
const confirmPassword = document.getElementById("confirmPasswordInput");

const securityEmail = document.getElementById("securityEmail");
const accountStatus = document.getElementById("accountStatus");
const darkModeSwitch = document.getElementById("darkModeSwitch");

let currentUser = null;

function showMessage(message, type = "success") {
    if (!settingsMessage) return;
    settingsMessage.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show mb-4" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// LOAD CURRENT LOGGED IN USER DATA
async function loadMemberData(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let data = {};
        if (userSnap.exists()) {
            data = userSnap.data();
        }

        const name = data.fullName || data.name || user.displayName || "Member";
        const email = data.email || user.email || "";
        const phone = data.phone || "";
        const memberId = data.memberId || user.uid.substring(0, 8).toUpperCase();
        const photo = data.photoURL || user.photoURL || "../../images/user-avatar.png";

        if (profileDisplayName) profileDisplayName.textContent = name;
        if (profileMemberId) profileMemberId.textContent = memberId;
        if (profileAvatar) profileAvatar.src = photo;

        if (fullName) fullName.value = name;
        if (emailAddr) emailAddr.value = email;
        if (phoneNum) phoneNum.value = phone;

        if (securityEmail) securityEmail.textContent = email;
        if (accountStatus) accountStatus.textContent = user.emailVerified ? "Verified" : "Email not verified";

        // Save default document if missing
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                fullName: name,
                email: email,
                phone: phone,
                memberId: memberId,
                role: "Member",
                photoURL: photo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showMessage("Unable to load profile.", "danger");
    }
}

// UPDATE PROFILE DATA + CLOUDINARY UPLOAD
if (profileInfoForm) {
    profileInfoForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) return;

        const name = fullName.value.trim();
        const email = emailAddr.value.trim();
        const phone = phoneNum.value.trim();

        if (!name || !email) {
            showMessage("Name and email are required.", "warning");
            return;
        }

        try {
            let photoURL = profileAvatar ? profileAvatar.src : "";

            // Check if user selected new photo
            if (profileImageInput && profileImageInput.files[0]) {
                showMessage("Uploading profile image...", "info");
                photoURL = await uploadImageToCloudinary(profileImageInput.files[0]);
            }

            const userRef = doc(db, "users", currentUser.uid);
            const updatePayload = {
                fullName: name,
                email: email,
                phone: phone,
                photoURL: photoURL,
                updatedAt: serverTimestamp()
            };

            await setDoc(userRef, updatePayload, { merge: true });

            if (profileDisplayName) profileDisplayName.textContent = name;
            if (profileAvatar) profileAvatar.src = photoURL;

            showMessage("Profile updated successfully.", "success");
        } catch (error) {
            console.error("Profile update error:", error);
            showMessage("Unable to update profile.", "danger");
        }
    });
}

// CHANGE PASSWORD LOGIC
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) return;

        const oldPassword = currentPassword ? currentPassword.value.trim() : "";
        const newPass = newPassword ? newPassword.value.trim() : "";
        const confirmPass = confirmPassword ? confirmPassword.value.trim() : "";

        if (!oldPassword) {
            showMessage("Please enter your current password.", "warning");
            return;
        }

        if (newPass.length < 6) {
            showMessage("New password must be at least 6 characters long.", "warning");
            return;
        }

        if (newPass !== confirmPass) {
            showMessage("New passwords do not match.", "warning");
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPass);

            changePasswordForm.reset();
            showMessage("Password updated successfully.", "success");
        } catch (error) {
            console.error("Password change error:", error);
            if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
                showMessage("Current password is incorrect.", "danger");
            } else {
                showMessage("Failed to update password: " + error.message, "danger");
            }
        }
    });
}

// DARK MODE
function loadDarkMode() {
    const saved = localStorage.getItem("libraxMemberDarkMode") === "true";
    document.body.classList.toggle("dark-mode", saved);
    if (darkModeSwitch) darkModeSwitch.checked = saved;
}

if (darkModeSwitch) {
    darkModeSwitch.addEventListener("change", () => {
        const enabled = darkModeSwitch.checked;
        document.body.classList.toggle("dark-mode", enabled);
        localStorage.setItem("libraxMemberDarkMode", enabled);
    });
}
loadDarkMode();

// LOGOUT & AUTH
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = "../../login.html";
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../../login.html";
        return;
    }
    currentUser = user;
    await loadMemberData(user);
});