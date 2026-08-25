// Using Chart and io from global scope (via CDN)

const socket = io(window.location.origin, {
  path: '/THE-GLITCH-CAFE/socket.io',
  transports: ['websocket', 'polling']
});

window.socket = socket;

socket.on('connect', () => {
  console.log('🟢 REALTIME SOCKET CONNECTED! ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket connection error:', err);
});

// Global state
let salesChartInstance = null;
let allOrdersData = [];
let audioEnabled = localStorage.getItem('glitch_sound_enabled') === 'true';
let orderToReject = null;
let currentOrdersFilter = 'all';
let seenOrderIds = new Set();
let bellInterval = null;

function syncKitchenBellState(orders) {
  const hasPending = orders.some(o => (o.status || '').toUpperCase() === 'PENDING');
  if (hasPending) {
    playKitchenChime();
  } else {
    stopKitchenChime();
  }
}

// 1. Global Audio instance
let audioUnlocked = false;
const bellAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
bellAudio.loop = true;

// 2. Immediate unlock on ANY user interaction
function enableAudioPlayback() {
  if (audioUnlocked) return;
  bellAudio.play().then(() => {
    bellAudio.pause();
    bellAudio.currentTime = 0;
    audioUnlocked = true;
    console.log('🔊 Kitchen Audio fully enabled and unlocked!');
  }).catch(err => {
    console.warn('Audio unlock pending user gesture:', err);
  });
}

window.addEventListener('click', enableAudioPlayback, { once: true });
window.addEventListener('touchstart', enableAudioPlayback, { once: true });
window.addEventListener('keydown', enableAudioPlayback, { once: true });
async function init() {
  const isDashboard = document.getElementById('kpi-revenue');
  if (isDashboard) {
    await fetchStats();
    await fetchChartData();
  }
  
  await fetchAllProducts();
  await fetchAllOrders();
  syncKitchenBellState(allOrdersData);
  setupSocketListeners();
  
  // Start Timers if KDS is present
  if (document.getElementById('kds-clock')) {
    setInterval(updateKdsClock, 1000);
    updateKdsClock();
  }
  
  // Timer for ticket elapsed time (used in both KDS and Orders view)
  setInterval(updateTicketTimers, 60000); 
  
  // Payment Mode Modal Bindings
  const btnUpi = document.getElementById('btn-pay-upi');
  const btnCash = document.getElementById('btn-pay-cash');
  const btnConfirmPay = document.getElementById('btn-confirm-pay');
  const btnCancelPay = document.getElementById('btn-cancel-pay');
  
  if (btnUpi && btnCash && btnConfirmPay && btnCancelPay) {
    btnUpi.addEventListener('click', () => {
      if (window._pendingPaymentUpdate) {
        window._pendingPaymentUpdate.selectedMethod = 'UPI';
        btnUpi.classList.add('border-monochrome-900', 'bg-gray-50');
        btnCash.classList.remove('border-monochrome-900', 'bg-gray-50');
        btnConfirmPay.disabled = false;
      }
    });
    
    btnCash.addEventListener('click', () => {
      if (window._pendingPaymentUpdate) {
        window._pendingPaymentUpdate.selectedMethod = 'CASH';
        btnCash.classList.add('border-monochrome-900', 'bg-gray-50');
        btnUpi.classList.remove('border-monochrome-900', 'bg-gray-50');
        btnConfirmPay.disabled = false;
      }
    });
    
    btnCancelPay.addEventListener('click', () => {
      const modalBackdrop = document.getElementById('payment-mode-modal-backdrop');
      const modal = document.getElementById('payment-mode-modal');
      
      modal.querySelector('.bg-white').classList.remove('scale-100');
      modal.querySelector('.bg-white').classList.add('scale-95');
      modal.classList.add('opacity-0');
      modalBackdrop.classList.add('opacity-0');
      
      setTimeout(() => {
        modal.classList.add('hidden', 'pointer-events-none');
        modalBackdrop.classList.add('hidden');
      }, 300);
      
      window._pendingPaymentUpdate = null;
    });
    
    btnConfirmPay.addEventListener('click', () => {
      if (window._pendingPaymentUpdate && window._pendingPaymentUpdate.selectedMethod) {
        const { id, newStatus, newPaymentStatus, selectedMethod } = window._pendingPaymentUpdate;
        
        // Hide modal
        const modalBackdrop = document.getElementById('payment-mode-modal-backdrop');
        const modal = document.getElementById('payment-mode-modal');
        modal.querySelector('.bg-white').classList.remove('scale-100');
        modal.querySelector('.bg-white').classList.add('scale-95');
        modal.classList.add('opacity-0');
        modalBackdrop.classList.add('opacity-0');
        setTimeout(() => {
          modal.classList.add('hidden', 'pointer-events-none');
          modalBackdrop.classList.add('hidden');
        }, 300);
        
        window._pendingPaymentUpdate = null;
        
        // Execute original update but with chosen paymentMethod
        executeOrderStatusUpdate(id, newStatus, newPaymentStatus, selectedMethod);
      }
    });
  }
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
  localStorage.setItem('glitch_sound_enabled', audioEnabled);
  updateAudioUI();

  if (audioEnabled) {
    enableAudioPlayback();
    syncKitchenBellState(allOrdersData);
  } else {
    stopKitchenChime();
  }
};

function updateAudioUI() {
  const btn = document.getElementById('btn-audio-toggle');
  if (btn) {
    if (audioEnabled) {
      btn.className = "flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 text-xs px-3 py-1.5 rounded-lg border border-green-300 font-bold transition-colors";
      btn.innerHTML = "🔔 Alert Active";
    } else {
      btn.className = "flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-300 font-bold transition-colors";
      btn.innerHTML = "🔕 Muted (Away)";
    }
  }
}

// Call once on load to set initial UI
document.addEventListener('DOMContentLoaded', () => {
  updateAudioUI();
});

// 3. Dedicated chime function
function playKitchenChime() {
  const isMuted = localStorage.getItem('glitch_sound_enabled') === 'false';
  if (isMuted) return;

  // Reset and play immediately
  try {
    bellAudio.pause();
    bellAudio.currentTime = 0;
    const playPromise = bellAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Direct bell audio trigger requires user unlock:', err);
      });
    }
  } catch (e) {
    console.error('Audio playback error:', e);
  }
}

function stopKitchenChime() {
  bellAudio.pause();
  bellAudio.currentTime = 0;
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
    
    if (res.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login.');
      localStorage.removeItem('glitch_admin_token');
      localStorage.removeItem('adminToken');
      window.location.href = window.BASE_PATH + '/login.html';
      return;
    }
    
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
    
    if (res.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login.');
      localStorage.removeItem('glitch_admin_token');
      localStorage.removeItem('adminToken');
      window.location.href = window.BASE_PATH + '/login.html';
      return;
    }
    
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
    
    if (res.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login.');
      localStorage.removeItem('glitch_admin_token');
      localStorage.removeItem('adminToken');
      window.location.href = window.BASE_PATH + '/login.html';
      return;
    }
    
    const data = await res.json();
    if (res.ok) {
      allOrdersData = data;
      calculateAndRenderDashboardKPIs();
      updateAllUI();
    }
  } catch (err) {
    console.error('Failed to fetch orders:', err);
  }
}

