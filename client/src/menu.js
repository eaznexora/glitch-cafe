// menu.js - CRUD logic for Menu & Categories
// Relies on API_BASE from main.js

let categoriesData = [];
let menuItemsData = [];
let currentCategoryFilter = 'all';

let deleteTarget = null; // { type: 'category'|'item', id: string }

async function initMenu() {
  if (!document.getElementById('menu-item-grid')) return; // Guard
  await fetchCategories();
  await fetchMenuItems();
}

// --- DATA FETCHING ---

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
    if (res.ok) {
      categoriesData = await res.json();
      categoriesData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      renderCategoryList();
      renderCategoryPills();
      populateCategorySelects();
    }
  } catch (err) {
    console.error('Failed to fetch categories:', err);
  }
}

async function fetchMenuItems() {
  try {
    const res = await fetch(`${API_BASE}/products`, { headers: getAuthHeaders() });
    if (res.ok) {
      menuItemsData = await res.json();
      menuItemsData.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
      filterMenuItems();
    }
  } catch (err) {
    console.error('Failed to fetch menu items:', err);
  }
}

// --- RENDERING ---

function renderCategoryList() {
  const container = document.getElementById('category-list');
  container.innerHTML = '';
  
  if (categoriesData.length === 0) {
    container.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No categories yet.</div>`;
    return;
  }
  
  categoriesData.forEach(cat => {
    const count = menuItemsData.filter(p => 
      (p.categoryId === cat._id) || 
      (p.categoryId && p.categoryId._id === cat._id) ||
      (p.categorySlug === cat.slug)
    ).length;
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors group';
    div.innerHTML = `
      <div class="flex items-center">
        <i data-lucide="grip-vertical" class="h-4 w-4 text-gray-300 mr-2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"></i>
        <div>
          <div class="font-bold text-sm text-monochrome-900">${cat.name}</div>
          <div class="text-xs text-gray-500">${count} items</div>
        </div>
      </div>
      <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded mr-1">#${cat.displayOrder || 1}</span>
        <button class="p-1.5 text-gray-400 hover:text-black rounded hover:bg-gray-200" onclick="openCategoryModal('${cat._id}')"><i data-lucide="edit-2" class="h-3 w-3"></i></button>
        <button class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" onclick="promptDelete('category', '${cat._id}', '${cat.name}')"><i data-lucide="trash-2" class="h-3 w-3"></i></button>
      </div>
    `;
    container.appendChild(div);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderCategoryPills() {
  const container = document.getElementById('category-pills');
  // keep 'all' button
  container.innerHTML = `<button class="menu-tab ${currentCategoryFilter === 'all' ? 'active bg-monochrome-900 text-white' : 'bg-monochrome-100 text-gray-600'} px-4 py-1.5 rounded-full text-sm font-medium transition-colors" onclick="setMenuFilter('all', this)">All Items</button>`;
  
  categoriesData.forEach(cat => {
    const isActive = currentCategoryFilter === cat._id;
    container.innerHTML += `<button class="menu-tab ${isActive ? 'active bg-monochrome-900 text-white' : 'bg-monochrome-100 text-gray-600 hover:bg-gray-200'} px-4 py-1.5 rounded-full text-sm font-medium transition-colors" onclick="setMenuFilter('${cat._id}', this)">${cat.name}</button>`;
  });
}

function populateCategorySelects() {
  const select = document.getElementById('item-category');
  select.innerHTML = '<option value="" disabled selected>Select a category</option>';
  categoriesData.forEach(cat => {
    select.innerHTML += `<option value="${cat._id}">${cat.name}</option>`;
  });
}

window.setMenuFilter = (catId, btnElement) => {
  currentCategoryFilter = catId;
  document.querySelectorAll('.menu-tab').forEach(btn => {
    btn.classList.remove('bg-monochrome-900', 'text-white', 'active');
    btn.classList.add('bg-monochrome-100', 'text-gray-600');
  });
  btnElement.classList.add('bg-monochrome-900', 'text-white', 'active');
  btnElement.classList.remove('bg-monochrome-100', 'text-gray-600');
  filterMenuItems();
};

window.filterMenuItems = () => {
  const searchQ = document.getElementById('menu-search').value.toLowerCase();
  
  const filtered = menuItemsData.filter(item => {
    const matchesCat = currentCategoryFilter === 'all' || 
      item.categoryId === currentCategoryFilter || 
      (item.categoryId && item.categoryId._id === currentCategoryFilter) ||
      (item.categorySlug && categoriesData.find(c => c._id === currentCategoryFilter)?.slug === item.categorySlug);
      
    const matchesSearch = item.name.toLowerCase().includes(searchQ) || (item.description && item.description.toLowerCase().includes(searchQ));
    return matchesCat && matchesSearch;
  });
  
  document.getElementById('item-count').innerText = `${filtered.length} items`;
  renderMenuItems(filtered);
};

function renderMenuItems(items) {
  const container = document.getElementById('menu-item-grid');
  container.innerHTML = '';
  
  if (items.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">No items found matching criteria.</div>`;
    return;
  }
  
  items.forEach(item => {
    const catName = item.categoryId ? item.categoryId.name : 'Uncategorized';
    
    let typeIcon = item.isVeg ? 'leaf' : 'drumstick';
    let typeColor = item.isVeg ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200';
    let typeText = item.isVeg ? 'Vegetarian' : 'Non-Veg';

    const card = document.createElement('div');
    card.className = `bg-white rounded-lg border ${item.isAvailable ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 opacity-75 grayscale-[50%]'} flex flex-col overflow-hidden transition-all group p-4 relative`;
    
    card.innerHTML = `
      ${!item.isAvailable ? `<div class="absolute inset-0 bg-black bg-opacity-5 z-10 flex items-center justify-center pointer-events-none"><span class="bg-red-600 text-white font-bold px-3 py-1 rounded shadow-lg tracking-wider text-sm">OUT OF STOCK</span></div>` : ''}
      <div class="flex-1 flex flex-col">
        <div class="flex justify-between items-start mb-2">
          <div class="flex flex-col flex-1 pr-2">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">${catName}</span>
            <h4 class="font-bold text-monochrome-900 line-clamp-1">${item.name}</h4>
          </div>
          <div class="flex flex-col items-end">
            <span class="font-bold text-lg text-monochrome-900 whitespace-nowrap">₹${item.price.toFixed(2)}</span>
            <span class="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">#${item.displayOrder || 1}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2 mb-3">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${typeColor}">
            <i data-lucide="${typeIcon}" class="h-3 w-3 mr-1"></i> ${typeText}
          </span>
          ${item.isSpecial ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider text-yellow-700 bg-yellow-50 border-yellow-200">✦ Special</span>` : ''}
        </div>
        <p class="text-xs text-gray-500 line-clamp-2 flex-1 mb-4">${item.description || 'No description provided.'}</p>
        
        <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div class="flex items-center">
            <div class="relative inline-block w-8 mr-2 align-middle select-none">
              <input type="checkbox" class="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 appearance-none cursor-pointer" ${item.isAvailable ? 'checked' : ''} onchange="toggleStock('${item._id}', this.checked)"/>
              <label class="toggle-label block overflow-hidden h-4 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
            <span class="text-xs font-medium ${item.isAvailable ? 'text-gray-700' : 'text-red-500'}">${item.isAvailable ? 'In Stock' : '86ed'}</span>
          </div>
          <div class="flex space-x-1">
            <button class="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors" onclick="openMenuItemModal('${item._id}')"><i data-lucide="edit" class="h-4 w-4"></i></button>
            <button class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" onclick="promptDelete('item', '${item._id}', '${item.name.replace(/'/g, "\\'")}')"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- MODALS & FORMS ---

window.openCategoryModal = (id = null) => {
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const title = document.getElementById('category-modal-title');
  form.reset();
  document.getElementById('category-id').value = '';
  
  if (id) {
    const cat = categoriesData.find(c => c._id === id);
    if (cat) {
      title.innerText = 'Edit Category';
      document.getElementById('category-id').value = cat._id;
      document.getElementById('category-name').value = cat.name;
      document.getElementById('category-slug').value = cat.slug;
      document.getElementById('category-order').value = cat.displayOrder || 0;
    }
  } else {
    title.innerText = 'Add Category';
  }
  
  modal.classList.remove('hidden');
};

window.closeCategoryModal = () => {
  document.getElementById('category-modal').classList.add('hidden');
};

window.saveCategory = async () => {
  const id = document.getElementById('category-id').value;
  let slug = document.getElementById('category-slug').value;
  const name = document.getElementById('category-name').value;
  const order = document.getElementById('category-order').value;
  
  if (!name) return alert('Category Name is required.');
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const payload = { name, slug, displayOrder: parseInt(order) || 0 };
  
  try {
    const url = id ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      closeCategoryModal();
      await fetchCategories();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  } catch (err) {
    console.error(err);
  }
};

window.addSizeRow = (name = '', price = '') => {
  const container = document.getElementById('sizes-container');
  const div = document.createElement('div');
  div.className = 'size-row flex space-x-2 items-center';
  div.innerHTML = `
    <input type="text" class="size-name flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-monochrome-900 text-sm bg-white" placeholder="e.g. Regular" value="${name}">
    <input type="number" class="size-price w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-monochrome-900 text-sm bg-white" placeholder="₹" value="${price}">
    <button type="button" class="text-red-500 hover:text-red-700 p-2" onclick="this.parentElement.remove()"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
  `;
  container.appendChild(div);
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.addToppingRow = (name = '', price = '') => {
  const container = document.getElementById('toppings-container');
  const div = document.createElement('div');
  div.className = 'topping-row flex space-x-2 items-center';
  div.innerHTML = `
    <input type="text" class="topping-name flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-monochrome-900 text-sm bg-white" placeholder="e.g. Extra Cheese" value="${name}">
    <input type="number" class="topping-price w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-monochrome-900 text-sm bg-white" placeholder="₹" value="${price}">
    <button type="button" class="text-red-500 hover:text-red-700 p-2" onclick="this.parentElement.remove()"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
  `;
  container.appendChild(div);
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openMenuItemModal = (id = null) => {
  const modal = document.getElementById('menu-item-modal');
  const form = document.getElementById('menu-item-form');
  const title = document.getElementById('item-modal-title');
  form.reset();
  document.getElementById('item-id').value = '';
  
  if (id) {
    const item = menuItemsData.find(i => i._id === id);
    if (item) {
      title.innerText = 'Edit Food Item';
      document.getElementById('item-id').value = item._id;
      document.getElementById('item-name').value = item.name || '';
      document.getElementById('item-category').value = item.categoryId ? item.categoryId._id : '';
      document.getElementById('item-price').value = item.price || '';
      document.getElementById('item-order').value = item.displayOrder || 1;
      document.getElementById('item-desc').value = item.description || '';
      document.getElementById('item-available').checked = item.isAvailable;
      document.getElementById('item-isveg').checked = Boolean(item.isVeg !== false); // Default veg to true if undefined
      document.getElementById('item-isspecial').checked = Boolean(item.isSpecial);
      
      document.getElementById('sizes-container').innerHTML = '';
      if (item.sizes && item.sizes.length) {
        item.sizes.forEach(s => addSizeRow(s.name, s.price));
      }
      
      document.getElementById('toppings-container').innerHTML = '';
      if (item.toppings && item.toppings.length) {
        item.toppings.forEach(t => addToppingRow(t.name, t.price));
      }
    }
  } else {
    title.innerText = 'Add Food Item';
    document.getElementById('item-order').value = 1;
    document.getElementById('item-isveg').checked = true;
    document.getElementById('item-isspecial').checked = false;
    document.getElementById('sizes-container').innerHTML = '';
    document.getElementById('toppings-container').innerHTML = '';
  }
  
  modal.classList.remove('hidden');
};

window.closeMenuItemModal = () => {
  document.getElementById('menu-item-modal').classList.add('hidden');
};

window.saveMenuItem = async () => {
  const id = document.getElementById('item-id').value;
  const name = document.getElementById('item-name').value;
  const categoryId = document.getElementById('item-category').value;
  const price = document.getElementById('item-price').value;
  const description = document.getElementById('item-desc').value;
  const isAvailable = document.getElementById('item-available').checked;
  const isVeg = document.getElementById('item-isveg')?.checked ?? true;
  const isSpecial = document.getElementById('item-isspecial')?.checked ?? false;
  const displayOrder = Number(document.getElementById('item-order').value) || 1;
  
  if (!name || !categoryId || !price) return alert('Name, Category, and Price are required.');

  // Find categorySlug from selected category
  const selectedCat = categoriesData.find(c => c._id === categoryId);
  const categorySlug = selectedCat ? selectedCat.slug : '';

  const sizes = Array.from(document.querySelectorAll('.size-row')).map(row => ({
    name: row.querySelector('.size-name').value.trim(),
    price: Number(row.querySelector('.size-price').value) || 0
  })).filter(s => s.name);

  const toppings = Array.from(document.querySelectorAll('.topping-row')).map(row => ({
    name: row.querySelector('.topping-name').value.trim(),
    price: Number(row.querySelector('.topping-price').value) || 0
  })).filter(t => t.name);

  const payload = { name, categoryId, categorySlug, price: parseFloat(price), description, isAvailable, isVeg, isSpecial, displayOrder, sizes, toppings };
  
  try {
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const doc = await res.json();
      console.log('Saved Document:', doc);
      alert('Product saved successfully!');
      closeMenuItemModal();
      await fetchMenuItems(); // Refresh grid
      renderCategoryList(); // Update counts in sidebar
    } else {
      const err = await res.json();
      alert(`Error: ${err.error || 'Server error'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to connect to backend API.');
  }
};

window.toggleStock = async (id, isAvailable) => {
  try {
    const res = await fetch(`${API_BASE}/products/${id}/toggle-stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isAvailable })
    });
    if (res.ok) {
      // Update local data and re-render without full fetch for speed
      const item = menuItemsData.find(i => i._id === id);
      if (item) item.isAvailable = isAvailable;
      filterMenuItems();
    }
  } catch (err) {
    console.error(err);
  }
};

// --- DELETE CONFIRMATION ---

window.promptDelete = (type, id, name) => {
  deleteTarget = { type, id };
  document.getElementById('delete-message').innerText = `Are you sure you want to delete ${type === 'category' ? 'category' : 'item'}: "${name}"? This action cannot be undone.`;
  document.getElementById('delete-modal').classList.remove('hidden');
};

window.closeDeleteModal = () => {
  deleteTarget = null;
  document.getElementById('delete-modal').classList.add('hidden');
};

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!deleteTarget) return;
  
  const { type, id } = deleteTarget;
  const endpoint = type === 'category' ? 'categories' : 'products';
  
  try {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      closeDeleteModal();
      if (type === 'category') {
        if (currentCategoryFilter === id) currentCategoryFilter = 'all';
        await fetchCategories();
        filterMenuItems();
      } else {
        await fetchMenuItems();
        renderCategoryList(); // Update counts
      }
    } else {
      alert('Failed to delete.');
    }
  } catch (err) {
    console.error(err);
  }
});

// Run
document.addEventListener('DOMContentLoaded', initMenu);
