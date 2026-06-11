// =================================================================
// JINI JEWELS - STOCK INVENTORY LOGIC (js/modules/inventory.js)
// =================================================================

let currentFormMode = "weight"; 
let localLedgerCacheArray = []; 
let currentItemPhotoBase64 = "";

document.addEventListener("DOMContentLoaded", () => { 
    // Trigger global security enforcing check (from security.js)
    enforceTerminalSecurity();
    
    // Initial Setup
    generateRandomSku(); 
    streamLiveEcosystemLedgers(); 

    // Bind real-time input listeners to refresh the preview tag canvas
    ['invTagId', 'invDesc', 'invWeight', 'invRate', 'invLabour', 'invMrp', 'invOther', 'invCypher'].forEach(id => { 
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', refreshPreviewCanvas); 
        }
    });
});

// ----------------------------------------------------
// PHOTO COMPRESSION & BASE64 ENGINE
// ----------------------------------------------------
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress to a max width of 400px to respect Firestore limits
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 400; 
            const scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Output to 70% quality JPEG
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7); 
            currentItemPhotoBase64 = compressedBase64;
            
            const previewContainer = document.getElementById("photoPreviewContainer");
            const previewImage = document.getElementById("photoPreview");
            
            previewImage.src = compressedBase64;
            previewContainer.classList.remove("hidden");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ----------------------------------------------------
// FORM FIELD HANDLERS & SKU GENERATION
// ----------------------------------------------------
function generateRandomSku() { 
    document.getElementById('invTagId').value = "JJ-" + Math.floor(200000 + Math.random() * 700000); 
    refreshPreviewCanvas(); 
}

function toggleFormSaleMode() { 
    currentFormMode = document.getElementById('invModeSelect').value; 
    
    if(currentFormMode === 'weight') { 
        document.getElementById('weightInputsRow').classList.remove('hidden'); 
        document.getElementById('mrpInputBox').classList.add('hidden'); 
    } else { 
        document.getElementById('mrpInputBox').classList.remove('hidden'); 
        document.getElementById('weightInputsRow').classList.add('hidden'); 
    } 
    
    refreshPreviewCanvas(); 
}

function handleCategorySelection() { 
    const selectValue = document.getElementById('invCategorySelect').value; 
    const customInput = document.getElementById('invCustomCategoryInput'); 
    
    if(selectValue === 'Custom') {
        customInput.classList.remove('hidden'); 
    } else {
        customInput.classList.add('hidden'); 
    }
}

// ----------------------------------------------------
// DYNAMIC PREVIEW & QR RENDERING
// ----------------------------------------------------
function refreshPreviewCanvas() {
    const tagId = document.getElementById('invTagId').value.trim().toUpperCase() || "----"; 
    const desc = document.getElementById('invDesc').value.trim() || "Item Details"; 
    const cypher = document.getElementById('invCypher').value.trim().toLowerCase();
    const weight = parseFloat(document.getElementById('invWeight').value) || 0; 
    const rate = parseFloat(document.getElementById('invRate').value) || 0; 
    const labour = parseFloat(document.getElementById('invLabour').value) || 0; 
    const mrp = parseFloat(document.getElementById('invMrp').value) || 0; 
    const other = parseFloat(document.getElementById('invOther').value) || 0;
    
    let metricsStr = currentFormMode === 'weight' ? `${weight.toFixed(2)}g | ₹${rate + labour}/g` : `₹${mrp + other}`;
    
    document.getElementById('tagTxtId').innerText = "#" + tagId; 
    document.getElementById('tagTxtDesc').innerText = desc + (cypher ? ` (${cypher})` : "");
    document.getElementById('tagTxtMetrics').innerText = metricsStr;
    
    document.getElementById('pTagId').innerText = tagId; 
    document.getElementById('pTagDesc').innerText = desc; 
    document.getElementById('pTagCypher').innerText = cypher ? `[${cypher}]` : ""; 
    document.getElementById('pTagMetrics').innerText = metricsStr;
    
    document.getElementById('tagQrOutput').innerHTML = ""; 
    document.getElementById('pTagQr').innerHTML = "";
    
    if (tagId !== "----") { 
        // Using correctLevel M for better scanning on tiny string tags
        new QRCode(document.getElementById('tagQrOutput'), { text: tagId, width: 65, height: 65, correctLevel: QRCode.CorrectLevel.M }); 
        new QRCode(document.getElementById('pTagQr'), { text: tagId, width: 72, height: 72, correctLevel: QRCode.CorrectLevel.M }); 
    }
}

// ----------------------------------------------------
// CLOUD SYNCHRONIZATION & LEDGER BUILDER
// ----------------------------------------------------
function streamLiveEcosystemLedgers() {
    if (typeof db === 'undefined') return;
    
    db.collection("jini_inventory").onSnapshot((snapshot) => {
        localLedgerCacheArray = []; 
        let total = 0, sold = 0, available = 0;
        
        snapshot.forEach(doc => { 
            const data = doc.data(); 
            localLedgerCacheArray.push(data); 
            total++; 
            if(data.status === 'Sold') {
                sold++; 
            } else {
                available++; 
            }
        });
        
        document.getElementById('statInward').innerText = total; 
        document.getElementById('statOutward').innerText = sold; 
        document.getElementById('statAvailable').innerText = available;
        
        renderTableRecords(localLedgerCacheArray);
    });
}