async function fetchAllProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`, { headers: getAuthHeaders() });
    if (res.ok) {
      window.allProductsData = await res.json();
    } else {
      window.allProductsData = [];
    }
  } catch (err) {
    console.error('Failed to fetch products:', err);
    window.allProductsData = [];
  }
}

function calculateAndRenderDashboardKPIs() {
  const isDashboard = document.getElementById('kpi-revenue');
  if (!isDashboard) return;

  const orders = Array.isArray(window.allOrdersData) ? window.allOrdersData : [];
  console.log('🔍 [AUDIT] Total Raw Orders Available in Memory:', orders.length);

  // 1. Bulletproof Date Matching (IST / Local Day Match)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const isToday = (dateInput) => {
    if (!dateInput) return true; // If order date is missing, treat as current session order
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === currentDate;
  };

  const todayOrders = orders.filter(o => isToday(o.createdAt || o.date || o.timestamp));
  console.log('🔍 [AUDIT] Filtered Today Orders Count:', todayOrders.length);

  // Status Normalizer
  const getStatus = (o) => (o.status || '').toString().toLowerCase().trim();

  // Metric 1: Total Orders
  const totalEl = document.querySelector('#todayTotalOrders') || document.querySelector('#kpi-orders') || document.querySelector('[data-kpi="total-orders"]');
  if (totalEl) totalEl.innerText = todayOrders.length;

  // Metric 2: Completed Orders
  const completedOrders = todayOrders.filter(o => ['completed', 'served', 'ready_to_serve'].includes(getStatus(o)));
  const completedEl = document.querySelector('#completedOrdersCount') || document.querySelector('[data-kpi="completed-orders"]');
  if (completedEl) completedEl.innerText = completedOrders.length;

  // Metric 3: Cancelled / Rejected Orders
  const cancelledOrders = todayOrders.filter(o => ['rejected', 'cancelled', 'canceled'].includes(getStatus(o)));
  const cancelledEl = document.querySelector('#cancelledOrdersCount') || document.querySelector('#kpi-pending') || document.querySelector('[data-kpi="cancelled-orders"]');
  if (cancelledEl) cancelledEl.innerText = cancelledOrders.length;
  
  const cancelledLabel = document.querySelector('#cancelledOrdersLabel');
  if (cancelledLabel) cancelledLabel.innerText = 'Cancelled Orders';

  // Metric 4: Revenue & Avg Order Value
  const nonRejectedOrders = todayOrders.filter(o => !['rejected', 'cancelled', 'canceled'].includes(getStatus(o)));
  const totalRevenue = nonRejectedOrders.reduce((sum, o) => {
    const amt = parseFloat(o.total || o.totalAmount || o.grandTotal || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const avgOrderValue = nonRejectedOrders.length > 0 ? (totalRevenue / nonRejectedOrders.length) : 0;
  
  const revenueEl = document.querySelector('#todayRevenue') || document.querySelector('#kpi-revenue') || document.querySelector('[data-kpi="today-revenue"]');
  if (revenueEl) revenueEl.innerText = `₹${totalRevenue.toFixed(2)}`;

  const avgEl = document.querySelector('#avgOrderValue') || document.querySelector('#kpi-aov') || document.querySelector('[data-kpi="avg-order-value"]');
  if (avgEl) avgEl.innerText = `₹${avgOrderValue.toFixed(2)}`;

  // Metric 5: Sales by Category Aggregation
  const categoryMap = {
    'FRIES': { count: 0, revenue: 0 },
    "MOMO'S": { count: 0, revenue: 0 },
    'MAGGI': { count: 0, revenue: 0 },
    'PASTA': { count: 0, revenue: 0 },
    'PIZZA': { count: 0, revenue: 0 },
    'BEVERAGES': { count: 0, revenue: 0 }
  };

  nonRejectedOrders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
      const name = (item.name || '').toLowerCase();
      const rawCategory = (item.category || item.categoryName || (item.product && item.product.category) || '').toUpperCase().trim();
      let assignedCategory = 'FRIES';

      // Cross reference with allProductsData if category is missing
      let resolvedCategory = rawCategory;
      if (!resolvedCategory || resolvedCategory === 'GENERAL' || resolvedCategory === 'UNCATEGORIZED' || resolvedCategory === 'OTHER') {
        if (Array.isArray(window.allProductsData)) {
          const product = window.allProductsData.find(p => p.name.toLowerCase() === name || p._id === item.productId || p._id === item.menuItemId);
          if (product) resolvedCategory = (product.category || '').toUpperCase().trim();
        }
      }

      if (resolvedCategory && categoryMap[resolvedCategory]) {
        assignedCategory = resolvedCategory;
      } else if (name.includes('momo')) {
        assignedCategory = "MOMO'S";
      } else if (name.includes('maggi') || name.includes('noodle')) {
        assignedCategory = 'MAGGI';
      } else if (name.includes('pasta')) {
        assignedCategory = 'PASTA';
      } else if (name.includes('pizza')) {
        assignedCategory = 'PIZZA';
      } else if (name.includes('shake') || name.includes('tea') || name.includes('coffee') || name.includes('drink') || name.includes('mojito') || name.includes('beverage')) {
        assignedCategory = 'BEVERAGES';
      } else if (name.includes('fries') || name.includes('fry') || name.includes('peri peri') || name.includes('cheese')) {
        assignedCategory = 'FRIES';
      }

      const qty = parseInt(item.quantity || item.qty || 1, 10) || 1;
      const price = parseFloat(item.price || item.unitPrice || (item.product && item.product.price) || 0) || 0;

      categoryMap[assignedCategory].count += qty;
      categoryMap[assignedCategory].revenue += (qty * price);
    });
  });

  // Render Sales by Category
  const categoryContainer = document.querySelector('#salesByCategoryContainer') || document.querySelector('.sales-by-category-list');
  if (categoryContainer) {
    const activeEntries = Object.entries(categoryMap).filter(([_, data]) => data.count > 0);
    
    if (activeEntries.length === 0) {
      categoryContainer.innerHTML = `<div class="text-sm text-gray-400 py-3 text-center">No category sales recorded today</div>`;
    } else {
      categoryContainer.innerHTML = activeEntries.sort((a, b) => b[1].revenue - a[1].revenue).map(([catName, data]) => `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 text-xs font-bold uppercase">
              ${catName.slice(0, 2)}
            </div>
            <div>
              <p class="font-medium text-gray-900 text-sm uppercase">${catName}</p>
              <p class="text-xs text-gray-500">${data.count} items</p>
            </div>
          </div>
          <span class="font-semibold text-gray-900 text-sm">₹${data.revenue.toFixed(2)}</span>
        </div>
      `).join('');
    }
  }
  
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Metric 6: Payment Breakdown (UPI vs Cash)
  let upiAmt = 0;
  let cashAmt = 0;
  todayOrders.forEach(o => {
    if ((o.paymentStatus || '').toUpperCase() !== 'PAID') return;
    const method = (o.paymentMethod || o.paymentMode || 'UPI').toString().toUpperCase();
    const total = parseFloat(o.total || o.totalAmount || 0) || 0;
    if (method === 'CASH') cashAmt += total;
    else upiAmt += total;
  });

  const totalPaid = upiAmt + cashAmt;
  const upiPercent = totalPaid > 0 ? Math.round((upiAmt / totalPaid) * 100) : 0;
  const cashPercent = totalPaid > 0 ? (100 - upiPercent) : 0;

  const upiBar = document.querySelector('#upiBar');
  const cashBar = document.querySelector('#cashBar');
  const upiPctEl = document.querySelector('#upiPercent');
  const cashPctEl = document.querySelector('#cashPercent');

  if (upiBar && upiPctEl) {
    upiBar.style.width = `${upiPercent}%`;
    upiPctEl.innerText = `${upiPercent}%`;
  }
  if (cashBar && cashPctEl) {
    cashBar.style.width = `${cashPercent}%`;
    cashPctEl.innerText = `${cashPercent}%`;
  }
}

window.updateAllUI = function() {
  syncKitchenBellState(allOrdersData);
  calculateAndRenderDashboardKPIs();
  

  
  const liveOrdersBody = document.getElementById('live-orders-body');
  if (liveOrdersBody) {
    const liveOrders = allOrdersData.filter(o => !['COMPLETED', 'REJECTED'].includes(o.status));
    renderDashboardLiveOrders(liveOrders, liveOrdersBody);
  }
  
  const kdsGrid = document.getElementById('kds-ticket-grid');
  if (kdsGrid) {
    renderKdsTickets(allOrdersData, kdsGrid);
    updateKdsCounters(allOrdersData);
  }
  
  if (document.getElementById('master-orders-body')) {
    filterAndRenderOrders();
    updateOrdersCounts();
  }
};

// ----------------- DASHBOARD LOGIC ----------------- //

function renderDashboardLiveOrders(orders, container) {
  container.innerHTML = '';
  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No active orders</td></tr>`;
    return;
  }
  orders.forEach(order => {
    const tableNumber = order.tableNumber || order.table || 'Takeaway';
    const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
    let statusClass = 'bg-gray-100 text-gray-800';
    if (order.status === 'PENDING') statusClass = 'bg-gray-200 text-monochrome-900 font-bold';
    if (order.status === 'PREPARING') statusClass = 'bg-black text-white';
    if (order.status === 'READY_TO_SERVE') statusClass = 'bg-gray-800 text-white border border-black';

    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer';
    tr.onclick = (e) => {
      if(e.target.tagName !== 'BUTTON') window.location.href = window.BASE_PATH + '/orders.html';
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
      const tableStr = `table ${order.tableNumber || order.table || ''}`.toLowerCase();
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
    const tableNumber = order.tableNumber || order.table || 'Takeaway';
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
    tr.className = 'transition-colors cursor-pointer group ';
    if (order.status === 'PENDING') {
      tr.className += 'bg-yellow-50/50 hover:bg-yellow-50 relative animate-[pulse_2s_ease-in-out_infinite] ring-1 ring-inset ring-yellow-400';
    } else {
      tr.className += 'hover:bg-gray-50';
    }
    
    tr.onclick = () => {
      if (order.status === 'PENDING') openIncomingOrderModal(order._id);
      else openOrderDrawer(order._id);
    };
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
  
  window.currentSelectedOrderId = orderId;
  const order = allOrdersData.find(o => o._id === orderId);
  window.currentActiveOrder = order;
  if (!order) return;

  const content = document.getElementById('drawer-content');
  const actions = document.getElementById('drawer-actions');

  const tableNumber = order.tableNumber || order.table || 'Takeaway';
  const timestamp = new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  const isPaid = order.paymentStatus === 'PAID';

  let itemsHtml = order.items.map((item, index) => `
    <div class="flex justify-between items-start py-3 border-b border-gray-100 last:border-0" id="drawer-item-${order._id}-${index}">
      <div class="flex-1">
        <div class="font-medium text-sm"><span class="text-gray-500 mr-2">${item.quantity}x</span>${item.name}</div>
        ${item.notes ? `<div class="text-xs text-red-500 italic mt-0.5">${item.notes}</div>` : ''}
      </div>
      <div class="text-sm font-medium flex items-center gap-3">
        ₹${(Number(item.subtotal) || (Number(item.price) * Number(item.quantity)) || 0).toFixed(2)}
        ${order.status === 'PENDING' ? `
          <button class="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" onclick="removeOrderItem('${order._id}', ${index})" title="Remove Item">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        ` : ''}
      </div>
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
      <div class="flex justify-between text-sm text-gray-500"><span>Subtotal</span> <span>₹${(Number(order.subtotal) || Number(order.totalAmount) || 0).toFixed(2)}</span></div>
      <div class="flex justify-between text-sm text-gray-500"><span>Taxes (5%)</span> <span>₹${(Number(order.tax) || 0).toFixed(2)}</span></div>
      <div class="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-gray-200 text-black"><span>Total</span> <span>₹${(Number(order.totalAmount) || 0).toFixed(2)}</span></div>
    </div>
  `;

  let actionsHtml = `
    <button type="button" id="printReceiptBtn" onclick="window.generateReceiptPDF()" class="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition cursor-pointer">
      🖨️ Print Receipt
    </button>
    <div id="paymentActionContainer" class="w-full mt-3">
      <!-- Dynamic: Rendered by renderPaymentButtonState() -->
    </div>
  `;

  if (order.status === 'PENDING') {
    actionsHtml = `
      <div class="grid grid-cols-2 gap-3 mb-3">
        <button class="w-full bg-[#09090b] text-white py-3 rounded text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm" onclick="acceptOrder('${order._id}')">Accept Order</button>
        <button class="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm" onclick="openRejectionModal('${order._id}', '${order.orderNumber}')">Reject Order</button>
      </div>
    ` + actionsHtml;
  } else if (order.status === 'PREPARING') {
    actionsHtml = `<button class="w-full mb-3 bg-[#09090b] text-white py-3 rounded text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm" onclick="updateOrderStatus('${order._id}', 'READY_TO_SERVE')">Mark Ready to Serve</button>` + actionsHtml;
  } else if (order.status === 'READY_TO_SERVE') {
    actionsHtml = `<button class="w-full mb-3 bg-white border-2 border-[#09090b] text-[#09090b] py-3 rounded text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm" onclick="updateOrderStatus('${order._id}', 'COMPLETED')">Mark Served / Completed</button>` + actionsHtml;
  }

  actions.innerHTML = actionsHtml;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  drawer.classList.remove('translate-x-full');
  backdrop.classList.remove('hidden');

  if (order.status !== 'REJECTED') {
    if (typeof window.renderPaymentButtonState === 'function') {
      window.renderPaymentButtonState(order);
    }
  }
};

window.removeOrderItem = async (orderId, itemIndex) => {
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  if (order.items.length <= 1) {
    showToast("Cannot remove the only item. Reject the order instead.", 'error');
    return;
  }
  
  if (!(await showConfirm("Are you sure you want to remove this item? It will be marked as out of stock for this order."))) return;
  
  // Mutate local state and recalculate
  order.items.splice(itemIndex, 1);
  order.subtotal = order.items.reduce((sum, item) => sum + (item.subtotal || (item.price * item.quantity)), 0);
  order.tax = order.subtotal * 0.05;
  order.totalAmount = order.subtotal + order.tax;
  
  // Re-render drawer
  openOrderDrawer(orderId);
};

window.acceptOrder = async (orderId) => {
  stopKitchenChime();
  
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  try {
    order.status = 'PREPARING';
    updateAllUI();

    await fetch(`${API_BASE}/orders/${orderId}/accept`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        acceptedItems: order.items, 
        subtotal: order.subtotal,
        totalAmount: order.totalAmount 
      })
    });
    closeOrderDrawer();
  } catch (err) {
    console.error("Failed to accept order", err);
  }
};

