// =================================================================
// JINI JEWELS - POS & BILLING ENGINE (js/modules/billing.js)
// =================================================================

let items = []; 
let saleMode = "weight"; 
let globalHistoryCache = []; 
let cameraScannerEngineInstance = null;
let activeDocId = null; 
window.localShowroomInventoryMemoryList = [];

// Using global objects to easily bind to DOM elements when they load
let inputs = {};

document.addEventListener("DOMContentLoaded", () => {
    // Set date to today
    document.getElementById('memoDate').valueAsDate = new Date();

    // Map DOM elements
    inputs = {
        name: document.getElementById('custName'), 
        mobile: document.getElementById('custMobile'), 
        memoId: document.getElementById('memoId'),
        desc: document.getElementById('itemDesc'), 
        stockTag: document.getElementById('itemAttachedStockTag'),
        rate: document.getElementById('itemRate'), 
        labour: document.getElementById('itemLabour'), 
        mrp: document.getElementById('itemMrp'),
        itemWeight: document.getElementById('itemWeight'), 
        other: document.getElementById('itemOther'),
        huidToggle: document.getElementById('itemHuidToggle'), 
        huidPrice: document.getElementById('itemHuidPrice'),
        taxToggle: document.getElementById('taxToggle'), 
        discType: document.getElementById('discountType'), 
        discVal: document.getElementById('discountValue')
    };

    // Live Sync Listeners
    document.getElementById('memoId').addEventListener('input', () => { 
        document.getElementById('prevMemoId').innerText = document.getElementById('memoId').value || '--'; 
    });
    
    setupSync('custName', 'prevName', '--'); 
    setupSync('custMobile', 'prevMobile', '--'); 
    setupSync('memoDate', 'prevDate', '--');

    // Click outside search suggestions
    document.addEventListener('click', (e) => { 
        if(e.target.id !== 'liveSearchQuery') {
            document.getElementById('searchSuggestions')?.classList.add('hidden'); 
        }
    });

    // DB Subscriptions
    if (typeof db !== 'undefined') {
        runAutoSequenceIncrement();
        db.collection("jini_inventory").onSnapshot((snapshot) => {
            window.localShowroomInventoryMemoryList = [];
            snapshot.forEach(doc => { 
                window.localShowroomInventoryMemoryList.push(doc.data()); 
            });
        });
    }
});

function runAutoSequenceIncrement() {
    db.collection("showroom_memos").get().then((querySnapshot) => {
        let maxNum = 1000;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const idNum = parseInt(data.estimateNumber);
            if (!isNaN(idNum) && idNum > maxNum) maxNum = idNum;
        });
        const nextSequenceId = maxNum + 1;
        document.getElementById('memoId').value = nextSequenceId;
        document.getElementById('prevMemoId').innerText = nextSequenceId;
    });
}

function setupSync(inputId, prevId, fallback) {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => { 
        document.getElementById(prevId).innerText = input.value || fallback; 
    });
    document.getElementById(prevId).innerText = input.value || fallback;
}

// ----------------------------------------------------
// INVENTORY LOOKUP & SCANNER
// ----------------------------------------------------
function showSearchSuggestions() {
    const query = document.getElementById('liveSearchQuery').value.trim().toLowerCase();
    const suggestionBox = document.getElementById('searchSuggestions');
    if(!query) { suggestionBox.classList.add('hidden'); return; }

    const matches = window.localShowroomInventoryMemoryList.filter(i => 
        i.tagNumberId.toLowerCase().includes(query) || 
        i.itemNameDescription.toLowerCase().includes(query)
    );

    if(matches.length === 0) { suggestionBox.classList.add('hidden'); return; }

    suggestionBox.innerHTML = "";
    matches.slice(0, 6).forEach(item => {
        if (item.status === "Sold") return;
        const cardRow = document.createElement('div'); 
        cardRow.className = "p-3 bg-white hover:bg-emerald-50 cursor-pointer flex justify-between items-center border-b border-gray-100 text-gray-900 font-bold";
        const rateInfo = item.pricingSaleMode === 'mrp' ? 'Fixed Price' : `₹${item.metalRateValue + item.labourChargeValue}/g`;
        cardRow.innerHTML = `
            <div>
                <p class="text-xs">#${item.tagNumberId} - ${item.itemNameDescription}</p>
                <p class="text-gray-400 text-[10px] font-normal mt-0.5">${item.itemCategory || 'Silver'} | ${rateInfo}</p>
            </div>
            <span class="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-black">${item.netWeightValue ? item.netWeightValue.toFixed(2)+'g' : '-'}</span>
        `;
        cardRow.addEventListener('click', () => { 
            populateFormFieldsWithStockData(item); 
            suggestionBox.classList.add('hidden'); 
        });
        suggestionBox.appendChild(cardRow);
    });
    suggestionBox.classList.remove('hidden');
}

