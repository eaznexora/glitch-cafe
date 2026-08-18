// Using Chart and io from global scope (via CDN)

const API_BASE = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

// Global state
let salesChartInstance = null;
let allOrdersData = [];
let audioEnabled = false;
let orderToReject = null;
let currentOrdersFilter = 'all';

const alertSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

async function init() {
  const isDashboard = document.getElementById('kpi-revenue');
  if (isDashboard) {
    await fetchStats();
    await fetchChartData();
  }
  
  await fetchAllOrders();
  setupSocketListeners();
  
  // Start Timers if KDS is present
  if (document.getElementById('kds-clock')) {
    setInterval(updateKdsClock, 1000);
    updateKdsClock();
  }
  
  // Timer for ticket elapsed time (used in both KDS and Orders view)
  setInterval(updateTicketTimers, 60000); 
}

// ----------------- SHARED / UTILS ----------------- //

window.toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.toggle('-translate-x-full');
    backdrop.classList.toggle('hidden');
  }
};

window.toggleAudio = () => {
  audioEnabled = !audioEnabled;
  const icon = document.getElementById('audio-icon');
  if (icon) {
    if (audioEnabled) {
      icon.setAttribute('data-lucide', 'volume-2');
      alertSound.play().catch(e => console.log('Audio requires interaction first'));
    } else {
      icon.setAttribute('data-lucide', 'volume-x');
    }
    lucide.createIcons();
  }
};

function playAlert() {
  if (audioEnabled) {
    alertSound.play().catch(e => console.log('Audio playback failed', e));
  }
}

function calculateElapsedMinutes(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} mins`;
}

function updateTicketTimers() {
  document.querySelectorAll('.kds-timer').forEach(timerEl => {
    const createdAt = timerEl.getAttribute('data-time');
    timerEl.innerText = calculateElapsedMinutes(createdAt);
  });
  if (document.getElementById('master-orders-body')) {
    filterAndRenderOrders();
  }
}

// ----------------- DATA FETCHING ----------------- //

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('kpi-revenue').innerText = `₹${data.revenue.toLocaleString()}`;
      document.getElementById('kpi-orders').innerText = data.orderCount;
      document.getElementById('kpi-tables').innerText = data.activeTables;
      document.getElementById('kpi-pending').innerText = data.pendingTickets;
      document.getElementById('kpi-aov').innerText = `₹${data.aov}`;
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

async function fetchChartData() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/chart-data?range=today`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) {
      const ctx = document.getElementById('salesChart').getContext('2d');
      if (salesChartInstance) salesChartInstance.destroy();
      salesChartInstance = new Chart(ctx, { 
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{ label: 'Revenue (₹)', data: data.data, borderColor: '#000000', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderWidth: 2, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }
      });
    }
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }
}

async function fetchAllOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) {
      allOrdersData = data;
      
      const liveOrdersBody = document.getElementById('live-orders-body');
      if (liveOrdersBody) {
        const liveOrders = data.filter(o => !['COMPLETED', 'REJECTED'].includes(o.status));
        renderDashboardLiveOrders(liveOrders, liveOrdersBody);
      }
      
      const kdsGrid = document.getElementById('kds-ticket-grid');
      if (kdsGrid) {
        renderKdsTickets(data, kdsGrid);
        updateKdsCounters(data);
      }
      
      if (document.getElementById('master-orders-body')) {
        filterAndRenderOrders();
        updateOrdersCounts();
      }
    }
  } catch (err) {
    console.error('Failed to fetch orders:', err);
  }
}

// ----------------- DASHBOARD LOGIC ----------------- //

