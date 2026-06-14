// =================================================================
// JINI JEWELS - LOGIN GATEWAY MODULE (js/modules/index.js)
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Trigger global security check
    if (typeof enforceTerminalSecurity === "function") {
        enforceTerminalSecurity();
    }
    
    // 2. Bind the form submission safely
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', executeLogin);
    }

    // 3. Listen for Auth State
    window.auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('hubUserEmail').innerText = `Active Session: ${user.email}`;
            setTimeout(() => {
                const role = localStorage.getItem('active_user_role');
                if (role === "Sales") {
                    document.getElementById('modAccounts')?.remove();
                    document.getElementById('modAdmin')?.remove();
                    document.getElementById('modOffice')?.remove();
                    document.getElementById('modHisab')?.remove();
                } else if (role === "Manager") {
                    document.getElementById('modAdmin')?.remove();
                }
            }, 1000);
        }
    });
});

function executeLogin(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPassword').value;
    const btn = document.getElementById('btnLogin');
    const errMsg = document.getElementById('loginErrorMsg');

    btn.innerText = "Authenticating...";
    btn.disabled = true;
    errMsg.classList.add('hidden');

    // Use window.auth to prevent scoping crashes
    window.auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            btn.innerText = "Access Granted";
            // Security.js will auto-redirect the UI now
        })
        .catch((error) => {
            console.error("Login Error:", error);
            errMsg.innerText = "Authentication Failed: " + error.message;
            errMsg.classList.remove('hidden');
            btn.innerText = "Access Terminal";
            btn.disabled = false;
        });
}

function executeLogout() {
    window.auth.signOut().then(() => {
        localStorage.removeItem('active_user_role');
        localStorage.removeItem('has_logged_in_once');
        document.getElementById('showroomHubDashboard').classList.add('hidden');
        document.getElementById('sessionLockOverlay').classList.add('hidden');
        document.getElementById('loginGatewayPanel').classList.remove('hidden');
        document.getElementById('authPassword').value = '';
    }).catch(err => console.error(err));
}
