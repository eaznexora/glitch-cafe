let cart = [];
let tableNumber = 'Walk-in';
let masterProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  initURLParams();
  setOrderGreeting();
  loadCart();
  await fetchProducts();
  renderCart();
  initAutoResizeNote();
});

function setOrderGreeting() {
  const customerStr = localStorage.getItem('glitch_customer');
  const nameEl = document.getElementById('header-name');
  if (nameEl) {
    if (customerStr) {
      try {
        const customer = JSON.parse(customerStr);
        if (customer.isVerified) {
          nameEl.innerText = customer.name;
          return;
        }
      } catch (e) {}
    }
    nameEl.innerText = 'Guest';
  }
}

function initAutoResizeNote() {
  const noteInput = document.getElementById('order-note');
  if (!noteInput) return;
  
  noteInput.addEventListener('input', function() {
    // Reset height to auto to get the true scrollHeight
    this.style.height = 'auto';
    
    // Calculate max height (approx 5 lines based on 20px line-height + padding)
    const maxHeight = 100; 
    
    if (this.scrollHeight <= maxHeight) {
      this.style.height = this.scrollHeight + 'px';
      this.style.overflowY = 'hidden';
    } else {
      this.style.height = maxHeight + 'px';
      this.style.overflowY = 'auto';
    }
  });
}

async function fetchProducts() {
  try {
    const res = await fetch('http://localhost:5000/api/products');
    if (res.ok) {
      masterProducts = await res.json();
    }
  } catch (err) {
    console.error("Failed to load master products", err);
  }
}

function initURLParams() {
  const params = new URLSearchParams(window.location.search);
  const table = params.get('table');
  if (table) {
    tableNumber = table;
  }
}

function loadCart() {
  const saved = localStorage.getItem('glitch_cart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
    } catch (e) {
      cart = [];
    }
  } else {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem('glitch_cart', JSON.stringify(cart));
}

function updateQuantity(index, change) {
  if (cart[index]) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
      // Remove item
      cart.splice(index, 1);
    } else {
      cart[index].subtotal = cart[index].quantity * cart[index].price;
    }
    
    saveCart();
    renderCart();
  }
}

