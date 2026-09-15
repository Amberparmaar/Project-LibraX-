
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
   GoogleAuthProvider,
   signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from "../firebase/firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


export async function registerUser(email, password, name,contact, role) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

   
    await updateProfile(user, { displayName: name });

    
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      password:password,
      contact:contact,
      role: role, 
      createdAt: new Date(),
      isActive: true,
      profilePicture: null
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    return { 
      success: true, 
      user: userDoc.data(),
      uid: user.uid
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email بھیج دی گئی" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export function getCurrentUser() {
  return auth.currentUser;
}


const googleProvider = new GoogleAuthProvider();

// Google Sign-In Function (Handles both User and Admin)
export async function googleSignIn(selectedRole = "user") {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    // 1. Agar Naya User/Admin Google se pehli baar sign in kar raha hai
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email,
        contact: user.phoneNumber || "",
        role: selectedRole,
        createdAt: new Date(),
        isActive: true,
        profilePicture: user.photoURL || null
      });
    }

    const currentUserDoc = await getDoc(userDocRef);
    const userData = currentUserDoc.data();

    return { 
      success: true, 
      user: userData,
      uid: user.uid 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}