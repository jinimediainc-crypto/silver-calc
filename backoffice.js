// =================================================================
// JINI JEWELS - BACK OFFICE MATH ENGINE (js/modules/backoffice.js)
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Enforce Security safely (bypasses crash if security.js is delayed)
    if (typeof window.enforceTerminalSecurity === "function") {
        window.enforceTerminalSecurity();
    }

    // 2. Map Elements INSIDE the loader to guarantee the HTML exists first
    const els = {
        rate: document.getElementById('boSilverRate'),
        weight: document.getElementById('boWeight'),
        labour: document.getElementById('boLabour'),
        commToggle: document.getElementById('boCommToggle'),
        commPercent: document.getElementById('boCommPercent'),
        gstToggle: document.getElementById('boGstToggle'),
        vSilv: document.getElementById('valSilver'),
        vLab: document.getElementById('valLabour'),
        vComm: document.getElementById('valComm'),
        vGst: document.getElementById('valGst'),
        rComm: document.getElementById('rowComm'),
        rGst: document.getElementById('rowGst'),
        lComm: document.getElementById('lblComm'),
        total: document.getElementById('boGrandTotal')
    };

    // 3. Bulletproof currency formatter (Works even if utils.js is missing)
    const formatMoney = (num) => {
        return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    // 4. Load Previous User Settings from Device Storage
    els.rate.value = localStorage.getItem('bo_rate') || '';
    els.commToggle.checked = localStorage.getItem('bo_commToggle') !== 'false';
    els.gstToggle.checked = localStorage.getItem('bo_gstToggle') !== 'false';
    if (localStorage.getItem('bo_commPercent')) {
        els.commPercent.value = localStorage.getItem('bo_commPercent');
    }

    // 5. The Live Math Engine
    function calculate() {
        try {
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
                els.rGst.classList.remove('hidden');
            } else { 
                els.rGst.classList.add('hidden'); 
            }

            const subTotalWithGst = baseVal + gstAmt;
            
            let commAmt = 0;
            if (els.commToggle.checked) {
                commAmt = subTotalWithGst * (cp / 100);
                els.rComm.classList.remove('hidden');
                els.lComm.innerText = `Commission (${cp}%)`;
            } else { 
                els.rComm.classList.add('hidden'); 
            }

            const finalTotal = Math.round(subTotalWithGst + commAmt);

            // Update UI
            els.vSilv.innerText = formatMoney(silvVal);
            els.vLab.innerText = formatMoney(labVal);
            els.vGst.innerText = formatMoney(gstAmt);
            els.vComm.innerText = formatMoney(commAmt);
            els.total.innerText = formatMoney(finalTotal);
        } catch(e) {
            console.error("Math Engine Error:", e);
        }
    }

    // 6. Bind Event Listeners (Triggers calculate() instantly on typing)
    els.rate.addEventListener('input', (e) => { localStorage.setItem('bo_rate', e.target.value); calculate(); });
    els.weight.addEventListener('input', calculate);
    els.labour.addEventListener('input', calculate);
    els.commPercent.addEventListener('input', (e) => { localStorage.setItem('bo_commPercent', e.target.value); calculate(); });
    els.commToggle.addEventListener('change', (e) => { localStorage.setItem('bo_commToggle', e.target.checked); calculate(); });
    els.gstToggle.addEventListener('change', (e) => { localStorage.setItem('bo_gstToggle', e.target.checked); calculate(); });

    // Run initial calculation to sync the zeros
    calculate();
});
