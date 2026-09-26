import { auth, db } from "../JS/firebase/firebase-config.js";
import { uploadImageToCloudinary } from "../JS/cloudinary.js";

import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ====================================
// DOM Elements
// ====================================
const settingsMessage = document.getElementById("settingsMessage");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileRole = document.getElementById("profileRole");
const profileAvatar = document.getElementById("profileAvatar");
const securityEmail = document.getElementById("securityEmail");

const profileInfoForm = document.getElementById("profileInfoForm");
const fullNameInput = document.getElementById("fullName");
const emailAddrInput = document.getElementById("emailAddr");
const phoneNumInput = document.getElementById("phoneNum");
const imageInput = document.getElementById("imageInput");

const changePasswordForm = document.getElementById("changePasswordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

// EMAIL NOTIFICATION
const emailNotifSwitch = document.getElementById("emailNotifSwitch");
const saveNotificationsBtn = document.getElementById("saveNotificationsBtn");

let currentUser = null;

// ====================================
// Alert Display Function
// ====================================
function showAlert(message, type = "success") {
  settingsMessage.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show mb-3" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// ====================================
// 1. Load User Data on Page Load
// ====================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    securityEmail.textContent = user.email || "N/A";

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();

        // Profile Info
        profileDisplayName.textContent =
          data.fullName || user.displayName || "User";
        profileRole.textContent = data.role || "Member";
        fullNameInput.value = data.fullName || "";
        emailAddrInput.value = user.email || "";
        phoneNumInput.value = data.phone || "";

        const photoURL =
          data.photoURL || user.photoURL || "../../images/user-avatar.png";
        profileAvatar.src = photoURL;

        // Load Email Notification Preference
        if (data.notifications) {
          emailNotifSwitch.checked = !!data.notifications.email;
        }

      }
    } catch (err) {
      showAlert("Error loading profile data: " + err.message, "danger");
    }
  } else {
    window.location.href = "../auth/login.html";
  }
});

// ====================================
// 2. Update Profile Information
// ====================================
profileInfoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const submitBtn =
    profileInfoForm.querySelector('button[type="submit"]') ||
    document.querySelector('button[form="profileInfoForm"]');
  const originalBtnText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    let photoURL = profileAvatar.src;
    const selectedFile = imageInput.files[0];

    if (selectedFile) {
      photoURL = await uploadImageToCloudinary(selectedFile);
    }

    const updatedData = {
      fullName: fullNameInput.value.trim(),
      phone: phoneNumInput.value.trim(),
      photoURL: photoURL,
    };

    // Update Firestore
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, updatedData);

    // Update Firebase Auth Profile
    await updateProfile(currentUser, {
      displayName: updatedData.fullName,
      photoURL: photoURL,
    });

    // Update UI
    profileDisplayName.textContent = updatedData.fullName;
    profileAvatar.src = photoURL;
    imageInput.value = "";

    showAlert("Profile updated successfully!");
  } catch (err) {
    showAlert("Failed to update profile: " + err.message, "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// ====================================
// 3. Change Password
// ====================================
changePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (newPassword !== confirmPassword) {
    showAlert("New passwords do not match!", "warning");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );
    await reauthenticateWithCredential(currentUser, credential);

    await updatePassword(currentUser, newPassword);
    showAlert("Password updated successfully!");
    changePasswordForm.reset();
  } catch (err) {
    showAlert("Password update failed: " + err.message, "danger");
  }
});

// ====================================
// 4. Save Email Notification Settings
// ====================================
saveNotificationsBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const saveBtn = saveNotificationsBtn;
  const originalText = saveBtn.textContent;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const userDocRef = doc(db, "users", currentUser.uid);

    // Save to Firestore
    await updateDoc(userDocRef, {
      "notifications.email": emailNotifSwitch.checked,
    });

    showAlert("✓ Email notification settings saved!", "success");
  } catch (err) {
    showAlert("Failed to save settings: " + err.message, "danger");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
});
