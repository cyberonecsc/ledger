/* ==========================================================================
   CYBER ONE Center Management Platform - User Management View (views/users.js)
   ========================================================================== */

import { auth } from '../auth.js';
import { store } from '../store.js';

export function renderUserManagement(mountPoint, appInstance) {
  const users = auth.getPresetUsers();
  
  // Privilege checklist details for permissions matrix reference
  const privilegeKeys = [
    { key: 'view_balances', label: 'View Total Cash & Bank Balances' },
    { key: 'edit_balances', label: 'Force Adjust Balance Figures' },
    { key: 'manage_ledger', label: 'Create/Delete Daily Transactions' },
    { key: 'manage_applications', label: 'Submit & Track Government Applications' },
    { key: 'manage_accounts', label: 'Edit Bank Account/Wallet details' },
    { key: 'manage_customers', label: 'Register Citizens & Adjust Credit limits' },
    { key: 'manage_inventory', label: 'Edit Product Stock levels' },
    { key: 'manage_payroll', label: 'Run Monthly Attendance & Issue Salaries' }
  ];

  let editingUsername = null; // Track if we are editing an account
  let editPhotoBase64 = '';

  const renderView = () => {
    const listUsers = auth.getPresetUsers();

    mountPoint.innerHTML = `
      <div class="glass-card" style="padding:24px; margin-bottom: 25px;">
        <div class="section-header" style="margin-bottom:20px; border-bottom:1px solid var(--panel-border); padding-bottom:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h3>User Management & Access Control</h3>
            <span style="font-size:12px; color:var(--text-muted);">Manage system operator credentials, profile details, and configure role privileges</span>
          </div>
          <button id="btn-add-user" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:6px; height:36px; font-size:12px;">
            <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Add New Account
          </button>
        </div>
        
        <div class="form-row" style="grid-template-columns: 1fr 1.2fr; gap:30px; align-items: start;">
          <!-- Left Column: Accounts list -->
          <div style="border-right: 1px solid var(--panel-border); padding-right: 25px; display:flex; flex-direction:column; gap:25px;">
            <div>
              <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Active Accounts</h5>
              <div style="display:flex; flex-direction:column; gap:8px; max-height:380px; overflow-y:auto; padding-right:5px;">
                ${listUsers.map(u => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.01); border:1px solid var(--panel-border); border-radius:var(--border-radius-sm);">
                    <div style="display:flex; align-items:center; gap:10px; min-width: 0; flex-grow: 1;">
                      ${u.photo ? `
                        <img src="${u.photo}" alt="User Avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid var(--color-primary);">
                      ` : `
                        <div class="avatar" style="width: 28px; height: 28px; font-size: 11px; box-shadow: none;">${u.name.charAt(0)}</div>
                      `}
                      <div style="min-width: 0; flex-grow: 1;">
                        <strong style="font-size:13px; display:block; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.name}</strong>
                        <span style="font-size:11px; color:var(--text-muted);">@${u.username} <code style="color:var(--color-primary);">(${u.role})</code></span>
                      </div>
                    </div>
                    
                    <div style="display:flex; gap:6px; align-items:center;">
                      <!-- ID Card Button -->
                      <button class="btn-idcard-user btn btn-secondary" data-username="${u.username}" style="padding: 4px 8px; font-size: 11px; height: 24px; display: flex; align-items: center; justify-content: center; gap: 4px; border-radius: 4px; border-color: rgba(99,102,241,0.25);">
                        <i data-lucide="contact" style="width: 11px; height: 11px; color: var(--color-primary);"></i> ID Card
                      </button>
                      
                      <!-- Edit Button -->
                      <button class="btn-edit-user btn btn-secondary" data-username="${u.username}" style="padding: 4px 8px; font-size: 11px; height: 24px; display: flex; align-items: center; justify-content: center; gap: 4px; border-radius: 4px;">
                        <i data-lucide="edit-2" style="width: 11px; height: 11px;"></i> Edit
                      </button>
                      
                      ${u.username.toUpperCase() !== 'SHIBURCN' ? `
                        <button class="btn-delete-user" data-username="${u.username}" style="padding: 4px; color: var(--color-danger); background: none; border: 1px solid rgba(239,68,68,0.15); border-radius: 4px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:var(--transition-smooth); width: 24px; height: 24px;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='none'">
                          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <!-- Right Column: Privilege matrix visualizer -->
          <div>
            <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Role Privilege Mapping</h5>
            <div class="table-responsive" style="border:none;">
              <table class="privilege-table">
                <thead>
                  <tr>
                    <th>Operation Privilege</th>
                    <th style="color:var(--color-primary);">Owner</th>
                    <th>Admin</th>
                    <th>Accountant</th>
                    <th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  ${privilegeKeys.map(p => `
                    <tr>
                      <td>${p.label}</td>
                      <!-- Owner has locked full access -->
                      <td>
                        <input type="checkbox" class="checkbox-custom" checked disabled>
                      </td>
                      <!-- Admin privileges -->
                      <td>
                        <input type="checkbox" class="checkbox-custom privilege-checkbox" data-role="admin" data-priv="${p.key}" ${auth.privileges.admin[p.key] ? 'checked' : ''}>
                      </td>
                      <!-- Accountant privileges -->
                      <td>
                        <input type="checkbox" class="checkbox-custom privilege-checkbox" data-role="accountant" data-priv="${p.key}" ${auth.privileges.accountant[p.key] ? 'checked' : ''}>
                      </td>
                      <!-- Staff privileges -->
                      <td>
                        <input type="checkbox" class="checkbox-custom privilege-checkbox" data-role="staff" data-priv="${p.key}" ${auth.privileges.staff[p.key] ? 'checked' : ''}>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modals Backdrop for User Registration/Edit -->
      <div id="user-form-modal-backdrop" class="modal-backdrop">
        <div class="modal-container" style="max-width: 600px;">
          <div class="modal-header">
            <h4 id="user-modal-title">Register New Operator</h4>
            <button id="user-modal-close" class="modal-close">&times;</button>
          </div>
          <div style="padding-top: 10px;">
            <form id="form-operator-account" style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px; margin-bottom:4px;">Full Name</label>
                <input type="text" id="op-name" class="form-control" placeholder="Ramesh Kumar" style="font-size:12px; padding:8px 12px;" required>
              </div>
              
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px; margin-bottom:4px;">Username</label>
                <input type="text" id="op-username" class="form-control" placeholder="username" style="font-size:12px; padding:8px 12px;" required>
              </div>
              
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px; margin-bottom:4px;">Password</label>
                <input type="password" id="op-password" class="form-control" placeholder="••••••••" style="font-size:12px; padding:8px 12px;" required>
              </div>
              
              <div class="form-row">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Access Level (Role)</label>
                  <select id="op-role" class="form-control" style="font-size:12px; padding:8px 12px;" required>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Base Salary (₹)</label>
                  <input type="number" step="1" id="op-salary" class="form-control" placeholder="e.g. 15000" style="font-size:12px; padding:8px 12px;" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Mobile (WhatsApp)</label>
                  <input type="tel" id="op-mobile" class="form-control" placeholder="Mobile Number" style="font-size:12px; padding:8px 12px;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Email ID</label>
                  <input type="email" id="op-email" class="form-control" placeholder="Email ID" style="font-size:12px; padding:8px 12px;">
                </div>
              </div>

              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" style="font-size:11px; margin-bottom:4px;">Profile Photo</label>
                <input type="file" id="op-photo" class="form-control" accept="image/*" style="font-size:12px; padding:6px 12px;">
                <div id="op-photo-preview-container" style="display:none; align-items:center; gap:10px; margin-top:8px;">
                  <img id="op-photo-preview" src="" alt="Avatar Preview" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--color-primary);">
                  <span style="font-size:10px; color:var(--text-muted);">Photo uploaded</span>
                </div>
              </div>
              
              <div style="display:flex; gap:10px; margin-top:15px;">
                <button type="submit" class="btn btn-primary" style="flex-grow: 1; font-size:12px;">
                  <i data-lucide="check-circle" style="width:14px; height:14px; margin-right:4px; vertical-align:middle;"></i> 
                  <span id="user-submit-text">Create Account</span>
                </button>
                <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modals Backdrop for Staff ID Card -->
      <div id="staff-modal-backdrop" class="modal-backdrop">
        <div class="modal-container" id="staff-modal-container" style="max-width: 500px;">
          <!-- Dynamic Modal content -->
        </div>
      </div>
    `;

    // Re-initialize lucide icons
    lucide.createIcons();

    // Bind Add Account button click
    const btnAddUser = document.getElementById('btn-add-user');
    if (btnAddUser) {
      btnAddUser.addEventListener('click', () => {
        editingUsername = null;
        editPhotoBase64 = '';
        
        // Reset form fields
        document.getElementById('op-name').value = '';
        const opUsernameInput = document.getElementById('op-username');
        opUsernameInput.value = '';
        opUsernameInput.disabled = false;
        opUsernameInput.readOnly = false;
        document.getElementById('op-password').value = '';
        
        const opRoleSelect = document.getElementById('op-role');
        opRoleSelect.innerHTML = `
          <option value="admin">Admin</option>
          <option value="accountant">Accountant</option>
          <option value="staff" selected>Staff</option>
        `;
        opRoleSelect.disabled = false;
        opRoleSelect.value = 'staff';
        document.getElementById('op-salary').value = 12000;
        document.getElementById('op-mobile').value = '';
        document.getElementById('op-email').value = '';
        document.getElementById('op-photo').value = '';
        
        // Hide photo preview
        const preview = document.getElementById('op-photo-preview');
        const container = document.getElementById('op-photo-preview-container');
        if (preview && container) {
          preview.src = '';
          container.style.display = 'none';
        }
        
        // Set labels
        document.getElementById('user-modal-title').innerText = 'Register New Operator';
        document.getElementById('user-submit-text').innerText = 'Create Account';
        
        // Show modal
        const modal = document.getElementById('user-form-modal-backdrop');
        if (modal) modal.classList.add('show');
      });
    }

    // Bind Edit Account buttons click
    const editBtns = document.querySelectorAll('.btn-edit-user');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.getAttribute('data-username');
        const userObj = auth.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userObj) {
          editingUsername = userObj.username;
          editPhotoBase64 = userObj.photo || '';
          
          // Populate fields
          document.getElementById('op-name').value = userObj.name;
          const opUsernameInput = document.getElementById('op-username');
          opUsernameInput.value = userObj.username;
          opUsernameInput.disabled = true; // disable username edit
          opUsernameInput.readOnly = true;
          document.getElementById('op-password').value = userObj.password;
          
          const opRoleSelect = document.getElementById('op-role');
          if (editingUsername.toUpperCase() === 'SHIBURCN') {
            opRoleSelect.innerHTML = `<option value="owner">Owner (Full Permissions)</option>`;
            opRoleSelect.disabled = true;
          } else {
            opRoleSelect.innerHTML = `
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
              <option value="staff">Staff</option>
            `;
            opRoleSelect.disabled = false;
          }
          opRoleSelect.value = userObj.role;
          
          document.getElementById('op-mobile').value = userObj.mobile || '';
          document.getElementById('op-email').value = userObj.email || '';
          
          const staffObj = store.staff.find(s => s.id === userObj.username);
          const currentSal = userObj.baseSalary !== undefined && userObj.baseSalary !== null ? userObj.baseSalary : (staffObj ? staffObj.baseSalary : 0);
          document.getElementById('op-salary').value = currentSal;
          
          const preview = document.getElementById('op-photo-preview');
          const container = document.getElementById('op-photo-preview-container');
          if (userObj.photo) {
            if (preview && container) {
              preview.src = userObj.photo;
              container.style.display = 'flex';
            }
          } else {
            if (preview && container) {
              preview.src = '';
              container.style.display = 'none';
            }
          }
          
          // Set labels
          document.getElementById('user-modal-title').innerText = 'Edit Operator Details';
          document.getElementById('user-submit-text').innerText = 'Save Changes';
          
          // Show modal
          const modal = document.getElementById('user-form-modal-backdrop');
          if (modal) modal.classList.add('show');
        }
      });
    });

    // Bind Close buttons for User modal
    const userModal = document.getElementById('user-form-modal-backdrop');
    const closeBtn = document.getElementById('user-modal-close');
    if (closeBtn && userModal) {
      closeBtn.addEventListener('click', () => {
        userModal.classList.remove('show');
      });
    }
    
    if (userModal) {
      const cancelBtns = userModal.querySelectorAll('.btn-modal-cancel');
      cancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          userModal.classList.remove('show');
        });
      });
    }

    // Bind Photo upload change preview
    const photoUploadInput = document.getElementById('op-photo');
    if (photoUploadInput) {
      photoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            editPhotoBase64 = event.target.result;
            const preview = document.getElementById('op-photo-preview');
            const container = document.getElementById('op-photo-preview-container');
            if (preview && container) {
              preview.src = editPhotoBase64;
              container.style.display = 'flex';
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Bind Form submit action (Handles both Add and Edit details)
    const opForm = document.getElementById('form-operator-account');
    if (opForm) {
      opForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('op-name').value.trim();
        const password = document.getElementById('op-password').value;
        const role = document.getElementById('op-role').value;
        const mobile = document.getElementById('op-mobile').value.trim();
        const email = document.getElementById('op-email').value.trim();
        const baseSalary = parseFloat(document.getElementById('op-salary').value || 0);
 
        if (editingUsername) {
          // Edit Mode
          const result = auth.updateUser(editingUsername, {
            name,
            password,
            role,
            mobile,
            email,
            photo: editPhotoBase64,
            baseSalary
          });
          
          if (result.success) {
            store.loadState(); // Force reload staff lists
            appInstance.showToast(`Operator account @${editingUsername} updated successfully!`, 'success');
            editingUsername = null;
            editPhotoBase64 = '';
            
            // Hide modal
            if (userModal) userModal.classList.remove('show');
            
            // If editing own details, re-render layouts to trigger sidebar updates
            if (result.user.username === auth.currentUser.username) {
              appInstance.renderLayout((mount, app) => renderUserManagement(mount, app));
            } else {
              renderView();
            }
          } else {
            alert(result.message);
          }
        } else {
          // Add Mode
          const username = document.getElementById('op-username').value.trim().toLowerCase();
          const result = auth.addUser(name, username, password, role, mobile, email, editPhotoBase64, baseSalary);
          if (result.success) {
            store.loadState(); // Force reload staff lists
            appInstance.showToast(`User Account @${username} created successfully!`, 'success');
            editPhotoBase64 = '';
            
            // Hide modal
            if (userModal) userModal.classList.remove('show');
            
            renderView();
          } else {
            alert(result.message);
          }
        }
      });
    }

    // Bind Delete User click listeners
    const deleteBtns = document.querySelectorAll('.btn-delete-user');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.getAttribute('data-username');
        if (confirm(`Are you sure you want to delete user account @${username}?`)) {
          const result = auth.deleteUser(username);
          if (result.success) {
            appInstance.showToast(`User Account @${username} deleted!`, 'success');
            editingUsername = null;
            editPhotoBase64 = '';
            renderView();
          } else {
            alert(result.message);
          }
        }
      });
    });

    // Bind Privilege checkboxes change listener
    const checkboxes = document.querySelectorAll('.privilege-checkbox');
    checkboxes.forEach(box => {
      box.addEventListener('change', (e) => {
        const role = e.target.getAttribute('data-role');
        const priv = e.target.getAttribute('data-priv');
        const val = e.target.checked;

        const success = auth.updatePrivilege(role, priv, val);
        if (success) {
          appInstance.showToast(`Privilege "${priv}" updated for ${role}`, 'success');
        } else {
          appInstance.showToast('Failed to update privilege', 'error');
          e.target.checked = !val; // rollback
        }
      });
    });

    // Default base salary on role selection changes in add mode
    const opRoleSelect = document.getElementById('op-role');
    const opSalaryInput = document.getElementById('op-salary');
    if (opRoleSelect && opSalaryInput) {
      opRoleSelect.addEventListener('change', (e) => {
        if (!editingUsername) {
          const role = e.target.value;
          const defaults = { owner: 35000, admin: 20000, accountant: 18000, staff: 12000 };
          opSalaryInput.value = defaults[role] || 12000;
        }
      });
    }

    // Bind Staff ID Card buttons click
    const idCardUserBtns = document.querySelectorAll('.btn-idcard-user');
    idCardUserBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.getAttribute('data-username');
        const userObj = auth.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userObj) {
          const backdrop = document.getElementById('staff-modal-backdrop');
          const container = document.getElementById('staff-modal-container');
          renderStaffIDCardModal(userObj, container, backdrop, appInstance);
        }
      });
    });
  };

  // Initial Draw
  renderView();

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'User Access & Privilege Control';
  document.getElementById('page-heading-sub').innerText = 'Create operator accounts and configure granular permission overrides';
}

