import { auth, db } from "../JS/firebase/firebase-config.js"; 
// Aapki existing Cloudinary file ka path yahan dein:
import { uploadImageToCloudinary } from "../JS/cloudinary.js"; 

import { 
  onAuthStateChanged, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
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

const emailNotifSwitch = document.getElementById("emailNotifSwitch");
const smsNotifSwitch = document.getElementById("smsNotifSwitch");
const saveNotificationsBtn = document.getElementById("saveNotificationsBtn");
const darkModeSwitch = document.getElementById("darkModeSwitch");

let currentUser = null;

// Helper: Alert Display
function showAlert(message, type = "success") {
  settingsMessage.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show mb-3" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// 1. Initial Data Fetch & Auth Check
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    securityEmail.textContent = user.email || "N/A";
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        
        profileDisplayName.textContent = data.fullName || user.displayName || "User";
        profileRole.textContent = data.role || "Member";
        fullNameInput.value = data.fullName || "";
        emailAddrInput.value = user.email || "";
        phoneNumInput.value = data.phone || "";

        const photoURL = data.photoURL || user.photoURL || "../../images/user-avatar.png";
        profileAvatar.src = photoURL;

        if (data.notifications) {
          emailNotifSwitch.checked = !!data.notifications.email;
          smsNotifSwitch.checked = !!data.notifications.sms;
        }
        if (data.darkMode !== undefined) {
          darkModeSwitch.checked = data.darkMode;
        }
      }
    } catch (err) {
      showAlert("Error loading profile data: " + err.message, "danger");
    }
  } else {
    window.location.href = "../auth/login.html";
  }
});

// 2. Profile Info Form Submit (Existing Cloudinary Function Integration)
profileInfoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const submitBtn = profileInfoForm.querySelector('button[type="submit"]') || document.querySelector('button[form="profileInfoForm"]');
  const originalBtnText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    let photoURL = profileAvatar.src;
    const selectedFile = imageInput.files[0];

    // Agar user ne new picture choose ki ho, toh aapki file ka function call hoga
    if (selectedFile) {
      photoURL = await uploadImageToCloudinary(selectedFile);
    }

    const updatedData = {
      fullName: fullNameInput.value.trim(),
      phone: phoneNumInput.value.trim(),
      photoURL: photoURL
    };

    // Firestore record update
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, updatedData);

    // Firebase Auth user profile update
    await updateProfile(currentUser, {
      displayName: updatedData.fullName,
      photoURL: photoURL
    });

    // Update UI Elements
    profileDisplayName.textContent = updatedData.fullName;
    profileAvatar.src = photoURL;
    imageInput.value = ""; // Clear file input

    showAlert("Profile updated successfully!");
  } catch (err) {
    showAlert("Failed to update profile: " + err.message, "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// 3. Password Reset Handler
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
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    
    await updatePassword(currentUser, newPassword);
    showAlert("Password updated successfully!");
    changePasswordForm.reset();
  } catch (err) {
    showAlert("Password update failed: " + err.message, "danger");
  }
});

// 4. Notifications Update
saveNotificationsBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, {
      "notifications.email": emailNotifSwitch.checked,
      "notifications.sms": smsNotifSwitch.checked
    });
    showAlert("Notification settings saved!");
  } catch (err) {
    showAlert("Failed to save settings: " + err.message, "danger");
  }
});

// 5. Dark Mode Handler
darkModeSwitch.addEventListener("change", async () => {
  const isDark = darkModeSwitch.checked;
  document.body.classList.toggle("bg-dark", isDark);

  if (currentUser) {
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { darkMode: isDark });
    } catch (err) {
      console.error("Theme preference error:", err);
    }
  }
});