function renderDashboardLiveOrders(orders, container) {
  container.innerHTML = '';
  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No active orders</td></tr>`;
    return;
  }
  orders.forEach(order => {
    const tableNumber = order.tableId ? order.tableId.tableNumber : 'N/A';
    const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
    let statusClass = 'bg-gray-100 text-gray-800';
    if (order.status === 'PENDING') statusClass = 'bg-gray-200 text-monochrome-900 font-bold';
    if (order.status === 'PREPARING') statusClass = 'bg-black text-white';
    if (order.status === 'READY_TO_SERVE') statusClass = 'bg-gray-800 text-white border border-black';

    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer';
    tr.onclick = (e) => {
      if(e.target.tagName !== 'BUTTON') window.location.href = 'orders.html';
    };
    tr.innerHTML = `
      <td class="py-3 font-medium text-sm pr-4">${order.orderNumber}</td>
      <td class="py-3 text-sm pr-4">Table ${tableNumber}</td>
      <td class="py-3 text-sm text-gray-600 pr-4">${itemsCount} items</td>
      <td class="py-3 font-medium text-sm pr-4">₹${order.totalAmount}</td>
      <td class="py-3 pr-4"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${order.status}</span></td>
      <td class="py-3 text-right">
        ${order.status === 'PENDING' ? `<button class="text-sm font-medium text-gray-600 hover:text-monochrome-900" onclick="updateOrderStatus('${order._id}', 'PREPARING')">Accept</button>` : ''}
      </td>
    `;
    container.appendChild(tr);
  });
}

// ----------------- MASTER ORDERS FEED LOGIC ----------------- //

window.setOrdersFilter = (filterType, btnElement) => {
  currentOrdersFilter = filterType;
  document.querySelectorAll('.orders-tab').forEach(btn => {
    btn.classList.remove('bg-monochrome-900', 'text-white', 'active');
    btn.classList.add('bg-monochrome-100', 'text-gray-600');
  });
  btnElement.classList.add('bg-monochrome-900', 'text-white', 'active');
  btnElement.classList.remove('bg-monochrome-100', 'text-gray-600');
  filterAndRenderOrders();
};

window.filterOrders = () => {
  filterAndRenderOrders();
};

function updateOrdersCounts() {
  const ongoing = allOrdersData.filter(o => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_TO_SERVE'].includes(o.status)).length;
  document.getElementById('orders-count-all').innerText = `(${allOrdersData.length})`;
  document.getElementById('orders-count-ongoing').innerText = `(${ongoing})`;
}

function filterAndRenderOrders() {
  const searchInput = document.getElementById('orders-search');
  const searchQ = searchInput ? searchInput.value.toLowerCase() : '';
  
  let filtered = allOrdersData.filter(order => {
    let matchesTab = false;
    if (currentOrdersFilter === 'all') matchesTab = true;
    else if (currentOrdersFilter === 'ongoing') matchesTab = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY_TO_SERVE'].includes(order.status);
    else if (currentOrdersFilter === 'completed') matchesTab = order.status === 'COMPLETED';
    else if (currentOrdersFilter === 'cancelled') matchesTab = order.status === 'REJECTED';
    
    let matchesSearch = true;
    if (searchQ) {
      const tableStr = `table ${order.tableId ? order.tableId.tableNumber : ''}`.toLowerCase();
      const orderNo = order.orderNumber.toLowerCase();
      const itemsStr = order.items.map(i => i.name.toLowerCase()).join(' ');
      matchesSearch = tableStr.includes(searchQ) || orderNo.includes(searchQ) || itemsStr.includes(searchQ);
    }
    
    return matchesTab && matchesSearch;
  });

  renderMasterOrders(filtered);
}

function renderMasterOrders(orders) {
  const masterOrdersBody = document.getElementById('master-orders-body');
  if (!masterOrdersBody) return;
  masterOrdersBody.innerHTML = '';
  
  if (orders.length === 0) {
    masterOrdersBody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-gray-500">No orders found</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const tableNumber = order.tableId ? order.tableId.tableNumber : 'N/A';
    const timestamp = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const isPaid = order.paymentStatus === 'PAID';
    const paymentBadge = isPaid 
      ? `<span class="px-2 py-0.5 text-xs font-bold bg-monochrome-900 text-white rounded-full">PAID</span>`
      : `<span class="px-2 py-0.5 text-xs font-bold border border-monochrome-900 text-monochrome-900 rounded-full">UNPAID</span>`;
      
    let statusBadge = '';
    if (order.status === 'PENDING') statusBadge = `<span class="px-2 py-1 text-xs font-bold border border-yellow-500 text-yellow-600 rounded">Pending Acceptance</span>`;
    else if (order.status === 'PREPARING') statusBadge = `<span class="px-2 py-1 text-xs font-bold bg-monochrome-900 text-white rounded flex items-center inline-flex"><span class="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></span>Preparing <span class="ml-2 font-normal opacity-80">${calculateElapsedMinutes(order.createdAt)}</span></span>`;
    else if (order.status === 'READY_TO_SERVE') statusBadge = `<span class="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 border border-green-200 rounded">Ready to Serve</span>`;
    else if (order.status === 'COMPLETED') statusBadge = `<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">Completed</span>`;
    else if (order.status === 'REJECTED') statusBadge = `<span class="px-2 py-1 text-xs font-medium border border-gray-300 text-gray-500 line-through rounded relative group cursor-help">Rejected<div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap z-10">${order.rejectionReason || 'No reason'}</div></span>`;

    let itemsHtml = `<div class="space-y-1">`;
    const displayItems = order.items.slice(0, 3);
    displayItems.forEach(item => {
      itemsHtml += `<div class="text-sm"><span class="font-medium">${item.quantity}x</span> ${item.name} <span class="text-xs text-gray-400 italic">${item.notes ? `(${item.notes})` : ''}</span></div>`;
    });
    if (order.items.length > 3) {
      itemsHtml += `<div class="text-xs text-gray-500 font-medium cursor-pointer hover:text-black mt-1" onclick="event.stopPropagation(); openOrderDrawer('${order._id}')">+ ${order.items.length - 3} more items</div>`;
    }
    itemsHtml += `</div>`;

    let actionsHtml = '';
    if (order.status === 'PENDING') {
      actionsHtml = `
        <button class="bg-[#09090b] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800" onclick="event.stopPropagation(); updateOrderStatus('${order._id}', 'PREPARING')">Accept</button>
        <button class="bg-white border border-[#09090b] text-[#09090b] px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50 ml-1" onclick="event.stopPropagation(); openRejectionModal('${order._id}', '${order.orderNumber}')">Reject</button>
      `;
    } else if (order.status === 'PREPARING') {
      actionsHtml = `<button class="bg-[#09090b] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800" onclick="event.stopPropagation(); updateOrderStatus('${order._id}', 'READY_TO_SERVE')">Mark Ready</button>`;
    } else if (order.status === 'READY_TO_SERVE') {
      actionsHtml = `<button class="bg-white border-2 border-green-600 text-green-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-50" onclick="event.stopPropagation(); updateOrderStatus('${order._id}', 'COMPLETED')">Mark Served</button>`;
    } else if (order.status === 'COMPLETED') {
      actionsHtml = `<button class="btn-outline text-xs py-1.5" onclick="event.stopPropagation(); openOrderDrawer('${order._id}')">Print Bill</button>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition-colors cursor-pointer group';
    tr.onclick = () => openOrderDrawer(order._id);
    tr.innerHTML = `
      <td class="px-6 py-4 align-top">
        <div class="font-bold text-sm text-monochrome-900 group-hover:underline">${order.orderNumber}</div>
        <div class="text-xs text-gray-500 mt-1">${timestamp}</div>
      </td>
      <td class="px-6 py-4 align-top">
        <span class="inline-block px-2 py-1 bg-gray-100 text-monochrome-900 font-bold text-xs rounded border border-gray-200">Table ${tableNumber}</span>
      </td>
      <td class="px-6 py-4 align-top">
        ${itemsHtml}
      </td>
      <td class="px-6 py-4 align-top">
        <div class="font-bold text-sm">₹${order.totalAmount.toFixed(2)}</div>
        <div class="mt-1">${paymentBadge}</div>
      </td>
      <td class="px-6 py-4 align-top">
        ${statusBadge}
      </td>
      <td class="px-6 py-4 align-top text-right space-y-2 whitespace-nowrap">
        ${actionsHtml}
      </td>
    `;
    masterOrdersBody.appendChild(tr);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ----------------- ORDER DRAWER LOGIC ----------------- //

window.openOrderDrawer = (orderId) => {
  const drawer = document.getElementById('order-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !backdrop) return;
  
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;

  const content = document.getElementById('drawer-content');
  const actions = document.getElementById('drawer-actions');

  const tableNumber = order.tableId ? order.tableId.tableNumber : 'N/A';
  const timestamp = new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  const isPaid = order.paymentStatus === 'PAID';

  let itemsHtml = order.items.map(item => `
    <div class="flex justify-between items-start py-3 border-b border-gray-100 last:border-0">
      <div>
        <div class="font-medium text-sm"><span class="text-gray-500 mr-2">${item.quantity}x</span>${item.name}</div>
        ${item.notes ? `<div class="text-xs text-red-500 italic mt-0.5">${item.notes}</div>` : ''}
      </div>
      <div class="text-sm font-medium">₹${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h3 class="text-xl font-bold">${order.orderNumber}</h3>
        <p class="text-sm text-gray-500">${timestamp}</p>
      </div>
      <span class="px-3 py-1 bg-gray-100 text-monochrome-900 font-bold text-sm rounded border border-gray-200">Table ${tableNumber}</span>
    </div>
    
    <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
      <div class="flex justify-between text-sm mb-2"><span class="text-gray-500">Status</span> <span class="font-bold">${order.status}</span></div>
      <div class="flex justify-between text-sm"><span class="text-gray-500">Payment</span> <span class="font-bold ${isPaid ? 'text-green-600' : 'text-yellow-600'}">${order.paymentStatus}</span></div>
      ${order.rejectionReason ? `<div class="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200"><span class="text-red-500">Reason</span> <span class="font-medium">${order.rejectionReason}</span></div>` : ''}
    </div>

    <h4 class="font-bold text-sm uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">Order Items</h4>
    <div class="mb-6">
      ${itemsHtml}
    </div>

    <div class="border-t border-gray-200 pt-4 space-y-2">
      <div class="flex justify-between text-sm text-gray-500"><span>Subtotal</span> <span>₹${order.subtotal.toFixed(2)}</span></div>
      <div class="flex justify-between text-sm text-gray-500"><span>Taxes (5%)</span> <span>₹${order.tax.toFixed(2)}</span></div>
      <div class="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-gray-200 text-black"><span>Total</span> <span>₹${order.totalAmount.toFixed(2)}</span></div>
    </div>
  `;

  actions.innerHTML = `
    <button class="w-full bg-monochrome-900 text-white font-bold py-3 rounded hover:bg-monochrome-800 transition-colors flex items-center justify-center" onclick="alert('Printing KOT / Receipt...')">
      <i data-lucide="printer" class="h-4 w-4 mr-2"></i> Print Receipt
    </button>
    ${!isPaid && order.status !== 'REJECTED' ? `<button class="w-full mt-3 bg-white border border-gray-300 text-monochrome-900 font-bold py-3 rounded hover:bg-gray-50 transition-colors" onclick="updateOrderStatus('${order._id}', null, 'PAID')">Mark as Paid</button>` : ''}
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  drawer.classList.remove('translate-x-full');
  backdrop.classList.remove('hidden');
};

window.closeOrderDrawer = () => {
  const drawer = document.getElementById('order-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.add('translate-x-full');
  if (backdrop) backdrop.classList.add('hidden');
};

// ----------------- KDS LOGIC ----------------- //
function updateKdsClock() {
  const clock = document.getElementById('kds-clock');
  if (clock) {
    const now = new Date();
    clock.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

function updateKdsCounters(orders) {
  const pend = document.getElementById('kds-count-pending');
  const prep = document.getElementById('kds-count-preparing');
  const readyEl = document.getElementById('kds-count-ready');
  if (!pend) return;

  let pending = 0, preparing = 0, ready = 0;
  orders.forEach(o => {
    if (o.status === 'PENDING') pending++;
    else if (o.status === 'PREPARING') preparing++;
    else if (o.status === 'READY_TO_SERVE') ready++;
  });
  
  pend.innerText = pending;
  prep.innerText = preparing;
  readyEl.innerText = ready;
}

function renderKdsTickets(orders, container) {
  container.innerHTML = '';
  const kdsOrders = orders.filter(o => ['PENDING', 'PREPARING', 'READY_TO_SERVE'].includes(o.status));
  
  if (kdsOrders.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">No active kitchen tickets</div>`;
    return;
  }

  kdsOrders.forEach(order => {
    const tableNumber = order.tableId ? order.tableId.tableNumber : 'N/A';
    const timestamp = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let borderColor = 'border-gray-200';
    let badgeColor = 'bg-[#09090b] text-white';
    
    if (order.status === 'PENDING') borderColor = 'border-[#09090b]'; 
    else if (order.status === 'READY_TO_SERVE') { borderColor = 'border-green-600'; badgeColor = 'bg-green-600 text-white'; }

    const card = document.createElement('div');
    card.className = `bg-white rounded-lg shadow-sm border ${borderColor} flex flex-col`;
    
    let itemsHtml = order.items.map((item) => `
      <div class="flex items-start py-2 border-b border-gray-100 last:border-0 cursor-pointer select-none group" onclick="this.querySelector('span').classList.toggle('line-through'); this.querySelector('span').classList.toggle('text-gray-400')">
        <span class="text-sm font-medium transition-colors group-hover:text-gray-600">${item.quantity}x ${item.name}</span>
      </div>
    `).join('');

    let actionButtons = '';
    if (order.status === 'PENDING') {
      actionButtons = `
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button class="bg-[#09090b] text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors" onclick="updateOrderStatus('${order._id}', 'PREPARING')">Accept Order</button>
          <button class="bg-white border border-[#09090b] text-[#09090b] py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors" onclick="openRejectionModal('${order._id}', '${order.orderNumber}')">Reject</button>
        </div>
      `;
    } else if (order.status === 'PREPARING') {
      actionButtons = `<button class="w-full mt-4 bg-[#09090b] text-white py-3 rounded text-sm font-bold hover:bg-gray-800 transition-colors" onclick="updateOrderStatus('${order._id}', 'READY_TO_SERVE')">Mark Ready to Serve</button>`;
    } else if (order.status === 'READY_TO_SERVE') {
      actionButtons = `<button class="w-full mt-4 bg-white border-2 border-[#09090b] text-[#09090b] py-3 rounded text-sm font-bold hover:bg-gray-50 transition-colors" onclick="updateOrderStatus('${order._id}', 'COMPLETED')">Mark Served / Completed</button>`;
    }

    card.innerHTML = `
      <div class="p-4 border-b border-gray-100 flex justify-between items-start">
        <div>
          <span class="inline-block px-3 py-1 rounded text-sm font-bold ${badgeColor}">TABLE ${tableNumber}</span>
          <div class="mt-2 text-xs text-gray-500 font-medium">${order.orderNumber} | ${timestamp}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Time Elapsed</div>
          <div class="kds-timer text-lg font-bold text-[#09090b]" data-time="${order.createdAt}">${calculateElapsedMinutes(order.createdAt)}</div>
        </div>
      </div>
      <div class="p-4 flex-1 overflow-y-auto">${itemsHtml}</div>
      <div class="p-4 bg-gray-50 rounded-b-lg border-t border-gray-100">${actionButtons}</div>
    `;
    
    container.appendChild(card);
  });
}

// ----------------- REJECTION MODAL ----------------- //

window.openRejectionModal = (orderId, orderNo) => {
  const modal = document.getElementById('rejection-modal');
  const span = document.getElementById('reject-order-no');
  if (modal && span) {
    orderToReject = orderId;
    span.innerText = orderNo;
    modal.classList.remove('hidden');
  }
};

window.closeRejectionModal = () => {
  const modal = document.getElementById('rejection-modal');
  if (modal) {
    orderToReject = null;
    modal.classList.add('hidden');
  }
};

window.submitRejection = async (reason) => {
  if (!orderToReject) return;
  try {
    await fetch(`${API_BASE}/orders/${orderToReject}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason })
    });
    closeRejectionModal();
  } catch (err) {
    console.error('Failed to reject order:', err);
  }
};

// ----------------- SHARED API / SOCKET LOGIC ----------------- //

window.updateOrderStatus = async (id, newStatus, newPaymentStatus = null) => {
  try {
    const payload = {};
    if (newStatus) payload.status = newStatus;
    if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;
    
    await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    closeOrderDrawer(); // Auto close drawer on action if present
  } catch (err) {
    console.error('Failed to update order:', err);
  }
};

function setupSocketListeners() {
  socket.on('order:created', (newOrder) => {
    const isDashboard = document.getElementById('kpi-revenue');
    if (isDashboard) fetchStats();
    
    fetchAllOrders(); // Reload everything (realtime)
    playAlert(); 
  });
  socket.on('order:status_changed', () => {
    const isDashboard = document.getElementById('kpi-revenue');
    if (isDashboard) fetchStats();
    
    fetchAllOrders();
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