function executeDatabaseLookup() {
    const query = document.getElementById('liveSearchQuery').value.trim().toLowerCase(); 
    if(!query) return;
    let foundRecord = window.localShowroomInventoryMemoryList.find(i => i.tagNumberId.toLowerCase() === query);
    if(!foundRecord) { 
        foundRecord = window.localShowroomInventoryMemoryList.find(i => i.itemNameDescription.toLowerCase().includes(query)); 
    }
    if(foundRecord) { 
        populateFormFieldsWithStockData(foundRecord); 
        document.getElementById('searchSuggestions').classList.add('hidden'); 
    } else { 
        alert(`No inventory matched: "${query}"`); 
    }
}

function handleBarcodeGunScan(e) { if (e.key === 'Enter') { e.preventDefault(); executeDatabaseLookup(); } }

function populateFormFieldsWithStockData(data) {
    if(data.status === "Sold") { alert(`⚠️ STOCK WARNING: Tag #${data.tagNumberId} is already marked as SOLD.`); }
    inputs.desc.value = data.itemNameDescription || ''; 
    inputs.stockTag.value = data.tagNumberId || ''; 
    inputs.itemWeight.value = data.netWeightValue || ''; 
    inputs.other.value = data.otherChargesAmount || '0';
    
    if (data.pricingSaleMode === 'mrp') { 
        setSaleMode(null, 'mrp'); 
        inputs.mrp.value = data.fixedMrpAmount || ''; 
    } else { 
        setSaleMode(null, 'weight'); 
        inputs.rate.value = data.metalRateValue || ''; 
        inputs.labour.value = data.labourChargeValue || ''; 
    }
    document.getElementById('liveSearchQuery').value = ""; 
    inputs.itemWeight.focus();
}

function startCameraScanner() { 
    document.getElementById('qrScannerBox').classList.remove('hidden'); 
    cameraScannerEngineInstance = new Html5Qrcode("cameraViewfinder"); 
    cameraScannerEngineInstance.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 }, 
        (txt) => { document.getElementById('liveSearchQuery').value = txt; stopCameraScanner(); executeDatabaseLookup(); }, 
        () => {}
    ); 
}
function stopCameraScanner() { 
    if(cameraScannerEngineInstance) {
        cameraScannerEngineInstance.stop().then(() => { document.getElementById('qrScannerBox').classList.add('hidden'); });
    }
}

// ----------------------------------------------------
// BILLING OPERATIONS
// ----------------------------------------------------
function executePrint(e) { 
    if (e) e.preventDefault(); 
    if (!checkMandatoryDetails()) return; 
    
    const format = document.getElementById('printFormatSelect').value;
    document.body.className = document.body.className.replace(/print-(thermal|a4|a5)/g, '');
    document.body.classList.add('print-' + format);
    
    window.print(); 
}

function checkMandatoryDetails() { 
    const n = inputs.name.value.trim(); const m = inputs.mobile.value.trim(); 
    if (!n || !m) { alert("Customer Name and Mobile Number are strictly compulsory!"); return false; } 
    return true; 
}

function setSaleMode(browserEvent, mode) {
    if (browserEvent) { browserEvent.preventDefault(); browserEvent.stopPropagation(); } 
    saleMode = mode;
    if (mode === 'weight') {
        document.getElementById('btnModeWeight').className = "text-xs font-black uppercase px-4 py-2 rounded-lg bg-[#047857] text-white";
        document.getElementById('btnModeMrp').className = "text-xs font-black uppercase px-4 py-2 rounded-lg text-gray-500";
        document.getElementById('rowWeightRate').classList.remove('hidden'); 
        document.getElementById('rowFixedMrp').classList.add('hidden');
        document.getElementById('lblWeight').innerText = "Net Weight (g) *";
    } else {
        document.getElementById('btnModeMrp').className = "text-xs font-black uppercase px-4 py-2 rounded-lg bg-blue-800 text-white";
        document.getElementById('btnModeWeight').className = "text-xs font-black uppercase px-4 py-2 rounded-lg text-gray-500";
        document.getElementById('rowFixedMrp').classList.remove('hidden'); 
        document.getElementById('rowWeightRate').classList.add('hidden');
        document.getElementById('lblWeight').innerText = "Weight (g - Optional)";
    }
}

