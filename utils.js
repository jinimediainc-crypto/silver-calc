// =================================================================
// JINI JEWELS - GLOBAL UTILITIES (js/core/utils.js)
// =================================================================

// Formats numbers consistently across the app (e.g. 100000 to 1,00,000)
function formatCurrency(num) { 
    return num.toLocaleString('en-IN'); 
}
