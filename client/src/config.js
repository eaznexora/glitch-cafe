// Configuration for the Glitch Cafe frontend
const isSubpath = window.location.pathname.startsWith('/THE-GLITCH-CAFE');
window.BASE_PATH = isSubpath ? '/THE-GLITCH-CAFE' : '';
window.API_BASE = isSubpath ? '/THE-GLITCH-CAFE/api' : '/api';

window.resolveAndPersistTable = function() {
  const urlParams = new URLSearchParams(window.location.search);
  let tableFromUrl = urlParams.get('table');

  // 1. Check for tokenized parameter
  const token = urlParams.get('token');
  if (token) {
    try {
      const decoded = JSON.parse(atob(token));
      tableFromUrl = decoded.table || decoded.tableNumber || decoded.id;
    } catch (err) {
      console.error('Failed to parse table token:', err);
    }
  }

  // 2. CRITICAL: If a table is found in the current URL, ALWAYS overwrite storage
  if (tableFromUrl) {
    const cleanTable = String(tableFromUrl).replace(/^Table\s*/i, '').trim();
    localStorage.setItem('glitch_active_table', cleanTable);
    sessionStorage.setItem('glitch_active_table', cleanTable);
    return cleanTable;
  }

  // 3. Fallback to cached storage ONLY if no URL param exists
  return localStorage.getItem('glitch_active_table') || sessionStorage.getItem('glitch_active_table') || '1';
};