function addItem(e) {
    if (e) e.preventDefault(); 
    if (!checkMandatoryDetails()) return;
    
    const desc = inputs.desc.value.trim();
    const tagRef = inputs.stockTag.value; // Can be empty for loose items!
    const other = parseFloat(inputs.other.value) || 0;
    const weight = parseFloat(inputs.itemWeight.value) || 0;
    const huidAmt = inputs.huidToggle.checked ? (parseFloat(inputs.huidPrice.value) || 0) : 0;
    
    if (!desc) { alert("Please input Item Description!"); return; } 
    
    let total = 0;
    if (saleMode === "weight") {
        let r = parseFloat(inputs.rate.value) || 0; let l = parseFloat(inputs.labour.value) || 0;
        if (weight <= 0) { alert("Net Weight is mandatory for weight-based items!"); return; }
        total = Math.round(((r + l) * weight) + other + huidAmt);
    } else { 
        let mrp = parseFloat(inputs.mrp.value) || 0; 
        if (mrp <= 0) { alert("Please input Fixed Item MRP!"); return; } 
        total = Math.round(mrp + other + huidAmt); 
    }

    items.push({ desc, tagNumberId: tagRef, total, weight });
    inputs.desc.value = ''; inputs.stockTag.value = ''; inputs.itemWeight.value = ''; inputs.other.value = '';
    
    renderInvoice();
}

function editItem(index) {
    const item = items[index]; 
    inputs.desc.value = item.desc; inputs.stockTag.value = item.tagNumberId || '';
    inputs.itemWeight.value = item.weight || ''; inputs.other.value = item.other || ''; inputs.huidPrice.value = item.huidPriceVal || '50';
    if (item.mrp > 0) { setSaleMode(null, 'mrp'); inputs.mrp.value = item.mrp; } 
    else { setSaleMode(null, 'weight'); inputs.rate.value = item.rate; inputs.labour.value = item.labour; }
    items.splice(index, 1); renderInvoice();
}

function deleteItem(index) { items.splice(index, 1); renderInvoice(); }

function renderInvoice() {
    const wrapper = document.getElementById('invoiceTableWrapper');
    
    if (items.length === 0) {
        wrapper.innerHTML = `<p class="text-center text-gray-300 font-medium text-sm py-16">No items on canvas</p>`;
        document.getElementById('itemCountLabel').innerText = '0 Items Added'; 
        document.getElementById('prevGross').innerText = '0';
        document.getElementById('prevTax').innerText = '0'; 
        document.getElementById('printGrandTotal').innerText = '0';
        document.getElementById('invoiceGrandTotalDisplay').innerText = '0'; 
        document.getElementById('printBalanceDue').innerText = '0';
        return;
    }
    
    let tableHtml = `<table class="print-table w-full text-left text-xs border-collapse">
        <thead>
            <tr class="border-b-2 border-black">
                <th class="py-2 w-8 text-center">Sr.</th>
                <th>Description</th>
                <th class="text-right w-20">Weight</th>
                <th class="text-right pr-1 w-28">Amount</th>
                <th class="internal-only no-print text-center w-16">Action</th>
            </tr>
        </thead>
        <tbody>`;
    
    let gross = 0;
    items.forEach((item, idx) => {
        gross += item.total; 
        const wDisp = item.weight > 0 ? `${item.weight.toFixed(2)} g` : `-`;
        tableHtml += `
            <tr class="align-top border-b border-gray-100">
                <td class="py-3 text-center text-gray-400">${idx+1}</td>
                <td class="py-3 font-black text-gray-800 text-sm">${item.desc}</td>
                <td class="py-3 text-right font-bold">${wDisp}</td>
                <td class="py-3 text-right font-black pr-1">₹${item.total.toLocaleString('en-IN')}</td>
                <td class="py-3 text-center internal-only no-print space-x-1">
                    <button type="button" onclick="editItem(${idx})">✏️</button>
                    <button type="button" onclick="deleteItem(${idx})">🗑️</button>
                </td>
            </tr>`;
    });
    tableHtml += `</tbody></table>`; wrapper.innerHTML = tableHtml;

    const taxApplied = inputs.taxToggle.checked; 
    const gst = taxApplied ? Math.round(gross * 0.03) : 0;
    const dIn = parseFloat(inputs.discVal.value) || 0;
    const dAmt = inputs.discType.value === 'percent' ? Math.round((gross + gst) * (dIn / 100)) : Math.round(dIn);
    const finalTotal = (gross + gst) - dAmt;

    let amtPaidInput = document.getElementById('amtPaid').value;
    let amtPaid = amtPaidInput === '' ? finalTotal : (parseFloat(amtPaidInput) || 0);
    
    const balDue = Math.max(0, finalTotal - amtPaid);
    document.getElementById('printBalanceDue').innerText = balDue.toLocaleString('en-IN');

    document.getElementById('invoiceGrossRow').style.display = taxApplied ? "flex" : "none";
    document.getElementById('invoiceGstRow').style.display = taxApplied ? "flex" : "none";
    if (dAmt > 0) { 
        document.getElementById('invoiceDiscountRow').classList.remove('hidden'); 
        document.getElementById('prevDiscountAmt').innerText = dAmt.toLocaleString('en-IN'); 
    } else { 
        document.getElementById('invoiceDiscountRow').classList.add('hidden'); 
    }

    document.getElementById('itemCountLabel').innerText = `${items.length} Items`;
    document.getElementById('prevGross').innerText = gross.toLocaleString('en-IN'); 
    document.getElementById('prevTax').innerText = gst.toLocaleString('en-IN');
    
    document.getElementById('printGrandTotal').innerText = finalTotal.toLocaleString('en-IN'); 
    document.getElementById('invoiceGrandTotalDisplay').innerText = finalTotal.toLocaleString('en-IN'); 
}

