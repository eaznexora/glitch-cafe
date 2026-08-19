// Configuration for the Glitch Cafe frontend
const isSubpath = window.location.pathname.startsWith('/THE-GLITCH-CAFE');
window.BASE_PATH = isSubpath ? '/THE-GLITCH-CAFE' : '';
window.API_BASE = isSubpath ? '/THE-GLITCH-CAFE/api' : (window.location.origin.includes('5500') || window.location.origin.includes('localhost') ? 'http://localhost:5005/api' : '/api');

window.getTableNumber = function() {
  const params = new URLSearchParams(window.location.search);
  
  const token = params.get('token');
  if (token) {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.table || decoded.tableNumber || decoded.id) {
        const t = decoded.table || decoded.tableNumber || decoded.id;
        localStorage.setItem('glitch_table_num', t);
        sessionStorage.setItem('glitch_table_id', t);
        sessionStorage.setItem('glitch_table', `Table ${t}`);
        return t;
      }
    } catch (err) {
      console.warn("Invalid table token", err);
    }
  }

  const legacyTable = params.get('table');
  if (legacyTable) {
    localStorage.setItem('glitch_table_num', legacyTable);
    sessionStorage.setItem('glitch_table_id', legacyTable);
    sessionStorage.setItem('glitch_table', `Table ${legacyTable}`);
    return legacyTable;
  }
  
  return sessionStorage.getItem('glitch_table_id') || localStorage.getItem('glitch_table_num') || 'Takeaway';
};
