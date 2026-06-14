// =================================================================
// JINI JEWELS - GLOBAL SECURITY & RBAC ENGINE (js/core/security.js)
// =================================================================

window.enforceTerminalSecurity = function() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('index.html/');

    window.auth.onAuthStateChanged((user) => {
        if (!user) {
            // Kick unauthorized devices to login gate
            if (!isLoginPage) { window.location.replace('index.html'); }
        } else {
            // Handle successful login UI routing on index
            if (isLoginPage) {
                const loginCard = document.getElementById('loginGatewayPanel');
                const dashboard = document.getElementById('showroomHubDashboard');
                if (loginCard && dashboard) {
                    loginCard.classList.add('hidden');
                    dashboard.classList.remove('hidden');
                }
            }
            localStorage.setItem('has_logged_in_once', 'true');

            // FETCH ROLE-BASED ACCESS CONTROL (RBAC)
            const userEmail = user.email.toLowerCase();
            
            window.db.collection("team_members").doc(userEmail).get().then((doc) => {
                let assignedRole = "Sales"; // Default to lowest privilege
                
                if (doc.exists) {
                    assignedRole = doc.data().role;
                } else if (userEmail === "jinijewelsco@gmail.com") {
                    assignedRole = "Owner";
                    window.db.collection("team_members").doc(userEmail).set({ 
                        email: userEmail, role: "Owner", addedTimestamp: new Date().toISOString() 
                    });
                }
                localStorage.setItem('active_user_role', assignedRole);
                window.applyRoleBasedUI(assignedRole, currentPath);
            }).catch(err => console.error("RBAC Security Fetch Error:", err.message));
        }
    });
};

window.applyRoleBasedUI = function(role, currentPath) {
    if (role === "Sales") {
        if (currentPath.includes("accounting.html") || currentPath.includes("admin.html") || currentPath.includes("backoffice.html") || currentPath.includes("hisab.html")) {
            alert("Security Alert: Your 'Sales' role does not have permission to view this module.");
            window.location.replace("billing.html");
        }
        document.querySelectorAll('a[href="accounting.html"], a[href="admin.html"], a[href="backoffice.html"], a[href="hisab.html"]').forEach(el => el.remove());
        
        // Globally remove all delete buttons so staff cannot wipe records
        setTimeout(() => { document.querySelectorAll('button[onclick*="delete"], .btn-delete, button:contains("🗑️")').forEach(el => el.remove()); }, 1500);
    }
    if (role === "Manager") {
        if (currentPath.includes("admin.html")) {
            alert("Security Alert: Only the 'Owner' can access the Admin panel.");
            window.location.replace("billing.html");
        }
        document.querySelectorAll('a[href="admin.html"]').forEach(el => el.remove());
    }
};

// ----------------------------------------------------
// 15-MINUTE INACTIVITY LOCK TRACKER
// ----------------------------------------------------
let idleTrackerTimestamp = Date.now();
        
window.refreshInactivityHeartbeat = function() { 
    idleTrackerTimestamp = Date.now(); 
};

document.addEventListener('click', window.refreshInactivityHeartbeat);
document.addEventListener('touchstart', window.refreshInactivityHeartbeat);
document.addEventListener('mousemove', window.refreshInactivityHeartbeat);
document.addEventListener('keypress', window.refreshInactivityHeartbeat);

setInterval(() => { 
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('index.html/');
    const lockOverlay = document.getElementById('sessionLockOverlay');
    
    if (lockOverlay) {
        if (isLoginPage) {
            const dashboard = document.getElementById('showroomHubDashboard');
            if (dashboard && !dashboard.classList.contains('hidden')) {
                if (Date.now() - idleTrackerTimestamp > 15 * 60 * 1000) lockOverlay.classList.remove('hidden'); 
            }
        } else {
            if (Date.now() - idleTrackerTimestamp > 15 * 60 * 1000) lockOverlay.classList.remove('hidden'); 
        }
    }
}, 10000);

window.unlockTerminalWithBiometrics = function() {
    if (window.crypto && navigator.credentials) { 
        navigator.credentials.get({ publicKey: { challenge: new Uint8Array([8,16,24,32]), timeout: 60000, allowCredentials: [] } })
        .then(() => {
            document.getElementById('sessionLockOverlay').classList.add('hidden'); 
            idleTrackerTimestamp = Date.now();
        }).catch(() => { 
            document.getElementById('sessionLockOverlay').classList.add('hidden'); 
            idleTrackerTimestamp = Date.now(); 
        }); 
    } else { 
        document.getElementById('sessionLockOverlay').classList.add('hidden'); 
        idleTrackerTimestamp = Date.now(); 
    }
};