// ----------------------------------------------------
// CLOUD SAVE & AUTOMATIC CRM GENERATION
// ----------------------------------------------------
function executeCloudSave(e) {
    if (e) e.preventDefault(); 
    if (!checkMandatoryDetails() || items.length === 0) return;
    
    const saveBtn = document.getElementById('btnCloudSave'); 
    saveBtn.innerText = "⏳ Syncing..."; 
    saveBtn.disabled = true;
    
    const targetId = inputs.memoId.value.trim();
    const finalTotalStr = document.getElementById('printGrandTotal').innerText;
    const finalTotalNum = parseFloat(finalTotalStr.replace(/,/g, '')) || 0;
    
    const amtPaidInput = document.getElementById('amtPaid').value;
    const amtPaid = amtPaidInput === '' ? finalTotalNum : (parseFloat(amtPaidInput) || 0);
    const balDue = Math.max(0, finalTotalNum - amtPaid);

    const payload = {
        estimateNumber: targetId, 
        customerName: inputs.name.value.trim(), 
        customerMobile: inputs.mobile.value.trim(),
        memoDate: document.getElementById('memoDate').value, 
        itemsListArray: items, 
        subtotalAmount: document.getElementById('prevGross').innerText,
        taxAppliedBool: inputs.taxToggle.checked, 
        discountGivenValue: document.getElementById('prevDiscountAmt').innerText || '0',
        grandTotalPayable: finalTotalNum, 
        amountPaid: amtPaid,
        balanceDue: balDue,
        paymentMode: document.getElementById('paymentMode').value,
        localTimestamp: new Date().toISOString()
    };

    const ref = activeDocId ? db.collection("showroom_memos").doc(activeDocId) : db.collection("showroom_memos").doc();
    let updatePromises = [ref.set(payload)];
    
    items.forEach(item => { 
        if (item.tagNumberId && item.tagNumberId !== "") { 
            updatePromises.push(db.collection("jini_inventory").doc(item.tagNumberId).update({ status: "Sold" })); 
        } 
    });

    const crmRef = db.collection("client_profiles").doc(inputs.mobile.value.trim());
    updatePromises.push(crmRef.set({
        name: inputs.name.value.trim(),
        mobile: inputs.mobile.value.trim(),
        lastPurchaseDate: document.getElementById('memoDate').value,
        totalLifetimeValue: firebase.firestore.FieldValue.increment(finalTotalNum),
        pendingDue: firebase.firestore.FieldValue.increment(balDue)
    }, { merge: true }));
    
    Promise.all(updatePromises).then(() => { 
        alert(`✅ Cloud Record Saved! CRM Profiles and Accounting Ledgers Updated.`); 
        resetTerminalBillingState(); 
    }).catch(err => { 
        alert(err.message); 
        saveBtn.innerText = "☁️ Cloud Save"; 
        saveBtn.disabled = false; 
    });
}