function renderTableRecords(records) {
    const tableBody = document.getElementById('ledgerTableBody'); 
    
    if(records.length === 0) { 
        tableBody.innerHTML = `<tr><td colspan=\"6\" class=\"text-center py-12 text-gray-300 font-bold\">No registered items.</td></tr>`; 
        return; 
    }
    
    tableBody.innerHTML = "";
    
    records.forEach(item => {
        const tr = document.createElement('tr'); 
        tr.className = "border-b border-gray-100 hover:bg-emerald-50/50 transition-colors"; 
        const badgeColor = item.status === 'Sold' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
        
        const photoCell = item.itemPhotoData 
            ? `<img src="${item.itemPhotoData}" class="w-9 h-9 rounded-md object-cover border border-gray-200 shadow-sm" />` 
            : `<div class="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">📷</div>`;
        
        tr.innerHTML = `
            <td class="py-2.5 text-center">${photoCell}</td>
            <td class="py-2.5 font-mono font-black text-gray-900">#${item.tagNumberId}</td>
            <td class="py-2.5 text-[11px] text-gray-400 uppercase">${item.itemCategory || 'Silver'}</td>
            <td class="py-2.5 font-black text-gray-800">
                ${item.itemNameDescription} 
                ${item.itemCypherCode ? `<div class="text-[9px] font-mono font-normal text-gray-400 mt-0.5 tracking-widest uppercase">${item.itemCypherCode}</div>` : ''}
            </td>
            <td class="py-2.5 text-right font-black text-gray-900">${item.netWeightValue ? item.netWeightValue.toFixed(2)+' g' : '-'}</td>
            <td class="py-2.5 text-center">
                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${badgeColor}">${item.status || 'In Stock'}</span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function filterLedgerTable() { 
    const query = document.getElementById('ledgerSearch').value.toLowerCase().trim(); 
    
    if(!query) { 
        renderTableRecords(localLedgerCacheArray); 
        return; 
    } 
    
    const matches = localLedgerCacheArray.filter(i => 
        i.tagNumberId.toLowerCase().includes(query) || 
        i.itemNameDescription.toLowerCase().includes(query) || 
        (i.itemCategory && i.itemCategory.toLowerCase().includes(query))
    ); 
    
    renderTableRecords(matches); 
}

function saveItemToInventory() {
    const tagId = document.getElementById('invTagId').value.trim().toUpperCase(); 
    const desc = document.getElementById('invDesc').value.trim(); 
    const cypher = document.getElementById('invCypher').value.trim().toLowerCase(); 
    const weight = parseFloat(document.getElementById('invWeight').value) || 0; 
    const other = parseFloat(document.getElementById('invOther').value) || 0;
    
    let selectedCategory = document.getElementById('invCategorySelect').value; 
    if(selectedCategory === 'Custom') {
        selectedCategory = document.getElementById('invCustomCategoryInput').value.trim() || "Silver Item";
    }
    
    if(!tagId || !desc) { 
        alert("Tag SKU and Description Name are compulsory fields!"); 
        return; 
    }

    const itemPayload = { 
        tagNumberId: tagId, 
        itemNameDescription: desc, 
        searchName: desc.toLowerCase(), 
        itemCategory: selectedCategory, 
        itemCypherCode: cypher, 
        netWeightValue: weight, 
        otherChargesAmount: other, 
        pricingSaleMode: currentFormMode, 
        status: "In Stock", 
        itemPhotoData: currentItemPhotoBase64,
        metalRateValue: currentFormMode === 'weight' ? (parseFloat(document.getElementById('invRate').value) || 0) : 0, 
        labourChargeValue: currentFormMode === 'weight' ? (parseFloat(document.getElementById('invLabour').value) || 0) : 0, 
        fixedMrpAmount: currentFormMode === 'mrp' ? (parseFloat(document.getElementById('invMrp').value) || 0) : 0, 
        creationTimestamp: new Date().toISOString() 
    };
    
    db.collection("jini_inventory").doc(tagId).set(itemPayload).then(() => { 
        alert(`Stock Recorded Successfully!`); 
        
        // Reset Inputs
        document.getElementById('invDesc').value = ''; 
        document.getElementById('invCypher').value = ''; 
        document.getElementById('invWeight').value = ''; 
        document.getElementById('invOther').value = ''; 
        document.getElementById('invRate').value = ''; 
        document.getElementById('invLabour').value = ''; 
        document.getElementById('invMrp').value = ''; 
        
        // Reset Photo
        currentItemPhotoBase64 = "";
        document.getElementById("invPhotoInput").value = "";
        document.getElementById("photoPreviewContainer").classList.add("hidden");
        
        // Setup next item
        generateRandomSku(); 
    });
}
