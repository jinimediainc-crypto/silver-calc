// =================================================================
// JINI JEWELS - LOGIN GATEWAY MODULE (js/modules/index.js)
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Trigger the global security check (from js/core/security.js)
    enforceTerminalSecurity();
    
    // Setup local listener to update the welcome text and module visibility
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('hubUserEmail').innerText = `Active Session: ${user.email}`;
            
            // Allow time for RBAC fetch to complete, then apply UI logic
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
function executeLogin(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPassword').value;
    const btn = document.getElementById('btnLogin');
    const errMsg = document.getElementById('loginErrorMsg');

    btn.innerText = "Authenticating...";
    btn.disabled = true;
    errMsg.classList.add('hidden');

    auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            // Success! security.js enforces the UI swap automatically.
            btn.innerText = "Access Terminal";
            btn.disabled = false;
        })
        .catch((error) => {
            errMsg.innerText = "Authentication Failed: Please check your email and password.";
            errMsg.classList.remove('hidden');
            btn.innerText = "Access Terminal";
            btn.disabled = false;
        });
}

function executeLogout() {
    auth.signOut().then(() => {
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
}
