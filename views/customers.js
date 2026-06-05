/* ==========================================================================
   CYBERONE Center Management Platform - Customers View (views/customers.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderCustomers(mountPoint, appInstance) {
  const customers = store.customers;

  mountPoint.innerHTML = `
    <!-- Search / Filter and Add Customer -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="cust-search" class="form-control" placeholder="Search by name, phone, or ID...">
      </div>

      <div class="filter-actions">
        <button id="btn-add-cust" class="btn btn-primary">
          <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i> Add Citizen
        </button>
      </div>
    </div>

    <!-- Customers Directory Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Citizen ID</th>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>Outstanding Credit</th>
              <th style="text-align: center;">Total Visits</th>
              <th>Last Visited</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="cust-tbody">
            ${renderCustomerTableRows(customers)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals Backdrop -->
    <div id="cust-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" id="cust-modal-container" style="max-width: 650px;">
        <!-- Dynamic Modal Forms Mount Here -->
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Citizen & Customer Directory';
  document.getElementById('page-heading-sub').innerText = 'Manage customer profiles, loyalty visits and outstanding store credit balances';

  lucide.createIcons();

  // Search Filter functionality
  const custSearch = document.getElementById('cust-search');
  custSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#cust-tbody tr');
    
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  const backdrop = document.getElementById('cust-modal-backdrop');
  const container = document.getElementById('cust-modal-container');

  const closeModal = () => backdrop.classList.remove('show');

  // Add Customer modal opening
  document.getElementById('btn-add-cust').addEventListener('click', () => {
    container.innerHTML = `
      <div class="modal-header">
        <h4>Register New Citizen</h4>
        <button id="cust-modal-close" class="modal-close" style="display:none;">&times;</button>
      </div>

      <form id="form-add-cust">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="cust-name" class="form-control" placeholder="e.g. Ramesh Kumar" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="cust-phone" class="form-control" placeholder="10-digit mobile" required pattern="[0-9]{10}">
          </div>
          <div class="form-group">
            <label class="form-label">Email ID (Optional)</label>
            <input type="email" id="cust-email" class="form-control" placeholder="name@domain.com">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Full Address</label>
          <input type="text" id="cust-address" class="form-control" placeholder="House name, street, post office">
        </div>

        <div class="form-group">
          <label class="form-label">Starting Credit Balance (₹) (Optional)</label>
          <input type="number" step="0.01" id="cust-credit" class="form-control" value="0.00">
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-primary" style="flex-grow:1;">
            <i data-lucide="user-check" style="width:16px; height:16px;"></i> Register Citizen
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();
    container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
    backdrop.classList.add('show');

    document.getElementById('form-add-cust').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newCust = store.addCustomer({
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        email: document.getElementById('cust-email').value,
        address: document.getElementById('cust-address').value,
        creditBalance: parseFloat(document.getElementById('cust-credit').value || 0)
      });

      appInstance.showToast(`Citizen registered: ${newCust.uniqueNumber}`, 'success');
      closeModal();
      appInstance.handleRouting();
    });
  });

  // Citizen Profile and Log Book details
  const detailButtons = document.querySelectorAll('.btn-view-cust');
  detailButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const custId = e.currentTarget.getAttribute('data-id');
      const customer = store.customers.find(c => c.id === custId);
      if (!customer) return;

      if (!customer.visitLogs) {
        customer.visitLogs = [];
      }

      // Find all transactions associated with this customer
      const customerTxns = [];
      Object.keys(store.dailyLogs).forEach(date => {
        const log = store.dailyLogs[date];
        log.transactions.forEach(t => {
          if (t.customerId === custId) {
            customerTxns.push({ date, ...t });
          }
        });
      });

      container.innerHTML = `
        <div class="modal-header">
          <h4>Citizen Profile & Log Book: ${customer.name}</h4>
          <button id="cust-modal-close" class="modal-close" style="display:none;">&times;</button>
        </div>

        <div style="display: grid; grid-template-columns: 320px 350px 1fr; gap: 20px; height: 580px; padding: 5px 0;">
          <!-- Column 1: Profile & Credit -->
          <div style="display: flex; flex-direction: column; gap: 15px; height: 100%; overflow-y: auto; padding-right: 5px;">
            <!-- Profile metadata -->
            <div class="glass-card" id="profile-metadata-card" style="padding:15px; background: rgba(255,255,255,0.01); position: relative; margin-bottom: 0;">
              <button id="btn-edit-profile-toggle" class="btn btn-sm btn-secondary" style="position: absolute; right: 15px; top: 15px; padding: 4px 8px; font-size: 11px;">
                <i data-lucide="edit-3" style="width: 12px; height: 12px; margin-right: 4px;"></i> Edit Profile
              </button>
              <div id="profile-view-fields">
                <div style="font-size:14px;"><strong>ID:</strong> <code>${customer.uniqueNumber}</code></div>
                <div style="font-size:14px; margin-top:4px;"><strong>Name:</strong> ${customer.name}</div>
                <div style="font-size:14px; margin-top:4px;"><strong>Phone:</strong> ${customer.phone}</div>
                <div style="font-size:14px; margin-top:4px;"><strong>Email:</strong> ${customer.email || '—'}</div>
                <div style="font-size:14px; margin-top:4px;"><strong>Address:</strong> ${customer.address || '—'}</div>
                <div style="font-size:14px; margin-top:4px;"><strong>Visits:</strong> ${customer.visitCount} visits</div>
              </div>
              <div id="profile-edit-fields" style="display: none; margin-top: 5px;">
                <form id="form-edit-customer-profile" style="display: flex; flex-direction: column; gap: 8px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Name</label>
                    <input type="text" id="edit-cust-name" class="form-control" value="${customer.name}" style="height: 32px; font-size: 12px;" required>
                  </div>
                  <div class="form-row" style="margin-top: 0; margin-bottom: 0;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Phone</label>
                      <input type="text" id="edit-cust-phone" class="form-control" value="${customer.phone}" style="height: 32px; font-size: 12px;" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Email</label>
                      <input type="email" id="edit-cust-email" class="form-control" value="${customer.email || ''}" style="height: 32px; font-size: 12px;">
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Address</label>
                    <input type="text" id="edit-cust-address" class="form-control" value="${customer.address || ''}" style="height: 32px; font-size: 12px;">
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button type="submit" class="btn btn-primary btn-sm" style="flex: 1; height: 32px; font-size: 11px;">Save Changes</button>
                    <button type="button" id="btn-edit-profile-cancel" class="btn btn-secondary btn-sm" style="flex: 1; height: 32px; font-size: 11px;">Cancel</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Credit Balance Management Form -->
            <div class="glass-card" style="padding:15px; border-color: ${customer.creditBalance > 0 ? 'var(--color-warning)' : 'var(--panel-border)'}; margin-bottom: 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size: 13px; font-weight:600; color:var(--text-muted);">Outstanding Balance</span>
                <span style="font-family:var(--font-display); font-size:18px; font-weight:700; color:${customer.creditBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">₹${customer.creditBalance.toFixed(2)}</span>
              </div>
              
              <form id="form-adjust-credit" style="display:flex; flex-direction:column; gap:10px; align-items:stretch;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:11px;">Record Payment / Add Credit (₹)</label>
                  <input type="number" step="0.01" id="credit-adjust-amount" class="form-control" placeholder="0.00" required>
                </div>
                <div style="display:flex; gap:8px; margin-top:5px;">
                  <select id="credit-action" class="form-control" style="flex: 1; font-size:12px; height: 32px;">
                    <option value="pay">Receive Payment</option>
                    <option value="add">Add Credit</option>
                  </select>
                  <button type="submit" class="btn btn-sm btn-primary" style="height: 32px; padding: 0 15px;">Apply</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Column 2: Log Visit Purpose Form -->
          <div style="display: flex; flex-direction: column; gap: 15px; height: 100%; overflow-y: auto; padding-right: 5px;">
            <!-- Log New Visit Purpose Form -->
            <div class="glass-card" style="padding:15px; background: rgba(255,255,255,0.01); margin-bottom: 0;">
              <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px;">Log New Visit Purpose</h5>
              <form id="form-log-visit">
                <div class="form-group">
                  <label class="form-label">Purpose of Visit</label>
                  <input type="text" id="visit-purpose" class="form-control" placeholder="e.g. Website Registration, Certificate filing" required list="visit-purposes">
                  <datalist id="visit-purposes">
                    <option value="Website Registration">
                    <option value="e-District Certificate">
                    <option value="PAN Card Application">
                    <option value="Aadhaar Biometric Update">
                    <option value="Electricity Bill Payment">
                    <option value="Money Transfer AEPS">
                    <option value="DTP & Photocopy">
                  </datalist>
                </div>

                <div class="form-row" style="margin-top: 0; margin-bottom: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Operator Staff</label>
                    <select id="visit-staff" class="form-control" required>
                      ${store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:20px; margin-bottom: 0;">
                    <input type="checkbox" id="visit-is-webreg" style="width:18px; height:18px; cursor:pointer;">
                    <label class="form-label" for="visit-is-webreg" style="margin-bottom:0; cursor:pointer;">Is Web Reg?</label>
                  </div>
                </div>

                <!-- Website registration details (Hidden by default) -->
                <div id="webreg-fields" style="display:none; background:rgba(255,255,255,0.02); border:1px solid var(--panel-border); padding:12px; border-radius:var(--border-radius-sm); margin-bottom:15px;">
                  <div class="form-group">
                    <label class="form-label">Website Name / URL</label>
                    <input type="text" id="web-url" class="form-control" placeholder="e.g. Kerala PSC Thulasi">
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Registration ID</label>
                      <input type="text" id="web-login-id" class="form-control" placeholder="Login ID">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Password</label>
                      <input type="text" id="web-password" class="form-control" placeholder="Password">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Ref Number</label>
                      <input type="text" id="web-ref-no" class="form-control" placeholder="Application / Ref No">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Applied Date</label>
                      <input type="date" id="web-applied-date" class="form-control" value="${appInstance.getActiveDate()}">
                    </div>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-sm" style="width:100%;">
                  <i data-lucide="plus-circle" style="width:14px; height:14px; margin-right:4px;"></i> Log Visit Purpose
                </button>
              </form>
            </div>
          </div>

          <!-- Column 3: History Lists -->
          <div style="display: flex; flex-direction: column; gap: 15px; height: 100%; overflow: hidden;">
            <!-- Log Book Visits Listing -->
            <div class="glass-card" style="padding: 15px; margin-bottom: 0; display: flex; flex-direction: column; flex: 1; min-height: 0;">
              <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px; color: var(--color-primary);">Visit Purpose History Log</h5>
              <div style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex: 1; padding-right: 5px; min-height: 0;">
                ${customer.visitLogs.length === 0 ? `
                  <div style="font-size:12px; color:var(--text-dimmed); text-align:center; padding:10px;">No visit details logged yet.</div>
                ` : customer.visitLogs.map(log => `
                  <div style="padding:10px; background:rgba(255,255,255,0.01); border:1px solid var(--panel-border); border-radius:var(--border-radius-sm); font-size:12px;">
                    <div style="display:flex; justify-content:space-between; font-weight:600; color: #fff;">
                      <span>${log.purpose}</span>
                      <span style="font-size:10px; color:var(--text-muted);">${log.date}</span>
                    </div>
                    <div style="font-size:11px; margin-top:4px; color: var(--text-muted);">Operator: <strong>${log.staff}</strong></div>
                    ${log.isWebReg ? `
                      <div style="margin-top:6px; padding:6px; background:rgba(0,0,0,0.2); border-radius:4px; font-family:monospace; font-size:11px;">
                        <div>Web: ${log.webUrl || '—'}</div>
                        <div>ID: <code>${log.webLoginId || '—'}</code> | Pass: <code>${log.webPassword || '—'}</code></div>
                        <div>Ref: <code>${log.webRefNo || '—'}</code> | Date: ${log.webAppliedDate || '—'}</div>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Transaction History -->
            <div class="glass-card" style="padding: 15px; margin-bottom: 0; display: flex; flex-direction: column; flex: 1; min-height: 0;">
              <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px;">Transaction History (${customerTxns.length})</h5>
              <div style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex: 1; padding-right: 5px; min-height: 0;">
                ${customerTxns.length === 0 ? `
                  <div style="font-size:12px; color:var(--text-dimmed); text-align:center; padding:15px;">No transactions logged.</div>
                ` : customerTxns.map(t => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.01); border:1px solid var(--panel-border); border-radius:var(--border-radius-sm); font-size:12px;">
                    <div>
                      <div style="font-weight:600;">${t.description}</div>
                      <div style="font-size:10px; color:var(--text-dimmed);">${t.date}</div>
                    </div>
                    <strong style="color: ${t.type === 'sale' ? 'var(--color-success)' : 'var(--color-danger)'};">
                      ₹${t.amount.toFixed(2)}
                    </strong>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:20px; border-top: 1px solid var(--panel-border); padding-top: 15px;">
          <button type="button" class="btn btn-secondary btn-modal-cancel">Close</button>
        </div>
      `;

      lucide.createIcons();
      container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
      backdrop.classList.add('show');
 
      // Edit Profile Event Handlers
      const btnEditProfileToggle = document.getElementById('btn-edit-profile-toggle');
      const btnEditProfileCancel = document.getElementById('btn-edit-profile-cancel');
      const profileViewFields = document.getElementById('profile-view-fields');
      const profileEditFields = document.getElementById('profile-edit-fields');
      const formEditProfile = document.getElementById('form-edit-customer-profile');

      if (btnEditProfileToggle && btnEditProfileCancel && profileViewFields && profileEditFields && formEditProfile) {
        btnEditProfileToggle.addEventListener('click', () => {
          profileViewFields.style.display = 'none';
          profileEditFields.style.display = 'block';
          btnEditProfileToggle.style.display = 'none';
        });

        btnEditProfileCancel.addEventListener('click', () => {
          profileViewFields.style.display = 'block';
          profileEditFields.style.display = 'none';
          btnEditProfileToggle.style.display = 'block';
        });

        formEditProfile.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const nameVal = document.getElementById('edit-cust-name').value.trim();
          const phoneVal = document.getElementById('edit-cust-phone').value.trim();
          const emailVal = document.getElementById('edit-cust-email').value.trim();
          const addressVal = document.getElementById('edit-cust-address').value.trim();

          if (!nameVal || !phoneVal) {
            alert('Name and Phone fields are required!');
            return;
          }

          const updated = store.updateCustomer(custId, {
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            address: addressVal
          });

          if (updated) {
            appInstance.showToast('Citizen profile updated successfully!', 'success');
            closeModal();
            appInstance.handleRouting();
          } else {
            appInstance.showToast('Failed to update citizen profile', 'error');
          }
        });
      }

      // Handle checkbox toggles for webreg fields
      const webRegCheck = document.getElementById('visit-is-webreg');
      const webRegFields = document.getElementById('webreg-fields');
      if (webRegCheck && webRegFields) {
        webRegCheck.addEventListener('change', (ev) => {
          webRegFields.style.display = ev.target.checked ? 'block' : 'none';
        });
      }

      // Log Visit submit
      document.getElementById('form-log-visit').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const purpose = document.getElementById('visit-purpose').value;
        const staff = document.getElementById('visit-staff').value;
        const isWebReg = document.getElementById('visit-is-webreg').checked;

        const logEntry = {
          purpose,
          staff,
          isWebReg
        };

        if (isWebReg) {
          logEntry.webUrl = document.getElementById('web-url').value;
          logEntry.webLoginId = document.getElementById('web-login-id').value;
          logEntry.webPassword = document.getElementById('web-password').value;
          logEntry.webRefNo = document.getElementById('web-ref-no').value;
          logEntry.webAppliedDate = document.getElementById('web-applied-date').value;
        }

        store.logCustomerVisitPurpose(custId, logEntry);
        appInstance.showToast('Visit details logged successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });

      // Credit adjustment form submit
      document.getElementById('form-adjust-credit').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const amt = parseFloat(document.getElementById('credit-adjust-amount').value);
        const action = document.getElementById('credit-action').value;
        const diff = action === 'pay' ? -amt : amt;

        if (action === 'pay' && amt > customer.creditBalance) {
          alert('Cannot pay more than the outstanding credit balance!');
          return;
        }

        store.adjustCustomerCredit(custId, diff);
        
        // Log transaction in ledger automatically if credit payment received!
        if (action === 'pay') {
          store.addTransaction(appInstance.getActiveDate(), {
            type: 'sale',
            description: `Credit payment: ${customer.name}`,
            amount: amt,
            paidByCash: amt, // default to cash payment
            paidByUPI: 0,
            deductedFrom: 'none',
            deductedAmount: 0,
            customerId: custId,
            staffId: 'STAFF-02'
          });
        }

        appInstance.showToast(action === 'pay' ? 'Payment logged and outstanding adjusted!' : 'Credit log updated!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });

  // ID Card modal opening
  const idCardBtns = document.querySelectorAll('.btn-idcard-cust');
  idCardBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const custId = e.currentTarget.getAttribute('data-id');
      const customer = customers.find(c => c.id === custId);
      if (!customer) return;

      renderIDCardModal(customer, container, backdrop, appInstance);
    });
  });

  // Customer Deletion handler
  const deleteCustBtns = document.querySelectorAll('.btn-delete-cust');
  deleteCustBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const custId = e.currentTarget.getAttribute('data-id');
      const customer = customers.find(c => c.id === custId);
      if (!customer) return;

      if (confirm(`Are you sure you want to delete customer "${customer.name}"? This will permanently remove their profile.`)) {
        const deleted = store.deleteCustomer(custId);
        if (deleted) {
          appInstance.showToast(`Deleted customer: ${customer.name}`, 'success');
          appInstance.handleRouting();
        } else {
          appInstance.showToast('Failed to delete customer', 'error');
        }
      }
    });
  });
}

function renderIDCardModal(customer, container, backdrop, appInstance) {
  const primaryBank = store.bankAccounts.find(b => b.id === 'main_bob') || store.bankAccounts[0];
  const upiId = primaryBank ? primaryBank.upiId : 'cyberone@barodampay';
  const centerName = store.centerProfile.name || 'CYBER ONE CSC';

  container.innerHTML = `
    <div class="modal-header">
      <h4>Citizen Digital ID Card</h4>
      <button id="cust-modal-close" class="modal-close" style="display:none;">&times;</button>
    </div>

    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; overflow-y: auto; max-height: 480px; padding: 10px;">
      <!-- Card Container for printing -->
      <div id="printable-citizen-idcard" class="preview-normal" style="background:#f8fafc; border: 1px solid #e2e8f0; padding: 25px; display:flex; flex-direction:column; gap:20px; align-items:center; border-radius: var(--border-radius-md); max-width: 380px;">
        
        <!-- Front Side -->
        <div class="idcard-front" style="width: 330px; height: 200px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 15px; position: relative; color: #0f172a; box-shadow: 0 8px 24px rgba(0,0,0,0.1); overflow:hidden; font-family: 'Outfit', sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <img src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" style="width:22px; height:22px; object-fit:contain;" onerror="this.style.display='none';">
              <span style="font-family: 'Outfit', sans-serif; font-size:12px; font-weight:800; letter-spacing:0.5px; color:#1e40af;">CYBER ONE CSC</span>
            </div>
            <span style="font-size:9px; color:#64748b; font-weight:800; letter-spacing:0.5px;">ATTINGAL CENTER</span>
          </div>
          
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="width:65px; height:65px; border-radius:50%; background:#eff6ff; border: 2.5px solid #3b82f6; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:24px; color:#1d4ed8; box-shadow: 0 4px 12px rgba(59,130,246,0.15);">
              ${customer.name.charAt(0)}
            </div>
            <div>
              <h4 style="font-family: 'Outfit', sans-serif; font-size:15px; font-weight:700; margin:0; color:#0f172a;">${customer.name}</h4>
              <span style="font-size:11px; color:#0284c7; font-weight:700; font-family:monospace;">ID: ${customer.uniqueNumber}</span>
              <div style="font-size: 10px; color:#475569; margin-top:4px;">Mob: <strong>${customer.phone}</strong></div>
              <div style="font-size: 10px; color:#475569;">Email: <strong>${customer.email || '—'}</strong></div>
            </div>
          </div>
          <div style="position:absolute; bottom:12px; left:15px; right:15px; font-size:9px; color:#64748b; display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; padding-top:6px;">
            <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Address: ${customer.address || 'Attingal'}</span>
            <span style="font-weight:700; color:#1d4ed8;">CITIZEN IDENTITY</span>
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
      <button id="btn-print-idcard" class="btn btn-primary" style="flex-grow:1;">
        <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Card
      </button>
      <button id="btn-download-idcard" class="btn btn-secondary" style="flex-grow:1;">
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
  document.getElementById('btn-print-idcard').addEventListener('click', () => {
    appInstance.printElement('normal');
  });

  // Download PDF button
  document.getElementById('btn-download-idcard').addEventListener('click', () => {
    appInstance.downloadElementAsPDF('printable-citizen-idcard', `ID_Card_${customer.uniqueNumber}.pdf`, false);
  });
}

function renderCustomerTableRows(customers) {
  if (customers.length === 0) {
    return `<tr><td colspan="8" style="text-align:center; color:var(--text-dimmed); padding:20px;">No registered citizens found.</td></tr>`;
  }

  return customers.map(c => `
    <tr>
      <td><code>${c.uniqueNumber}</code></td>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.address || '—'}</td>
      <td style="font-weight:600; color: ${c.creditBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">
        ₹${c.creditBalance.toFixed(2)}
      </td>
      <td style="text-align: center;">
        <span class="badge" style="background: rgba(99,102,241,0.05); color: var(--color-primary); border: 1px solid rgba(99,102,241,0.1);">${c.visitCount} visits</span>
      </td>
      <td><span style="font-size:12px; color:var(--text-muted);">${c.lastVisitedAt || 'Never'}</span></td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-sm btn-secondary btn-view-cust" data-id="${c.id}">
          <i data-lucide="user" style="width: 14px; height: 14px; margin-right: 4px;"></i> Profile
        </button>
        <button class="btn btn-sm btn-secondary btn-idcard-cust" data-id="${c.id}" style="margin-left:5px; border-color:rgba(99,102,241,0.25);">
          <i data-lucide="contact" style="width: 14px; height: 14px; margin-right: 4px; color: var(--color-primary);"></i> ID Card
        </button>
        <button class="btn btn-sm btn-danger btn-delete-cust" data-id="${c.id}" style="margin-left:5px;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px; margin-right: 4px;"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}
export default renderCustomers;