window.closeOrderDrawer = () => {
  const drawer = document.getElementById('order-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.add('translate-x-full');
  if (backdrop) backdrop.classList.add('hidden');
};

// ----------------- INCOMING ORDER MODAL ----------------- //

window.openIncomingOrderModal = (orderId) => {
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  const modal = document.getElementById('incoming-order-modal');
  const backdrop = document.getElementById('incoming-order-backdrop');
  if (!modal || !backdrop) return;
  
  // Populate Headers
  document.getElementById('incoming-order-number').innerText = order.orderNumber;
  document.getElementById('incoming-table').innerText = order.tableNumber || order.table || 'Takeaway';
  document.getElementById('incoming-customer').innerText = order.customerName || 'Guest';
  
  // Note
  const noteContainer = document.getElementById('incoming-note-container');
  if (order.note) {
    document.getElementById('incoming-note').innerText = order.note;
    noteContainer.classList.remove('hidden');
  } else {
    noteContainer.classList.add('hidden');
  }
  
  // Items
  const itemsList = document.getElementById('incoming-items-list');
  let itemsHtml = '';
  order.items.forEach((item, index) => {
    const toppingsStr = Array.isArray(item.toppings) && item.toppings.length ? item.toppings.join(', ') : 'None';
    itemsHtml += `
      <label class="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer">
        <div class="flex items-center gap-3.5">
          <input 
            type="checkbox" 
            checked 
            data-index="${index}" 
            class="incoming-item-checkbox w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer accent-emerald-600"
            onchange="recalculateIncomingTotal('${orderId}')"
          />
          <div>
            <p class="text-sm font-bold text-neutral-900 leading-snug">
              ${item.name} <span class="text-xs font-normal text-neutral-500">(${item.size || 'Regular'})</span>
            </p>
            <p class="text-xs text-neutral-500 mt-0.5">Extras: ${toppingsStr}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-neutral-900">₹${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</p>
          <span class="text-xs text-neutral-400">Qty: ${item.quantity || 1}</span>
        </div>
      </label>
    `;
  });
  itemsList.innerHTML = itemsHtml;
  
  // Actions
  document.getElementById('btn-reject-entire').onclick = () => rejectEntireIncomingOrder(orderId);
  document.getElementById('btn-accept-selective').onclick = () => acceptSelectiveIncomingOrder(orderId);
  
  // Total
  recalculateIncomingTotal(orderId);
  
  // Open
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
};

window.closeIncomingOrderModal = () => {
  const modal = document.getElementById('incoming-order-modal');
  const backdrop = document.getElementById('incoming-order-backdrop');
  if (modal) modal.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
};

window.recalculateIncomingTotal = (orderId) => {
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  const checkboxes = document.querySelectorAll('.incoming-item-checkbox');
  let newSubtotal = 0;
  
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.getAttribute('data-index'));
      const item = order.items[idx];
      newSubtotal += (item.subtotal || (item.price * item.quantity));
    }
  });
  
  const newTax = newSubtotal * 0.05;
  const newTotal = newSubtotal + newTax;
  
  document.getElementById('incoming-total').innerText = `₹${newTotal.toFixed(2)}`;
  
  const acceptBtn = document.getElementById('btn-accept-selective');
  if (acceptBtn) {
    acceptBtn.innerText = `Accept Order (₹${newTotal.toFixed(2)})`;
    acceptBtn.disabled = newTotal === 0;
    if (newTotal === 0) {
      acceptBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      acceptBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
};

window.rejectEntireIncomingOrder = async (orderId) => {
  stopKitchenChime();
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  if (!(await showConfirm('Are you sure you want to reject this entire order?'))) return;
  
  try {
    order.status = 'REJECTED';
    updateAllUI();

    await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'REJECTED', rejectionReason: 'Order Declined' })
    });
    closeIncomingOrderModal();
  } catch (err) {
    console.error(err);
  }
};