function renderCart() {
  const cartList = document.getElementById('cart-list');
  const subtotalLabel = document.getElementById('subtotal-label');
  const subtotalAmt = document.getElementById('subtotal-amt');
  const extrasAmt = document.getElementById('extras-amt');
  const totalAmt = document.getElementById('total-amt');

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="p-8 text-center text-gray-500">
        <p class="mb-4 text-sm font-medium">Your order is empty.</p>
        <button onclick="window.location.href='customer.html'+window.location.search" class="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm">Browse Menu</button>
      </div>
    `;
    subtotalLabel.innerText = `Subtotal (0 items):`;
    subtotalAmt.innerText = '₹0';
    extrasAmt.innerText = '₹0';
    totalAmt.innerText = '₹0';
    document.getElementById('btn-place-order').disabled = true;
    document.getElementById('btn-place-order').classList.add('opacity-50', 'cursor-not-allowed');
    return;
  }

  document.getElementById('btn-place-order').disabled = false;
  document.getElementById('btn-place-order').classList.remove('opacity-50', 'cursor-not-allowed');

  let html = '';
  let totalItems = 0;
  let totalBase = 0;
  let totalExtras = 0;

  cart.forEach((item, index) => {
    totalItems += item.quantity;
    totalBase += item.subtotal; // In this basic version, we combine base + extras into price during add
    
    // To cleanly separate extras, we would need basePrice stored separately. 
    // Since customer.js combines them into item.price, we'll display total as Subtotal.
    // However, if we need to show Extras separately, we'd need to extract it. For now, let's assume totalBase is just item.subtotal.
    // We'll set Extras to 0 unless we have explicit extra fields. Wait, the prompt says "Extras: Cheese Dip, Chutney".
    // I'll calculate total amount.
    
    // Definitively check the master products list for the special flag
    const product = masterProducts.find(p => p._id === item.id || p.id === item.id);
    
    // Calculate extras based on product schema
    let itemExtrasTotal = 0;
    if (product && item.toppings && item.toppings.length > 0) {
      item.toppings.forEach(toppingName => {
        const toppingObj = product.toppings.find(t => t.name === toppingName);
        if (toppingObj) {
          itemExtrasTotal += Number(toppingObj.price || 0) * item.quantity;
        }
      });
    }
    totalExtras += itemExtrasTotal;
    
    const isSpecialItem = product ? Boolean(product.isSpecial || product.isGlitchSpecial) : Boolean(item.isGlitchSpecial || item.isSpecial);
    
    const specialBadgeHtml = isSpecialItem ? `
      <div class="w-full bg-black text-white text-sm font-semibold py-1.5 px-4 rounded-md mb-2 flex items-center justify-center tracking-wider uppercase">
        ✦ THE GLITCH SPECIAL ✦
      </div>
    ` : '';
    
    const isVegItem = product ? (product.isVeg !== false) : true;
    
    const iconHTML = isVegItem
      ? `<div class="w-3 h-3 border-[1px] border-green-600 flex items-center justify-center rounded-[2px] bg-white shrink-0"><div class="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>`
      : `<div class="w-3 h-3 border-[1px] border-red-700 flex items-center justify-center rounded-[2px] bg-white shrink-0"><div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-red-700"></div></div>`;
    
    let customizationHtml = '';
    const hasSize = item.size !== null && item.size !== undefined;
    const hasToppings = item.toppings && item.toppings.length > 0;
    
    if (hasSize || hasToppings) {
      customizationHtml = `
        <div class="flex justify-between items-center text-[11px] text-gray-500 mb-2 mt-1">
          ${hasSize ? `<span>Size: ${item.size}</span>` : '<span></span>'}
          ${hasToppings ? `<span>Extras: ${item.toppings.join(', ')}</span>` : '<span></span>'}
        </div>
      `;
    }
    
    html += `
      <div class="p-4">
        ${specialBadgeHtml}
        <div class="flex justify-between items-start mb-1">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-sm text-black">${item.name}</h4>
            ${iconHTML}
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-sm">₹${item.subtotal}</span>
            <div class="bg-black text-white flex items-center rounded-md px-2 py-0.5 shadow-md">
              <button class="px-1 font-medium hover:text-gray-300" onclick="updateQuantity(${index}, -1)">-</button>
              <span class="px-2 font-bold text-xs w-6 text-center">${item.quantity}</span>
              <button class="px-1 font-medium hover:text-gray-300" onclick="updateQuantity(${index}, 1)">+</button>
            </div>
          </div>
        </div>
        ${customizationHtml}
      </div>
      ${index !== cart.length - 1 ? '<hr class="border-gray-200 mx-4">' : ''}
    `;
  });

  cartList.innerHTML = html;
  
  const grandTotal = totalBase;
  const subtotalOnly = grandTotal - totalExtras;
  
  subtotalLabel.innerText = `Subtotal (${totalItems} items):`;
  subtotalAmt.innerText = `₹${subtotalOnly}`;
  extrasAmt.innerText = `₹${totalExtras}`;
  totalAmt.innerText = `₹${grandTotal}`;
}

window.pendingOrderSubmission = false;

async function submitOrder() {
  const customerStr = localStorage.getItem('glitch_customer');
  let customer = null;
  if (customerStr) {
    try {
      customer = JSON.parse(customerStr);
    } catch (e) {}
  }

  const isVerified = customer && customer.isVerified;

  if (!isVerified) {
    window.pendingOrderSubmission = true;
    showAuthModal();
    return;
  }

  // Proceed with verified customer
  submitOrderPayload(customer);
}

async function submitOrderPayload(customer) {
  const btn = document.getElementById('btn-place-order');
  const note = document.getElementById('order-note').value;
  
  if (cart.length === 0) return;
  
  btn.innerText = 'Placing Order...';
  btn.disabled = true;

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const payload = {
    tableNumber,
    customerName: customer.name,
    customerEmail: customer.email,
    items: cart,
    totalAmount,
    note
  };

  try {
    const res = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      localStorage.removeItem('glitch_cart');
      alert('Order Placed Successfully!');
      window.location.href = 'customer.html' + window.location.search;
    } else {
      const err = await res.json();
      alert(`Error placing order: ${err.error || 'Unknown error'}`);
      btn.innerText = 'Place Order';
      btn.disabled = false;
    }
  } catch (err) {
    alert('Network error, please try again later.');
    btn.innerText = 'Place Order';
    btn.disabled = false;
  }
}

