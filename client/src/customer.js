// customer.js
// Logic for the mobile QR ordering web app

const API_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000'); // Connect to Socket.io

let menuItems = [];
let categories = [];
let cart = {}; // itemId -> { item, quantity }
let currentTable = 'Walk-in';
let activeOrder = null;

// Modal State
let modalItemId = null;
let modalSelectedSize = null;
let modalSelectedToppings = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initURLParams();
  setGreeting();
  fetchMenu();
  
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
    document.getElementById('header-table').innerText = `Table ${table}`;
  }
}

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  document.getElementById('header-greeting').innerText = greeting;
}

async function fetchMenu() {
  try {
    const res = await fetch(`${API_BASE}/menu`);
    if (res.ok) {
      const data = await res.json();
      
      if (data.length === 0) {
        injectDummyMenu();
      } else {
        menuItems = data;
        processMenuData();
      }
    }
  } catch (err) {
    console.error('Failed to fetch menu, using dummy data:', err);
    injectDummyMenu();
  }
}

function injectDummyMenu() {
  const commonSizes = [
    { name: 'Regular', priceDiff: 0 },
    { name: 'Medium', priceDiff: 20 },
    { name: 'Large', priceDiff: 40 }
  ];
  const commonToppings = [
    { name: 'Extra Cheese', price: 20 },
    { name: 'Veggies', price: 15 },
    { name: 'Peri-Peri Sprinkle', price: 10 }
  ];

  menuItems = [
    { _id: 'm1', name: 'Classic Maggi', category: 'Maggi', price: 60, isAvailable: true, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', sizes: commonSizes, toppings: commonToppings },
    { _id: 'm2', name: 'Corn And Cheese Maggi', category: 'Maggi', price: 60, isAvailable: true, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', sizes: commonSizes, toppings: commonToppings },
    { _id: 'm3', name: 'Double Masala Maggi', category: 'Maggi', price: 60, isAvailable: true, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', sizes: commonSizes, toppings: commonToppings },
    { _id: 'm4', name: 'Garden Blaze Maggi', category: 'Maggi', price: 60, isAvailable: false, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', sizes: commonSizes, toppings: commonToppings },
    { _id: 'm5', name: 'Garden Blaze Maggi', category: 'Maggi', price: 60, isAvailable: true, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', sizes: commonSizes, toppings: commonToppings },
    { _id: 'm6', name: 'Signature Maggi', category: 'Maggi', price: 60, isAvailable: true, foodType: 'veg', description: 'Classic Maggi is a simple, comforting dish of yellow instant noodles tossed in a signature savory spice blend.', special: true, sizes: commonSizes, toppings: commonToppings },
    { _id: 'w1', name: 'BBQ Chicken Wings', category: 'Chi. Wings', price: 220, isAvailable: true, foodType: 'non-veg', description: 'Smoky, sweet & spicy chicken wings.', sizes: commonSizes, toppings: commonToppings }
  ];
  cart = { 'm5': { item: menuItems[4], quantity: 1 } }; // Preset stepper for visual matching
  processMenuData();
}

function processMenuData() {
  // Extract unique categories
  const catSet = new Set();
  menuItems.forEach(item => {
    if (item.category) catSet.add(item.category);
  });
  categories = Array.from(catSet);
  
  renderCategoryBar();
  renderMenu();
}

function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  bar.innerHTML = '';
  
  // "All" button
  const allBtn = document.createElement('button');
  allBtn.className = `category-pill active`;
  allBtn.innerText = 'All Items';
  allBtn.onclick = (e) => filterCategory('All Items', e.target);
  bar.appendChild(allBtn);
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-pill`;
    btn.innerText = cat;
    btn.onclick = (e) => filterCategory(cat, e.target);
    bar.appendChild(btn);
  });
}

function filterCategory(category, btnElement) {
  // Update active pill
  document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  
  // Scroll to section if we have specific categories, else re-render
  renderMenu(category === 'All Items' ? null : category);
}

function renderMenu(filterCat = null) {
  const container = document.getElementById('menu-container');
  container.innerHTML = '';
  
  let catsToRender = filterCat ? [filterCat] : categories;
  
  catsToRender.forEach(cat => {
    const itemsInCat = menuItems.filter(i => i.category === cat);
    if (itemsInCat.length === 0) return;
    
    // Category Header & White Container Start
    let catHTML = `
      <div class="bg-white rounded-[20px] pt-6 pb-3 px-3 mb-6 shadow-sm border border-gray-100">
        <h2 class="text-[20px] font-bold tracking-widest uppercase text-brand-black text-center mb-3">${cat}</h2>
        <hr class="border-gray-200 mb-4 mx-2">
    `;
    
    // Render Items
    itemsInCat.forEach(item => {
      const isVeg = item.foodType === 'veg';
      const iconHTML = isVeg ? `<div class="icon-veg"></div>` : `<div class="icon-nonveg"></div>`;
      
      const isSpecial = item.special || item.name.includes('Special');
      const badgeHTML = isSpecial ? `<div class="bg-brand-black text-white text-[15px] leading-none font-bold text-center py-1.5 tracking-[0.2em] uppercase flex items-center justify-center rounded-md mb-3">✦ THE GLITCH SPECIAL ✦</div>` : '';
      
      let actionHTML = '';
      if (!item.isAvailable) {
        actionHTML = `<button class="bg-[#A3A3A3] text-white px-4 py-1.5 rounded-lg text-sm font-semibold cursor-not-allowed min-w-[76px]">+ Add</button>`;
      } else {
        const qty = cart[item._id] ? cart[item._id].quantity : 0;
        if (qty > 0) {
          actionHTML = `
            <div class="flex items-center bg-brand-black text-white rounded-lg h-[32px] overflow-hidden shadow-sm min-w-[76px]">
              <button class="flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="event.stopPropagation(); updateCart('${item._id}', -1)">-</button>
              <span class="w-6 text-center text-sm font-bold leading-none">${qty}</span>
              <button type="button" class="add-btn flex-1 h-full flex items-center justify-center hover:bg-gray-800 transition text-lg leading-none" onclick="event.stopPropagation(); window.openCustomizationModal('${item._id}')">+</button>
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
                <h3 class="font-bold text-brand-black leading-tight text-[15px]">${item.name}</h3>
                <div class="ml-2 mt-[2px] shrink-0">${iconHTML}</div>
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
    
    catHTML += `</div>`;
    container.innerHTML += catHTML;
  });
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
  
  renderMenu(document.querySelector('.category-pill.active').innerText === 'All Items' ? null : document.querySelector('.category-pill.active').innerText);
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
  if (item.special || item.name.includes('Special')) {
    specialTag.classList.remove('hidden');
  } else {
    specialTag.classList.add('hidden');
  }

  const sizeContainer = document.getElementById('modal-sizes');
  if (item.sizes && item.sizes.length > 0) {
    sizeContainer.innerHTML = item.sizes.map((size, index) => {
      const isSelected = index === modalSelectedSize;
      const sizePrice = item.price + size.priceDiff;
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
    sizeContainer.innerHTML = '';
  }

  const toppingContainer = document.getElementById('modal-toppings');
  if (item.toppings && item.toppings.length > 0) {
    toppingContainer.innerHTML = item.toppings.map((top, index) => {
      const isChecked = modalSelectedToppings.includes(index);
      return `
        <label class="flex items-center justify-between cursor-pointer">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="w-4 h-4 rounded border-neutral-400 text-black focus:ring-0 accent-black" ${isChecked ? 'checked' : ''} onchange="toggleTopping(${index})">
            <span class="text-xs font-medium text-neutral-800">${top.name}</span>
          </div>
          <span class="text-xs font-semibold text-neutral-900">₹${top.price}</span>
        </label>
      `;
    }).join('');
  } else {
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
      const sizePrice = item.price + size.priceDiff;
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
  
  let total = item.price;
  
  if (modalSelectedSize !== null && item.sizes && item.sizes[modalSelectedSize]) {
    total += item.sizes[modalSelectedSize].priceDiff;
  }
  
  if (item.toppings) {
    modalSelectedToppings.forEach(idx => {
      total += item.toppings[idx].price;
    });
  }
  
  document.getElementById('modal-add-to-order-btn').innerText = `Add to Order • ₹${total}`;
};

window.addToOrder = () => {
  console.log("Item added to order");
  // Add to cart visually
  updateCart(modalItemId, 1);
  closeCustomizationModal();
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
});