function toggleHistoryModal(s) { 
    const m = document.getElementById('historyModal'); 
    if(s) { m.classList.remove('opacity-0', 'pointer-events-none'); } 
    else { m.classList.add('opacity-0', 'pointer-events-none'); }
}

function fetchHistoryFromCloud() {
    toggleHistoryModal(true); 
    const list = document.getElementById('historyMemosList'); 
    list.innerHTML = `<p class="text-center font-bold animate-pulse">⏳ Loading records...</p>`;
    
    db.collection("showroom_memos").get().then((snap) => {
        globalHistoryCache = []; 
        if (snap.empty) { list.innerHTML = `<p class="text-center py-8">No memos found.</p>`; return; }
        snap.forEach(d => { 
            let recordData = d.data(); 
            recordData.fbDocIdReferenceToken = d.id; 
            globalHistoryCache.push(recordData); 
        }); 
        renderHistoryList(globalHistoryCache);
    });
}

function renderHistoryList(arr) {
    const list = document.getElementById('historyMemosList'); 
    list.innerHTML = "";
    
    arr.forEach(d => {
        const card = document.createElement('div'); 
        card.className = "bg-gray-50 border p-4 rounded-2xl mb-2 text-left cursor-pointer relative group transition-all hover:bg-emerald-50/60 shadow-sm";
        
        const grandTotal = d.grandTotalPayable.toLocaleString ? d.grandTotalPayable.toLocaleString('en-IN') : d.grandTotalPayable;
        const balDue = d.balanceDue > 0 ? `<span class="text-[9px] text-red-600 bg-red-100 px-1 rounded ml-2 uppercase tracking-wide border border-red-200">Due: ₹${d.balanceDue}</span>` : '';

        card.innerHTML = `
            <div class="flex justify-between font-black text-sm pr-6">
                <span>#${d.estimateNumber}</span>
                <span class="text-xs font-bold text-gray-400">${d.memoDate}</span>
            </div>
            <div class="flex justify-between mt-1 pr-6">
                <p class="text-xs uppercase text-gray-700 flex items-center">${d.customerName} ${balDue}</p>
                <span class="font-black text-emerald-700">₹${grandTotal}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2.5 mt-3 border-t border-gray-100">
                <button type="button" class="btn-load bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase py-1.5 rounded-lg text-center shadow-sm transition-colors">✏️ Edit / Load</button>
                <button type="button" class="btn-preview bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-black uppercase py-1.5 rounded-lg text-center border transition-colors">👁️ View PDF</button>
            </div>
            <button type="button" class="btn-delete absolute right-3 top-4 text-gray-300 hover:text-red-600 text-sm transition-colors p-1">🗑️</button>
        `;
        
        card.querySelector('.btn-load').addEventListener('click', (e) => { e.stopPropagation(); toggleHistoryModal(false); loadOldRecordIntoTerminal(d); });
        card.querySelector('.btn-preview').addEventListener('click', (e) => { e.stopPropagation(); loadOldRecordIntoTerminal(d); });
        card.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteHistoryRecord(d.fbDocIdReferenceToken); });
        
        list.appendChild(card);
    });
}

// FULL STOCK REVERSAL DELETE LOGIC
function deleteHistoryRecord(docId) { 
    if (!confirm("Are you sure you want to permanently delete this estimate?")) return; 
    if (!confirm("CRITICAL WARNING: This will automatically reverse matching jewelry items back to 'In Stock' and deduct the amount from the Customer's CRM LTV Profile! Proceed?")) return; 
    
    const record = globalHistoryCache.find(i => i.fbDocIdReferenceToken === docId); 
    
    db.collection("showroom_memos").doc(docId).delete().then(() => { 
        if (record && record.itemsListArray) { 
            let reversePromises = []; 
            
            record.itemsListArray.forEach(item => { 
                if (item.tagNumberId && item.tagNumberId !== "") { 
                    const promise = db.collection("jini_inventory").doc(item.tagNumberId).update({ status: "In Stock" });
                    reversePromises.push(promise); 
                } 
            }); 
            
            if (record.customerMobile) {
                const crmRef = db.collection("client_profiles").doc(record.customerMobile);
                reversePromises.push(crmRef.set({
                    totalLifetimeValue: firebase.firestore.FieldValue.increment(-(parseFloat(record.grandTotalPayable) || 0)),
                    pendingDue: firebase.firestore.FieldValue.increment(-(parseFloat(record.balanceDue) || 0))
                }, { merge: true }));
            }

            Promise.all(reversePromises).then(() => { 
                alert("🗑️ Invoice deleted! CRM balances and inventory stock levels successfully restored."); 
                if (activeDocId === docId) resetTerminalBillingState(); 
                fetchHistoryFromCloud(); 
            }).catch(err => {
                alert("Error reversing stock: " + err.message);
                fetchHistoryFromCloud();
            }); 
        } else {
            alert("🗑️ Invoice deleted successfully.");
            if(activeDocId === docId) resetTerminalBillingState();
            fetchHistoryFromCloud();
        }
    }).catch(err => alert("System Deletion Failure: " + err.message)); 
}

