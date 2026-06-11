// =================================================================
// JINI JEWELS - CRM & CUSTOMER LEDGER LOGIC (js/modules/crm.js)
// =================================================================

let currentPendingDue = 0;

document.addEventListener("DOMContentLoaded", () => {
    // Trigger global security enforcing check
    enforceTerminalSecurity();
});

// ----------------------------------------------------
// CUSTOMER SEARCH & PROFILE FETCH
// ----------------------------------------------------
function handleSearch(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        lookupCustomer();
    }
}

function lookupCustomer() {
    const mobile = document.getElementById('searchMobile').value.trim();
    if (!mobile || mobile.length < 5) {
        alert("Please enter a valid mobile number to search.");
        return;
    }

    document.getElementById('crmMobile').value = mobile;
    const statusLabel = document.getElementById('profileStatus');
    statusLabel.innerText = "Searching...";
    statusLabel.className = "bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider animate-pulse";

    // 1. Fetch Profile Data & Pending Dues
    db.collection("client_profiles").doc(mobile).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('crmName').value = data.name || '';
            document.getElementById('crmDob').value = data.dob || '';
            document.getElementById('crmAnniversary').value = data.anniversary || '';
            
            currentPendingDue = parseFloat(data.pendingDue) || 0;
            
            // Show or Hide the Debt Settlement Card
            if (currentPendingDue > 0) {
                document.getElementById('debtSettlementCard').classList.remove('hidden');
                document.getElementById('activeDueDisplay').innerText = formatCurrency(currentPendingDue);
                document.getElementById('settleAmount').value = currentPendingDue; // Auto-fill
            } else {
                document.getElementById('debtSettlementCard').classList.add('hidden');
            }
            
            statusLabel.innerText = "Existing Client";
            statusLabel.className = "bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md";
        } else {
            // Reset for New Client
            document.getElementById('crmName').value = '';
            document.getElementById('crmDob').value = '';
            document.getElementById('crmAnniversary').value = '';
            currentPendingDue = 0;
            
            document.getElementById('debtSettlementCard').classList.add('hidden');
            
            statusLabel.innerText = "New Client";
            statusLabel.className = "bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md";
        }
    }).catch(e => console.error("Error fetching profile:", e));

    // 2. Fetch Detailed Invoice & Payment Ledger
    db.collection("showroom_memos")
      .where("customerMobile", "==", mobile)
      .orderBy("localTimestamp", "desc")
      .get()
      .then((querySnapshot) => {
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = "";
        let lifetimeValue = 0;

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-300 font-bold">No ledger history found for this number.</td></tr>`;
            document.getElementById('statLtv').innerText = "0";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Determine if row is normal invoice or partial payment receipt
            const isPaymentReceipt = data.isPaymentReceipt === true;
            
            let invTotal = parseFloat(data.grandTotalPayable) || 0;
            let amtPaid = parseFloat(data.amountPaid) || 0;
            
            if (!isPaymentReceipt) lifetimeValue += invTotal;

            let detailsStr = "";
            if (isPaymentReceipt) {
                detailsStr = `<span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Payment Received (${data.paymentMode})</span>`;
            } else if (data.itemsListArray && data.itemsListArray.length > 0) {
                detailsStr = data.itemsListArray.map(i => i.desc).join(", ");
                if (detailsStr.length > 25) detailsStr = detailsStr.substring(0, 25) + "...";
            }

            const refStr = isPaymentReceipt ? "RECEIPT" : `#${data.estimateNumber}`;
            const rowColor = isPaymentReceipt ? "bg-emerald-50/30" : "hover:bg-gray-50";

            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-100 transition-colors ${rowColor}`;
            tr.innerHTML = `
                <td class="py-3 text-[10px] text-gray-500">${data.memoDate}</td>
                <td class="py-3 font-black text-gray-800">${refStr}</td>
                <td class="py-3 text-[10px] text-gray-600 truncate max-w-[120px]">${detailsStr}</td>
                <td class="py-3 text-right font-black ${isPaymentReceipt ? 'text-gray-300' : 'text-[#064e3b]'}">₹${formatCurrency(invTotal)}</td>
                <td class="py-3 text-right font-black ${isPaymentReceipt ? 'text-emerald-600' : 'text-gray-800'}">₹${formatCurrency(amtPaid)}</td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('statLtv').innerText = formatCurrency(lifetimeValue);

    }).catch(e => console.error("Error fetching history:", e));
}

