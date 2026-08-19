// settings.js
// Handles UI logic for the Settings & Access Control page

const PRESET_PERMISSIONS = {
  'Admin': ['dashboard', 'orders', 'tables', 'menu', 'inventory', 'analytics', 'billing', 'settings'],
  'Chef': ['orders'],
  'Cashier': ['dashboard', 'orders', 'billing']
};

let staffList = [];
let editingStaffId = null;

async function fetchStaffList() {
  try {
    const res = await fetch(`${window.API_BASE}/auth/staff`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      staffList = await res.json();
      renderStaffTable();
    }
  } catch (err) {
    console.error('Failed to fetch staff list', err);
  }
}

function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  staffList.forEach(staff => {
    const permBadges = staff.permissions.map(p => 
      `<span class="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 mb-1 uppercase">${p.replace('_', ' ')}</span>`
    ).join('');
    
    let role = 'Staff';
    for (const [key, perms] of Object.entries(PRESET_PERMISSIONS)) {
      if (perms.length === staff.permissions.length && perms.every(p => staff.permissions.includes(p))) {
        role = key;
        break;
      }
    }
    
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="py-3 px-4">
          <div class="font-medium text-monochrome-900">${staff.email}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-bold ${role === 'Admin' ? 'bg-monochrome-900 text-white' : 'bg-gray-200 text-gray-800'}">${role}</span>
        </td>
        <td class="py-3 px-4 hidden md:table-cell max-w-xs flex-wrap">
          ${permBadges}
        </td>
        <td class="py-3 px-4 text-right">
          <button class="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium" onclick="editStaff('${staff._id}')">Edit</button>
        </td>
      </tr>
    `;
  });
}

window.openStaffModal = () => {
  editingStaffId = null;
  document.getElementById('staff-modal-title').innerText = 'Add Staff Member';
  document.getElementById('staff-email').value = '';
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-password').placeholder = 'Create a secure password';
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
  }
};

window.editStaff = (id) => {
  const staff = staffList.find(s => s._id === id);
  if (!staff) return;
  
  editingStaffId = id;
  document.getElementById('staff-modal-title').innerText = 'Edit Staff Member';
  document.getElementById('staff-email').value = staff.email;
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-password').placeholder = '(Leave blank to keep current password)';
  
  const checkboxes = document.querySelectorAll('.perm-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = staff.permissions.includes(cb.value);
  });
  
  document.getElementById('staff-modal').classList.remove('hidden');
};

window.saveStaffMember = async () => {
  const email = document.getElementById('staff-email').value;
  const password = document.getElementById('staff-password').value;
  
  const checkboxes = document.querySelectorAll('.perm-checkbox:checked');
  const permissions = Array.from(checkboxes).map(cb => cb.value);
  
  if (!email) {
    showToast("Please fill the email address.", 'error');
    return;
  }
  if (!editingStaffId && !password) {
    showToast("Please fill the password for new staff.", 'error');
    return;
  }

  try {
    const url = editingStaffId ? `${window.API_BASE}/auth/staff/${editingStaffId}` : '${window.API_BASE}/auth/staff';
    const method = editingStaffId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password, permissions })
    });
    
    if (res.ok) {
      showToast(`Staff member ${editingStaffId ? 'updated' : 'created'} successfully!`, 'success');
      closeStaffModal();
      fetchStaffList();
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error}`, 'error');
    }
  } catch (err) {
    showToast('Failed to save staff member', 'error');
    console.error(err);
  }
};

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
  if (currentUser && currentUser.isSuperAdmin) {
    fetchStaffList();
  } else {
    // Hide staff tab entirely if not super admin
    const staffTabBtn = document.querySelector("[onclick=\"switchTab('staff-roles', this)\"]");
    if (staffTabBtn) staffTabBtn.style.display = 'none';
    
    // Switch to profile tab by default
    const profileBtn = document.querySelector("[onclick=\"switchTab('cafe-profile', this)\"]");
    if (profileBtn) profileBtn.click();
  }

  // Bind password toggle
  const toggleBtn = document.getElementById('toggle-staff-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const pwdInput = document.getElementById('staff-password');
      const eyeIcon = document.getElementById('eye-icon');
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        // Eye-Off SVG
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />`;
      } else {
        pwdInput.type = 'password';
        // Eye SVG
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
      }
    });
  }
});
