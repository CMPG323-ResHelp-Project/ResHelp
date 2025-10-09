// lib/firebase2.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Your second Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCygPyA_1XTUhx4ru_dYIbaIw25CIbmaGg",
  authDomain: "chatbot-ae54e.firebaseapp.com",
  databaseURL: "https://chatbot-ae54e-default-rtdb.firebaseio.com",
  projectId: "chatbot-ae54e",
  storageBucket: "chatbot-ae54e.appspot.com",
  messagingSenderId: "209821127392",
  appId: "1:209821127392:web:0f87b0bbd1763ba8ac3685",
  measurementId: "G-R2GXCZM9J9",
};

// Initialize the Firebase app (only once)
const firebase2: FirebaseApp = !getApps().some(app => app.name === "firebase2")
  ? initializeApp(firebaseConfig, "firebase2")
  : getApps().find(app => app.name === "firebase2")!;

// Get the storage instance
const storage = getStorage(firebase2);

export { firebase2, storage, ref, uploadBytes, getDownloadURL };
