import { auth, db } from "./firebase/firebase-config.js";
import { 
  onAuthStateChanged, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Initialize Storage without 'app' parameter
const storage = getStorage();

// Utility Notification Handler
function notifyUser(msg) {
  alert(msg);
}

// Global reference
let activeUser = null;

// Auth State Monitor & Initial Load
onAuthStateChanged(auth, async (user) => {
  if (user) {
    activeUser = user;
    await fetchUserProfile(user);
    setupSecurityView(user);
    setupAppearanceView(user);
    
    // Notifications Logic Call
    setupNotificationView(user);
    
    // Picture Logic Init
    setupProfilePictureUpload(user);
  } else {
    window.location.href = "../../index.html";
  }
});

/* ==========================================================================
   1. PROFILE INFORMATION (Update Name, Email, Phone)
   ========================================================================== */
async function fetchUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const nameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("emailAddr");
    const phoneInput = document.getElementById("phoneNum");

    const userData = userSnap.exists() ? userSnap.data() : null;

    // 1. Profile Picture Load Karein
    displayProfilePicture(userData, user);

    // 2. Form Inputs Fill Karein
    if (userData) {
      if (nameInput) nameInput.value = userData.name || user.displayName || "";
      if (emailInput) {
        emailInput.value = userData.email || user.email || "";
        emailInput.disabled = true;
      }
      if (phoneInput) phoneInput.value = userData.contact || userData.phone || "";
    } else {
      if (nameInput) nameInput.value = user.displayName || "";
      if (emailInput) {
        emailInput.value = user.email || "";
        emailInput.disabled = true;
      }
    }
  } catch (error) {
    console.error("Error fetching profile details:", error);
  }
}

// Profile Form Submit Handler
const profileForm = document.getElementById("profileInfoForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeUser) return;

    const nameVal = document.getElementById("fullName")?.value.trim();
    const phoneVal = document.getElementById("phoneNum")?.value.trim();

    try {
      const userRef = doc(db, "users", activeUser.uid);
      await updateDoc(userRef, {
        name: nameVal,
        contact: phoneVal
      });

      notifyUser("Profile Updated Successfully!");
    } catch (err) {
      console.error("Profile update failed:", err);
      notifyUser("Failed to update profile: " + err.message);
    }
  });
}

/* ==========================================================================
   2. CHANGE PASSWORD
   ========================================================================== */
const passwordForm = document.getElementById("changePasswordForm");
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeUser) return;

    const currentPassword = document.getElementById("currentPassword")?.value;
    const newPassword = document.getElementById("newPassword")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      notifyUser("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      notifyUser("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyUser("New password and confirm password do not match.");
      return;
    }

    try {
      // Re-authenticate user before updating sensitive info
      const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
      await reauthenticateWithCredential(activeUser, credential);

      // Update password in Auth
      await updatePassword(activeUser, newPassword);

      notifyUser("Password Updated Successfully!");
      passwordForm.reset();
    } catch (err) {
      console.error("Password update error:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        notifyUser("Current password is incorrect.");
      } else {
        notifyUser("Error: " + err.message);
      }
    }
  });
}

/* ==========================================================================
   3. SECURITY TAB
   ========================================================================== */
function setupSecurityView(user) {
  const securityContainer = document.getElementById("content-security");
  if (!securityContainer) return;

  const lastLogin = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString()
    : "N/A";

  securityContainer.innerHTML = `
    <h6 class="section-title fw-bold text-dark mb-3">Security Configuration</h6>
    <p class="text-secondary" style="font-size: 14px">
      Access rules and database backups can be managed here.
    </p>

    <div class="p-3 bg-light rounded-3 border mb-3">
      <p class="mb-2"><strong>User Unique ID (UID):</strong> <span class="text-muted">${user.uid}</span></p>
      <p class="mb-2"><strong>Email Status:</strong> 
        <span class="badge ${user.emailVerified ? 'bg-success' : 'bg-warning text-dark'}">
          ${user.emailVerified ? 'Verified' : 'Unverified'}
        </span>
      </p>
      <p class="mb-0"><strong>Last Active Session:</strong> <span class="text-muted">${lastLogin}</span></p>
    </div>

    <button id="twoFactorBtn" class="btn btn-outline-primary rounded-3 btn-sm">
      Enable 2FA (Coming Soon)
    </button>
  `;

  document.getElementById("twoFactorBtn")?.addEventListener("click", () => {
    notifyUser("Two-Factor Authentication (2FA) will be available in the next release!");
  });
}

