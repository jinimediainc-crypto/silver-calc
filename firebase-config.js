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

// 🟢 NEW: TRUE OFFLINE PERSISTENCE ENGINE
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Offline sync failed: Multiple tabs open.");
      } else if (err.code == 'unimplemented') {
          console.warn("Offline sync failed: Browser not supported.");
      }
  });

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

            // RBAC FETCH
            const userEmail = user.email.toLowerCase();
            db.collection("team_members").doc(userEmail).get().then((doc) => {
                let assignedRole = "Sales"; 
                if (doc.exists) {
                    assignedRole = doc.data().role;
                } else if (userEmail === "jinijewelsco@gmail.com") {
                    assignedRole = "Owner";
                    db.collection("team_members").doc(userEmail).set({ email: userEmail, role: "Owner", addedTimestamp: new Date().toISOString() });
                }
                localStorage.setItem('active_user_role', assignedRole);
                applyRoleBasedUI(assignedRole, currentPath);
            }).catch(err => console.error("RBAC Security Fetch Error:", err.message));
        }
    });
}

function applyRoleBasedUI(role, currentPath) {
    if (role === "Sales") {
        if (currentPath.includes("accounting.html") || currentPath.includes("admin.html") || currentPath.includes("backoffice.html") || currentPath.includes("hisab.html")) {
            alert("Security Alert: Your 'Sales' role does not have permission to view this module.");
            window.location.replace("billing.html");
        }
        document.querySelectorAll('a[href="accounting.html"], a[href="admin.html"], a[href="backoffice.html"], a[href="hisab.html"]').forEach(el => el.remove());
        setTimeout(() => { document.querySelectorAll('button[onclick*="delete"], .btn-delete, button:contains("🗑️")').forEach(el => el.remove()); }, 1500);
    }
    if (role === "Manager") {
        if (currentPath.includes("admin.html")) {
            alert("Security Alert: Only the 'Owner' can access the Admin panel.");
            window.location.replace("billing.html");
        }
        document.querySelectorAll('a[href="admin.html"]').forEach(el => el.remove());
    }
}