// ----------------------------------------------------
// UPDATE PROFILE INFO
// ----------------------------------------------------
function saveCustomerProfile() {
    const mobile = document.getElementById('crmMobile').value.trim();
    const name = document.getElementById('crmName').value.trim();

    if (!mobile || !name) {
        alert("Mobile Number and Name are mandatory to save a profile.");
        return;
    }

    const profilePayload = {
        mobile: mobile,
        name: name,
        dob: document.getElementById('crmDob').value,
        anniversary: document.getElementById('crmAnniversary').value,
        lastUpdated: new Date().toISOString()
    };

    db.collection("client_profiles").doc(mobile).set(profilePayload, { merge: true }).then(() => {
        alert(`✅ Profile for ${name} updated successfully!`);
    }).catch(e => alert("Error saving profile: " + e.message));
}

// ----------------------------------------------------
// DEBT SETTLEMENT -> ACCOUNTING SYNC
// ----------------------------------------------------
function processDebtSettlement() {
    const mobile = document.getElementById('crmMobile').value.trim();
    const name = document.getElementById('crmName').value.trim();
    const amount = parseFloat(document.getElementById('settleAmount').value) || 0;
    const mode = document.getElementById('settleMode').value;

    if (amount <= 0 || amount > currentPendingDue) {
        alert(`Invalid Amount. Please enter a value up to ₹${currentPendingDue}`);
        return;
    }

    if (!confirm(`Confirm receiving ₹${amount} via ${mode} from ${name}?`)) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 1. Create a Payment Receipt in showroom_memos (This routes cash to accounting.js)
    const receiptPayload = {
        isPaymentReceipt: true,
        customerName: name,
        customerMobile: mobile,
        memoDate: dateStr,
        grandTotalPayable: 0, 
        amountPaid: amount,
        balanceDue: 0, 
        paymentMode: mode,
        localTimestamp: new Date().toISOString()
    };

    const memoRef = db.collection("showroom_memos").doc();
    let promises = [memoRef.set(receiptPayload)];

    // 2. Deduct debt from CRM profile
    const crmRef = db.collection("client_profiles").doc(mobile);
    promises.push(crmRef.set({
        pendingDue: firebase.firestore.FieldValue.increment(-amount)
    }, { merge: true }));

    Promise.all(promises).then(() => {
        alert(`✅ Payment of ₹${amount} received! Accounting Day-Book has been updated.`);
        lookupCustomer(); // Refresh screen
    }).catch(e => alert("Error processing payment: " + e.message));
}

// ----------------------------------------------------
// WHATSAPP SMART GREETINGS
// ----------------------------------------------------
function sendGreeting(eventType) {
    const mobile = document.getElementById('crmMobile').value.trim();
    const name = document.getElementById('crmName').value.trim() || "Valued Client";
    
    if (!mobile) {
        alert("Please search and load a client profile first.");
        return;
    }
    
    let msg = "";
    if (eventType === "Birthday") {
        msg = `Happy Birthday ${name}! 🎂\n\nWishing you a wonderful day filled with joy. As a special gift from the Jini Jewels team, show this message to receive 50% off making charges on your next purchase!\n\n✨ Jini Jewels, Surat`;
    } else {
        msg = `Happy Anniversary ${name}! 💍\n\nWishing you years of continuous love. As a special gift from the Jini Jewels team, show this message to receive an exclusive VIP discount on your next purchase!\n\n✨ Jini Jewels, Surat`;
    }
    
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
}