// Checkout Auth Logic
let currentAuthEmail = '';

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('btn-close-auth');
  const skipBtn = document.getElementById('btn-auth-skip');
  const backdrop = document.getElementById('customer-auth-backdrop');
  
  if (closeBtn) closeBtn.addEventListener('click', dismissAuthModal);
  if (skipBtn) skipBtn.addEventListener('click', dismissAuthModal);
  if (backdrop) backdrop.addEventListener('click', dismissAuthModal);
  
  const continueBtn = document.getElementById('btn-auth-continue');
  const verifyBtn = document.getElementById('btn-auth-verify');
  const resendBtn = document.getElementById('btn-auth-resend');
  
  if (continueBtn) continueBtn.addEventListener('click', handleAuthRequestOTP);
  if (verifyBtn) verifyBtn.addEventListener('click', handleAuthVerify);
  if (resendBtn) resendBtn.addEventListener('click', handleAuthRequestOTP);
});

function showAuthModal() {
  const backdrop = document.getElementById('customer-auth-backdrop');
  const modal = document.getElementById('customer-auth-modal');
  if (!backdrop || !modal) return;
  
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
  
  setTimeout(() => {
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100', 'pointer-events-auto');
    modal.classList.remove('translate-y-full');
    modal.classList.add('translate-y-0');
  }, 10);
}

function dismissAuthModal() {
  const backdrop = document.getElementById('customer-auth-backdrop');
  const modal = document.getElementById('customer-auth-modal');
  if (!backdrop || !modal) return;
  
  backdrop.classList.remove('opacity-100', 'pointer-events-auto');
  backdrop.classList.add('opacity-0', 'pointer-events-none');
  modal.classList.remove('translate-y-0');
  modal.classList.add('translate-y-full');
  
  setTimeout(() => {
    backdrop.classList.add('hidden');
    modal.classList.add('hidden');
  }, 300);
}

async function handleAuthRequestOTP() {
  const name = document.getElementById('auth-name').value.trim();
  const email = document.getElementById('auth-email').value.trim();
  
  if (!name || !email) {
    alert('Please enter both Name and Email');
    return;
  }

  const btn = document.getElementById('btn-auth-continue');
  const originalText = btn.innerText;
  btn.innerText = 'Sending...';
  btn.disabled = true;

  try {
    const res = await fetch(`http://localhost:5000/api/customer/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    
    if (res.ok) {
      currentAuthEmail = email;
      document.getElementById('auth-step-1').classList.add('hidden');
      document.getElementById('auth-step-2').classList.remove('hidden');
      document.getElementById('auth-display-email').innerText = email;
      startResendTimer();
    } else {
      alert(data.error || 'Failed to send OTP');
    }
  } catch (err) {
    alert('Error connecting to server');
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

async function handleAuthVerify() {
  const name = document.getElementById('auth-name').value.trim();
  const otp = document.getElementById('auth-otp').value.trim();
  
  if (!otp || otp.length !== 6) {
    alert('Please enter a valid 6-digit code');
    return;
  }

  const btn = document.getElementById('btn-auth-verify');
  btn.innerText = 'Verifying...';
  btn.disabled = true;

  try {
    const res = await fetch(`http://localhost:5000/api/customer/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: currentAuthEmail, otp })
    });
    const data = await res.json();
    
    if (res.ok) {
      const customer = {
        name: data.customer.name,
        email: data.customer.email,
        isVerified: true
      };
      localStorage.setItem('glitch_customer', JSON.stringify(customer));
      
      const nameEl = document.getElementById('header-name');
      if (nameEl) nameEl.innerText = data.customer.name;
      
      dismissAuthModal();
      
      setTimeout(() => alert(`Welcome, ${data.customer.name}!`), 350);
      
      if (window.pendingOrderSubmission) {
        window.pendingOrderSubmission = false;
        submitOrderPayload(customer);
      }
    } else {
      alert(data.error || 'Invalid OTP');
    }
  } catch (err) {
    alert('Error connecting to server');
  } finally {
    btn.innerText = 'Verify & Continue';
    btn.disabled = false;
  }
}

let resendInterval = null;
function startResendTimer() {
  const timerSpan = document.getElementById('auth-resend-timer');
  const resendBtn = document.getElementById('btn-auth-resend');
  
  timerSpan.classList.remove('hidden');
  resendBtn.classList.add('hidden');
  
  let left = 60;
  timerSpan.innerText = `Resend code in ${left}s`;
  
  clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(resendInterval);
      timerSpan.classList.add('hidden');
      resendBtn.classList.remove('hidden');
    } else {
      timerSpan.innerText = `Resend code in ${left}s`;
    }
  }, 1000);
}
