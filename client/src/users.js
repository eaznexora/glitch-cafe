let allCustomers = [];

async function loadCustomerDirectory() {
  const apiBase = window.API_BASE || (window.location.pathname.startsWith('/THE-GLITCH-CAFE') ? '/THE-GLITCH-CAFE/api' : '/api');
  const token = localStorage.getItem('glitch_admin_token') || localStorage.getItem('token');
  
  try {
    const res = await fetch(`${apiBase}/orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await res.json();
    const orders = data.data || data.orders || (Array.isArray(data) ? data : []);

    const customerMap = {};
    const today = new Date().toISOString().slice(0, 10);

    orders.forEach(order => {
      const name = (order.customerName || order.customer?.name || 'Walk-in Guest').trim();
      const email = (order.customerEmail || order.customer?.email || '').trim();
      const key = (email || name).toLowerCase();

      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const orderDateStr = orderDate.toISOString().slice(0, 10);
      const amount = parseFloat(order.total || order.totalAmount || 0);

      if (!customerMap[key]) {
        customerMap[key] = {
          name: name,
          email: email || 'N/A',
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
    calculateUserKPIs(allCustomers, orders);
    renderUsersTable(allCustomers);
  } catch (err) {
    console.error('Failed to load user directory:', err);
  }
}

function calculateUserKPIs(customers, orders) {
  const total = customers.length;
  const newToday = customers.filter(c => c.isNewToday).length;
  const repeats = customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = total > 0 ? Math.round((repeats / total) * 100) : 0;
  const totalRev = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  document.getElementById('statTotalUsers').innerText = total;
  document.getElementById('statNewToday').innerText = newToday;
  document.getElementById('statRepeatRate').innerText = `${repeatRate}%`;
  document.getElementById('statTotalRev').innerText = `₹${totalRev.toFixed(2)}`;
}

function renderUsersTable(customers) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-gray-400">No customer records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr class="hover:bg-gray-50/80 transition">
      <td class="py-3.5 px-6 font-extrabold text-gray-900">${c.name}</td>
      <td class="py-3.5 px-6 text-gray-500">${c.email}</td>
      <td class="py-3.5 px-6 font-bold text-gray-900">${c.totalOrders}</td>
      <td class="py-3.5 px-6 font-black text-gray-900">₹${c.totalSpent.toFixed(2)}</td>
      <td class="py-3.5 px-6 text-gray-400">${new Date(c.lastActive).toLocaleDateString()}</td>
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
  if (!allCustomers || allCustomers.length === 0) return;
  
  let csv = 'Customer Name,Email,Total Orders,Total Spent (INR),Last Active\n';
  allCustomers.forEach(c => {
    csv += `"${c.name}","${c.email}",${c.totalOrders},${c.totalSpent.toFixed(2)},"${new Date(c.lastActive).toLocaleDateString()}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `glitch_cafe_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', loadCustomerDirectory);
