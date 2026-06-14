// =================================================================
// JINI JEWELS - LOGIN GATEWAY MODULE (js/modules/index.js)
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Trigger global security check
    if (typeof window.enforceTerminalSecurity === "function") {
        window.enforceTerminalSecurity();
    }

    // 2. Listen for Auth State to adjust the Hub UI
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

// ----------------------------------------------------
// FIREBASE AUTHENTICATION CONTROLS
// ----------------------------------------------------
window.executeLogin = function(e) {
    e.preventDefault(); // STOPS THE PAGE FROM RELOADING
    
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPassword').value;
    const btn = document.getElementById('btnLogin');
    const errMsg = document.getElementById('loginErrorMsg');

    btn.innerText = "Authenticating...";
    btn.disabled = true;
    errMsg.classList.add('hidden');

    window.auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            btn.innerText = "Access Granted";
            // security.js auto-swaps the UI from here
        })
        .catch((error) => {
            console.error("Login Error:", error);
            errMsg.innerText = "Authentication Failed: Please check your password.";
            errMsg.classList.remove('hidden');
            btn.innerText = "Access Terminal";
            btn.disabled = false;
        });
};

window.executeLogout = function() {
    window.auth.signOut().then(() => {
        localStorage.removeItem('active_user_role');
        localStorage.removeItem('has_logged_in_once');
        
        // Swap UI back to Gateway
        document.getElementById('showroomHubDashboard').classList.add('hidden');
        document.getElementById('sessionLockOverlay').classList.add('hidden');
        document.getElementById('loginGatewayPanel').classList.remove('hidden');
        
        // Clear inputs
        document.getElementById('authPassword').value = '';
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
};