window.acceptSelectiveIncomingOrder = async (orderId) => {
  if (bellInterval) {
    clearInterval(bellInterval);
    bellInterval = null;
  }
  
  const order = allOrdersData.find(o => o._id === orderId);
  if (!order) return;
  
  const checkboxes = document.querySelectorAll('.incoming-item-checkbox');
  let acceptedItemIndices = [];
  let rejectedItemIndices = [];
  let newSubtotal = 0;
  
  checkboxes.forEach(cb => {
    const idx = parseInt(cb.getAttribute('data-index'));
    if (cb.checked) {
      acceptedItemIndices.push(idx);
      const item = order.items[idx];
      newSubtotal += (item.subtotal || (item.price * item.quantity));
    } else {
      rejectedItemIndices.push(idx);
    }
  });
  
  if (acceptedItemIndices.length === 0) {
    return rejectEntireIncomingOrder(orderId);
  }
  
  const newTax = newSubtotal * 0.05;
  const newTotal = newSubtotal + newTax;
  
  try {
    order.status = acceptedItemIndices.length > 0 ? 'PREPARING' : 'CANCELLED';
    updateAllUI();

    await fetch(`${API_BASE}/orders/${orderId}/accept-selective`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        acceptedItemIndices, 
        rejectedItemIndices, 
        updatedTotal: newTotal 
      })
    });
    closeIncomingOrderModal();
  } catch (err) {
    console.error(err);
  }
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
    const tableNumber = order.tableNumber || order.table || 'Takeaway';
    const timestamp = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let borderColor = 'border-gray-200';
    let badgeColor = 'bg-[#09090b] text-white';
    
    if (order.status === 'PENDING') {
      borderColor = 'border-yellow-400 ring-2 ring-yellow-400 animate-[pulse_2s_ease-in-out_infinite]'; 
    }
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
      card.classList.add('cursor-pointer');
      card.onclick = () => openIncomingOrderModal(order._id);
      
      actionButtons = `
        <div class="grid grid-cols-2 gap-2 mt-4 pointer-events-none">
          <button class="bg-[#09090b] text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors">Review Order</button>
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
  stopKitchenChime();
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

window._pendingPaymentUpdate = null;

window.updateOrderStatus = async (id, newStatus, newPaymentStatus = null) => {
  try {
    if (newPaymentStatus === 'PAID') {
      const modalBackdrop = document.getElementById('payment-mode-modal-backdrop');
      const modal = document.getElementById('payment-mode-modal');
      
      if (modalBackdrop && modal) {
        modalBackdrop.classList.remove('hidden');
        modal.classList.remove('hidden');
        
        setTimeout(() => {
          modalBackdrop.classList.remove('opacity-0');
          modal.classList.remove('opacity-0', 'pointer-events-none');
          modal.querySelector('.bg-white').classList.remove('scale-95');
          modal.querySelector('.bg-white').classList.add('scale-100');
        }, 10);
        
        const upiBtn = document.getElementById('btn-pay-upi');
        const cashBtn = document.getElementById('btn-pay-cash');
        if (upiBtn) upiBtn.classList.remove('border-monochrome-900', 'bg-gray-50');
        if (cashBtn) cashBtn.classList.remove('border-monochrome-900', 'bg-gray-50');
        const confirmBtn = document.getElementById('btn-confirm-pay');
        if (confirmBtn) confirmBtn.disabled = true;
        
        window._pendingPaymentUpdate = { id, newStatus, newPaymentStatus, selectedMethod: null };
        return; // Wait for modal confirmation
      }
    }
    
    await executeOrderStatusUpdate(id, newStatus, newPaymentStatus);
  } catch (err) {
    console.error('Failed to update order:', err);
  }
};

window.executeOrderStatusUpdate = async (id, newStatus, newPaymentStatus, paymentMethod = null) => {
  try {
    const payload = {};
    if (newStatus) payload.status = newStatus;
    if (newPaymentStatus) {
      payload.paymentStatus = newPaymentStatus;
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      } else if (newPaymentStatus === 'PAID') {
        payload.paymentMethod = 'UPI'; // fallback
      }
    }
    
    const order = allOrdersData.find(o => o._id === id);
    if (order) {
      if (newStatus) order.status = newStatus;
      if (newPaymentStatus) {
        order.paymentStatus = newPaymentStatus;
        if (payload.paymentMethod) order.paymentMethod = payload.paymentMethod;
      }
      updateAllUI();
    }
    
    await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (typeof closeOrderDrawer === 'function') closeOrderDrawer(); 
  } catch (err) {
    console.error('Failed to execute order update:', err);
  }
};

const processedOrderIds = new Set();

function setupSocketListeners() {
  const handleIncomingOrder = async (newOrder) => {
    if (!newOrder) return;
    const orderId = newOrder._id || newOrder.id || newOrder.orderNumber;
    
    // 1. Strict deduplication check
    if (processedOrderIds.has(orderId)) return;
    processedOrderIds.add(orderId);

    console.log('⚡ Inserting & Rendering new incoming order:', orderId);

    // 4. Play chime SYNCHRONOUSLY BEFORE API call
    playKitchenChime();

    // 2. Fetch latest orders immediately from API to guarantee exact schema alignment and sorting
    if (typeof fetchAllOrders === 'function') {
      await fetchAllOrders();
    }

    // 3. Force re-render
    if (typeof updateAllUI === 'function') {
      updateAllUI();
    }

    // 5. Toast
    if (typeof showToast === 'function') {
      showToast(`🔔 New Order from Table ${newOrder.tableNumber || newOrder.table || '1'}!`, 'info');
    }
  };

  socket.on('order:new', handleIncomingOrder);
  socket.on('new_order', handleIncomingOrder);
  socket.on('order:created', handleIncomingOrder);
  
  socket.on('order:status_changed', (updatedOrder) => {
    const isDashboard = document.getElementById('kpi-revenue');
    if (isDashboard) fetchStats();
    
    if (updatedOrder && updatedOrder._id) {
      const idx = allOrdersData.findIndex(o => o._id === updatedOrder._id);
      if (idx !== -1) {
        allOrdersData[idx] = updatedOrder;
      } else {
        allOrdersData.unshift(updatedOrder);
      }
      syncKitchenBellState(allOrdersData);
      
      updateAllUI();
    }
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);

// Remove any legacy markAsPaid listener if present
window.markAsPaid = undefined;

window.renderPaymentButtonState = function(order) {
  const container = document.getElementById('paymentActionContainer');
  if (!container) return;

  const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID';
  const method = (order.paymentMethod || order.paymentMode || 'UPI').toUpperCase();

  if (isPaid) {
    container.innerHTML = `
      <div class="w-full py-2.5 bg-green-50 text-green-700 font-semibold text-center rounded-lg text-sm border border-green-200">
        ✓ Paid via ${method}
      </div>
    `;
  } else {
    container.innerHTML = `
      <button type="button" id="triggerPaymentOptionsBtn" class="w-full py-2.5 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-semibold rounded-lg text-sm transition shadow-sm">
        Mark as Paid
      </button>
    `;

    document.getElementById('triggerPaymentOptionsBtn').onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.showPaymentOptions();
    };
  }
};

window.showPaymentOptions = function() {
  const container = document.getElementById('paymentActionContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in duration-150">
      <p class="text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Select Payment Mode</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" id="selectCashBtn" class="py-2.5 px-3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg text-sm transition text-center shadow-sm">
          Cash
        </button>
        <button type="button" id="selectUpiBtn" class="py-2.5 px-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg text-sm transition text-center shadow-sm">
          UPI
        </button>
      </div>
      <button type="button" id="cancelPaymentBtn" class="w-full py-1 text-xs text-gray-400 hover:text-gray-600 transition text-center">
        Cancel
      </button>
    </div>
  `;

  document.getElementById('selectCashBtn').onclick = (e) => {
    e.stopPropagation();
    window.confirmPayment('CASH');
  };

  document.getElementById('selectUpiBtn').onclick = (e) => {
    e.stopPropagation();
    window.confirmPayment('UPI');
  };

  document.getElementById('cancelPaymentBtn').onclick = (e) => {
    e.stopPropagation();
    const currentOrder = (window.allOrdersData || []).find(o => (o._id || o.id) === window.currentSelectedOrderId);
    if (currentOrder) window.renderPaymentButtonState(currentOrder);
  };
};

