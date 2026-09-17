// ============================================================
// LIBRAX SETTINGS - FIREBASE FUNCTIONALITY
// ============================================================

import { auth, db } from "../../JS/firebase/firebase-config.js";

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
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// ============================================================
// ELEMENTS
// ============================================================

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const logoutBtn = document.getElementById("logoutBtn");

const settingsMessage = document.getElementById("settingsMessage");


// Profile
const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileRole = document.getElementById("profileRole");

const profileInfoForm = document.getElementById("profileInfoForm");
const fullName = document.getElementById("fullName");
const emailAddr = document.getElementById("emailAddr");
const phoneNum = document.getElementById("phoneNum");


// Password
const changePasswordForm = document.getElementById("changePasswordForm");
const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");


// Notifications
const emailNotifSwitch = document.getElementById("emailNotifSwitch");
const smsNotifSwitch = document.getElementById("smsNotifSwitch");
const saveNotificationsBtn = document.getElementById("saveNotificationsBtn");


// Security
const securityEmail = document.getElementById("securityEmail");


// Appearance
const darkModeSwitch = document.getElementById("darkModeSwitch");


// Current Firebase user
let currentUser = null;

// ============================================================
// MESSAGE
// ============================================================

function showMessage(message, type = "success") {

  settingsMessage.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}

      <button type="button"
        class="btn-close"
        data-bs-dismiss="alert">
      </button>

    </div>
  `;

}


// ============================================================
// LOAD USER SETTINGS
// ============================================================

async function loadUserData(user) {

  try {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);


    let userData = {};


    if (userSnap.exists()) {

      userData = userSnap.data();

    }


    // ========================================================
    // PROFILE DATA
    // ========================================================

    const name =
      userData.fullName ||
      userData.name ||
      user.displayName ||
      "User";


    const email =
      userData.email ||
      user.email ||
      "";


    const phone =
      userData.phone ||
      user.phoneNumber ||
      "";


    const role =
      userData.role ||
      "Member";


    const photo =
      userData.photoURL ||
      user.photoURL ||
      "../../images/user-avatar.png";


    // Profile display

    profileDisplayName.textContent = name;

    profileRole.textContent = role;

    profileAvatar.src = photo;


    // Form values

    fullName.value = name;

    emailAddr.value = email;

    phoneNum.value = phone;


    // Security

    securityEmail.textContent = user.email || email || "Not available";


    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    emailNotifSwitch.checked =
      userData.notifications?.email === true;


    smsNotifSwitch.checked =
      userData.notifications?.sms === true;


    // ========================================================
    // CREATE USER DOCUMENT IF NOT EXISTS
    // ========================================================

    if (!userSnap.exists()) {

      await setDoc(userRef, {

        uid: user.uid,

        fullName: name,

        email: email,

        phone: phone,

        role: role,

        photoURL: photo,

        notifications: {

          email: false,

          sms: false

        },

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      });

    }


  } catch (error) {

    console.error("Error loading user settings:", error);

    showMessage(
      "Unable to load your profile data.",
      "danger"
    );

  }

}


// ============================================================
// UPDATE PROFILE
// ============================================================

if (profileInfoForm) {

  profileInfoForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    if (!currentUser) {

      showMessage(
        "Please login first.",
        "warning"
      );

      return;

    }


    const name = fullName.value.trim();

    const email = emailAddr.value.trim();

    const phone = phoneNum.value.trim();


    if (!name || !email) {

      showMessage(
        "Name and email are required.",
        "warning"
      );

      return;

    }


    try {

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );


      await setDoc(
        userRef,
        {

          uid: currentUser.uid,

          fullName: name,

          email: email,

          phone: phone,

          updatedAt: serverTimestamp()

        },
        {
          merge: true
        }
      );


      profileDisplayName.textContent = name;


      showMessage(
        "Profile updated successfully.",
        "success"
      );


    } catch (error) {

      console.error("Profile update error:", error);

      showMessage(
        "Unable to update profile.",
        "danger"
      );

    }

  });

}


// ============================================================
// CHANGE PASSWORD
// ============================================================

if (changePasswordForm) {

  changePasswordForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    if (!currentUser) {

      showMessage(
        "Please login first.",
        "warning"
      );

      return;

    }


    const currentPass =
      currentPassword.value.trim();

    const newPass =
      newPassword.value.trim();

    const confirmPass =
      confirmPassword.value.trim();


    // Check new passwords

    if (newPass !== confirmPass) {

      showMessage(
        "New password and confirm password do not match.",
        "warning"
      );

      return;

    }


    // Password length

    if (newPass.length < 6) {

      showMessage(
        "New password must contain at least 6 characters.",
        "warning"
      );

      return;

    }


    try {

      // ======================================================
      // RE-AUTHENTICATE
      // ======================================================

      const credential =
        EmailAuthProvider.credential(
          currentUser.email,
          currentPass
        );


      await reauthenticateWithCredential(
        currentUser,
        credential
      );


      // ======================================================
      // UPDATE PASSWORD
      // ======================================================

      await updatePassword(
        currentUser,
        newPass
      );


      // Clear fields

      currentPassword.value = "";

      newPassword.value = "";

      confirmPassword.value = "";


      showMessage(
        "Password updated successfully.",
        "success"
      );


    } catch (error) {

      console.error("Password update error:", error);


      if (
        error.code ===
        "auth/invalid-credential"
      ) {

        showMessage(
          "Current password is incorrect.",
          "danger"
        );

      }

      else if (
        error.code ===
        "auth/wrong-password"
      ) {

        showMessage(
          "Current password is incorrect.",
          "danger"
        );

      }

      else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        showMessage(
          "Too many attempts. Please try again later.",
          "danger"
        );

      }

      else {

        showMessage(
          "Unable to change password.",
          "danger"
        );

      }

    }

  });

}


// ============================================================
// SAVE NOTIFICATIONS
// ============================================================

if (saveNotificationsBtn) {

  saveNotificationsBtn.addEventListener("click", async () => {

    if (!currentUser) {

      showMessage(
        "Please login first.",
        "warning"
      );

      return;

    }


    try {

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );


      await setDoc(
        userRef,
        {

          notifications: {

            email: emailNotifSwitch.checked,

            sms: smsNotifSwitch.checked

          },

          updatedAt: serverTimestamp()

        },
        {
          merge: true
        }
      );


      showMessage(
        "Notification settings saved successfully.",
        "success"
      );


    } catch (error) {

      console.error(
        "Notification settings error:",
        error
      );


      showMessage(
        "Unable to save notification settings.",
        "danger"
      );

    }

  });

}


// ============================================================
// DARK MODE
// ============================================================

function applyDarkMode(enabled) {

  if (enabled) {

    document.body.classList.add("dark-mode");

  } else {

    document.body.classList.remove("dark-mode");

  }

}


function loadDarkMode() {

  const savedMode =
    localStorage.getItem("libraxDarkMode");


  const enabled =
    savedMode === "true";


  applyDarkMode(enabled);


  if (darkModeSwitch) {

    darkModeSwitch.checked = enabled;

  }

}


if (darkModeSwitch) {

  darkModeSwitch.addEventListener("change", () => {

    const enabled =
      darkModeSwitch.checked;


    applyDarkMode(enabled);


    localStorage.setItem(
      "libraxDarkMode",
      enabled
    );

  });

}


// Load dark mode immediately

loadDarkMode();


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

  logoutBtn.addEventListener("click", async (event) => {

    event.preventDefault();


    try {

      await signOut(auth);


      window.location.href =
        "../login.html";


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      showMessage(
        "Unable to logout. Please try again.",
        "danger"
      );

    }

  });

}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    // User is not logged in

window.location.href = "../../login.html";

    return;

  }


  currentUser = user;


  console.log(
    "Logged in user:",
    user.email
  );


  await loadUserData(user);

});