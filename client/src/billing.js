// billing.js
// Handles Cashier & Billing features

const API_BASE = 'http://localhost:3000/api'; // Same as main.js
let allBills = [];
let currentStatusFilter = 'all';
let currentBill = null;
let selectedPaymentMethod = 'UPI';

// Fetch all orders on load
async function fetchBills() {
  try {
    const res = await fetch(`${API_BASE}/orders`); // Fetches all orders
    if (res.ok) {
      const data = await res.json();
      
      // Inject Dummy Data if database is empty or has very few orders for presentation
      if (data.length < 3) {
        const dummyData = [
          {
            _id: "DUMMY-6F8A2B",
            tableId: { tableNumber: "04" },
            customerName: "Arjun Reddy",
            createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
            totalAmount: 680,
            paymentStatus: "UNPAID",
            items: [
              { name: "Iced Americano", quantity: 2, price: 150 },
              { name: "Spicy Chicken Burger", quantity: 1, price: 380 }
            ]
          },
          {
            _id: "DUMMY-9C1D4E",
            tableId: { tableNumber: "12" },
            customerName: "Priya Sharma",
            createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
            totalAmount: 1450,
            paymentStatus: "PAID",
            paymentMethod: "UPI",
            items: [
              { name: "Margherita Pizza", quantity: 1, price: 450 },
              { name: "Pasta Alfredo", quantity: 2, price: 350 },
              { name: "Cold Coffee", quantity: 2, price: 150 }
            ]
          },
          {
            _id: "DUMMY-3E7F9A",
            tableId: { tableNumber: "02" },
            customerName: "Walk-in Guest",
            createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
            totalAmount: 320,
            paymentStatus: "PAID",
            paymentMethod: "CASH",
            items: [
              { name: "Cappuccino", quantity: 2, price: 160 }
            ]
          },
          {
            _id: "DUMMY-5B2C8D",
            tableId: { tableNumber: "08" },
            customerName: "Rahul Desai",
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
            totalAmount: 920,
            paymentStatus: "UNPAID",
            items: [
              { name: "Loaded Nachos", quantity: 1, price: 280 },
              { name: "BBQ Chicken Wings", quantity: 2, price: 320 }
            ]
          }
        ];
        allBills = [...data, ...dummyData];
      } else {
        allBills = data;
      }
      
      updateUnpaidCount();
      filterBills();
    }
  } catch (err) {
    console.error('Failed to fetch bills:', err);
  }
}

function updateUnpaidCount() {
  const unpaidCount = allBills.filter(b => b.paymentStatus !== 'PAID').length;
  document.getElementById('unpaid-badge').innerText = unpaidCount;
}

window.setStatusFilter = (status, btnElement) => {
  currentStatusFilter = status;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-monochrome-900', 'text-white');
    btn.classList.add('bg-monochrome-100', 'text-gray-600');
  });
  
  if (btnElement) {
    btnElement.classList.add('active', 'bg-monochrome-900', 'text-white');
    btnElement.classList.remove('bg-monochrome-100', 'text-gray-600');
  }
  filterBills();
};