function renderStaffIDCardModal(user, container, backdrop, appInstance) {
  const primaryBank = store.bankAccounts.find(b => b.id === 'main_bob') || store.bankAccounts[0];
  const upiId = primaryBank ? primaryBank.upiId : 'cyberone@barodampay';
  const centerName = store.centerProfile.name || 'CYBER ONE CSC';

  container.innerHTML = `
    <div class="modal-header">
      <h4>Operator Digital ID Card</h4>
      <button id="staff-modal-close" class="modal-close" style="display:none;">&times;</button>
    </div>

    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; overflow-y: auto; max-height: 480px; padding: 10px;">
      <!-- Card Container for printing -->
      <div id="printable-staff-idcard" class="preview-normal" style="background:#f8fafc; border: 1px solid #e2e8f0; padding: 25px; display:flex; flex-direction:column; gap:20px; align-items:center; border-radius: var(--border-radius-md); max-width: 380px;">
        
        <!-- Front Side -->
        <div class="idcard-front" style="width: 330px; height: 200px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 15px; position: relative; color: #0f172a; box-shadow: 0 8px 24px rgba(0,0,0,0.1); overflow:hidden; font-family: 'Outfit', sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <img src="./logo.png" style="width:22px; height:22px; object-fit:contain;" onerror="this.style.display='none';">
              <span style="font-family: 'Outfit', sans-serif; font-size:12px; font-weight:800; letter-spacing:0.5px; color:#1e40af;">CYBER ONE CSC</span>
            </div>
            <span style="font-size:9px; color:#64748b; font-weight:800; letter-spacing:0.5px;">ATTINGAL CENTER</span>
          </div>
          
          <div style="display:flex; gap:12px; align-items:center;">
            ${user.photo ? `
              <img src="${user.photo}" style="width:65px; height:65px; border-radius:50%; object-fit:cover; border: 2.5px solid #3b82f6; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(59,130,246,0.15);">
            ` : `
              <div style="width:65px; height:65px; border-radius:50%; background:#eff6ff; border: 2.5px solid #3b82f6; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:24px; color:#1d4ed8; box-shadow: 0 4px 12px rgba(59,130,246,0.15);">
                ${user.name.charAt(0)}
              </div>
            `}
            <div>
              <h4 style="font-family: 'Outfit', sans-serif; font-size:15px; font-weight:700; margin:0; color:#0f172a;">${user.name}</h4>
              <span style="font-size:11px; color:#0284c7; font-weight:700; font-family:monospace; text-transform:uppercase;">Role: ${user.role}</span>
              <div style="font-size: 10px; color:#475569; margin-top:4px;">Username: <strong>@${user.username}</strong></div>
              <div style="font-size: 10px; color:#475569;">Mob: <strong>${user.mobile || '—'}</strong></div>
            </div>
          </div>
          <div style="position:absolute; bottom:12px; left:15px; right:15px; font-size:9px; color:#64748b; display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; padding-top:6px;">
            <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Email: ${user.email || '—'}</span>
            <span style="font-weight:700; color:#1d4ed8;">OPERATOR IDENTITY</span>
          </div>
        </div>

        <!-- Back Side -->
        <div class="idcard-back" style="width: 330px; height: 200px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 15px; position: relative; color: #0f172a; box-shadow: 0 8px 24px rgba(0,0,0,0.1); display:flex; flex-direction:column; justify-content:space-between; align-items:center; font-family: 'Outfit', sans-serif;">
          <div style="width: 100%; border-bottom: 2px solid #e2e8f0; padding-bottom:5px; font-size: 10px; font-weight:800; color:#475569; text-align:center; letter-spacing:0.8px;">
            SCAN FOR QUICK UPI PAYMENT
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-grow:1; padding: 10px 0;">
            <div style="text-align:left; max-width:170px;">
              <h5 style="font-family: 'Outfit', sans-serif; font-size:11px; font-weight:800; margin:0 0 4px 0; color:#1d4ed8; text-transform:uppercase;">${centerName}</h5>
              <p style="font-size:8px; color:#475569; margin:2px 0; line-height:1.2;">${store.centerProfile.address || 'Attingal'}</p>
              <p style="font-size:8px; color:#475569; margin:2px 0;">Mob: ${store.centerProfile.mobile || '—'}</p>
              <p style="font-size:8px; color:#475569; margin:2px 0;">UPI ID: <strong>${upiId}</strong></p>
            </div>
            
            <!-- UPI QR Code -->
            <div style="background:#fff; padding:5px; border-radius:6px; border: 1px solid #cbd5e1; box-shadow: 0 4px 10px rgba(0,0,0,0.06); width: 90px; height: 90px; display: flex; align-items: center; justify-content: center;">
              ${primaryBank && primaryBank.qrCode ? `
                <img src="${primaryBank.qrCode}" style="width:80px; height:80px; object-fit:contain; display:block;">
              ` : `
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=upi://pay?pa=${encodeURIComponent(upiId)}%26pn=${encodeURIComponent(centerName)}" style="width:80px; height:80px; display:block;">
              `}
            </div>
          </div>
          
          <div style="width:100%; font-size:8px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:5px; text-align:center; font-weight:500;">
            Common Service Center (CSC) | Attingal Branch
          </div>
        </div>

      </div>
    </div>

    <div style="display:flex; gap:10px; margin-top:20px; border-top:1px solid var(--panel-border); padding-top:15px;">
      <button id="btn-print-staff-idcard" class="btn btn-primary" style="flex-grow:1;">
        <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Card
      </button>
      <button id="btn-download-staff-idcard" class="btn btn-secondary" style="flex-grow:1;">
        <i data-lucide="download" style="width:16px; height:16px;"></i> Download PDF
      </button>
      <button type="button" class="btn btn-secondary btn-modal-cancel">Close</button>
    </div>
  `;

  lucide.createIcons();
  const closeModal = () => backdrop.classList.remove('show');
  container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
  backdrop.classList.add('show');

  // Print button
  document.getElementById('btn-print-staff-idcard').addEventListener('click', () => {
    appInstance.printElement('normal');
  });

  // Download PDF button
  document.getElementById('btn-download-staff-idcard').addEventListener('click', () => {
    appInstance.downloadElementAsPDF('printable-staff-idcard', `Staff_Card_${user.username}.pdf`, false);
  });
}

export default renderUserManagement;
