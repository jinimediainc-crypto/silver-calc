// =================================================================
// JINI JEWELS - RETAIL CALCULATOR LOGIC (js/modules/retail.js)
// =================================================================

const INDIAN_MARKET_MULTIPLIER = 1.14;
const GOLD_OFFSET_PER_GRAM = 0; 
const SILVER_OFFSET_PER_GRAM = 0;   

document.addEventListener("DOMContentLoaded", () => {
    enforceTerminalSecurity();
    fetchLiveRates();
    
    // Bind Event Listeners on Load
    els.dailyRate.addEventListener('input', (e) => { 
        localStorage.setItem('retail_compact_silverRate', e.target.value); 
        if (!els.itemRate.value) els.itemRate.value = e.target.value; 
        triggerForwardCalc(); 
    });
    
    els.itemRate.addEventListener('input', updateCompoundTag);
    
    els.hmToggle.addEventListener('change', (e) => { 
        localStorage.setItem('retail_hmToggle', e.target.checked); 
        updateToggleStyles(); 
        triggerForwardCalc(); 
    });
    
    els.hmCharge.addEventListener('input', (e) => { 
        localStorage.setItem('retail_hmCharge', e.target.value); 
        triggerForwardCalc(); 
    });
    
    els.gstToggle.addEventListener('change', (e) => { 
        localStorage.setItem('retail_gstToggle', e.target.checked); 
        updateToggleStyles(); 
        triggerForwardCalc(); 
    });

    els.code.addEventListener('input', () => { 
        if (isCalculating) return; 
        isCalculating = true; 
        const t = els.code.value.toLowerCase().split('x'); 
        if (t[1]) els.itemRate.value = decodeStandard(t[1]) || els.itemRate.value; 
        els.labour.value = decodeStandard(t[0]) || ''; 
        isCalculating = false; 
        triggerForwardCalc(); 
    });

    els.labour.addEventListener('input', () => { 
        if (isCalculating) return; 
        isCalculating = true; 
        updateCompoundTag(); 
        isCalculating = false; 
        triggerForwardCalc(); 
    });

    els.total.addEventListener('input', () => {
        if (isCalculating) return; 
        isCalculating = true; 
        const w = parseFloat(els.weight.value)||0, t = parseFloat(els.total.value)||0;
        
        if (w > 0 && t > 0) {
            let reqBase = ((els.gstToggle.checked ? t / 1.03 : t) - (parseFloat(els.other.value)||0) - (els.hmToggle.checked ? (parseFloat(els.hmCharge.value)||0) : 0)) / w;
            if (getSolveMode() === 'labour') { 
                els.labour.value = Math.round(Math.max(0, reqBase - (parseFloat(els.dailyRate.value)||0))); 
            } else { 
                els.dailyRate.value = els.itemRate.value = Math.round(Math.max(0, reqBase - (parseFloat(els.labour.value)||0))); 
                localStorage.setItem('retail_compact_silverRate', els.dailyRate.value); 
            }
            updateCompoundTag(); 
            updateBaseRateDisplay(parseFloat(els.labour.value)||0);
        }
        isCalculating = false;
    });

    ['weight', 'other'].forEach(id => els[id].addEventListener('input', triggerForwardCalc));
    Array.from(els.solveModeInputs).forEach(r => r.addEventListener('change', triggerForwardCalc)); 
    
    triggerForwardCalc();
});

// ----------------------------------------------------
// LIVE CURRENCY & METAL TICKER
// ----------------------------------------------------
async function fetchLiveRates() {
    try {
        const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!fiatRes.ok) throw new Error("API down");
        const fiatData = await fiatRes.json();
        const inr = fiatData.rates.INR, eur = inr / fiatData.rates.EUR;
        
        document.getElementById('tick-usd').innerText = `USD: ₹${inr.toFixed(2)}`;
        document.getElementById('tick-eur').innerText = `EUR: ₹${eur.toFixed(2)}`;
        document.getElementById('tick-usd-2').innerText = `USD: ₹${inr.toFixed(2)}`;
        document.getElementById('tick-eur-2').innerText = `EUR: ₹${eur.toFixed(2)}`;

        const metalRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        if (metalRes.ok) {
            const metalData = await metalRes.json();
            if(metalData.usd.xau) {
                const goldInr = ((1/metalData.usd.xau * inr) / 31.1035 * INDIAN_MARKET_MULTIPLIER) + GOLD_OFFSET_PER_GRAM;
                document.getElementById('tick-xau').innerText = `GOLD: ₹${Math.round(goldInr)}/g`;
                document.getElementById('tick-xau-2').innerText = `GOLD: ₹${Math.round(goldInr)}/g`;
            }
            if(metalData.usd.xag) {
                const silverInr = ((1/metalData.usd.xag * inr) / 31.1035 * INDIAN_MARKET_MULTIPLIER) + SILVER_OFFSET_PER_GRAM;
                document.getElementById('tick-xag').innerText = `SILV: ₹${Math.round(silverInr)}/g`;
                document.getElementById('tick-xag-2').innerText = `SILV: ₹${Math.round(silverInr)}/g`;
            }
        }
    } catch (error) {
        document.getElementById('ticker-container').innerHTML = '<span class="text-red-400">DATA OFFLINE</span>&nbsp;&nbsp;&nbsp;&nbsp;<span class="text-red-400">DATA OFFLINE</span>';
    }
}