function filterHistoryLedger() {
    const q = document.getElementById('historySearchInput').value.toLowerCase().trim(); 
    if(!q) { renderHistoryList(globalHistoryCache); return; }
    const matches = globalHistoryCache.filter(i => 
        i.customerName.toLowerCase().includes(q) || 
        i.customerMobile.includes(q) || 
        i.estimateNumber.toString().includes(q)
    );
    renderHistoryList(matches);
}

function resetTerminalBillingState() { 
    activeDocId = null; 
    document.getElementById('editModeIndicator').classList.add('hidden'); 
    const b = document.getElementById('btnCloudSave'); 
    b.innerText = "☁️ Cloud Save"; 
    b.disabled = false; 
    b.className = "bg-blue-700 text-white font-bold py-3 px-4 rounded-xl uppercase tracking-wider text-[11px] shadow-md active:scale-95 transition-transform"; 
    
    runAutoSequenceIncrement(); 
    items = []; inputs.discVal.value = 0; document.getElementById('amtPaid').value = '';
    renderInvoice(); 
    inputs.name.value = ''; inputs.mobile.value = ''; 
}

function loadOldRecordIntoTerminal(d) { 
    activeDocId = d.fbDocIdReferenceToken; 
    document.getElementById('editModeIndicator').classList.remove('hidden'); 
    const b = document.getElementById('btnCloudSave'); 
    b.innerText = "💾 Update Existing Record"; 
    b.className = "bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl uppercase tracking-wider text-[11px] shadow-md active:scale-95 transition-transform"; 
    
    inputs.name.value = d.customerName || ''; 
    inputs.mobile.value = d.customerMobile || ''; 
    inputs.memoId.value = d.estimateNumber || ''; 
    document.getElementById('memoDate').value = d.memoDate || ''; 
    document.getElementById('amtPaid').value = d.amountPaid || '';
    document.getElementById('paymentMode').value = d.paymentMode || 'Cash';
    
    items = d.itemsListArray || []; 
    renderInvoice(); 
}

// ----------------------------------------------------
// WHATSAPP INTEGRATION ENGINE
// ----------------------------------------------------
function sendWhatsAppInvoice() {
    if (!checkMandatoryDetails() || items.length === 0) {
        alert("Cannot send empty invoice. Add items and customer details first!");
        return;
    }
    
    const mobile = inputs.mobile.value.trim();
    const name = inputs.name.value.trim();
    const total = document.getElementById('printGrandTotal').innerText;
    const estimateNo = inputs.memoId.value;
    const date = document.getElementById('memoDate').value;
    
    let text = `*JINI JEWELS*\nEstimate: #${estimateNo}\nDate: ${date}\n\nHi ${name},\nHere is the summary of your purchase today:\n\n`;
    
    items.forEach((item, idx) => {
        text += `▪️ ${item.desc}\n   Weight: ${item.weight > 0 ? item.weight+'g' : '-'} | Amt: ₹${item.total.toLocaleString('en-IN')}\n`;
    });
    
    text += `\n*Net Payable: ₹${total}*`;

    const balDueStr = document.getElementById('printBalanceDue').innerText;
    if (balDueStr !== "0") {
        const amtPaid = document.getElementById('amtPaid').value || "0";
        text += `\n*Amount Paid:* ₹${parseFloat(amtPaid).toLocaleString('en-IN')}`;
        text += `\n*Balance Due:* ₹${balDueStr}`;
    }

    text += `\n\nThank you for shopping with Jini Jewels! ✨\n📍 Surat, Gujarat`;
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/91${mobile}?text=${encodedText}`, '_blank');
}
