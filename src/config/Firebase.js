import {
  initializeApp
} from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  signInAnonymously
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNMml7f6jlNyyyRtuiOi9A1yU3jPhSYI8",
  authDomain: "data1-210b2.firebaseapp.com",
  projectId: "data1-210b2",
  storageBucket: "data1-210b2.firebasestorage.app",
  messagingSenderId: "751379869160",
  appId: "1:751379869160:web:3873201d31038ed86cc85d",
  measurementId: "G-LCMGDG65ZV"
};

const app =
initializeApp(firebaseConfig);

export const auth =
getAuth(app);

export const authReady = signInAnonymously(auth);

export const googleProvider =
new GoogleAuthProvider();

export const db =
getFirestore(app);