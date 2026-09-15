// firebase/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOGCuFVIz_r3pFe9mSFj9LI1L22_wu_Kk",
  authDomain: "project-librax-fd891.firebaseapp.com",
  projectId: "project-librax-fd891",
  storageBucket: "project-librax-fd891.firebasestorage.app",
  messagingSenderId: "145096590343",
  appId: "1:145096590343:web:f1da5e7251a2cde02916a2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
