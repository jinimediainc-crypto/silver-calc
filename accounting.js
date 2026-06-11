// =================================================================
// JINI JEWELS - ACCOUNTING & DAY-BOOK LOGIC (js/modules/accounting.js)
// =================================================================

let globalSalesTotal = 0;
let globalExpensesTotal = 0;
let expensesUnsubscribe = null;
let salesUnsubscribe = null;

document.addEventListener("DOMContentLoaded", () => { 
    // 1. Enforce Terminal Security (from security.js)
    enforceTerminalSecurity();

    // 2. Set today's date in the date picker by default
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('ledgerDate').value = `${yyyy}-${mm}-${dd}`;
    
    // 3. Run Initial Fetch
    fetchDailyFinancials(); 
});

// ----------------------------------------------------
// FINANCIAL MATH ENGINE
// ----------------------------------------------------
function updateNetCash() {
    const netCash = globalSalesTotal - globalExpensesTotal;
    // formatCurrency is automatically pulled from js/core/utils.js
    document.getElementById('statNet').innerText = formatCurrency(netCash);
}

// ----------------------------------------------------
// DAY-BOOK CLOUD FETCH & SYNC
// ----------------------------------------------------
function fetchDailyFinancials() {
    const targetDate = document.getElementById('ledgerDate').value;
    if (!targetDate) return;

    if (expensesUnsubscribe) expensesUnsubscribe();
    if (salesUnsubscribe) salesUnsubscribe();

    // 1. Fetch Sales Inflow
    salesUnsubscribe = db.collection("showroom_memos")
        .where("memoDate", "==", targetDate)
        .onSnapshot((snapshot) => {
            globalSalesTotal = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Track actual amount paid today
                let amount = 0;
                if (data.amountPaid !== undefined && data.amountPaid !== "") {
                    amount = parseFloat(data.amountPaid) || 0;
                } else {
                    // Fallback for older string-based formats
                    amount = parseFloat(data.grandTotalPayable.toString().replace(/,/g, '')) || 0;
                }
                
                globalSalesTotal += amount;
            });
            document.getElementById('statInflow').innerText = formatCurrency(globalSalesTotal);
            updateNetCash();
        }, (error) => console.error("Error fetching sales data: ", error));

    // 2. Fetch Expenses Outflow
    expensesUnsubscribe = db.collection("jini_expenses")
        .where("expenseDate", "==", targetDate)
        .orderBy("creationTimestamp", "desc")
        .onSnapshot((snapshot) => {
            globalExpensesTotal = 0;
            const tableBody = document.getElementById('expenseTableBody');
            tableBody.innerHTML = "";

            if(snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-300 font-bold">No expenses recorded.</td></tr>`;
            } else {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const docId = doc.id;
                    const amount = parseFloat(data.expenseAmount) || 0;
                    globalExpensesTotal += amount;
                    
                    const timeObj = new Date(data.creationTimestamp);
                    const timeString = timeObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    const tr = document.createElement('tr');
                    tr.className = "border-b border-gray-100 hover:bg-red-50/50 transition-colors";
                    
                    let modeIcon = "💵";
                    if(data.paymentMode === "UPI") modeIcon = "📱";
                    if(data.paymentMode === "Bank") modeIcon = "🏦";

                    tr.innerHTML = `
                        <td class="py-3 text-[10px] text-gray-400 font-black">${timeString}</td>
                        <td class="py-3 text-[11px] text-gray-500 uppercase tracking-wider">${data.expenseCategory}</td>
                        <td class="py-3 font-black text-gray-800">${data.expenseDescription}</td>
                        <td class="py-3 text-center text-sm">${modeIcon}</td>
                        <td class="py-3 text-right font-black text-red-600">₹${formatCurrency(amount)}</td>
                        <td class="py-3 text-center">
                            <button type="button" onclick="deleteExpenseRecord('${docId}')" class="text-gray-300 hover:text-red-600 text-sm transition-colors p-1">🗑️</button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
            document.getElementById('statOutflow').innerText = formatCurrency(globalExpensesTotal);
            updateNetCash();
        }, (error) => console.error("Error fetching expenses data: ", error));
}

// ----------------------------------------------------
// EXPENSE DATA ENTRY
// ----------------------------------------------------
function saveExpenseRecord() {
    const desc = document.getElementById('expDesc').value.trim();
    const amount = parseFloat(document.getElementById('expAmount').value) || 0;
    const category = document.getElementById('expCategory').value;
    const mode = document.getElementById('expMode').value;
    const targetDate = document.getElementById('ledgerDate').value;

    if (!desc || amount <= 0) {
        alert("Please provide a valid description and an amount greater than 0.");
        return;
    }

    if (!confirm(`Are you sure you want to deduct ₹${amount} for ${desc}?`)) return;

    const expensePayload = {
        expenseCategory: category, 
        expenseDescription: desc, 
        expenseAmount: amount,
        paymentMode: mode, 
        expenseDate: targetDate, 
        creationTimestamp: new Date().toISOString()
    };

    db.collection("jini_expenses").add(expensePayload).then(() => {
        document.getElementById('expDesc').value = '';
        document.getElementById('expAmount').value = '';
    }).catch(e => alert("System Error logging expense: " + e.message));
}

function deleteExpenseRecord(docId) {
    if(!confirm("Are you sure you want to delete this expense record?")) return;
    db.collection("jini_expenses").doc(docId).delete().catch(e => alert("System Error: " + e.message));
}
