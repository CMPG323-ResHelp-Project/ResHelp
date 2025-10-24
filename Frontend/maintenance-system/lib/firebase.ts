// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
/*
const firebaseConfig = {
  apiKey: "AIzaSyAXsXO7r2aFVhzU0RCpYvzX_czW0zPDujs",
  authDomain: "reshelp-ba48b.firebaseapp.com",
  databaseURL: "https://reshelp-ba48b-default-rtdb.firebaseio.com",
  projectId: "reshelp-ba48b",
  storageBucket: "reshelp-ba48b.firebasestorage.app",
  messagingSenderId: "109807635599",
  appId: "1:109807635599:web:48f12d6608270a03f074fa",
  measurementId: "G-D2R1ME3KTC"
};
*/

const firebaseConfig = {
  apiKey: "AIzaSyBMDut7COBOMNa9edbfdO1uKo7UMBvHueQ",
  authDomain: "reshelp2.firebaseapp.com",
  projectId: "reshelp2",
  storageBucket: "reshelp2.firebasestorage.app",
  messagingSenderId: "132832428",
  appId: "1:132832428:web:02da36805e7e1442acd309",
  measurementId: "G-10WEP3Q1Y8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };