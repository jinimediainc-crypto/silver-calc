// =================================================================
// JINI JEWELS - CORE FIREBASE INITIALIZATION (js/core/firebase-config.js)
// =================================================================

const firebaseConfig = {
  apiKey: "AIzaSyD6eG22cNgeUOus3w3S4uDOB8j84AnqKLk",
  authDomain: "jinijewels-github.firebaseapp.com",
  databaseURL: "https://jinijewels-github-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jinijewels-github",
  storageBucket: "jinijewels-github.firebasestorage.app",
  messagingSenderId: "578815043824",
  appId: "1:578815043824:web:27014b622834fc57d9ba35",
  measurementId: "G-JGZS4GB8VL"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 🟢 CRITICAL FIX: Attach to window for cross-file global access
window.auth = firebase.auth();
window.db = firebase.firestore();

// 🟢 OFFLINE PERSISTENCE ENGINE
window.db.enablePersistence().catch((err) => console.warn(err));
window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
