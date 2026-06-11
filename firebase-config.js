// =================================================================
// JINI JEWELS - MASTER FIREBASE CONFIGURATION
// Paste your unique Firebase SDK snippet values here
// =================================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 🟢 TRUE OFFLINE PERSISTENCE ENGINE
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Offline sync failed: Multiple tabs open.");
      } else if (err.code == 'unimplemented') {
          console.warn("Offline sync failed: Browser not supported.");
      }
  });

// Lock in local device storage persistence permanently
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
