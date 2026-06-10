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

// Initialize infrastructure engines safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Locks in local device storage persistence permanently
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

function enforceTerminalSecurity() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('index.html/');

    auth.onAuthStateChanged((user) => {
        if (!user) {
            if (!isLoginPage) { window.location.replace('index.html'); }
        } else {
            if (isLoginPage) {
                const loginCard = document.getElementById('loginGatewayPanel');
                const dashboard = document.getElementById('showroomHubDashboard');
                if (loginCard && dashboard) {
                    loginCard.classList.add('hidden');
                    dashboard.classList.remove('hidden');
                }
            }
            localStorage.setItem('has_logged_in_once', 'true');
        }
    });
}
