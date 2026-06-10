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

// Initialize Firebase App Instance
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Core Reference Variables
const auth = firebase.auth();
const db = firebase.firestore();

// GLOBAL SECURITY ENFORCEMENT: Guard all app windows from unauthorized URL bypass
function enforceTerminalSecurity() {
    // Skip verification only if the user is already on the index.html login page
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    auth.onAuthStateChanged((user) => {
        if (!user && !isLoginPage) {
            // No active secure session -> instantly kick user back to login vault
            window.location.replace('index.html');
        } else if (user && isLoginPage) {
            // User is already signed in -> skip login screen, send straight into app hub
            // We default to billing.html or can stay on a menu dashboard
        }
    });
}
