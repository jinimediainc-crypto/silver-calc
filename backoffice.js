// =================================================================
// JINI JEWELS - BACK OFFICE MATH ENGINE (js/modules/backoffice.js)
// =================================================================

function initializeBackOfficeEngine() {
    try {
        // 1. ISOLATED SECURITY CHECK
        if (typeof window.enforceTerminalSecurity === "function") {
            window.enforceTerminalSecurity();
        }

        // 2. Map Elements
        const els = {
            rate: document.getElementById('boSilverRate'),
            weight: document.getElementById('boWeight'),
            labour: document.getElementById('boLabour'),
            commToggle: document.getElementById('boGstToggle'), // GST Toggle
            commPercent: document.getElementById('boCommPercent'),
            gstToggle: document.getElementById('boGstToggle'), 
            commBoxToggle: document.getElementById('boCommToggle'), // Commission Toggle
            vSilv: document.getElementById('valSilver'),
            vLab: document.getElementById('valLabour'),
            vComm: document.getElementById('valComm'),
            vGst: document.getElementById('valGst'),
            rComm: document.getElementById('rowComm'),
            rGst: document.getElementById('rowGst'),
            lComm: document.getElementById('lblComm'),
            total: document.getElementById('boGrandTotal')
        };

        // UI DIAGNOSTIC: Immediately alert if the HTML structure is missing
        for (const [key, el] of Object.entries(els)) {
            if (!el) {
                alert(`System Error: Could not find HTML element -> ${key}`);
                return; 
            }
        }

        // 3. Independent Formatter
        const formatMoney = (num) => {
            if (isNaN(num)) return "0";
            return Math.round(num).toLocaleString('en-IN');
        };

        // 4. Load Saved Parameters
        els.rate.value = localStorage.getItem('bo_rate') || '';
        els.commBoxToggle.checked = localStorage.getItem('bo_commToggle') !== 'false';
        els.gstToggle.checked = localStorage.getItem('bo_gstToggle') !== 'false';
        if (localStorage.getItem('bo_commPercent')) {
            els.commPercent.value = localStorage.getItem('bo_commPercent');
        }

        // 5. Core Engine
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
                els.rGst.classList.remove('hidden');
            } else { 
                els.rGst.classList.add('hidden'); 
            }

            const subTotalWithGst = baseVal + gstAmt;
            
            let commAmt = 0;
            if (els.commBoxToggle.checked) {
                commAmt = subTotalWithGst * (cp / 100);
                els.rComm.classList.remove('hidden');
                els.lComm.innerText = `Commission (${cp}%)`;
            } else { 
                els.rComm.classList.add('hidden'); 
            }

            const finalTotal = subTotalWithGst + commAmt;

            els.vSilv.innerText = formatMoney(silvVal);
            els.vLab.innerText = formatMoney(labVal);
            els.vGst.innerText = formatMoney(gstAmt);
            els.vComm.innerText = formatMoney(commAmt);
            els.total.innerText = formatMoney(finalTotal);
        }

        // 6. Bind Real-Time Listeners
        els.rate.addEventListener('input', (e) => { localStorage.setItem('bo_rate', e.target.value); calculate(); });
        els.weight.addEventListener('input', calculate);
        els.labour.addEventListener('input', calculate);
        els.commPercent.addEventListener('input', (e) => { localStorage.setItem('bo_commPercent', e.target.value); calculate(); });
        els.commBoxToggle.addEventListener('change', (e) => { localStorage.setItem('bo_commToggle', e.target.checked); calculate(); });
        els.gstToggle.addEventListener('change', (e) => { localStorage.setItem('bo_gstToggle', e.target.checked); calculate(); });

        // 7. Run initial calculation
        calculate();

    } catch (error) {
        alert("Fatal Math Engine Crash: " + error.message);
    }
}

// 🟢 CRITICAL BYPASS FOR iOS SAFARI BUG
// This forces the script to boot up regardless of whether the page loaded fast or slow.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBackOfficeEngine);
} else {
    initializeBackOfficeEngine();
}
