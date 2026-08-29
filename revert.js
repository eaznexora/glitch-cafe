const fs = require('fs');
let code = fs.readFileSync('client/src/main.js', 'utf-8');

const regex1 = /function renderPosMenuList\(items\) \{[\s\S]*?\}\n\nwindow\.filterPosMenu/m;
const replacement1 = `function renderPosMenuList(items) {
  const container = document.getElementById('posMenuContainer');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = \\\`<div class="col-span-2 text-center py-12 text-sm text-gray-400">No items available in menu.</div>\\\`;
    return;
  }

  container.innerHTML = items.map(item => {
    const itemId = item._id || item.id || item.name;
    const variants = Array.isArray(item.variants) ? item.variants : (Array.isArray(item.sizes) ? item.sizes : (Array.isArray(item.portions) ? item.portions : []));
    const addOns = (Array.isArray(item.addOns) && item.addOns.length > 0) ? item.addOns : (Array.isArray(item.toppings) ? item.toppings : (Array.isArray(item.addons) ? item.addons : []));
    const hasCustomization = variants.length > 0 || addOns.length > 0;

    const imgUrl = item.image || item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80';
    const isVeg = item.isVeg !== undefined ? item.isVeg : true;

    return \\\`
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between group">
        <!-- Card Top: Image + Veg/Non-Veg Tag -->
        <div class="relative h-28 w-full bg-gray-100 overflow-hidden">
          <img src="\\\${imgUrl}" alt="\\\${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80'">
          <div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-xs">
            <div class="w-3 h-3 border \\\${isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-0.5">
              <div class="w-1.5 h-1.5 rounded-full \\\${isVeg ? 'bg-green-600' : 'bg-red-600'}"></div>
            </div>
          </div>
          <span class="absolute top-2 right-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
            \\\${item.category || 'General'}
          </span>
        </div>

        <!-- Card Body -->
        <div class="p-3 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start gap-1">
              <h4 class="font-bold text-gray-900 text-sm leading-snug line-clamp-1">\\\${item.name}</h4>
              <span class="text-xs font-black text-gray-900 shrink-0">₹\\\${parseFloat(item.price || 0).toFixed(2)}</span>
            </div>
            \\\${item.description ? \\\`<p class="text-[11px] text-gray-400 mt-1 line-clamp-2">\\\${item.description}</p>\\\` : ''}
          </div>

          <!-- Card Actions -->
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[10px] font-semibold text-gray-400">
              \\\${hasCustomization ? 'Customizable' : 'Standard'}
            </span>
            \\\${hasCustomization ? \\\`
              <button type="button" onclick="openItemCustomizer('\\\${itemId}')" class="text-xs font-bold bg-gray-100 hover:bg-black hover:text-white text-gray-900 px-3.5 py-1.5 rounded-xl transition">
                + Customize
              </button>
            \\\` : \\\`
              <button type="button" onclick="addDirectItem('\\\${itemId}')" class="text-xs font-bold bg-black hover:bg-gray-800 text-white px-3.5 py-1.5 rounded-xl transition">
                + Add
              </button>
            \\\`}
          </div>
        </div>
      </div>
    \\\`;
  }).join('');
}

window.filterPosMenu`;

