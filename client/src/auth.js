// auth.js
// Included on every protected admin page

function checkAuth() {
  const token = localStorage.getItem('adminToken');
  const path = window.location.pathname;
  let filename = path.split('/').pop();
  if (filename === '' || filename === '/') filename = 'index.html';
  
  const isLoginPage = filename === 'login.html';

  if (!token) {
    if (!isLoginPage) {
      window.location.href = window.BASE_PATH + '/login.html';
    }
    return null;
  }

  try {
    const user = JSON.parse(localStorage.getItem('adminUser'));
    if (isLoginPage && user) {
      window.location.href = window.BASE_PATH + '/index.html'; // Already logged in
    }
    return user;
  } catch (e) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = window.BASE_PATH + '/login.html';
    return null;
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = window.BASE_PATH + '/login.html';
}

function getAuthHeaders() {
  const token = localStorage.getItem('glitch_admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('glitch_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Immediately invoke on script load
window.currentUser = checkAuth();

document.addEventListener('DOMContentLoaded', () => {
  // Bind global logout buttons if present
  const logoutBtns = document.querySelectorAll('[onclick="logout()"]');
  if (logoutBtns.length === 0) {
    // try binding by text
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (link.innerText.toLowerCase().includes('logout') || link.innerHTML.toLowerCase().includes('log-out')) {
        link.onclick = (e) => { e.preventDefault(); logout(); };
      }
    });
  }
});
