// customer.js
// Logic for the mobile QR ordering web app

const API_BASE = 'http://localhost:5000/api';
const socket = io('http://localhost:5000'); // Connect to Socket.io

let menuItems = [];
let categories = [];
let cart = []; // [{ id, name, size, toppings: [], quantity, price, subtotal }]
let modalItemId = null;
let modalSelectedSize = null;
let modalSelectedToppings = [];
let modalQuantity = 1;
let currentTable = 'Walk-in';
let activeOrder = null;
let isManualScrolling = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  const savedCart = localStorage.getItem('glitch_cart');
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
      updateFloatingCartBar();
    } catch (e) {
      cart = [];
    }
  }

  initURLParams();
  setGreeting();
  initCustomerAuth();
  fetchMenu();
  checkActiveOrderPill();
  
  // Event Delegation for dynamically rendered Add buttons
  const menuContainer = document.getElementById('menu-container');
  if (menuContainer) {
    menuContainer.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-btn');
      if (addBtn) {
        const itemId = addBtn.dataset.id;
        openCustomizationModal(itemId);
      }
    });
  }
});

function initURLParams() {
  const params = new URLSearchParams(window.location.search);
  const table = params.get('table');
  if (table) {
    currentTable = table;
  }
}

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  
  const greetingEl = document.getElementById('header-greeting');
  if (greetingEl) greetingEl.innerText = greeting;
}

function checkActiveOrderPill() {
  const trackerPill = document.getElementById('active-order-tracker');
  const statusText = document.getElementById('tracker-status-text');
  if (!trackerPill || !statusText) return;
  
  const activeOrderStr = localStorage.getItem('glitch_active_order');
  if (activeOrderStr) {
    try {
      const activeOrder = JSON.parse(activeOrderStr);
      const status = activeOrder.status?.toUpperCase() || 'PENDING';
      
      if (['PENDING', 'PREPARING', 'READY_TO_SERVE'].includes(status)) {
        let displayStatus = 'Preparing';
        if (status === 'PENDING') displayStatus = 'Awaiting Kitchen';
        if (status === 'READY_TO_SERVE') displayStatus = 'Ready to Serve!';
        
        statusText.innerText = `Active Order: ${displayStatus}`;
        trackerPill.classList.remove('hidden');
      } else {
        trackerPill.classList.add('hidden');
      }
    } catch (e) {
      trackerPill.classList.add('hidden');
    }
  } else {
    trackerPill.classList.add('hidden');
  }
}

async function fetchMenu() {
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${API_BASE}/categories`),
      fetch(`${API_BASE}/products`)
    ]);
    if (catRes.ok && prodRes.ok) {
      const catsData = await catRes.json();
      const prodsData = await prodRes.json();
      
      // Sort categories and products by displayOrder (defaulting to 999)
      categories = catsData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      menuItems = prodsData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      
      renderCategoryBar();
      renderMenu();
    } else {
      console.error('Failed to fetch live menu: Non-OK response');
      document.getElementById('menu-container').innerHTML = '<div class="text-center py-12 text-gray-500">Failed to load menu. Please try again.</div>';
    }
  } catch (err) {
    console.error('Failed to fetch live menu:', err);
    document.getElementById('menu-container').innerHTML = '<div class="text-center py-12 text-gray-500">Failed to load menu. Please try again.</div>';
  }
}

function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;
  bar.innerHTML = '';
  
  const allBtn = document.createElement('button');
  allBtn.className = `category-pill active`;
  allBtn.innerText = 'All Items';
  allBtn.dataset.target = 'top';
  allBtn.onclick = (e) => scrollToCategory('top', e.target);
  bar.appendChild(allBtn);
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-pill`;
    btn.innerText = cat.name;
    const catSlug = cat.slug || cat.name.replace(/\s+/g, '-');
    btn.dataset.target = `cat-section-${catSlug}`;
    btn.onclick = (e) => scrollToCategory(btn.dataset.target, e.target);
    bar.appendChild(btn);
  });
}

