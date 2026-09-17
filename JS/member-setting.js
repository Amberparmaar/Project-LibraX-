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

const storage = getStorage();

function notifyUser(msg) {
  alert(msg);
}

let activeUser = null;

// ==========================================================================
// ROLE SECURITY GUARD & INITIAL LOAD
// ==========================================================================
// Pehle wala Redirect Guard Hata Kar Is Tarah Replace Karein:
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        // Direct profile load karein (bina admin redirect check ke)
        activeUser = user;
        await renderMemberProfile(userData, user);
        setupSecurityView(user);
        setupAppearanceView(user);
        setupProfilePictureUpload(user);
        setupLogout();
      } else {
        window.location.href = "../../login.html";
      }
    } catch (error) {
      console.error("Auth routing error:", error);
    }
  } else {
    window.location.href = "../../login.html";
  }
});

// ==========================================================================
// 1. MEMBER PROFILE LOAD & UPDATE
// ==========================================================================
async function renderMemberProfile(userData, user) {
  // Update Header UI (Name & Member ID)
  const headerName = document.querySelector(".d-flex .fw-bold.mb-0");
  const headerSub = document.querySelector(".d-flex .text-muted.small");

  if (headerName) headerName.textContent = userData.name || user.displayName || "Member";
  if (headerSub) headerSub.textContent = userData.memberId || userData.uid.substring(0, 8);

  // Update Avatar Image
  displayProfilePicture(userData, user);

  // Fill Form Fields
  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("emailAddr");
  const phoneInput = document.getElementById("phoneNum");

  if (nameInput) nameInput.value = userData.name || user.displayName || "";
  if (emailInput) {
    emailInput.value = userData.email || user.email || "";
    emailInput.disabled = true; // Email modify allow nahi hai
  }
  if (phoneInput) phoneInput.value = userData.contact || userData.phone || "";
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

      // Update Header Display Live
      const headerName = document.querySelector(".d-flex .fw-bold.mb-0");
      if (headerName) headerName.textContent = nameVal;

      notifyUser("Profile Updated Successfully!");
    } catch (err) {
      console.error("Profile update failed:", err);
      notifyUser("Failed to update profile: " + err.message);
    }
  });
}

// ==========================================================================
// 2. CHANGE PASSWORD
// ==========================================================================
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
      const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
      await reauthenticateWithCredential(activeUser, credential);

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

// ==========================================================================
// 3. SECURITY VIEW
// ==========================================================================
function setupSecurityView(user) {
  const securityContainer = document.getElementById("content-security");
  if (!securityContainer) return;

  const lastLogin = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString()
    : "N/A";

  securityContainer.innerHTML = `
    <h6 class="section-title fw-bold text-dark mb-3">Security Configuration</h6>
    <p class="text-secondary" style="font-size: 14px">
      Manage your account authentication status and security details.
    </p>

    <div class="p-3 bg-light rounded-3 border mb-3">
      <p class="mb-2"><strong>Member Unique ID:</strong> <span class="text-muted">${user.uid}</span></p>
      <p class="mb-2"><strong>Email Verification:</strong> 
        <span class="badge ${user.emailVerified ? 'bg-success' : 'bg-warning text-dark'}">
          ${user.emailVerified ? 'Verified' : 'Unverified'}
        </span>
      </p>
      <p class="mb-0"><strong>Last Active Session:</strong> <span class="text-muted">${lastLogin}</span></p>
    </div>
  `;
}

// ==========================================================================
// 4. APPEARANCE (DARK MODE) VIEW
// ==========================================================================
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
        console.error("Theme save error:", err);
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

// ==========================================================================
// 5. PROFILE PICTURE UPLOAD
// ==========================================================================
function displayProfilePicture(userData, user) {
  const avatarImg = document.querySelector(".rounded-circle img");
  if (!avatarImg) return;

  if (userData && userData.profilePicture) {
    avatarImg.src = userData.profilePicture;
  } else if (user.photoURL) {
    avatarImg.src = user.photoURL;
  }
}

function setupProfilePictureUpload(user) {
  const avatarContainer = document.querySelector(".rounded-circle");
  if (!avatarContainer) return;

  avatarContainer.style.cursor = "pointer";
  avatarContainer.title = "Click to upload profile picture";

  let fileInput = document.getElementById("profilePicInput");
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "profilePicInput";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  }

  avatarContainer.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notifyUser("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notifyUser("Image size should be less than 2MB.");
      return;
    }

    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, file);

      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        profilePicture: downloadURL
      });

      const avatarImg = avatarContainer.querySelector("img");
      if (avatarImg) avatarImg.src = downloadURL;

      notifyUser("Profile Picture Updated Successfully!");
    } catch (error) {
      console.error("Profile picture upload error:", error);
      notifyUser("Upload failed: " + error.message);
    }
  });
}

// ==========================================================================
// 6. LOGOUT FUNCTIONALITY
// ==========================================================================
function setupLogout() {
  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await auth.signOut();
        window.location.href = "../../login.html";
      } catch (err) {
        console.error("Logout error:", err);
      }
    });
  }
}