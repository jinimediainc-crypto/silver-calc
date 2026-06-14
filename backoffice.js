// =================================================================
// JINI JEWELS - BACK OFFICE MATH ENGINE (js/modules/backoffice.js)
// =================================================================

(() => { // Replaced DOMContentLoaded with an Immediate Invocation
    
    // Trigger global security if available
    try {
        if (typeof window.enforceTerminalSecurity === "function") {
            window.enforceTerminalSecurity();
        }
    } catch (e) {
        console.warn("Security check delayed.");
    }

    // MAP ELEMENTS (IDs exactly match HTML)
    const els = {
        rate: document.getElementById('boSilverRate'),
        weight: document.getElementById('boWeight'),
        labour: document.getElementById('boLabour'),
        gstToggle: document.getElementById('boGstToggle'),   
        commToggle: document.getElementById('boCommToggle'), 
        commPercent: document.getElementById('boCommPercent'),
        vSilv: document.getElementById('valSilver'),
        vLab: document.getElementById('valLabour'),
        vGst: document.getElementById('valGst'),
        vComm: document.getElementById('valComm'),
        rowGst: document.getElementById('rowGst'),
        rowComm: document.getElementById('rowComm'),
        lblComm: document.getElementById('lblComm'),
        total: document.getElementById('boGrandTotal')
    };

    // Diagnostic fallback
    if (!els.rate || !els.weight || !els.total) {
        console.error("DOM Elements not fully loaded.");
        return;
    }

    // Local formatter
    const formatMoney = (num) => Math.round(num || 0).toLocaleString('en-IN');

    // Load Local Storage Memory
    els.rate.value = localStorage.getItem('bo_rate') || '';
    els.labour.value = localStorage.getItem('bo_labour') || ''; // Added Labour Memory
    els.gstToggle.checked = localStorage.getItem('bo_gstToggle') !== 'false';
    els.commToggle.checked = localStorage.getItem('bo_commToggle') !== 'false';
    if (localStorage.getItem('bo_commPercent')) {
        els.commPercent.value = localStorage.getItem('bo_commPercent');
    }

    // CORE MATH ENGINE
    function calculate() {
        const r = parseFloat(els.rate.value) || 0;
        const w = parseFloat(els.weight.value) || 0;
        const l = parseFloat(els.labour.value) || 0;
        const cp = parseFloat(els.commPercent.value) || 0;
        
        const silvVal = r * w;
        const labVal = l * w;
        const baseVal = silvVal + labVal;

        let gstAmt = 0;
        if (els.gstToggle.checked) {
            gstAmt = baseVal * 0.03;
            els.rowGst.classList.remove('hidden');
        } else { 
            els.rowGst.classList.add('hidden'); 
        }

        const subTotal = baseVal + gstAmt;
        
        let commAmt = 0;
        if (els.commToggle.checked) {
            commAmt = subTotal * (cp / 100);
            els.rowComm.classList.remove('hidden');
            els.lblComm.innerText = `Commission (${cp}%)`;
        } else { 
            els.rowComm.classList.add('hidden'); 
        }

        const finalTotal = subTotal + commAmt;

        // UI Injection
        els.vSilv.innerText = formatMoney(silvVal);
        els.vLab.innerText = formatMoney(labVal);
        els.vGst.innerText = formatMoney(gstAmt);
        els.vComm.innerText = formatMoney(commAmt);
        els.total.innerText = formatMoney(finalTotal);
    }

    // ATTACH REAL-TIME EVENT LISTENERS
    els.rate.addEventListener('input', (e) => { localStorage.setItem('bo_rate', e.target.value); calculate(); });
    els.labour.addEventListener('input', (e) => { localStorage.setItem('bo_labour', e.target.value); calculate(); }); // Added listener
    els.weight.addEventListener('input', calculate);
    els.commPercent.addEventListener('input', (e) => { localStorage.setItem('bo_commPercent', e.target.value); calculate(); });
    els.gstToggle.addEventListener('change', (e) => { localStorage.setItem('bo_gstToggle', e.target.checked); calculate(); });
    els.commToggle.addEventListener('change', (e) => { localStorage.setItem('bo_commToggle', e.target.checked); calculate(); });

    // Initial Trigger immediately runs calculation
    calculate();
})();
