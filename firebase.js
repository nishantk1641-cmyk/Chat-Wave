import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCuU2BsXyHDTErlEFlOvpBFubMvblKtq_E",
  authDomain: "chat-wave-4360b.firebaseapp.com",
  projectId: "chat-wave-4360b",
  storageBucket: "chat-wave-4360b.firebasestorage.app",
  messagingSenderId: "175583548782",
  appId: "1:175583548782:web:ad12b23d271aeef2771d7f"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error("AUTH PERSISTENCE ERROR:", error);
});