function scrollToCategory(targetId, btn) {
  isManualScrolling = true;
  
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  
  if (targetId === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Offset by the sticky bar height (approx 70px) + some buffer
      const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  }
  
  setTimeout(() => {
    isManualScrolling = false;
  }, 800); // Allow smooth scroll to complete
}

function setupScrollspy() {
  const options = {
    root: null, // use window viewport
    rootMargin: '-80px 0px -70% 0px',
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    if (isManualScrolling) return;
    
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const btn = document.querySelector(`.category-pill[data-target="${id}"]`);
        if (btn) {
          document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    });
  }, options);
  
  document.querySelectorAll('.cat-section-block').forEach(section => {
    observer.observe(section);
  });
  
  // Track "All Items" top scroll
  window.addEventListener('scroll', () => {
    if (isManualScrolling) return;
    if (window.scrollY < 50) {
      const btn = document.querySelector('.category-pill[data-target="top"]');
      if (btn && !btn.classList.contains('active')) {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  });
}

function renderMenu() {
  const container = document.getElementById('menu-container');
  container.innerHTML = '';
  
  let catsToRender = categories;
  
  catsToRender.forEach(cat => {
    const itemsInCat = menuItems.filter(p => 
      p.categoryId === cat._id || 
      (p.categoryId && p.categoryId._id === cat._id) ||
      p.categorySlug === cat.slug
    );
    
    // Category Header & White Container Start
    let catHTML = `
      <div id="cat-section-${cat.slug || cat.name.replace(/\s+/g, '-')}" class="cat-section-block bg-white rounded-[20px] pt-6 pb-3 px-3 mb-6 shadow-sm border border-gray-100 scroll-mt-24">
        <h2 class="text-[20px] font-bold tracking-widest uppercase text-brand-black text-center mb-3">${cat.name}</h2>
        <hr class="border-gray-200 mb-4 mx-2">
    `;
    
    if (itemsInCat.length === 0) {
      catHTML += `<div class="text-xs text-gray-400 py-3 italic text-center">No items available in this category yet.</div>`;
    } else {
      // Render Items
    itemsInCat.forEach(item => {
      const iconHTML = item.isVeg 
        ? `<span class="inline-flex items-center justify-center w-4 h-4 border border-green-600 rounded-sm p-[2px]"><span class="w-2 h-2 bg-green-600 rounded-full"></span></span>` 
        : `<span class="inline-flex items-center justify-center w-4 h-4 border border-red-700 rounded-sm p-[2px]"><span class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-red-700"></span></span>`;
      
      const badgeHTML = item.isSpecial 
        ? `<div class="bg-black text-white text-sm font-semibold px-4 py-1.5 rounded-md uppercase tracking-wider text-center w-full mb-3">✦ THE GLITCH SPECIAL ✦</div>` 
        : '';
      
      let actionHTML = '';
      if (!item.isAvailable) {
        actionHTML = `<button class="bg-[#A3A3A3] text-white px-4 py-1.5 rounded-lg text-sm font-semibold cursor-not-allowed min-w-[76px]">86'd</button>`;
      } else {
        const qty = cart[item._id] ? cart[item._id].quantity : 0;
        const hasOptions = (item.sizes && item.sizes.length > 0) || (item.toppings && item.toppings.length > 0);
        
        if (qty > 0) {
          actionHTML = `
            <div class="flex items-center bg-brand-black text-white rounded-lg h-[32px] overflow-hidden shadow-sm min-w-[76px]">
              <button class="flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="event.stopPropagation(); updateCart('${item._id}', -1)">-</button>
              <span class="w-6 text-center text-sm font-bold leading-none">${qty}</span>
              <button type="button" class="add-btn flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="event.stopPropagation(); updateCart('${item._id}', 1)">+</button>
            </div>
          `;
        } else {
          actionHTML = `<button type="button" class="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer" onclick="event.stopPropagation(); window.openCustomizationModal('${item._id}')">+ Add</button>`;
        }
      }
      
      catHTML += `
        <div class="item-card ${!item.isAvailable ? 'opacity-60' : ''}">
          ${badgeHTML}
          <div class="">
            <div class="flex justify-between items-start">
              <div class="flex-1 pr-3 flex items-start">
                <h3 class="font-bold text-brand-black leading-tight text-[17px]">${item.name}</h3>
                <div class="ml-2 shrink-0">${iconHTML}</div>
              </div>
              <div class="shrink-0 flex items-center gap-3">
                <div class="font-bold text-sm text-brand-black">₹${item.price}</div>
                <div id="action-btn-${item._id}">
                  ${actionHTML}
                </div>
              </div>
            </div>
            ${item.description ? `<hr class="border-gray-200 mt-3 mb-2"><p class="text-[11px] text-gray-500 font-normal leading-relaxed line-clamp-2 pr-12">${item.description}</p>` : ''}
          </div>
        </div>
      `;
    });
    } // close else
    
    catHTML += `</div>`;
    container.innerHTML += catHTML;
  });
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
  setupScrollspy();
}

function updateCart(itemId, change) {
  const item = menuItems.find(i => i._id === itemId);
  if (!item || !item.isAvailable) return;
  
  if (!cart[itemId]) {
    cart[itemId] = { item, quantity: 0 };
  }
  
  cart[itemId].quantity += change;
  if (cart[itemId].quantity <= 0) {
    delete cart[itemId];
  }
  
  renderMenu();
}

function showRejectionModal(reason) {
  document.getElementById('alert-modal').classList.remove('hidden');
  document.getElementById('alert-modal').classList.add('flex');
  document.getElementById('alert-message').innerText = reason || 'Sorry, we cannot fulfill this right now.';
}

window.closeAlert = () => {
  document.getElementById('alert-modal').classList.add('hidden');
  document.getElementById('alert-modal').classList.remove('flex');
};

// --- CUSTOMIZATION MODAL LOGIC ---

window.openCustomizationModal = function(itemId) {
  console.log("⚡ FORCE OPEN MODAL for ID:", itemId);

  let item = menuItems.find(i => i._id === itemId);
  if (!item) {
    console.warn("Item not found in menuItems! Using fallback dummy item for testing.");
    item = {
      _id: itemId || 'dummy',
      name: 'Hardcoded Item Test',
      price: 60,
      sizes: [{name: 'Regular', priceDiff: 0}, {name: 'Large', priceDiff: 30}],
      toppings: [{name: 'Cheese', price: 20}]
    };
  }
  
  modalItemId = itemId;
  modalSelectedSize = item.sizes && item.sizes.length > 0 ? 0 : null;
  modalSelectedToppings = [];
  modalQuantity = 1;
  document.getElementById('modal-qty').innerText = modalQuantity;
  
  const backdrop = document.getElementById('customization-backdrop');
  const modal = document.getElementById('customization-modal');

  if (!backdrop || !modal) {
    alert("CRITICAL ERROR: Elements #customization-backdrop or #customization-modal not found in HTML!");
    return;
  }

  // Populate dynamic data
  document.getElementById('modal-item-name').innerText = item.name;
  document.getElementById('modal-item-price').innerText = `₹${item.price}`;
  
  const specialTag = document.getElementById('modal-special-tag');
  if (item.isSpecial) {
    specialTag.classList.remove('hidden');
  } else {
    specialTag.classList.add('hidden');
  }

  const sizeContainer = document.getElementById('modal-sizes');
  const sizeWrapper = document.getElementById('sizes-section-wrapper');
  const sizeDivider = document.getElementById('sizes-divider');
  if (item.sizes && item.sizes.length > 0) {
    sizeWrapper.style.display = 'block';
    if (sizeDivider) sizeDivider.style.display = 'block';
    sizeContainer.innerHTML = item.sizes.map((size, index) => {
      const isSelected = index === modalSelectedSize;
      const basePrice = Number(item.price) || 0;
      const sizeExtraPrice = Number(size.price || 0);
      const sizePrice = basePrice + sizeExtraPrice;
      if (isSelected) {
        return `
          <div class="bg-black text-white p-3 rounded-xl text-center flex flex-col justify-center items-center shadow-sm cursor-pointer" onclick="selectSize(${index})">
            <span class="font-bold text-sm leading-tight">${size.name}</span>
            <span class="font-bold text-sm mt-0.5">₹${sizePrice}</span>
          </div>
        `;
      } else {
        return `
          <div class="bg-white border border-neutral-400 text-neutral-900 p-3 rounded-xl text-center flex flex-col justify-center items-center hover:border-black cursor-pointer" onclick="selectSize(${index})">
            <span class="font-bold text-sm leading-tight">${size.name}</span>
            <span class="font-bold text-sm mt-0.5">₹${sizePrice}</span>
          </div>
        `;
      }
    }).join('');
  } else {
    sizeWrapper.style.display = 'none';
    if (sizeDivider) sizeDivider.style.display = 'none';
    sizeContainer.innerHTML = '';
  }

  const toppingContainer = document.getElementById('modal-toppings');
  const toppingWrapper = document.getElementById('toppings-section-wrapper');
  if (item.toppings && item.toppings.length > 0) {
    toppingWrapper.style.display = 'block';
    toppingContainer.innerHTML = item.toppings.map((top, index) => {
      const isChecked = modalSelectedToppings.includes(index);
      return `
        <label class="flex items-center justify-between cursor-pointer">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="w-4 h-4 rounded border-neutral-400 text-black focus:ring-0 accent-black" ${isChecked ? 'checked' : ''} onchange="toggleTopping(${index})">
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
  
  lucide.createIcons();
  updateModalPrice();

  // 1. Make backdrop visible
  backdrop.style.display = 'block';
  setTimeout(() => {
    backdrop.style.opacity = '1';
  }, 10);

  // 2. Force modal slide up via direct inline transform
  modal.style.transform = 'translateY(0%)';
  console.log("⚡ MODAL TRANSFORM APPLIED: translateY(0%)");
};

window.closeCustomizationModal = function() {
  console.log("⚡ CLOSING MODAL");
  const backdrop = document.getElementById('customization-backdrop');
  const modal = document.getElementById('customization-modal');

  if (backdrop && modal) {
    modal.style.transform = 'translateY(100%)';
    backdrop.style.opacity = '0';
    setTimeout(() => {
      backdrop.style.display = 'none';
    }, 300);
  }
};

window.selectSize = (index) => {
  modalSelectedSize = index;
  // Re-render size UI
  const item = menuItems.find(i => i._id === modalItemId);
  const sizeContainer = document.getElementById('modal-sizes');
  if (item && item.sizes) {
    sizeContainer.innerHTML = item.sizes.map((size, idx) => {
      const isSelected = idx === modalSelectedSize;
      const basePrice = Number(item.price) || 0;
      const sizeExtraPrice = Number(size.price || 0);
      const sizePrice = basePrice + sizeExtraPrice;
      if (isSelected) {
        return `
          <div class="bg-black text-white p-3 rounded-xl text-center flex flex-col justify-center items-center shadow-sm cursor-pointer" onclick="selectSize(${idx})">
            <span class="font-bold text-sm leading-tight">${size.name}</span>
            <span class="font-bold text-sm mt-0.5">₹${sizePrice}</span>
          </div>
        `;
      } else {
        return `
          <div class="bg-white border border-neutral-400 text-neutral-900 p-3 rounded-xl text-center flex flex-col justify-center items-center hover:border-black cursor-pointer" onclick="selectSize(${idx})">
            <span class="font-bold text-sm leading-tight">${size.name}</span>
            <span class="font-bold text-sm mt-0.5">₹${sizePrice}</span>
          </div>
        `;
      }
    }).join('');
  }
  updateModalPrice();
};

window.toggleTopping = (index) => {
  const topIdx = modalSelectedToppings.indexOf(index);
  if (topIdx > -1) {
    modalSelectedToppings.splice(topIdx, 1);
  } else {
    modalSelectedToppings.push(index);
  }
  updateModalPrice();
};

window.updateModalPrice = () => {
  const item = menuItems.find(i => i._id === modalItemId);
  if (!item) return;
  
  const basePrice = Number(item.price) || 0;
  let total = basePrice;
  
  if (modalSelectedSize !== null && item.sizes && item.sizes[modalSelectedSize]) {
    total += Number(item.sizes[modalSelectedSize].price || 0);
  }
  
  if (item.toppings) {
    modalSelectedToppings.forEach(idx => {
      total += Number(item.toppings[idx].price || 0);
    });
  }
  
  const finalPrice = total * modalQuantity;
  document.getElementById('modal-add-to-order-btn').innerText = `Add to Order • ₹${finalPrice}`;
};

window.updateModalQty = (change) => {
  modalQuantity += change;
  if (modalQuantity < 1) modalQuantity = 1;
  document.getElementById('modal-qty').innerText = modalQuantity;
  updateModalPrice();
};

window.addToOrder = () => {
  const item = menuItems.find(i => i._id === modalItemId);
  if (!item) return;

  const basePrice = Number(item.price) || 0;
  let unitPrice = basePrice;
  let sizeName = null;
  let selectedToppingNames = [];

  if (modalSelectedSize !== null && item.sizes && item.sizes[modalSelectedSize]) {
    unitPrice += Number(item.sizes[modalSelectedSize].price || 0);
    sizeName = item.sizes[modalSelectedSize].name;
  }

  if (item.toppings) {
    modalSelectedToppings.forEach(idx => {
      unitPrice += Number(item.toppings[idx].price || 0);
      selectedToppingNames.push(item.toppings[idx].name);
    });
  }

  const subtotal = unitPrice * modalQuantity;

  // Check if identical item already exists (same id, size, toppings)
  const existingIdx = cart.findIndex(c => 
    c.id === item._id && 
    c.size === sizeName && 
    JSON.stringify(c.toppings) === JSON.stringify(selectedToppingNames)
  );

  if (existingIdx > -1) {
    cart[existingIdx].quantity += modalQuantity;
    cart[existingIdx].subtotal = cart[existingIdx].quantity * cart[existingIdx].price;
    // Force inject the property onto stale items in case they were added before the fix
    cart[existingIdx].isGlitchSpecial = Boolean(item.isSpecial || item.isGlitchSpecial || item.special);
    cart[existingIdx].isSpecial = Boolean(item.isSpecial || item.isGlitchSpecial || item.special);
  } else {
    cart.push({
      id: item._id,
      name: item.name,
      isGlitchSpecial: Boolean(item.isSpecial || item.isGlitchSpecial || item.special),
      isSpecial: Boolean(item.isSpecial || item.isGlitchSpecial || item.special),
      size: sizeName,
      toppings: selectedToppingNames,
      quantity: modalQuantity,
      price: unitPrice,
      subtotal: subtotal
    });
  }

  console.log("Item added to order", cart);
  localStorage.setItem('glitch_cart', JSON.stringify(cart));
  closeCustomizationModal();
  updateFloatingCartBar();
};

window.updateFloatingCartBar = () => {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartBar = document.getElementById('floating-cart-bar');
  const countBadge = document.getElementById('floating-cart-count');
  
  if (totalCount > 0) {
    countBadge.innerText = `(${totalCount} item${totalCount > 1 ? 's' : ''})`;
    cartBar.classList.remove('translate-y-full', 'opacity-0');
    cartBar.classList.add('translate-y-0', 'opacity-100');
  } else {
    cartBar.classList.remove('translate-y-0', 'opacity-100');
    cartBar.classList.add('translate-y-full', 'opacity-0');
  }
};

window.openCartDrawer = () => {
  const backdrop = document.getElementById('cart-drawer-backdrop');
  const drawer = document.getElementById('cart-drawer');
  
  if (backdrop && drawer) {
    backdrop.classList.remove('hidden');
    drawer.classList.remove('hidden');
    
    // Allow display to update before animating
    setTimeout(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      drawer.classList.remove('translate-y-full');
      drawer.classList.add('translate-y-0');
    }, 10);
    
    renderCartItems();
  }
};

window.closeCartDrawer = () => {
  const backdrop = document.getElementById('cart-drawer-backdrop');
  const drawer = document.getElementById('cart-drawer');
  
  if (backdrop && drawer) {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    drawer.classList.remove('translate-y-0');
    drawer.classList.add('translate-y-full');
    
    setTimeout(() => {
      backdrop.classList.add('hidden');
      drawer.classList.add('hidden');
    }, 300);
  }
};

window.renderCartItems = () => {
  const container = document.getElementById('cart-items-container');
  const subtotalDisplay = document.getElementById('cart-subtotal-display');
  
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 py-8">Your cart is empty</div>';
    if (subtotalDisplay) subtotalDisplay.innerText = '₹0';
    return;
  }
  
  let html = '';
  let subtotal = 0;
  
  cart.forEach((item, index) => {
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
          <div class="font-bold text-sm mt-1">₹${item.price} x ${item.quantity}</div>
        </div>
        <div class="font-bold text-gray-900 shrink-0">₹${item.subtotal}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (subtotalDisplay) subtotalDisplay.innerText = `₹${subtotal}`;
};

// Ensure direct event listeners are attached just in case
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('customization-backdrop');
  const handle = document.getElementById('modal-drag-handle');
  const addBtn = document.getElementById('modal-add-to-order-btn');
  
  if (backdrop) backdrop.onclick = window.closeCustomizationModal;
  if (handle) handle.onclick = window.closeCustomizationModal;
  if (addBtn) addBtn.onclick = () => {
    window.addToOrder();
  };
  
  const viewOrderBtn = document.getElementById('btn-view-order');
  if (viewOrderBtn) {
    viewOrderBtn.onclick = () => {
      window.location.href = 'order.html' + window.location.search;
    };
  }
  
  const closeCartBtn = document.getElementById('close-cart-drawer');
  if (closeCartBtn) closeCartBtn.onclick = window.closeCartDrawer;
  
  const cartBackdrop = document.getElementById('cart-drawer-backdrop');
  if (cartBackdrop) cartBackdrop.onclick = window.closeCartDrawer;
  
  // Fetch live database menu
  fetchMenu();
});

// Customer Auth Logic
let authTimer = null;
let currentAuthEmail = '';

function initCustomerAuth() {
  const customerStr = localStorage.getItem('glitch_customer');
  let customer = null;
  if (customerStr) {
    try {
      customer = JSON.parse(customerStr);
    } catch (e) {}
  }

  const nameEl = document.getElementById('header-name');
  if (customer && customer.isVerified) {
    if (nameEl) nameEl.innerText = customer.name;
    return; // Already verified, don't show modal
  }

  // Not verified, show Guest
  if (nameEl) nameEl.innerText = 'Guest';

  // Check if dismissed
  if (sessionStorage.getItem('glitch_auth_dismissed') === 'true') {
    return;
  }

  // Start 30s timer
  authTimer = setTimeout(() => {
    showAuthModal();
  }, 30000);

  // Bind Events
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
}

function showAuthModal() {
  const backdrop = document.getElementById('customer-auth-backdrop');
  const modal = document.getElementById('customer-auth-modal');
  if (!backdrop || !modal) return;
  
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
  
  // Trigger animation after layout
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
  
  sessionStorage.setItem('glitch_auth_dismissed', 'true');
  
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
    const res = await fetch(`${API_BASE}/customer/request-otp`, {
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
    const res = await fetch(`${API_BASE}/customer/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: currentAuthEmail, otp })
    });
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('glitch_customer', JSON.stringify({
        name: data.customer.name,
        email: data.customer.email,
        isVerified: true
      }));
      
      const nameEl = document.getElementById('header-name');
      if (nameEl) nameEl.innerText = data.customer.name;
      
      dismissAuthModal();
      
      // Optional: show a small toast "Welcome, [Name]!"
      setTimeout(() => alert(`Welcome, ${data.customer.name}!`), 350);
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
