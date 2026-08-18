// sidebar.js
// Handles RBAC sidebar rendering and route protection for Admin panel

const PAGE_PERMISSIONS = {
  'index.html': 'dashboard',
  'orders.html': 'orders',
  'tables.html': 'tables',
  'menu.html': 'menu',
  'inventory.html': 'inventory',
  'analytics.html': 'analytics',
  'billing.html': 'billing',
  'settings.html': 'settings'
};

function enforceRBAC() {
  if (!currentUser) return; // checkAuth handles missing users
  if (currentUser.isSuperAdmin) return; // Super admin has all access

  // 1. Navigation Guard
  const path = window.location.pathname;
  let filename = path.split('/').pop();
  if (filename === '' || filename === '/') filename = 'index.html';
  
  const requiredPerm = PAGE_PERMISSIONS[filename];
  
  if (requiredPerm && (!currentUser.permissions || !currentUser.permissions.includes(requiredPerm))) {
    // Access denied! Redirect to their first available permitted page
    const fallbackMap = {
      'dashboard': 'index.html',
      'orders': 'orders.html',
      'tables': 'tables.html',
      'menu': 'menu.html',
      'inventory': 'inventory.html',
      'analytics': 'analytics.html',
      'billing': 'billing.html',
      'settings': 'settings.html'
    };
    
    let fallback = 'index.html'; // default
    if (currentUser.permissions && currentUser.permissions.length > 0) {
      fallback = fallbackMap[currentUser.permissions[0]];
    }
    window.location.href = fallback;
    return;
  }
}

function filterSidebarLinks() {
  if (!currentUser || currentUser.isSuperAdmin) return;

  const links = document.querySelectorAll('aside nav a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && PAGE_PERMISSIONS[href]) {
      const requiredPerm = PAGE_PERMISSIONS[href];
      if (!currentUser.permissions.includes(requiredPerm)) {
        link.style.display = 'none';
      }
    }
  });
}

// Inject User Profile Info into Sidebar/Header if desired
function updateAdminProfile() {
  const profileNames = document.querySelectorAll('.admin-profile-name');
  const profileRoles = document.querySelectorAll('.admin-profile-role');
  
  profileNames.forEach(el => el.innerText = currentUser.email.split('@')[0]);
  profileRoles.forEach(el => el.innerText = currentUser.isSuperAdmin ? 'Super Admin' : 'Staff');
}

// Run protection immediately
enforceRBAC();

document.addEventListener('DOMContentLoaded', () => {
  filterSidebarLinks();
  updateAdminProfile();
});
