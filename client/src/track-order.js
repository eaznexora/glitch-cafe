document.addEventListener('DOMContentLoaded', () => {
  loadAndRenderActiveOrder();
});

let activeOrderSession = null;
let pollInterval = null;

function loadAndRenderActiveOrder() {
  const activeOrderStr = localStorage.getItem('glitch_active_order');
  if (!activeOrderStr) {
    window.location.href = 'customer.html' + window.location.search;
    return;
  }

  try {
    activeOrderSession = JSON.parse(activeOrderStr);
    renderOrderDetails();
    renderStatusBadge(activeOrderSession.status);
    
    // Only poll if not in a final state
    if (!['COMPLETED', 'REJECTED', 'CANCELLED', 'SERVED'].includes(activeOrderSession.status?.toUpperCase())) {
      startPolling();
    }
  } catch (e) {
    window.location.href = 'customer.html' + window.location.search;
  }
}

function renderOrderDetails() {
  const cartList = document.getElementById('cart-list');
  const subtotalAmt = document.getElementById('subtotal-amt');
  const totalAmt = document.getElementById('total-amt');
  
  if (!activeOrderSession || !activeOrderSession.items) return;
  
  const items = activeOrderSession.items;
  
  if (items.length === 0) {
    cartList.innerHTML = `<div class="p-4 text-center text-gray-500 font-medium">No items found.</div>`;
    return;
  }

  let html = '';
  items.forEach((item, index) => {
    let customizationHtml = '';
    if (item.size || (item.toppings && item.toppings.length > 0)) {
      customizationHtml = `<div class="mt-2 pl-2 border-l-2 border-gray-200">`;
      if (item.size) customizationHtml += `<div class="text-[11px] text-gray-500 font-medium">Size: ${item.size}</div>`;
      if (item.toppings && item.toppings.length > 0) {
        customizationHtml += `<div class="text-[11px] text-gray-500 font-medium">Add-ons: ${item.toppings.map(t => t.name).join(', ')}</div>`;
      }
      customizationHtml += `</div>`;
    }

    const isCancelled = item.status === 'Cancelled';
    const rowOpacity = isCancelled ? 'opacity-50' : '';
    const strikeClass = isCancelled ? 'line-through text-gray-400' : 'text-brand-black';
    const tagHtml = isCancelled ? `<div class="text-xs font-bold text-red-500 mt-1">✕ Cancelled (Out of Stock)</div>` : '';

    html += `
      <div class="p-4 flex flex-col ${rowOpacity}">
        <div class="flex justify-between items-start mb-1">
          <div class="flex-1 pr-3">
            <h4 class="font-bold text-[15px] leading-tight ${strikeClass}">${item.name}</h4>
            ${tagHtml}
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-sm ${isCancelled ? 'line-through text-gray-400' : ''}">₹${item.subtotal}</span>
            <div class="bg-gray-100 text-gray-500 font-bold px-3 py-1 rounded-md text-sm">x${item.quantity}</div>
          </div>
        </div>
        ${customizationHtml}
      </div>
      ${index !== items.length - 1 ? '<hr class="border-gray-200 mx-4">' : ''}
    `;
  });

  cartList.innerHTML = html;
  
  let totalBase = 0;
  let cancelledItems = [];
  
  items.forEach(i => {
    if (i.status === 'Cancelled') {
      cancelledItems.push(i.name);
    } else {
      totalBase += i.subtotal;
    }
  });
  
  const bannerContainer = document.getElementById('rejection-banner-container');
  if (cancelledItems.length > 0 && bannerContainer) {
    bannerContainer.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span class="text-xl">⚠️</span>
        <div>
          <h4 class="text-sm font-bold text-red-600">Item Unavailable</h4>
          <p class="text-xs text-gray-600 mt-0.5">
            <strong>${cancelledItems.join(', ')}</strong> was out of stock and removed from your order. Your bill total has been adjusted.
          </p>
        </div>
      </div>
    `;
  } else if (bannerContainer) {
    bannerContainer.innerHTML = '';
  }
  
  const grandTotal = activeOrderSession.totals?.totalAmount || totalBase;
  const totalExtras = grandTotal - totalBase;
  
  subtotalAmt.innerText = `₹${totalBase}`;
  document.getElementById('extras-amt').innerText = `₹${totalExtras > 0 ? totalExtras : 0}`;
  totalAmt.innerText = `₹${grandTotal}`;
}

function renderStatusBadge(status) {
  const container = document.getElementById('status-container');
  status = status ? status.toUpperCase() : 'PENDING';
  
  let badgeHtml = '';
  if (status === 'PENDING') {
    badgeHtml = `
      <div class="w-full bg-neutral-900 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-md">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Accepting your order...</span>
      </div>
    `;
  } else if (status === 'PREPARING') {
    badgeHtml = `
      <div class="w-full bg-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
        <span>Order Accepted ✓ Preparing</span>
      </div>
    `;
  } else if (status === 'READY_TO_SERVE') {
    badgeHtml = `
      <div class="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-600/20">
        <span class="text-lg">Ready to Serve! 🍽️</span>
        <span class="text-xs font-normal opacity-80 mt-1">Your order is coming right up.</span>
      </div>
    `;
  } else if (['REJECTED', 'CANCELLED'].includes(status)) {
    badgeHtml = `
      <div class="w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-red-600/20">
        <span>Order Declined</span>
        <span class="text-xs font-normal opacity-80">Please check with cafe staff.</span>
      </div>
    `;
  } else if (status === 'COMPLETED') {
    badgeHtml = `
      <div class="w-full bg-gray-800 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md">
        <span>Order Completed</span>
      </div>
    `;
  }
  
  container.innerHTML = badgeHtml;
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  
  const orderId = activeOrderSession.orderId;
  
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`);
      if (res.ok) {
        const order = await res.json();
        
        // Handle partial items rejection (update status of items)
        let needsUpdate = false;
        
        if (order.items && order.items.length > 0) {
          order.items.forEach((remoteItem, idx) => {
            if (activeOrderSession.items[idx] && activeOrderSession.items[idx].status !== remoteItem.status) {
              needsUpdate = true;
            }
          });
          
          if (needsUpdate || order.totalAmount !== activeOrderSession.totals?.totalAmount) {
            activeOrderSession.items = order.items;
            activeOrderSession.totals = { totalAmount: order.totalAmount };
            localStorage.setItem('glitch_active_order', JSON.stringify(activeOrderSession));
            renderOrderDetails();
          }
        }
        
        // Handle Status Change
        if (order.status !== activeOrderSession.status) {
          activeOrderSession.status = order.status;
          localStorage.setItem('glitch_active_order', JSON.stringify(activeOrderSession));
          renderStatusBadge(order.status);
          
          if (['ACCEPTED', 'PREPARING', 'READY_TO_SERVE'].includes(order.status.toUpperCase())) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          } else if (['REJECTED', 'CANCELLED', 'COMPLETED'].includes(order.status.toUpperCase())) {
            clearInterval(pollInterval);
            if (['COMPLETED'].includes(order.status.toUpperCase())) {
               // Remove active session on completion so they can order again fully fresh next time
               localStorage.removeItem('glitch_active_order');
            }
          }
        }
      }
    } catch (err) {
      console.error('Polling error', err);
    }
  }, 3000);
}
