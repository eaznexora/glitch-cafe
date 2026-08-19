// Configuration for the Glitch Cafe frontend
const isSubpath = window.location.pathname.startsWith('/THE-GLITCH-CAFE');
window.BASE_PATH = isSubpath ? '/THE-GLITCH-CAFE' : '';
window.API_BASE = isSubpath ? '/THE-GLITCH-CAFE/api' : (window.location.origin.includes('5500') ? 'http://localhost:5000/api' : '/api');
