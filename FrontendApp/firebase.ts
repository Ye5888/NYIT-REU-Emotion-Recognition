// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALrywrvxNrMx9oNjmJqJIZ00RMrc-zEds",
  authDomain: "nyit-reu.firebaseapp.com",
  projectId: "nyit-reu",
  storageBucket: "nyit-reu.firebasestorage.app",
  messagingSenderId: "718111085920",
  appId: "1:718111085920:web:0192e8d48225ac6d7fba05",
  measurementId: "G-4HLD9WMTSE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);