window.filterBills = () => {
  const searchQ = document.getElementById('bill-search').value.toLowerCase();
  const grid = document.getElementById('bills-grid');
  grid.innerHTML = '';
  
  const filtered = allBills.filter(bill => {
    const tableNo = bill.tableId ? bill.tableId.tableNumber : 'Unknown';
    const isMatch = tableNo.toString().includes(searchQ) || 
                    bill._id.toLowerCase().includes(searchQ) || 
                    (bill.customerName && bill.customerName.toLowerCase().includes(searchQ));
    
    let isStatusMatch = true;
    if (currentStatusFilter === 'unpaid') isStatusMatch = bill.paymentStatus !== 'PAID';
    if (currentStatusFilter === 'paid') isStatusMatch = bill.paymentStatus === 'PAID';
    
    return isMatch && isStatusMatch;
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">No bills found.</div>`;
    return;
  }
  
  filtered.forEach(bill => {
    const tableNo = bill.tableId ? bill.tableId.tableNumber : 'N/A';
    const shortId = bill._id.substring(bill._id.length - 6).toUpperCase();
    const time = new Date(bill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Calculate totals (Assuming DB totalAmount is Subtotal)
    const subtotal = bill.totalAmount || 0;
    const gst = subtotal * 0.05;
    const grandTotal = subtotal + gst;
    
    const isPaid = bill.paymentStatus === 'PAID';
    const badgeClass = isPaid ? 'bg-monochrome-900 text-white' : 'border border-red-500 text-red-600 bg-red-50';
    const badgeText = isPaid ? `PAID - ${bill.paymentMethod || 'UPI'}` : 'UNPAID';
    
    const itemsCount = bill.items.length;
    const itemsPreview = bill.items.slice(0,2).map(i => `${i.quantity}x ${i.name}`).join(', ') + (itemsCount > 2 ? '...' : '');

    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => openDrawer(bill._id);
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <span class="font-bold text-lg bg-gray-100 px-2 py-1 rounded">T-${tableNo}</span>
        <div class="text-right">
          <div class="text-xs text-gray-500 font-mono">#INV-${shortId}</div>
          <div class="text-xs text-gray-400">${time}</div>
        </div>
      </div>
      <div class="mb-4 flex-1">
        <div class="text-sm font-medium text-monochrome-900"><i data-lucide="user" class="inline h-3 w-3 mr-1 text-gray-400"></i> ${bill.customerName || 'Walk-in Guest'}</div>
        <p class="text-xs text-gray-500 mt-2">${itemsCount} Items: ${itemsPreview}</p>
      </div>
      <div class="flex justify-between items-end border-t border-gray-100 pt-3 mt-auto">
        <div>
          <div class="text-xs text-gray-500 mb-1">Grand Total</div>
          <div class="font-bold text-xl text-monochrome-900">₹${grandTotal.toFixed(2)}</div>
        </div>
        <span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${badgeText}</span>
      </div>
    `;
    grid.appendChild(card);
  });
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openDrawer = (id) => {
  currentBill = allBills.find(b => b._id === id);
  if (!currentBill) return;
  
  const shortId = currentBill._id.substring(currentBill._id.length - 6).toUpperCase();
  const tableNo = currentBill.tableId ? currentBill.tableId.tableNumber : 'N/A';
  const dateObj = new Date(currentBill.createdAt);
  
  // Drawer Info
  document.getElementById('drawer-table').innerText = `Table ${tableNo}`;
  document.getElementById('drawer-id').innerText = `#INV-${shortId}`;
  document.getElementById('drawer-customer').innerText = currentBill.customerName || 'Walk-in Guest';
  document.getElementById('drawer-time').innerText = dateObj.toLocaleString();
  
  const isPaid = currentBill.paymentStatus === 'PAID';
  document.getElementById('drawer-badge-container').innerHTML = isPaid 
    ? `<span class="px-2 py-1 rounded text-xs font-bold bg-monochrome-900 text-white uppercase tracking-wider">PAID - ${currentBill.paymentMethod || 'UPI'}</span>`
    : `<span class="px-2 py-1 rounded text-xs font-bold border border-red-500 text-red-600 bg-red-50 uppercase tracking-wider">UNPAID</span>`;
  
  // Items
  const itemsContainer = document.getElementById('drawer-items');
  itemsContainer.innerHTML = '';
  
  currentBill.items.forEach(item => {
    const lineTotal = item.quantity * item.price;
    itemsContainer.innerHTML += `
      <tr>
        <td class="py-2 px-3">
          <div class="font-medium text-monochrome-900">${item.name}</div>
        </td>
        <td class="py-2 px-3 text-center">${item.quantity}</td>
        <td class="py-2 px-3 text-right">₹${item.price.toFixed(2)}</td>
        <td class="py-2 px-3 text-right font-medium text-monochrome-900">₹${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  });
  
  // Financials
  const subtotal = currentBill.totalAmount || 0;
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;
  
  document.getElementById('drawer-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
  document.getElementById('drawer-gst').innerText = `₹${gst.toFixed(2)}`;
  document.getElementById('drawer-total').innerText = `₹${grandTotal.toFixed(2)}`;
  
  // Payment Section
  const paymentSection = document.getElementById('drawer-payment-section');
  if (isPaid) {
    paymentSection.classList.add('hidden');
  } else {
    paymentSection.classList.remove('hidden');
    // Reset payment selection UI
    selectPaymentMethod('UPI');
  }
  
  // Populate Hidden Print Template
  populatePrintTemplate(currentBill, shortId, tableNo, dateObj, subtotal, gst, grandTotal, isPaid);

  // Show Drawer
  document.getElementById('drawer-backdrop').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('bill-drawer').classList.remove('translate-x-full');
  }, 10);
};

window.closeDrawer = () => {
  document.getElementById('bill-drawer').classList.add('translate-x-full');
  setTimeout(() => {
    document.getElementById('drawer-backdrop').classList.add('hidden');
    currentBill = null;
  }, 300);
};

// Payment Method Selection
document.querySelectorAll('.pay-method-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const method = e.currentTarget.getAttribute('data-method');
    selectPaymentMethod(method);
  });
});

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  document.getElementById('selected-payment-method').value = method;
  
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.classList.remove('border-monochrome-900', 'bg-gray-50');
    btn.classList.add('border-gray-200');
    if (btn.getAttribute('data-method') === method) {
      btn.classList.add('border-monochrome-900', 'bg-gray-50');
      btn.classList.remove('border-gray-200');
    }
  });
}

window.settleBill = async () => {
  if (!currentBill) return;
  const btn = document.getElementById('settle-btn');
  btn.innerHTML = `<i class="lucide-loader animate-spin h-5 w-5 mr-2"></i> Processing...`;
  btn.disabled = true;
  
  try {
    const res = await fetch(`${API_BASE}/orders/${currentBill._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paymentStatus: 'PAID', 
        paymentMethod: selectedPaymentMethod 
      })
    });
    
    if (res.ok) {
      // Update local state instantly
      currentBill.paymentStatus = 'PAID';
      currentBill.paymentMethod = selectedPaymentMethod;
      updateUnpaidCount();
      filterBills();
      
      // Re-open drawer to show Paid state
      openDrawer(currentBill._id);
    } else {
      alert('Failed to settle bill.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    btn.innerHTML = `<i data-lucide="check-circle" class="h-5 w-5 mr-2"></i> Mark as Paid & Settle`;
    btn.disabled = false;
    lucide.createIcons();
  }
};

// --- PRINT & PDF LOGIC ---

function populatePrintTemplate(bill, shortId, tableNo, dateObj, subtotal, gst, grandTotal, isPaid) {
  document.getElementById('print-bill-no').innerText = `INV-${shortId}`;
  document.getElementById('print-date').innerText = dateObj.toLocaleDateString();
  document.getElementById('print-table').innerText = `Table: ${tableNo}`;
  document.getElementById('print-time').innerText = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  const printItems = document.getElementById('print-items');
  printItems.innerHTML = '';
  bill.items.forEach(item => {
    printItems.innerHTML += `
      <tr>
        <td style="padding: 3px 0;">${item.name}</td>
        <td style="text-align: center; padding: 3px 0;">${item.quantity}</td>
        <td style="text-align: right; padding: 3px 0;">${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `;
  });
  
  document.getElementById('print-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
  document.getElementById('print-cgst').innerText = `₹${(gst/2).toFixed(2)}`;
  document.getElementById('print-sgst').innerText = `₹${(gst/2).toFixed(2)}`;
  document.getElementById('print-total').innerText = `₹${grandTotal.toFixed(2)}`;
  
  document.getElementById('print-status').innerText = isPaid ? `PAID (${bill.paymentMethod || 'UPI'})` : 'UNPAID';
}

window.printInvoiceThermal = () => {
  // Uses browser print dialogue with @media print CSS hiding everything except #print-invoice
  window.print();
};

window.printInvoicePDF = () => {
  // Uses html2pdf.js to directly download the hidden template as A4/Receipt PDF
  const element = document.getElementById('print-invoice');
  
  // Briefly unhide for html2pdf to capture it, then hide it again. 
  // (html2pdf works better if element is in DOM, though CSS visibility trick handles this cleanly usually. 
  // We'll just clone it and make a visible off-screen container).
  const clone = element.cloneNode(true);
  clone.style.display = 'block';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.width = '300px';
  document.body.appendChild(clone);
  
  const shortId = currentBill._id.substring(currentBill._id.length - 6).toUpperCase();
  const opt = {
    margin:       0.2,
    filename:     `Invoice-${shortId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: [3.15, 6], orientation: 'portrait' } // Receipt size
  };
  
  html2pdf().set(opt).from(clone).save().then(() => {
    document.body.removeChild(clone);
  });
};

// Initial Fetch
document.addEventListener('DOMContentLoaded', fetchBills);
