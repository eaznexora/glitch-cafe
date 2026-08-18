// auth.js - Client-side RBAC Simulation Guard

const PAGE_PERMISSIONS = {
  'index.html': 'dashboard',
  'orders.html': 'live_orders',
  'kds.html': 'live_orders', // KDS falls under live orders usually
  'tables.html': 'dashboard', // grouped with dashboard for now
  'menu.html': 'menu',
  'billing.html': 'billing',
  'analytics.html': 'analytics',
  'inventory.html': 'menu', // grouped with menu/inventory
  'settings.html': 'settings'
};

const DEFAULT_USERS = {
  'admin': {
    name: 'Boss Admin',
    role: 'Admin',
    permissions: ['dashboard', 'live_orders', 'menu', 'billing', 'analytics', 'settings']
  },
  'chef': {
    name: 'Mario Chef',
    role: 'Chef',
    permissions: ['live_orders'] // Only sees Orders & KDS
  },
  'cashier': {
    name: 'Sarah Cashier',
    role: 'Cashier',
    permissions: ['dashboard', 'live_orders', 'billing']
  }
};

// Initialize or get current user
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  currentUser = DEFAULT_USERS['admin'];
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// 1. Navigation Guard
function checkAccess() {
  const path = window.location.pathname;
  let filename = path.split('/').pop();
  if (filename === '' || filename === '/') filename = 'index.html'; // default
  
  const requiredPerm = PAGE_PERMISSIONS[filename];
  
  if (requiredPerm && !currentUser.permissions.includes(requiredPerm)) {
    alert(`Access Denied: You do not have permission to view ${filename}.`);
    // Find a fallback page they *can* access
    if (currentUser.permissions.includes('live_orders')) {
      window.location.href = 'orders.html';
    } else if (currentUser.permissions.includes('dashboard')) {
      window.location.href = 'index.html';
    } else {
      document.body.innerHTML = '<h1 class="p-8 text-2xl text-red-600 font-bold">Access Denied. Contact Admin.</h1>';
    }
  }
}

// 2. Hide Unauthorized Sidebar Links
function filterSidebarLinks() {
  const links = document.querySelectorAll('#sidebar nav a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#') {
      const requiredPerm = PAGE_PERMISSIONS[href];
      if (requiredPerm && !currentUser.permissions.includes(requiredPerm)) {
        link.style.display = 'none'; // Hide unauthorized link
      }
    }
  });
}

// 3. Inject Role Switcher into Header
function injectRoleSwitcher() {
  const headers = document.querySelectorAll('header > div:last-child');
  if (headers.length > 0) {
    const headerRight = headers[headers.length - 1];
    // Create dropdown element
    const container = document.createElement('div');
    container.className = 'relative ml-4 flex items-center bg-gray-100 rounded-lg px-3 py-1.5 border border-gray-200 cursor-pointer group z-50';
    container.innerHTML = `
      <div class="flex items-center text-sm font-medium text-gray-700">
        <i data-lucide="user-circle" class="h-4 w-4 mr-2"></i> ${currentUser.role}
        <i data-lucide="chevron-down" class="h-3 w-3 ml-2 text-gray-400"></i>
      </div>
      <div class="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 shadow-lg rounded-lg hidden group-hover:block overflow-hidden">
        <div class="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2 bg-gray-50 border-b border-gray-100">Switch Demo Role</div>
        <a class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors" onclick="switchRole('admin')">Admin</a>
        <a class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors" onclick="switchRole('cashier')">Cashier</a>
        <a class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black transition-colors" onclick="switchRole('chef')">Chef</a>
      </div>
    `;
    // Insert at the end of the header
    headerRight.appendChild(container);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Global window function for switching
window.switchRole = (roleKey) => {
  if (DEFAULT_USERS[roleKey]) {
    localStorage.setItem('currentUser', JSON.stringify(DEFAULT_USERS[roleKey]));
    window.location.reload();
  }
};

// Run immediately before page finishes loading
checkAccess();

// Run DOM manipulation after load
document.addEventListener('DOMContentLoaded', () => {
  filterSidebarLinks();
  injectRoleSwitcher();
});
