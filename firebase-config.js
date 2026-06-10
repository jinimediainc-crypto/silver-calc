// =================================================================
// JINI JEWELS - MASTER FIREBASE CONFIGURATION
// Paste your unique Firebase SDK snippet values here
// =================================================================
const firebaseConfig = {
    apiKey: "YOUR_REAL_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
