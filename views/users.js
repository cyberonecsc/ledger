/* ==========================================================================
   CYBER ONE Center Management Platform - User Management View (views/users.js)
   ========================================================================== */

import { auth } from '../auth.js';

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
        <div class="section-header" style="margin-bottom:20px; border-bottom:1px solid var(--panel-border); padding-bottom:15px;">
          <div>
            <h3>User Management & Access Control</h3>
            <span style="font-size:12px; color:var(--text-muted);">Manage system operator credentials, profile details, and configure role privileges</span>
          </div>
        </div>
        
        <div class="form-row" style="grid-template-columns: 1.3fr 2fr; gap:30px; align-items: start;">
          <!-- Left Column: Accounts list & Add/Edit Form -->
          <div style="border-right: 1px solid var(--panel-border); padding-right: 25px; display:flex; flex-direction:column; gap:25px;">
            <div>
              <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Active Accounts</h5>
              <div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:5px;">
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
                    
                    <div style="display:flex; gap:6px;">
                      <!-- Edit Button (Available for all users, including owner) -->
                      <button class="btn-edit-user btn btn-secondary" data-username="${u.username}" style="padding: 4px 8px; font-size: 11px; height: 24px; display: flex; align-items: center; justify-content: center; gap: 4px; border-radius: 4px;">
                        <i data-lucide="edit-2" style="width: 11px; height: 11px;"></i> Edit
                      </button>
                      
                      ${u.username !== 'owner' ? `
                        <button class="btn-delete-user" data-username="${u.username}" style="padding: 4px; color: var(--color-danger); background: none; border: 1px solid rgba(239,68,68,0.15); border-radius: 4px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:var(--transition-smooth); width: 24px; height: 24px;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='none'">
                          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Form: Add/Edit Account -->
            <div style="padding-top:15px; border-top:1px dashed var(--panel-border);">
              <h5 id="form-title" style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">
                ${editingUsername ? `Edit Account: @${editingUsername}` : 'Add New Account'}
              </h5>
              
              <form id="form-operator-account" style="display:flex; flex-direction:column; gap:10px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Full Name</label>
                  <input type="text" id="op-name" class="form-control" placeholder="Full Name" style="font-size:12px; padding:8px 12px;" required>
                </div>
                
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Username</label>
                  <input type="text" id="op-username" class="form-control" placeholder="Username" style="font-size:12px; padding:8px 12px;" required ${editingUsername ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                </div>
                
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Password</label>
                  <input type="password" id="op-password" class="form-control" placeholder="Password" style="font-size:12px; padding:8px 12px;" required>
                </div>
                
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Access Level (Role)</label>
                  <select id="op-role" class="form-control" style="font-size:12px; padding:8px 12px;" required ${editingUsername === 'owner' ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                    <option value="owner">Owner (Full Permissions)</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Mobile (WhatsApp)</label>
                  <input type="tel" id="op-mobile" class="form-control" placeholder="Mobile Number" style="font-size:12px; padding:8px 12px;">
                </div>

                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Email ID</label>
                  <input type="email" id="op-email" class="form-control" placeholder="Email ID" style="font-size:12px; padding:8px 12px;">
                </div>

                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px; margin-bottom:4px;">Profile Photo</label>
                  <input type="file" id="op-photo" class="form-control" accept="image/*" style="font-size:12px; padding:6px 12px;">
                  <div id="op-photo-preview-container" style="display:none; align-items:center; gap:10px; margin-top:8px;">
                    <img id="op-photo-preview" src="" alt="Avatar Preview" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--color-primary);">
                    <span style="font-size:10px; color:var(--text-muted);">Photo uploaded</span>
                  </div>
                </div>
                
                <div style="display:flex; gap:8px; margin-top:8px;">
                  <button type="submit" class="btn btn-sm btn-primary" style="flex-grow: 1; font-size:11px; padding:8px 12px;">
                    <i data-lucide="check-circle" style="width:13px; height:13px;"></i> 
                    ${editingUsername ? 'Save Changes' : 'Create Account'}
                  </button>
                  ${editingUsername ? `
                    <button type="button" id="btn-cancel-edit" class="btn btn-sm btn-secondary" style="font-size:11px; padding:8px 12px;">
                      Cancel
                    </button>
                  ` : ''}
                </div>
              </form>
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
    `;

    // Re-initialize lucide icons
    lucide.createIcons();

    // Bind Edit Account buttons click
    const editBtns = document.querySelectorAll('.btn-edit-user');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const username = e.currentTarget.getAttribute('data-username');
        const userObj = auth.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userObj) {
          editingUsername = userObj.username;
          editPhotoBase64 = userObj.photo || '';
          
          // Re-render views inside panel to switch form content values
          renderView();
          
          // Populate fields
          document.getElementById('op-name').value = userObj.name;
          document.getElementById('op-username').value = userObj.username;
          document.getElementById('op-password').value = userObj.password;
          document.getElementById('op-role').value = userObj.role;
          document.getElementById('op-mobile').value = userObj.mobile || '';
          document.getElementById('op-email').value = userObj.email || '';
          
          if (userObj.photo) {
            const preview = document.getElementById('op-photo-preview');
            const container = document.getElementById('op-photo-preview-container');
            if (preview && container) {
              preview.src = userObj.photo;
              container.style.display = 'flex';
            }
          }
        }
      });
    });

    // Bind Cancel Edit button click
    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingUsername = null;
        editPhotoBase64 = '';
        renderView();
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

        if (editingUsername) {
          // Edit Mode
          const result = auth.updateUser(editingUsername, {
            name,
            password,
            role,
            mobile,
            email,
            photo: editPhotoBase64
          });
          
          if (result.success) {
            appInstance.showToast(`Operator account @${editingUsername} updated successfully!`, 'success');
            editingUsername = null;
            editPhotoBase64 = '';
            
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
          const result = auth.addUser(name, username, password, role, mobile, email, editPhotoBase64);
          if (result.success) {
            appInstance.showToast(`User Account @${username} created successfully!`, 'success');
            editPhotoBase64 = '';
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
  };

  // Initial Draw
  renderView();

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'User Access & Privilege Control';
  document.getElementById('page-heading-sub').innerText = 'Create operator accounts and configure granular permission overrides';
}

export default renderUserManagement;