// ----------------------------------------------------
// MATH & DECODING LOGIC
// ----------------------------------------------------
const decodeMap = { 's':'0', 'i':'1', 'l':'2', 'v':'3', 'e':'4', 'r':'5', 'b':'6', 'a':'7', 'n':'8', 'k':'9' };
const encodeMap = { '0':'s', '1':'i', '2':'l', '3':'v', '4':'e', '5':'r', '6':'b', '7':'a', '8':'n', '9':'k' };

const els = { 
    dailyRate: document.getElementById('dailySilverRate'), 
    itemRate: document.getElementById('itemSilverRate'), 
    code: document.getElementById('cypherCode'), 
    labour: document.getElementById('labourCharge'), 
    baseRateDisplay: document.getElementById('baseRateDisplay'), 
    weight: document.getElementById('weight'), 
    other: document.getElementById('otherCharges'), 
    hmToggle: document.getElementById('hmToggle'), 
    hmCharge: document.getElementById('hmCharge'), 
    gstToggle: document.getElementById('gstToggle'), 
    gstLabel: document.getElementById('gstLabel'), 
    total: document.getElementById('grandTotal'), 
    solveModeInputs: document.getElementsByName('solveMode') 
};

let isCalculating = false;

// Init from storage immediately
els.dailyRate.value = localStorage.getItem('retail_compact_silverRate') || '';
els.itemRate.value = els.dailyRate.value; 
els.hmToggle.checked = localStorage.getItem('retail_hmToggle') === 'true';
els.gstToggle.checked = localStorage.getItem('retail_gstToggle') === 'true';
if (localStorage.getItem('retail_hmCharge')) els.hmCharge.value = localStorage.getItem('retail_hmCharge');

function updateToggleStyles() { 
    els.hmCharge.style.opacity = els.hmToggle.checked ? '1' : '0.4';
    els.gstLabel.style.opacity = els.gstToggle.checked ? '1' : '0.4'; 
}
updateToggleStyles();

const getSolveMode = () => { 
    const selected = Array.from(els.solveModeInputs).find(r => r.checked); 
    return selected ? selected.value : 'labour'; 
};

const encodeNumber = (num) => Math.round(num).toString().split('').map(c => encodeMap[c]||'').join('').toUpperCase();

const decodeStandard = (t) => { 
    let n = '';
    t = t.toLowerCase(); 
    for (let i = t.startsWith('f')?1:0; i < t.length; i++) {
        if (decodeMap[t[i]]) n += decodeMap[t[i]]; 
    }
    return parseInt(n) || 0; 
};

const updateBaseRateDisplay = (labourVal) => { 
    const hasF = els.code.value.toLowerCase().startsWith('f') || (!els.code.value && labourVal > 0);
    const totalBase = Math.round((hasF ? (parseFloat(els.dailyRate.value)||0) : 0) + labourVal); 
    els.baseRateDisplay.innerText = totalBase; 
    return totalBase; 
};

const updateCompoundTag = () => { 
    const l = parseFloat(els.labour.value) || 0, i = parseFloat(els.itemRate.value) || 0;
    els.code.value = l > 0 ? ('F' + encodeNumber(l) + (i > 0 ? 'X' + encodeNumber(i) : '')) : '';
};

function triggerForwardCalc() {
    if (isCalculating) return;
    isCalculating = true;
    const b = updateBaseRateDisplay(parseFloat(els.labour.value)||0);
    const w = parseFloat(els.weight.value)||0;
    const hm = els.hmToggle.checked ? (parseFloat(els.hmCharge.value)||0) : 0;
    
    if (w > 0 && b > 0) { 
        let sub = (b * w) + (parseFloat(els.other.value)||0) + hm;
        els.total.value = Math.round(els.gstToggle.checked ? sub * 1.03 : sub); 
    } else {
        els.total.value = ''; 
    }
    isCalculating = false;
}