const regex2 = /\/\/ 4\. Inline Customization Handlers[\s\S]*?window\.changeCartQty = function/m;
const replacement2 = `// 4. Customization Handler
let currentCustomizingItem = null;
let selectedSizeIndex = 0;
let selectedToppingIndices = new Set();
let customizeQty = 1;

window.openItemCustomizer = function(itemId) {
  const item = window.cafeMenuItems.find(i => (i._id || i.id || i.name) === itemId);
  if (!item) return;

  currentCustomizingItem = item;
  selectedSizeIndex = 0;
  selectedToppingIndices.clear();
  customizeQty = 1;

  const sizes = item.variants || item.sizes || item.portions || [];
  const toppings = item.toppings || item.addOns || item.addons || [];
  const isVeg = item.isVeg !== undefined ? item.isVeg : true;
  const badgeText = item.badge || item.tag || (item.category ? \\\`\\\${item.category.toUpperCase()} SPECIAL\\\` : 'THE GLITCH SPECIAL');

  let modal = document.getElementById('posCustomizeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'posCustomizeModal';
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150';
    document.body.appendChild(modal);
  }

  modal.innerHTML = \\\`
    <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-gray-900 animate-in zoom-in-95 duration-200">
      
      <!-- Close Button -->
      <button onclick="closeCustomizeModal()" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center text-lg font-bold transition">&times;</button>

      <!-- Badge -->
      <div class="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold tracking-widest px-3 py-1 rounded-lg uppercase mb-3">
        <span>✦</span>
        <span>\\\${badgeText}</span>
        <span>✦</span>
      </div>

      <!-- Item Title & Veg Indicator & Base Price -->
      <div class="flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div class="flex items-center gap-2">
          <h3 class="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">\\\${item.name}</h3>
          <div class="w-4 h-4 border \\\${isVeg ? 'border-green-600' : 'border-red-600'} rounded-[3px] flex items-center justify-center p-0.5 shrink-0">
            <div class="w-2 h-2 rounded-full \\\${isVeg ? 'bg-green-600' : 'bg-red-600'}"></div>
          </div>
        </div>
        <div class="text-xl font-black text-gray-900 shrink-0" id="customItemHeaderPrice">₹\\\${parseFloat(item.price || 0).toFixed(0)}</div>
      </div>

      <div class="py-4 space-y-5 max-h-[58vh] overflow-y-auto pr-1">
        
        <!-- Select Size Section -->
        \\\${sizes.length > 0 ? \\\`
          <div>
            <h4 class="text-sm font-bold text-gray-900 mb-2.5">Select Size</h4>
            <div class="grid grid-cols-3 gap-2.5" id="sizeSelectorGrid">
              \\\${sizes.map((s, idx) => {
                const sName = s.name || s.size || \\\`Option \\\${idx + 1}\\\`;
                const sPrice = parseFloat(s.price || item.price || 0).toFixed(0);
                const isSelected = idx === 0;
                return \\\`
                  <button type="button" onclick="setPosCustomSize(\\\${idx})" id="sizeBtn_\\\${idx}" class="size-option-btn p-3 rounded-2xl border-2 transition text-center flex flex-col justify-center items-center \\\${isSelected ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}">
                    <span class="text-xs font-semibold capitalize">\\\${sName}</span>
                    <span class="text-sm font-extrabold mt-0.5">₹\\\${sPrice}</span>
                  </button>
                \\\`;
              }).join('')}
            </div>
          </div>
        \\\` : ''}

        <!-- Select Toppings Section -->
        \\\${toppings.length > 0 ? \\\`
          <div>
            <h4 class="text-sm font-bold text-gray-900 mb-2.5">Select Toppings</h4>
            <div class="space-y-2.5">
              \\\${toppings.map((t, idx) => {
                const tPrice = parseFloat(t.price || 0).toFixed(0);
                return \\\`
                  <label class="flex items-center justify-between p-3 rounded-2xl border border-gray-200 hover:border-gray-300 bg-white cursor-pointer transition">
                    <div class="flex items-center gap-3">
                      <input type="checkbox" onchange="togglePosCustomTopping(\\\${idx}, this.checked)" class="w-4 h-4 rounded border-gray-300 accent-black text-black cursor-pointer">
                      <span class="text-sm font-medium text-gray-800">\\\${t.name}</span>
                    </div>
                    <span class="text-sm font-bold text-gray-900">₹\\\${tPrice}</span>
                  </label>
                \\\`;
              }).join('')}
            </div>
          </div>
        \\\` : ''}

      </div>

      <!-- Footer Info -->
      <div class="text-center text-xs text-gray-400 font-medium my-2">
        Hot & Fresh in 10–15 minutes
      </div>

      <!-- Action Row: [- 1 +] Pill & Add to Order CTA -->
      <div class="flex items-center gap-3 pt-2">
        <!-- Quantity Pill -->
        <div class="flex items-center justify-between bg-gray-100 rounded-full px-3 py-2 w-28 shrink-0">
          <button type="button" onclick="changeCustomModalQty(-1)" class="w-6 h-6 rounded-full hover:bg-gray-200 text-gray-700 font-black text-base flex items-center justify-center leading-none select-none">-</button>
          <span class="font-black text-sm text-gray-900" id="customModalQty">1</span>
          <button type="button" onclick="changeCustomModalQty(1)" class="w-6 h-6 rounded-full hover:bg-gray-200 text-gray-700 font-black text-base flex items-center justify-center leading-none select-none">+</button>
        </div>

        <!-- Add to Order Button -->
        <button type="button" onclick="confirmCustomizedOrder()" class="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-3 px-5 rounded-full text-sm flex items-center justify-center gap-1.5 transition shadow-sm">
          <span>Add to Order</span>
          <span>•</span>
          <span id="customModalFinalBtnPrice">₹0</span>
        </button>
      </div>

    </div>
  \\\`;

  modal.classList.remove('hidden');
  updateCustomModalPrices();
};

window.closeCustomizeModal = function() {
  const modal = document.getElementById('posCustomizeModal');
  if (modal) modal.classList.add('hidden');
};

window.setPosCustomSize = function(idx) {
  selectedSizeIndex = idx;
  const sizes = currentCustomizingItem.variants || currentCustomizingItem.sizes || currentCustomizingItem.portions || [];
  sizes.forEach((_, i) => {
    const btn = document.getElementById(\\\`sizeBtn_\\\${i}\\\`);
    if (btn) {
      if (i === idx) {
        btn.className = 'size-option-btn p-3 rounded-2xl border-2 transition text-center flex flex-col justify-center items-center border-black bg-black text-white shadow-sm';
      } else {
        btn.className = 'size-option-btn p-3 rounded-2xl border-2 transition text-center flex flex-col justify-center items-center border-gray-200 bg-white text-gray-900 hover:border-gray-300';
      }
    }
  });
  updateCustomModalPrices();
};

window.togglePosCustomTopping = function(idx, isChecked) {
  if (isChecked) {
    selectedToppingIndices.add(idx);
  } else {
    selectedToppingIndices.delete(idx);
  }
  updateCustomModalPrices();
};

window.changeCustomModalQty = function(delta) {
  customizeQty = Math.max(1, customizeQty + delta);
  const qtyEl = document.getElementById('customModalQty');
  if (qtyEl) qtyEl.innerText = customizeQty;
  updateCustomModalPrices();
};

function updateCustomModalPrices() {
  if (!currentCustomizingItem) return;

  const sizes = currentCustomizingItem.variants || currentCustomizingItem.sizes || currentCustomizingItem.portions || [];
  const toppings = currentCustomizingItem.toppings || currentCustomizingItem.addOns || currentCustomizingItem.addons || [];

  let basePrice = currentCustomizingItem.price || 0;
  if (sizes.length > 0 && sizes[selectedSizeIndex]) {
    basePrice = parseFloat(sizes[selectedSizeIndex].price || basePrice);
  }

  let toppingsTotal = 0;
  selectedToppingIndices.forEach(idx => {
    if (toppings[idx]) {
      toppingsTotal += parseFloat(toppings[idx].price || 0);
    }
  });

  const unitTotal = basePrice + toppingsTotal;
  const grandTotal = unitTotal * customizeQty;

  const headerPriceEl = document.getElementById('customItemHeaderPrice');
  if (headerPriceEl) headerPriceEl.innerText = \\\`₹\\\${unitTotal.toFixed(0)}\\\`;

  const btnPriceEl = document.getElementById('customModalFinalBtnPrice');
  if (btnPriceEl) btnPriceEl.innerText = \\\`₹\\\${grandTotal.toFixed(0)}\\\`;
}

window.confirmCustomizedOrder = function() {
  if (!currentCustomizingItem) return;

  const sizes = currentCustomizingItem.variants || currentCustomizingItem.sizes || currentCustomizingItem.portions || [];
  const toppings = currentCustomizingItem.toppings || currentCustomizingItem.addOns || currentCustomizingItem.addons || [];

  const chosenSize = sizes.length > 0 ? (sizes[selectedSizeIndex]?.name || sizes[selectedSizeIndex]?.size || 'Regular') : null;
  const basePrice = sizes.length > 0 ? parseFloat(sizes[selectedSizeIndex]?.price || currentCustomizingItem.price) : parseFloat(currentCustomizingItem.price);

  const chosenToppings = [];
  let toppingsTotal = 0;
  selectedToppingIndices.forEach(idx => {
    if (toppings[idx]) {
      chosenToppings.push(toppings[idx]);
      toppingsTotal += parseFloat(toppings[idx].price || 0);
    }
  });

  const unitPrice = basePrice + toppingsTotal;

  window.posCart.push({
    id: currentCustomizingItem._id || currentCustomizingItem.id || currentCustomizingItem.name,
    name: currentCustomizingItem.name,
    variant: chosenSize,
    toppings: chosenToppings,
    price: unitPrice,
    category: currentCustomizingItem.category || 'General',
    qty: customizeQty
  });

  closeCustomizeModal();
  renderPosCart();
};

window.addDirectItem = function(itemId) {
  const item = window.cafeMenuItems.find(i => (i._id || i.id || i.name) === itemId);
  if (!item) return;

  const existing = window.posCart.find(c => c.id === itemId && !c.variant && c.toppings.length === 0);
  if (existing) {
    existing.qty += 1;
  } else {
    window.posCart.push({
      id: itemId,
      name: item.name,
      variant: null,
      toppings: [],
      price: item.price,
      category: item.category || 'General',
      qty: 1
    });
  }
  renderPosCart();
};

window.changeCartQty = function`;

code = code.replace(regex1, replacement1);
code = code.replace(regex2, replacement2);

fs.writeFileSync('client/src/main.js', code);
