// settings.js
// Handles UI logic for the Settings & Access Control page

const PRESET_PERMISSIONS = {
  'Admin': ['dashboard', 'live_orders', 'menu', 'billing', 'analytics', 'settings'],
  'Chef': ['live_orders'],
  'Cashier': ['dashboard', 'live_orders', 'billing']
};

let staffList = [
  { id: '1', name: 'Boss Admin', username: 'admin', role: 'Admin', permissions: PRESET_PERMISSIONS['Admin'], status: 'Active' },
  { id: '2', name: 'Mario Chef', username: 'chef', role: 'Chef', permissions: PRESET_PERMISSIONS['Chef'], status: 'Active' },
  { id: '3', name: 'Sarah Cashier', username: 'cashier', role: 'Cashier', permissions: PRESET_PERMISSIONS['Cashier'], status: 'Active' },
];

let editingStaffId = null;

function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  staffList.forEach(staff => {
    const permBadges = staff.permissions.map(p => 
      `<span class="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 mb-1 uppercase">${p.replace('_', ' ')}</span>`
    ).join('');
    
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-medium text-monochrome-900">${staff.name}</div>
          <div class="text-xs text-gray-500">@${staff.username}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-bold ${staff.role === 'Admin' ? 'bg-monochrome-900 text-white' : 'bg-gray-200 text-gray-800'}">${staff.role}</span>
        </td>
        <td class="py-3 px-4 hidden md:table-cell max-w-xs flex-wrap">
          ${permBadges}
        </td>
        <td class="py-3 px-4 text-right">
          <button class="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium" onclick="editStaff('${staff.id}')">Edit</button>
          <button class="text-red-600 hover:text-red-800 text-sm font-medium" onclick="deleteStaff('${staff.id}')">Remove</button>
        </td>
      </tr>
    `;
  });
}

window.openStaffModal = () => {
  editingStaffId = null;
  document.getElementById('staff-modal-title').innerText = 'Add Staff Member';
  document.getElementById('staff-name').value = '';
  document.getElementById('staff-username').value = '';
  document.getElementById('staff-role-preset').value = 'Admin';
  applyRolePreset('Admin');
  
  document.getElementById('staff-modal').classList.remove('hidden');
};

window.closeStaffModal = () => {
  document.getElementById('staff-modal').classList.add('hidden');
};

window.applyRolePreset = (role) => {
  const checkboxes = document.querySelectorAll('.perm-checkbox');
  
  if (PRESET_PERMISSIONS[role]) {
    const perms = PRESET_PERMISSIONS[role];
    checkboxes.forEach(cb => {
      cb.checked = perms.includes(cb.value);
    });
  } else {
    // Custom: leave as is or clear
  }
};

window.editStaff = (id) => {
  const staff = staffList.find(s => s.id === id);
  if (!staff) return;
  
  editingStaffId = id;
  document.getElementById('staff-modal-title').innerText = 'Edit Staff Member';
  document.getElementById('staff-name').value = staff.name;
  document.getElementById('staff-username').value = staff.username;
  
  const presetSelect = document.getElementById('staff-role-preset');
  if (PRESET_PERMISSIONS[staff.role]) {
    presetSelect.value = staff.role;
  } else {
    presetSelect.value = 'Custom';
  }
  
  const checkboxes = document.querySelectorAll('.perm-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = staff.permissions.includes(cb.value);
  });
  
  document.getElementById('staff-modal').classList.remove('hidden');
};

window.saveStaffMember = () => {
  const name = document.getElementById('staff-name').value;
  const username = document.getElementById('staff-username').value;
  let role = document.getElementById('staff-role-preset').value;
  
  const checkboxes = document.querySelectorAll('.perm-checkbox:checked');
  const permissions = Array.from(checkboxes).map(cb => cb.value);
  
  if (role === 'Custom' && permissions.length > 0) {
    // Try to auto-detect if they accidentally match a preset exactly
    for (const [key, perms] of Object.entries(PRESET_PERMISSIONS)) {
      if (perms.length === permissions.length && perms.every(p => permissions.includes(p))) {
        role = key;
        break;
      }
    }
  }
  
  if (!name || !username) {
    alert("Please fill name and username.");
    return;
  }

  if (editingStaffId) {
    const idx = staffList.findIndex(s => s.id === editingStaffId);
    if (idx > -1) {
      staffList[idx] = { ...staffList[idx], name, username, role, permissions };
    }
  } else {
    staffList.push({
      id: Math.random().toString(36).substr(2, 9),
      name,
      username,
      role,
      permissions,
      status: 'Active'
    });
  }
  
  renderStaffTable();
  closeStaffModal();
};

window.deleteStaff = (id) => {
  if (confirm('Are you sure you want to remove this staff member?')) {
    staffList = staffList.filter(s => s.id !== id);
    renderStaffTable();
  }
};

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
  renderStaffTable();
});
