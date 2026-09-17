// ============================================================
// LIBRAX MEMBER SETTINGS - FIREBASE
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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// ============================================================
// ELEMENTS
// ============================================================

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

const logoutBtn = document.getElementById("logoutBtn");

const settingsMessage =
    document.getElementById("settingsMessage");


// Profile
const profileAvatar =
    document.getElementById("profileAvatar");

const profileDisplayName =
    document.getElementById("profileDisplayName");

const profileMemberId =
    document.getElementById("profileMemberId");

const profileInfoForm =
    document.getElementById("profileInfoForm");

const fullName =
    document.getElementById("fullName");

const emailAddr =
    document.getElementById("emailAddr");

const phoneNum =
    document.getElementById("phoneNum");


// Password
const changePasswordForm =
    document.getElementById("changePasswordForm");

const currentPassword =
    document.getElementById("currentPassword");

const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");


// Security
const securityEmail =
    document.getElementById("securityEmail");

const accountStatus =
    document.getElementById("accountStatus");


// Appearance
const darkModeSwitch =
    document.getElementById("darkModeSwitch");


// Current user
let currentUser = null;



// ============================================================
// MESSAGE
// ============================================================

function showMessage(message, type = "success") {

    settingsMessage.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show"
             role="alert">

            ${message}

            <button type="button"
                    class="btn-close"
                    data-bs-dismiss="alert">
            </button>

        </div>
    `;

}


// ============================================================
// LOAD MEMBER DATA
// ============================================================

async function loadMemberData(user) {

    try {

        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const userSnap =
            await getDoc(userRef);


        let data = {};


        if (userSnap.exists()) {

            data = userSnap.data();

        }


        // ====================================================
        // MEMBER INFORMATION
        // ====================================================

        const name =
            data.fullName ||
            data.name ||
            user.displayName ||
            "Member";


        const email =
            data.email ||
            user.email ||
            "";


        const phone =
            data.phone ||
            "";


        const memberId =
            data.memberId ||
            data.memberCode ||
            "Member";


        const photo =
            data.photoURL ||
            user.photoURL ||
            "../../images/user-avatar.png";


        // ====================================================
        // DISPLAY DATA
        // ====================================================

        profileDisplayName.textContent =
            name;


        profileMemberId.textContent =
            memberId;


        profileAvatar.src =
            photo;


        // ====================================================
        // FORM DATA
        // ====================================================

        fullName.value =
            name;


        emailAddr.value =
            email;


        phoneNum.value =
            phone;


        // ====================================================
        // SECURITY
        // ====================================================

        securityEmail.textContent =
            user.email || email || "Not available";


        accountStatus.textContent =
            user.emailVerified
                ? "Verified"
                : "Email not verified";


        // ====================================================
        // CREATE USER DOCUMENT
        // ====================================================

        if (!userSnap.exists()) {

            await setDoc(
                userRef,
                {

                    uid: user.uid,

                    fullName: name,

                    email: email,

                    phone: phone,

                    memberId: memberId,

                    role: "Member",

                    photoURL: photo,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );

        }


    } catch (error) {

        console.error(
            "Error loading member:",
            error
        );


        showMessage(
            "Unable to load your profile.",
            "danger"
        );

    }

}


// ============================================================
// UPDATE PROFILE
// ============================================================

if (profileInfoForm) {

    profileInfoForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentUser) {

                showMessage(
                    "Please login first.",
                    "warning"
                );

                return;

            }


            const name =
                fullName.value.trim();


            const email =
                emailAddr.value.trim();


            const phone =
                phoneNum.value.trim();


            if (!name || !email) {

                showMessage(
                    "Name and email are required.",
                    "warning"
                );

                return;

            }


            try {

                const userRef =
                    doc(
                        db,
                        "users",
                        currentUser.uid
                    );


                await setDoc(
                    userRef,
                    {

                        fullName: name,

                        email: email,

                        phone: phone,

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                profileDisplayName.textContent =
                    name;


                securityEmail.textContent =
                    currentUser.email || email;


                showMessage(
                    "Profile updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );


                showMessage(
                    "Unable to update profile.",
                    "danger"
                );

            }

        }
    );

}


// ============================================================
// CHANGE PASSWORD
// ============================================================

if (changePasswordForm) {

    changePasswordForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentUser) {

                showMessage(
                    "Please login first.",
                    "warning"
                );

                return;

            }


            const oldPassword =
                currentPassword.value.trim();


            const newPass =
                newPassword.value.trim();


            const confirmPass =
                confirmPassword.value.trim();


            // Password match

            if (newPass !== confirmPass) {

                showMessage(
                    "New password and confirm password do not match.",
                    "warning"
                );

                return;

            }


            // Minimum length

            if (newPass.length < 6) {

                showMessage(
                    "New password must contain at least 6 characters.",
                    "warning"
                );

                return;

            }


            try {

                // =================================================
                // RE-AUTHENTICATE
                // =================================================

                const credential =
                    EmailAuthProvider.credential(
                        currentUser.email,
                        oldPassword
                    );


                await reauthenticateWithCredential(
                    currentUser,
                    credential
                );


                // =================================================
                // UPDATE PASSWORD
                // =================================================

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

                console.error(
                    "Password error:",
                    error
                );


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

        }
    );

}


// ============================================================
// DARK MODE
// ============================================================

function applyDarkMode(enabled) {

    if (enabled) {

        document.body.classList.add(
            "dark-mode"
        );

    } else {

        document.body.classList.remove(
            "dark-mode"
        );

    }

}


function loadDarkMode() {

    const saved =
        localStorage.getItem(
            "libraxMemberDarkMode"
        );


    const enabled =
        saved === "true";


    applyDarkMode(enabled);


    if (darkModeSwitch) {

        darkModeSwitch.checked =
            enabled;

    }

}


if (darkModeSwitch) {

    darkModeSwitch.addEventListener(
        "change",
        () => {

            const enabled =
                darkModeSwitch.checked;


            applyDarkMode(enabled);


            localStorage.setItem(
                "libraxMemberDarkMode",
                enabled
            );

        }
    );

}


loadDarkMode();


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            try {

                await signOut(auth);


                // login.html project root mein hai
                window.location.href =
                    "../../login.html";


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

        }
    );

}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            // login.html project root mein hai

            window.location.href =
                "../../login.html";

            return;

        }


        currentUser = user;


        console.log(
            "Member logged in:",
            user.email
        );


        await loadMemberData(user);

    }
);