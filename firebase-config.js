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

// Initialize Firebase App Instance cleanly
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Core References for Ecosystem Modules
const auth = firebase.auth();
const db = firebase.firestore();

// Set permanent device persistence so you don't get kicked out on app restart
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

/**
 * Global Security Shield: Verifies active cloud tokens.
 * Prevents URL bypass attempts and safely manages redirects.
 */
function enforceTerminalSecurity() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath === '/';

    auth.onAuthStateChanged((user) => {
        if (!user) {
            // No active session detected -> send unauthorized traffic to vault
            if (!isLoginPage) {
                window.location.replace('index.html');
            }
        } else {
            // Device is verified -> if sitting on login screen, pass to dashboard instantly
            if (isLoginPage) {
                const loginCard = document.getElementById('loginGatewayPanel');
                const dashboard = document.getElementById('showroomHubDashboard');
                if (loginCard && dashboard) {
                    loginCard.classList.add('hidden');
                    dashboard.classList.remove('hidden');
                }
            }
            // Safely log active terminal instance details internally
            localStorage.setItem('has_logged_in_once', 'true');
        }
    });
}
