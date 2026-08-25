let allCustomers = [];

async function loadCustomerDirectory() {
  const apiBase = window.API_BASE || (window.location.pathname.startsWith('/THE-GLITCH-CAFE') ? '/THE-GLITCH-CAFE/api' : '/api');
  
  // Exhaustive token key probe
  const token = localStorage.getItem('token') || 
                localStorage.getItem('adminToken') || 
                localStorage.getItem('glitch_admin_token') || 
                localStorage.getItem('glitch_auth_token') ||
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('adminToken');

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${apiBase}/orders`, { headers });
    
    if (res.status === 401) {
      console.warn('Unauthorized on /api/orders. Attempting cached storage fallback...');
      const cached = localStorage.getItem('cached_orders') || localStorage.getItem('glitch_orders');
      if (cached) {
        processCustomerOrders(JSON.parse(cached));
        return;
      }
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const orders = data.data || data.orders || (Array.isArray(data) ? data : []);
    
    // Cache for resilience
    localStorage.setItem('cached_orders', JSON.stringify(orders));
    processCustomerOrders(orders);
  } catch (err) {
    console.error('Failed to load user directory:', err);
    const cached = localStorage.getItem('cached_orders') || localStorage.getItem('glitch_orders');
    if (cached) {
      try { processCustomerOrders(JSON.parse(cached)); } catch(e){}
    }
  }
}

function processCustomerOrders(orders) {
  const customerMap = {};
  const today = new Date().toISOString().slice(0, 10);

  orders.forEach(order => {
    const name = (order.customerName || order.customer?.name || 'Walk-in Guest').trim();
    const email = (order.customerEmail || order.customer?.email || '').trim();
    const key = (email || name).toLowerCase();

    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const orderDateStr = orderDate.toISOString().slice(0, 10);
    const amount = parseFloat(order.total || order.totalAmount || order.subtotal || 0);

    if (!customerMap[key]) {
      customerMap[key] = {
        name: name,
        email: email || '—',
        totalOrders: 0,
        totalSpent: 0,
        firstSeen: orderDate,
        lastActive: orderDate,
        isNewToday: orderDateStr === today
      };
    }

    customerMap[key].totalOrders += 1;
    customerMap[key].totalSpent += amount;
    if (orderDate > customerMap[key].lastActive) {
      customerMap[key].lastActive = orderDate;
    }
    if (orderDate < customerMap[key].firstSeen) {
      customerMap[key].firstSeen = orderDate;
    }
  });

  allCustomers = Object.values(customerMap);
  calculateUserKPIs(allCustomers);
  renderUsersTable(allCustomers);
}

function calculateUserKPIs(customers) {
  const total = customers.length;
  const newToday = customers.filter(c => c.isNewToday).length;
  const repeats = customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = total > 0 ? Math.round((repeats / total) * 100) : 0;
  const totalRev = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  const elTotal = document.getElementById('statTotalUsers');
  const elNew = document.getElementById('statNewToday');
  const elRepeat = document.getElementById('statRepeatRate');
  const elRev = document.getElementById('statTotalRev');

  if (elTotal) elTotal.innerText = total;
  if (elNew) elNew.innerText = newToday;
  if (elRepeat) elRepeat.innerText = `${repeatRate}%`;
  if (elRev) elRev.innerText = `₹${totalRev.toFixed(0)}`;
}

function renderUsersTable(customers) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-16 text-gray-400 font-medium">No customer records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-gray-50 transition-colors cursor-pointer">
      <td class="py-4 px-6 font-bold text-monochrome-900">${c.name}</td>
      <td class="py-4 px-6 text-gray-500">${c.email}</td>
      <td class="py-4 px-6 font-medium text-monochrome-900">${c.totalOrders}</td>
      <td class="py-4 px-6 font-bold text-monochrome-900">₹${c.totalSpent.toFixed(2)}</td>
      <td class="py-4 px-6 text-gray-500">${new Date(c.lastActive).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
    </tr>
  `).join('');
}

window.filterUsersTable = function() {
  const query = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const filtered = allCustomers.filter(c => 
    c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)
  );
  renderUsersTable(filtered);
};

window.exportCustomersToCSV = function() {
  if (!allCustomers || allCustomers.length === 0) {
    if (typeof showToast === 'function') showToast('No customer data to export', 'error');
    return;
  }
  
  // 1. Clean headers
  const headers = ['Customer Name', 'Email / Contact', 'Total Orders', 'Total Spent (INR)', 'Last Active Date'];
  
  // 2. Format rows safely
  const rows = allCustomers.map(c => {
    const cleanName = (c.name || 'Walk-in Guest').replace(/"/g, '""');
    const cleanEmail = (c.email && c.email !== '—' && c.email !== 'N/A') ? c.email.replace(/"/g, '""') : 'N/A';
    const totalOrders = parseInt(c.totalOrders || 0, 10);
    const totalSpent = Number(parseFloat(c.totalSpent || 0).toFixed(2));
    const lastActive = c.lastActive ? new Date(c.lastActive).toISOString().slice(0, 10) : '';

    return `"${cleanName}","${cleanEmail}",${totalOrders},${totalSpent},"${lastActive}"`;
  });

  // 3. Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  // 4. Trigger clean download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `glitch_cafe_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

document.addEventListener('DOMContentLoaded', loadCustomerDirectory);