function getAdminAuthHeaders() {
  const token = localStorage.getItem('glitch_admin_token') || 
                localStorage.getItem('adminToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('glitch_token') || 
                sessionStorage.getItem('glitch_admin_token') || 
                sessionStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
}

window.confirmPayment = async function(method) {
  if (!window.currentSelectedOrderId) return;
  const apiBase = window.API_BASE || (window.location.pathname.startsWith('/THE-GLITCH-CAFE') ? '/THE-GLITCH-CAFE/api' : '/api');

  try {
    const res = await fetch(`${apiBase}/orders/${window.currentSelectedOrderId}/status`, {
      method: 'PATCH',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({
        paymentMethod: method, // 'CASH' or 'UPI'
        paymentStatus: 'PAID',
        isPaid: true
      })
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast(`Order marked as Paid via ${method}!`, 'success');
      }

      // Close Order Details slide-over drawer
      if (typeof closeOrderDetails === 'function') {
        closeOrderDetails();
      } else {
        const closeBtn = document.querySelector('#closeOrderDetailsBtn, [data-action="close-order-details"]');
        if (closeBtn) closeBtn.click();
        const drawer = document.querySelector('#orderDetailsDrawer, #orderDrawer');
        if (drawer) drawer.classList.add('hidden', 'translate-x-full');
      }

      // Refresh orders table to update the badges in place
      if (typeof fetchAllOrders === 'function') {
        await fetchAllOrders();
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error('Payment PATCH error:', res.status, errData);
      if (typeof showToast === 'function') {
        showToast(errData.message || `Failed to update payment status (${res.status})`, 'error');
      }
    }
  } catch (err) {
    console.error('Payment execution error:', err);
    if (typeof showToast === 'function') {
      showToast('Network error while updating payment', 'error');
    }
  }
};

// Remove old legacy function if defined
window.printReceipt = undefined;

window.generateReceiptPDF = function() {
  let order = window.currentActiveOrder;
  if (!order && window.currentSelectedOrderId) {
    order = (window.allOrdersData || []).find(o => (o._id || o.id || o.orderNumber) === window.currentSelectedOrderId);
  }
  if (!order && Array.isArray(window.allOrdersData) && window.allOrdersData.length > 0) {
    order = window.allOrdersData[0];
  }

  if (!order) {
    if (typeof showToast === 'function') showToast('Please select an order first', 'error');
    return;
  }

  // Read latest live settings from localStorage
  let settings = {
    restaurantName: 'Glitch Cafe',
    address: '123 Web Dev Lane, Tech City, 10001',
    contactNumber: '+91 98765 43210',
    taxId: '22AAAAA0000A1Z5',
    currencySymbol: '₹',
    invoiceFooter: 'THANK YOU. VISIT AGAIN.nTHANK YOU'
  };

  const stored = localStorage.getItem('cafe_settings') || localStorage.getItem('glitch_cafe_profile');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      settings = { ...settings, ...parsed };
    } catch (e) {}
  }

  const orderDate = new Date(order.createdAt || order.date || Date.now());
  const dateStr = orderDate.toLocaleDateString('en-GB');
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const tableStr = order.table ? (order.table.toString().startsWith('Table') ? order.table : `Table: ${order.table}`) : 'Table 1';
  const invoiceNo = order.orderNumber || `ORD-${(order._id || '0000').slice(-4)}`;
  const customerName = order.customerName || order.customer || 'Walk-in Guest';
  const paymentMode = (order.paymentMethod || order.paymentMode || (order.paymentStatus === 'PAID' ? 'CASH' : 'UNPAID')).toLowerCase();

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || 1)), 0);
  const taxes = parseFloat(order.tax || order.taxes || 0);
  const grandTotal = parseFloat(order.total || order.totalAmount || (subtotal + taxes));

  const itemsHtml = items.map(item => {
    const qty = item.quantity || item.qty || 1;
    const price = (parseFloat(item.price || 0) * qty).toFixed(2);
    return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px;">
        <span style="max-width: 65%; word-break: break-word;">${qty} x ${item.name}</span>
        <span style="font-weight: 600;">₹${price}</span>
      </div>
    `;
  }).join('');

  // Thermal Receipt Component with explicit UTF-8 encoding
  const receiptBody = `
    <div id="thermalReceiptContent" style="width: 76mm; margin: 0 auto; padding: 14px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; font-size: 12px; line-height: 1.35; background: #fff;">
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">${settings.restaurantName}</div>
        <div style="font-size: 11px;">${settings.address}</div>
        ${settings.contactNumber ? `<div style="font-size: 11px;">CONTACT NO: ${settings.contactNumber}</div>` : ''}
        ${settings.taxId ? `<div style="font-size: 11px;">GSTIN: ${settings.taxId}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #777; margin: 8px 0;"></div>

      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Date: ${dateStr}</span>
        <span>Time: ${timeStr}</span>
        <span>${tableStr}</span>
      </div>

      <div style="border-top: 1px dashed #777; margin: 8px 0;"></div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: bold;">RECEIPT NO -</span>
        <span>${invoiceNo}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: bold;">CUSTOMER -</span>
        <span>${customerName}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: bold;">PAYMENT MODE -</span>
        <span style="text-transform: capitalize;">${paymentMode}</span>
      </div>

      <div style="border-top: 1px dashed #777; margin: 8px 0;"></div>

      <div>${itemsHtml}</div>

      <div style="border-top: 1px dashed #777; margin: 8px 0;"></div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: bold;">SUBTOTAL:</span>
        <span style="font-weight: bold;">₹${subtotal.toFixed(2)}</span>
      </div>
      ${taxes > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>CGST (2.5%):</span>
        <span>₹${(taxes / 2).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>SGST (2.5%):</span>
        <span>₹${(taxes / 2).toFixed(2)}</span>
      </div>` : ''}

      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-top: 4px;">
        <span>TOTAL:</span>
        <span>₹${grandTotal.toFixed(2)}</span>
      </div>

      <div style="border-top: 1px solid #000; margin: 10px 0 8px 0;"></div>

      <div style="text-align: center; font-size: 11px; white-space: pre-line;">
        ${settings.invoiceFooter}
      </div>
    </div>
  `;

  // 1. Open Clean UTF-8 Tab
  const fullHtmlPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Receipt - ${invoiceNo}</title>
      <style>
        body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; }
      </style>
    </head>
    <body>
      <div style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        ${receiptBody}
      </div>
    </body>
    </html>
  `;
  const receiptBlob = new Blob([fullHtmlPage], { type: 'text/html;charset=UTF-8' });
  const tabUrl = URL.createObjectURL(receiptBlob);
  window.open(tabUrl, '_blank');

  // 2. Download Clean PDF
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.left = '-9999px';
  tempContainer.innerHTML = receiptBody;
  document.body.appendChild(tempContainer);

  const opt = {
    margin: [4, 2, 4, 2],
    filename: `Receipt-${invoiceNo}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: [80, 230], orientation: 'portrait' }
  };

  const runDownload = () => {
    window.html2pdf().set(opt).from(tempContainer.querySelector('#thermalReceiptContent')).save().then(() => {
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      if (typeof showToast === 'function') showToast(`Receipt ${invoiceNo}.pdf downloaded!`, 'success');
    });
  };

  if (window.html2pdf) {
    runDownload();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = runDownload;
    document.head.appendChild(script);
  }
};


// POS Globals
window.posCart = []; // [{ id, name, size, toppings: [], quantity, price, subtotal }]
window.posMenuItems = [];
window.posCategories = [];
window.posModalItemId = null;
window.posModalSelectedSize = null;
window.posModalSelectedToppings = [];
window.posModalQuantity = 1;
window.posIsManualScrolling = false;

window.openNewOrderModal = async function() {
  window.posCart = window.posCart || [];
  
  let modal = document.getElementById('newOrderModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'newOrderModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6';
    document.body.appendChild(modal);
  }

  // Exact Customer CSS applied inline to avoid affecting other elements
  modal.innerHTML = `
    <div class="bg-[#FAFAFA] rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#000000] font-sans">
      <!-- Header -->
      <div class="px-6 py-4 border-b flex items-center justify-between bg-white shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm tracking-wide">POS</div>
          <div>
            <h3 class="text-base font-extrabold text-gray-900 leading-tight">Counter POS & Manual Order Punch</h3>
            <p class="text-xs text-gray-400 font-medium">Customer-synced live menu</p>
          </div>
        </div>
        <button onclick="closeNewOrderModal()" class="text-gray-400 hover:text-gray-900 text-2xl font-bold p-1 transition">&times;</button>
      </div>

      <!-- Main Body Split -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#fbfbfa]">
        
        <!-- LEFT: Customer Storefront Mirror (7 cols) -->
        <div class="lg:col-span-7 border-r border-gray-100 flex flex-col h-full bg-[#fbfbfa] overflow-hidden relative" id="pos-left-scroll-container">
          
          <!-- Sticky Category Bar -->
          <div id="pos-category-tabs-wrapper" class="sticky top-0 z-40 bg-[#fbfbfa] py-3 px-4 border-b border-gray-100 shadow-sm w-full shrink-0">
            <div id="pos-category-bar" class="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1">
              <!-- Dynamic category pills injected by JS -->
            </div>
          </div>

          <!-- Menu Container -->
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6" id="pos-menu-container">
            <div class="text-center py-16 text-sm text-gray-400 font-medium">Loading live menu...</div>
          </div>
        </div>

        <!-- RIGHT: Order Ticket & Checkout (5 cols) -->
        <div class="lg:col-span-5 flex flex-col h-full bg-white overflow-hidden">
          <!-- Order Header Inputs -->
          <div class="p-4 border-b border-gray-100 space-y-3 bg-gray-50/40 shrink-0">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Table / Tag</label>
                <select id="posTableSelect" class="w-full mt-1 border border-gray-200 rounded-xl p-2 text-sm bg-white font-semibold text-gray-900 focus:ring-2 focus:ring-black outline-none">
                  <option value="Table 1">Table 1</option>
                  <option value="Table 2">Table 2</option>
                  <option value="Table 3">Table 3</option>
                  <option value="Table 4">Table 4</option>
                  <option value="Takeaway">Takeaway</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Customer Name</label>
                <input type="text" id="posCustomerName" placeholder="Walk-in Guest" class="w-full mt-1 border border-gray-200 rounded-xl p-2 text-sm bg-white font-semibold text-gray-900 focus:ring-2 focus:ring-black outline-none">
              </div>
            </div>
            <div>
              <label class="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Customer Email <span class="text-gray-400 font-normal lowercase">(optional)</span></label>
              <input type="email" id="posCustomerEmail" placeholder="guest@example.com" class="w-full mt-1 border border-gray-200 rounded-xl p-2 text-sm bg-white focus:ring-2 focus:ring-black outline-none">
            </div>
          </div>

          <!-- Cart List -->
          <div class="p-4 flex-1 overflow-y-auto space-y-4" id="posCartList">
            <div class="text-center py-20 text-gray-400 text-sm font-medium">Your cart is empty</div>
          </div>

          <!-- Summary & Punch CTA -->
          <div class="p-5 border-t border-gray-100 bg-white shrink-0">
            <div class="flex justify-between items-center mb-4">
              <span class="text-gray-600 font-medium">Subtotal</span>
              <span id="pos-cart-subtotal-display" class="font-bold text-lg">₹0</span>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onclick="closeNewOrderModal()" class="py-3.5 border border-gray-300 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
              <button type="button" onclick="submitPosOrder()" class="py-3.5 bg-black hover:bg-neutral-900 text-white rounded-2xl text-sm font-bold shadow-xl active:scale-[0.98] transition">Punch Order</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    
    <!-- CUSTOMIZATION MODAL (Customer Mirror) -->
    <div id="pos-customization-backdrop" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 hidden" onclick="closePosCustomizationModal()">
      
      <!-- Centered popup modal -->
      <div id="pos-customization-modal" class="max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl relative flex flex-col max-h-[85vh]" onclick="event.stopPropagation()">
        
        <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-black transition z-10" onclick="closePosCustomizationModal()">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      
      <div class="flex-1 overflow-y-auto no-scrollbar pb-6">
        <!-- Dynamic Item Info -->
        <div id="pos-modal-special-tag-container">
          <div id="pos-modal-special-tag" class="hidden bg-black text-white text-[11px] font-semibold tracking-wider px-3 py-1 rounded-md uppercase inline-flex items-center gap-1 mb-2">
            ✦ THE GLITCH SPECIAL ✦
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <h3 id="pos-modal-item-name" class="text-xl font-extrabold text-black">Item Name</h3>
            <div id="pos-modal-veg-indicator" class="inline-flex items-center justify-center w-4 h-4 border-[1.5px] rounded-[3px] p-[2px] ml-2">
              <div class="w-2 h-2 rounded-full"></div>
            </div>
          </div>
          <span id="pos-modal-item-price" class="text-xl font-extrabold text-black">₹0</span>
        </div>
  
        <hr class="border-neutral-100 my-4">

        <!-- Sizes Container -->
        <div id="pos-sizes-section-wrapper">
          <p class="text-sm font-semibold text-neutral-800 mb-3">Select Size</p>
          <div id="pos-modal-sizes" class="grid grid-cols-3 gap-2.5 mb-4"></div>
        </div>
  
        <hr id="pos-sizes-divider" class="border-neutral-100 my-4">

        <!-- Toppings Container -->
        <div id="pos-toppings-section-wrapper">
          <p class="text-sm font-semibold text-neutral-800 mb-3">Select Toppings</p>
          <div id="pos-modal-toppings" class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4"></div>
        </div>
  
        <hr class="border-neutral-100 my-4">

        <p class="text-center text-[11px] text-neutral-500 mb-3">Hot & Fresh in 10–15 minutes</p>
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-between bg-neutral-100 text-black rounded-2xl h-[52px] px-3 w-[120px] shrink-0 border border-neutral-200">
            <button type="button" class="flex-1 h-full flex items-center justify-center text-2xl font-medium hover:text-gray-500 transition-colors pb-1" onclick="updatePosModalQty(-1)">-</button>
            <span id="pos-modal-qty" class="w-8 text-center text-base font-bold">1</span>
            <button type="button" class="flex-1 h-full flex items-center justify-center text-2xl font-medium hover:text-gray-500 transition-colors pb-1" onclick="updatePosModalQty(1)">+</button>
          </div>
          <button id="pos-modal-add-to-order-btn" type="button" class="flex-1 bg-black text-white font-bold text-base h-[52px] rounded-2xl active:scale-[0.98] transition" onclick="addPosCustomizedItem()">
            Add to Order
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  await loadPosMenuItems();
  
  if (window.posCart.length > 0) {
    renderPosCartList();
  }
};

window.closeNewOrderModal = function() {
  const modal = document.getElementById('newOrderModal');
  if (modal) modal.classList.add('hidden');
};

async function loadPosMenuItems() {
  const apiBase = window.API_BASE || (window.location.pathname.startsWith('/THE-GLITCH-CAFE') ? '/THE-GLITCH-CAFE/api' : '/api');
  
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${apiBase}/categories`),
      fetch(`${apiBase}/products`)
    ]);
    if (catRes.ok && prodRes.ok) {
      const catsData = await catRes.json();
      const prodsData = await prodRes.json();
      
      window.posCategories = catsData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      window.posMenuItems = prodsData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      
      renderPosCategories();
      renderPosCatalog();
    } else {
      document.getElementById('pos-menu-container').innerHTML = '<div class="text-center py-12 text-gray-500">Failed to load menu.</div>';
    }
  } catch (err) {
    console.error('POS menu fetch err:', err);
    document.getElementById('pos-menu-container').innerHTML = '<div class="text-center py-12 text-gray-500">Failed to load menu.</div>';
  }
}

function renderPosCategories() {
  const bar = document.getElementById('pos-category-bar');
  if (!bar) return;
  bar.innerHTML = '';
  
  const allBtn = document.createElement('button');
  allBtn.className = `px-5 py-1.5 rounded-md border border-gray-400 text-[#000000] bg-white whitespace-nowrap text-[13px] font-bold transition-colors pos-cat-pill bg-black text-white border-black`;
  allBtn.innerText = 'All Items';
  allBtn.dataset.target = 'top';
  allBtn.onclick = (e) => scrollToPosCategory('top', e.target);
  bar.appendChild(allBtn);
  
  window.posCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `px-5 py-1.5 rounded-md border border-gray-400 text-[#000000] bg-white whitespace-nowrap text-[13px] font-bold transition-colors pos-cat-pill`;
    btn.innerText = cat.name;
    const catSlug = cat.slug || cat.name.replace(/\s+/g, '-');
    btn.dataset.target = `pos-cat-section-${catSlug}`;
    btn.onclick = (e) => scrollToPosCategory(btn.dataset.target, e.target);
    bar.appendChild(btn);
  });
}

function scrollToPosCategory(targetId, btn) {
  window.posIsManualScrolling = true;
  
  document.querySelectorAll('.pos-cat-pill').forEach(p => {
    p.classList.remove('bg-black', 'text-white', 'border-black');
    p.classList.add('bg-white', 'text-[#000000]', 'border-gray-400');
  });
  
  if (btn) {
    btn.classList.remove('bg-white', 'text-[#000000]', 'border-gray-400');
    btn.classList.add('bg-black', 'text-white', 'border-black');
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  
  const scrollContainer = document.getElementById('pos-left-scroll-container');
  if (targetId === 'top') {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const targetTop = targetElement.getBoundingClientRect().top;
      const offset = targetTop - containerTop + scrollContainer.scrollTop - 70;
      scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }
  
  setTimeout(() => {
    window.posIsManualScrolling = false;
  }, 800);
}

function renderPosCatalog() {
  const container = document.getElementById('pos-menu-container');
  if (!container) return;
  container.innerHTML = '';
  
  window.posCategories.forEach(cat => {
    const itemsInCat = window.posMenuItems.filter(p => 
      p.categoryId === cat._id || 
      (p.categoryId && p.categoryId._id === cat._id) ||
      p.categorySlug === cat.slug
    );
    
    let catHTML = `
      <div id="pos-cat-section-${cat.slug || cat.name.replace(/\s+/g, '-')}" class="bg-white rounded-[20px] pt-6 pb-3 px-3 mb-6 shadow-sm border border-gray-100 scroll-mt-24">
        <h2 class="text-[20px] font-bold tracking-widest uppercase text-[#000000] text-center mb-3">${cat.name}</h2>
        <hr class="border-gray-200 mb-4 mx-2">
    `;
    
    if (itemsInCat.length === 0) {
      catHTML += `<div class="text-xs text-gray-400 py-3 italic text-center">No items available in this category yet.</div>`;
    } else {
      itemsInCat.forEach(item => {
        const iconHTML = item.isVeg 
          ? `<span class="inline-flex items-center justify-center w-4 h-4 border-2 border-green-600 rounded-sm bg-white shrink-0"><span class="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span>` 
          : `<span class="inline-flex items-center justify-center w-4 h-4 border-2 border-red-700 rounded-sm bg-white shrink-0"><span style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:5px solid #b91c1c;"></span></span>`;
        
        const badgeHTML = item.isSpecial 
          ? `<div class="bg-black text-white text-sm font-semibold px-4 py-1.5 rounded-md uppercase tracking-wider text-center w-full mb-3">✦ THE GLITCH SPECIAL ✦</div>` 
          : '';
        
        let actionHTML = '';
        if (!item.isAvailable) {
          actionHTML = `<button type="button" class="bg-[#A3A3A3] text-white px-4 py-1.5 rounded-lg text-sm font-semibold cursor-not-allowed min-w-[76px]">86'd</button>`;
        } else {
          const qty = window.posCart.filter(c => c.id === item._id).reduce((sum, c) => sum + c.quantity, 0);
          if (qty > 0) {
            actionHTML = `
              <div class="flex items-center bg-black text-white rounded-lg h-[32px] overflow-hidden shadow-sm min-w-[76px]">
                <button type="button" class="flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="openPosCustomizationModal('${item._id}')">-</button>
                <span class="w-6 text-center text-sm font-bold leading-none">${qty}</span>
                <button type="button" class="flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="openPosCustomizationModal('${item._id}')">+</button>
              </div>
            `;
          } else {
            actionHTML = `<button type="button" class="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer min-w-[76px]" onclick="openPosCustomizationModal('${item._id}')">+ Add</button>`;
          }
        }
        
        catHTML += `
          <div class="bg-[#FFFFFF] rounded-[15px] p-4 border border-[#EAEAEA] mb-3 relative ${!item.isAvailable ? 'opacity-60' : ''}">
            ${badgeHTML}
            <div>
              <div class="flex justify-between items-start">
                <div class="flex-1 pr-3 flex items-start">
                  <h3 class="font-bold text-[#000000] leading-tight text-[17px]">${item.name}</h3>
                  <div class="ml-2 shrink-0">${iconHTML}</div>
                </div>
                <div class="shrink-0 flex items-center gap-3">
                  <div class="font-bold text-sm text-[#000000]">₹${item.price}</div>
                  <div>${actionHTML}</div>
                </div>
              </div>
              ${item.description ? `<hr class="border-gray-200 mt-3 mb-2"><p class="text-[11px] text-gray-500 font-normal leading-relaxed line-clamp-2 pr-12">${item.description}</p>` : ''}
            </div>
          </div>
        `;
      });
    }
    catHTML += `</div>`;
    container.innerHTML += catHTML;
  });
}

window.openPosCustomizationModal = function(itemId) {
  let item = window.posMenuItems.find(i => i._id === itemId);
  if (!item) return;
  
  window.posModalItemId = itemId;
  window.posModalSelectedSize = item.sizes && item.sizes.length > 0 ? 0 : null;
  window.posModalSelectedToppings = [];
  window.posModalQuantity = 1;
  
  const backdrop = document.getElementById('pos-customization-backdrop');
  const modal = document.getElementById('pos-customization-modal');

  document.getElementById('pos-modal-item-name').innerText = item.name;
  document.getElementById('pos-modal-item-price').innerText = `₹${item.price}`;
  
  const specialTag = document.getElementById('pos-modal-special-tag');
  if (item.isSpecial) specialTag.classList.remove('hidden');
  else specialTag.classList.add('hidden');

  const vegIndicator = document.getElementById('pos-modal-veg-indicator');
  if (item.isVeg) {
    vegIndicator.className = 'inline-flex items-center justify-center w-4 h-4 border-[1.5px] border-emerald-600 rounded-[3px] p-[2px] ml-2';
    vegIndicator.innerHTML = '<div class="w-2 h-2 bg-emerald-600 rounded-full"></div>';
  } else {
    vegIndicator.className = 'inline-flex items-center justify-center w-4 h-4 border-[1.5px] border-red-700 rounded-[3px] p-[2px] ml-2';
    vegIndicator.innerHTML = '<div style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:5px solid #b91c1c;"></div>';
  }

  const sizeContainer = document.getElementById('pos-modal-sizes');
  const sizeWrapper = document.getElementById('pos-sizes-section-wrapper');
  const sizeDivider = document.getElementById('pos-sizes-divider');
  if (item.sizes && item.sizes.length > 0) {
    sizeWrapper.style.display = 'block';
    if (sizeDivider) sizeDivider.style.display = 'block';
    sizeContainer.innerHTML = item.sizes.map((size, index) => {
      const isSelected = index === window.posModalSelectedSize;
      const basePrice = Number(item.price) || 0;
      const sizePrice = basePrice + Number(size.price || 0);
      return `
        <div class="pos-size-btn ${isSelected ? 'bg-black text-white shadow-sm' : 'bg-white border border-neutral-400 text-neutral-900 hover:border-black'} p-3 rounded-xl text-center flex flex-col justify-center items-center cursor-pointer" onclick="selectPosSize(${index})">
          <span class="font-bold text-sm leading-tight">${size.name}</span>
          <span class="font-bold text-sm mt-0.5">₹${sizePrice}</span>
        </div>
      `;
    }).join('');
  } else {
    sizeWrapper.style.display = 'none';
    if (sizeDivider) sizeDivider.style.display = 'none';
    sizeContainer.innerHTML = '';
  }

  const toppingContainer = document.getElementById('pos-modal-toppings');
  const toppingWrapper = document.getElementById('pos-toppings-section-wrapper');
  if (item.toppings && item.toppings.length > 0) {
    toppingWrapper.style.display = 'block';
    toppingContainer.innerHTML = item.toppings.map((top, index) => {
      const isChecked = window.posModalSelectedToppings.includes(index);
      return `
        <label class="flex items-center justify-between cursor-pointer">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="w-4 h-4 rounded border-neutral-400 text-black focus:ring-0 accent-black" ${isChecked ? 'checked' : ''} onchange="togglePosTopping(${index})">
            <span class="text-xs font-medium text-neutral-800">${top.name}</span>
          </div>
          <span class="text-xs font-semibold text-neutral-900">₹${Number(top.price || 0)}</span>
        </label>
      `;
    }).join('');
  } else {
    toppingWrapper.style.display = 'none';
    toppingContainer.innerHTML = '';
  }
  
  document.getElementById('pos-modal-qty').innerText = window.posModalQuantity;
  updatePosModalPrice();

  backdrop.classList.remove('hidden');
  backdrop.style.display = 'flex';
};

window.closePosCustomizationModal = function() {
  const backdrop = document.getElementById('pos-customization-backdrop');
  if (backdrop) {
    backdrop.classList.add('hidden');
    backdrop.style.display = 'none';
  }
};

window.selectPosSize = (index) => {
  window.posModalSelectedSize = index;
  const item = window.posMenuItems.find(i => i._id === window.posModalItemId);
  if (item && item.sizes) {
    const sizeBtns = document.querySelectorAll('.pos-size-btn');
    sizeBtns.forEach((btn, idx) => {
      if (idx === index) {
        btn.className = 'pos-size-btn bg-black text-white shadow-sm p-3 rounded-xl text-center flex flex-col justify-center items-center cursor-pointer';
      } else {
        btn.className = 'pos-size-btn bg-white border border-neutral-400 text-neutral-900 hover:border-black p-3 rounded-xl text-center flex flex-col justify-center items-center cursor-pointer';
      }
    });
  }
  updatePosModalPrice();
};

window.togglePosTopping = (index) => {
  const topIdx = window.posModalSelectedToppings.indexOf(index);
  if (topIdx > -1) window.posModalSelectedToppings.splice(topIdx, 1);
  else window.posModalSelectedToppings.push(index);
  updatePosModalPrice();
};

window.updatePosModalQty = (change) => {
  window.posModalQuantity += change;
  if (window.posModalQuantity < 1) window.posModalQuantity = 1;
  document.getElementById('pos-modal-qty').innerText = window.posModalQuantity;
  updatePosModalPrice();
};

window.updatePosModalPrice = () => {
  const item = window.posMenuItems.find(i => i._id === window.posModalItemId);
  if (!item) return;
  let total = Number(item.price) || 0;
  if (window.posModalSelectedSize !== null && item.sizes && item.sizes[window.posModalSelectedSize]) {
    total += Number(item.sizes[window.posModalSelectedSize].price || 0);
  }
  if (item.toppings) {
    window.posModalSelectedToppings.forEach(idx => {
      total += Number(item.toppings[idx].price || 0);
    });
  }
  const finalPrice = total * window.posModalQuantity;
  document.getElementById('pos-modal-add-to-order-btn').innerText = `Add to Order • ₹${finalPrice}`;
};

window.addPosCustomizedItem = () => {
  const item = window.posMenuItems.find(i => i._id === window.posModalItemId);
  if (!item) return;

  let unitPrice = Number(item.price) || 0;
  let sizeName = null;
  let selectedToppingNames = [];

  if (window.posModalSelectedSize !== null && item.sizes && item.sizes[window.posModalSelectedSize]) {
    unitPrice += Number(item.sizes[window.posModalSelectedSize].price || 0);
    sizeName = item.sizes[window.posModalSelectedSize].name;
  }

  if (item.toppings) {
    window.posModalSelectedToppings.forEach(idx => {
      unitPrice += Number(item.toppings[idx].price || 0);
      selectedToppingNames.push(item.toppings[idx].name);
    });
  }

  const subtotal = unitPrice * window.posModalQuantity;

  const existingIdx = window.posCart.findIndex(c => 
    c.id === item._id && 
    c.size === sizeName && 
    JSON.stringify(c.toppings) === JSON.stringify(selectedToppingNames)
  );

  if (existingIdx > -1) {
    window.posCart[existingIdx].quantity += window.posModalQuantity;
    window.posCart[existingIdx].subtotal = window.posCart[existingIdx].quantity * window.posCart[existingIdx].price;
  } else {
    window.posCart.push({
      id: item._id,
      name: item.name,
      category: item.category || item.categoryName || 'General',
      size: sizeName,
      toppings: selectedToppingNames,
      quantity: window.posModalQuantity,
      price: unitPrice,
      subtotal: subtotal
    });
  }

  closePosCustomizationModal();
  renderPosCartList();
  renderPosCatalog();
};

window.changePosCartQty = (index, delta) => {
  if (!window.posCart[index]) return;
  window.posCart[index].quantity += delta;
  if (window.posCart[index].quantity <= 0) {
    window.posCart.splice(index, 1);
  } else {
    window.posCart[index].subtotal = window.posCart[index].quantity * window.posCart[index].price;
  }
  renderPosCartList();
  renderPosCatalog();
};

window.renderPosCartList = () => {
  const container = document.getElementById('posCartList');
  const subtotalDisplay = document.getElementById('pos-cart-subtotal-display');
  if (!container) return;

  if (window.posCart.length === 0) {
    container.innerHTML = '<div class="text-center py-20 text-gray-400 text-sm font-medium">Your cart is empty</div>';
    if (subtotalDisplay) subtotalDisplay.innerText = '₹0';
    return;
  }

  let html = '';
  let subtotal = 0;

  window.posCart.forEach((item, index) => {
    subtotal += item.subtotal;
    let details = [];
    if (item.size) details.push(`Size: ${item.size}`);
    if (item.toppings && item.toppings.length) details.push(`Toppings: ${item.toppings.join(', ')}`);
    
    const detailsStr = details.length ? `<p class="text-xs text-gray-500 mt-1">${details.join(' | ')}</p>` : '';
    
    html += `
      <div class="flex justify-between items-start border-b border-gray-100 pb-3">
        <div class="flex-1 pr-4">
          <div class="flex items-center">
            <h4 class="font-bold text-sm text-gray-900">${item.name}</h4>
          </div>
          ${detailsStr}
          <div class="font-bold text-sm mt-1 text-gray-700">₹${item.price} x ${item.quantity}</div>
        </div>
        <div class="flex flex-col items-end shrink-0">
          <div class="font-bold text-gray-900 mb-2">₹${item.subtotal}</div>
          <div class="flex items-center bg-gray-100 rounded border border-gray-200">
            <button class="w-7 h-7 flex items-center justify-center font-black hover:bg-gray-200 transition" onclick="changePosCartQty(${index}, -1)">-</button>
            <span class="w-6 text-center text-xs font-bold">${item.quantity}</span>
            <button class="w-7 h-7 flex items-center justify-center font-black hover:bg-gray-200 transition" onclick="changePosCartQty(${index}, 1)">+</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (subtotalDisplay) subtotalDisplay.innerText = `₹${subtotal}`;
};

// 5. Submit Complete Order
window.submitPosOrder = async function() {
  if (!window.posCart || window.posCart.length === 0) {
    if (typeof showToast === 'function') showToast('Ticket is empty! Add items first.', 'error');
    return;
  }

  const tableSelect = document.getElementById('posTableSelect');
  const tableVal = tableSelect ? tableSelect.value : 'Table 1';
  // Parse numeric table if backend expects a number, otherwise keep string
  const tableNumber = parseInt(tableVal.replace(/\\D/g, '')) || 1;

  const customerName = document.getElementById('posCustomerName')?.value?.trim() || 'Walk-in Guest';
  const customerEmail = document.getElementById('posCustomerEmail')?.value?.trim() || '';

  // Format items matching customer.js / backend order schema
  const formattedItems = window.posCart.map(item => ({
    id: item.id || item._id || item.productId,
    productId: item.productId || item.id || item._id,
    name: item.name,
    price: parseFloat(item.price || item.unitPrice || 0),
    quantity: parseInt(item.quantity || item.qty || 1),
    size: item.size || item.variant || '',
    toppings: Array.isArray(item.toppings) 
      ? item.toppings.map(t => typeof t === 'string' ? t : (t.name || ''))
      : [],
    itemTotal: parseFloat(item.price || 0) * parseInt(item.quantity || item.qty || 1)
  }));

  const subtotal = formattedItems.reduce((acc, curr) => acc + curr.itemTotal, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const payload = {
    table: tableVal,
    tableNumber: tableNumber,
    customerName: customerName,
    customerEmail: customerEmail,
    items: formattedItems,
    subtotal: subtotal,
    tax: tax,
    total: total,
    totalAmount: total,
    status: 'Preparing',
    orderStatus: 'PREPARING',
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    orderType: tableVal.toLowerCase().includes('takeaway') ? 'Takeaway' : 'Dine-In',
    createdAt: new Date().toISOString()
  };

  const apiBase = window.API_BASE || (window.location.pathname.startsWith('/THE-GLITCH-CAFE') ? '/THE-GLITCH-CAFE/api' : '/api');
  const token = localStorage.getItem('glitch_admin_token') || localStorage.getItem('token');

  try {
    const res = await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      if (typeof showToast === 'function') showToast('Order punched successfully!', 'success');
      closeNewOrderModal();
      
      // Redirect to orders / KDS screen
      window.location.href = './orders.html';
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error('Server rejection:', errData);
      if (typeof showToast === 'function') {
        showToast(errData.message || 'Failed to create order. Check payload.', 'error');
      }
    }
  } catch (err) {
    console.error('Network/POS error:', err);
    if (typeof showToast === 'function') showToast('Network error creating order', 'error');
  }
};