/* ==========================================================================
   4. APPEARANCE TAB (Dark / Light Theme)
   ========================================================================== */
async function setupAppearanceView(user) {
  const darkSwitch = document.getElementById("darkModeSwitch");
  if (!darkSwitch) return;

  let currentTheme = "light";

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().theme) {
      currentTheme = userSnap.data().theme;
    } else {
      currentTheme = localStorage.getItem("librax-theme") || "light";
    }
  } catch (e) {
    currentTheme = localStorage.getItem("librax-theme") || "light";
  }

  const isDarkMode = currentTheme === "dark";
  darkSwitch.checked = isDarkMode;
  toggleTheme(isDarkMode);

  darkSwitch.addEventListener("change", async (e) => {
    const isDark = e.target.checked;
    toggleTheme(isDark);

    const selectedTheme = isDark ? "dark" : "light";
    localStorage.setItem("librax-theme", selectedTheme);

    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { theme: selectedTheme });
      } catch (err) {
        console.error("Theme persistence error:", err);
      }
    }
  });
}

function toggleTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}



/* ==========================================================================
   6. NOTIFICATION TOGGLES FUNCTIONALITY
   ========================================================================== */
async function setupNotificationView(user) {
  const emailSwitch = document.getElementById("emailNotifSwitch");
  const smsSwitch = document.getElementById("smsNotifSwitch");

  if (!emailSwitch && !smsSwitch) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();

      // Load Saved Settings (Fallback defaults: email = true, sms = false)
      if (emailSwitch) {
        emailSwitch.checked = userData.emailNotif !== undefined ? userData.emailNotif : true;
      }
      if (smsSwitch) {
        smsSwitch.checked = userData.smsNotif !== undefined ? userData.smsNotif : false;
      }
    }
  } catch (error) {
    console.error("Error loading notification settings:", error);
  }

  // Update Firestore when toggled
  const updateNotifSetting = async (key, val) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { [key]: val });
    } catch (err) {
      console.error(`Error saving ${key}:`, err);
    }
  };

  if (emailSwitch) {
    emailSwitch.addEventListener("change", (e) => {
      updateNotifSetting("emailNotif", e.target.checked);
    });
  }

  if (smsSwitch) {
    smsSwitch.addEventListener("change", (e) => {
      updateNotifSetting("smsNotif", e.target.checked);
    });
  }
}


/* ==========================================================================
   5. PROFILE PICTURE UPLOAD FUNCTIONALITY
   ========================================================================== */

// Profile Image Load Check
function displayProfilePicture(userData, user) {
  const avatarImg = document.querySelector(".rounded-circle img");
  if (!avatarImg) return;

  if (userData && userData.profilePicture) {
    avatarImg.src = userData.profilePicture;
  } else if (user.photoURL) {
    avatarImg.src = user.photoURL;
  }
}

// Dynamically Attach Image Input & Upload Logic
function setupProfilePictureUpload(user) {
  const avatarContainer = document.querySelector(".rounded-circle");
  if (!avatarContainer) return;

  // Set cursor to pointer
  avatarContainer.style.cursor = "pointer";
  avatarContainer.title = "Click to change profile picture";

  // Create Hidden Input File Field dynamically
  let fileInput = document.getElementById("profilePicInput");
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "profilePicInput";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  }

  // Click on avatar opens file picker
  avatarContainer.addEventListener("click", () => {
    fileInput.click();
  });

  // Handle File Change Event
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation (Image only & max size 2MB)
    if (!file.type.startsWith("image/")) {
      notifyUser("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notifyUser("Image size should be less than 2MB.");
      return;
    }

    try {
      notifyUser("Uploading picture... Please wait.");

      // 1. Storage Reference Setup
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      
      // 2. Upload Bytes
      await uploadBytes(storageRef, file);

      // 3. Get Image Public Download URL
      const downloadURL = await getDownloadURL(storageRef);

      // 4. Update Firestore Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        profilePicture: downloadURL
      });

      // 5. Update UI Directly
      const avatarImg = avatarContainer.querySelector("img");
      if (avatarImg) avatarImg.src = downloadURL;

      notifyUser("Profile Picture Updated Successfully!");
    } catch (error) {
      console.error("Profile picture upload error:", error);
      notifyUser("Upload failed: " + error.message);
    }
  });
}