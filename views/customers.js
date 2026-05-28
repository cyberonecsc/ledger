/* ==========================================================================
   Akshaya Center Management Platform - Customers View (views/customers.js)
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

        <div style="display:flex; flex-direction:column; gap:15px; max-height:480px; overflow-y:auto; padding-right:5px;">
          <!-- Profile metadata -->
          <div class="glass-card" style="padding:15px; background: rgba(255,255,255,0.01);">
            <div style="font-size:14px;"><strong>ID:</strong> <code>${customer.uniqueNumber}</code></div>
            <div style="font-size:14px; margin-top:4px;"><strong>Phone:</strong> ${customer.phone}</div>
            <div style="font-size:14px; margin-top:4px;"><strong>Email:</strong> ${customer.email || '—'}</div>
            <div style="font-size:14px; margin-top:4px;"><strong>Address:</strong> ${customer.address || '—'}</div>
            <div style="font-size:14px; margin-top:4px;"><strong>Visits:</strong> ${customer.visitCount} visits</div>
          </div>

          <!-- Credit Balance Management Form -->
          <div class="glass-card" style="padding:15px; border-color: ${customer.creditBalance > 0 ? 'var(--color-warning)' : 'var(--panel-border)'};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size: 13px; font-weight:600; color:var(--text-muted);">Outstanding Balance</span>
              <span style="font-family:var(--font-display); font-size:18px; font-weight:700; color:${customer.creditBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">₹${customer.creditBalance.toFixed(2)}</span>
            </div>
            
            <form id="form-adjust-credit" style="display:flex; gap:10px; align-items:flex-end;">
              <div class="form-group" style="flex-grow:1; margin-bottom:0;">
                <label class="form-label" style="font-size:11px;">Record Payment / Add Credit (₹)</label>
                <input type="number" step="0.01" id="credit-adjust-amount" class="form-control" placeholder="0.00" required>
              </div>
              <select id="credit-action" class="form-control" style="width:120px; font-size:12px;">
                <option value="pay">Receive Payment</option>
                <option value="add">Add Credit</option>
              </select>
              <button type="submit" class="btn btn-sm btn-primary">Apply</button>
            </form>
          </div>

          <!-- Log Book Visits Listing -->
          <div class="glass-card" style="padding: 15px;">
            <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px; color: var(--color-primary);">Visit Purpose History Log</h5>
            <div style="display:flex; flex-direction:column; gap:8px; max-height: 150px; overflow-y:auto; padding-right: 5px;">
              ${customer.visitLogs.length === 0 ? `
                <div style="font-size:12px; color:var(--text-dimmed); text-align:center; padding:10px;">No visit details logged yet. Use the form below to log their visit purpose.</div>
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
                      <div>Ref No: <code>${log.webRefNo || '—'}</code> | Date: ${log.webAppliedDate || '—'}</div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Log New Visit Purpose Form -->
          <div class="glass-card" style="padding:15px; background: rgba(255,255,255,0.01);">
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

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Operator Staff</label>
                  <select id="visit-staff" class="form-control" required>
                    <option value="Shibu (Owner)">Shibu (Owner)</option>
                    <option value="Anil Kumar (Admin)">Anil Kumar (Admin)</option>
                    <option value="Saritha (Accountant)">Saritha (Accountant)</option>
                    <option value="Manu (Staff)">Manu (Staff)</option>
                  </select>
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top:20px;">
                  <input type="checkbox" id="visit-is-webreg" style="width:18px; height:18px; cursor:pointer;">
                  <label class="form-label" for="visit-is-webreg" style="margin-bottom:0; cursor:pointer;">Is Website Registration?</label>
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
                    <label class="form-label">Registration Login ID</label>
                    <input type="text" id="web-login-id" class="form-control" placeholder="Enter Registration ID">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Registration Password</label>
                    <input type="text" id="web-password" class="form-control" placeholder="Enter Password">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Application / Ref Number</label>
                    <input type="text" id="web-ref-no" class="form-control" placeholder="e.g. APP/2026/89201">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Applied Date</label>
                    <input type="date" id="web-applied-date" class="form-control" value="2026-05-29">
                  </div>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-sm" style="width:100%;">
                <i data-lucide="plus-circle" style="width:14px; height:14px; margin-right:4px;"></i> Log Visit Purpose
              </button>
            </form>
          </div>

          <!-- Transaction History -->
          <div>
            <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px;">Transaction History (${customerTxns.length})</h5>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${customerTxns.length === 0 ? `
                <div style="font-size:12px; color:var(--text-dimmed); text-align:center; padding:15px;">No transactions logged for this citizen.</div>
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

        <div style="display:flex; justify-content:flex-end; margin-top:20px; border-top: 1px solid var(--panel-border); padding-top: 15px;">
          <button type="button" class="btn btn-secondary btn-modal-cancel">Close</button>
        </div>
      `;

      lucide.createIcons();
      container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
      backdrop.classList.add('show');

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
}

function renderIDCardModal(customer, container, backdrop, appInstance) {
  container.innerHTML = `
    <div class="modal-header">
      <h4>Citizen Digital ID Card</h4>
      <button id="cust-modal-close" class="modal-close" style="display:none;">&times;</button>
    </div>

    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; overflow-y: auto; max-height: 480px; padding: 10px;">
      <!-- Card Container for printing -->
      <div id="printable-citizen-idcard" class="preview-normal" style="background:#060a13; border: 1px solid var(--panel-border); padding: 25px; display:flex; flex-direction:column; gap:20px; align-items:center; border-radius: var(--border-radius-md); max-width: 380px;">
        
        <!-- Front Side -->
        <div class="idcard-front" style="width: 330px; height: 200px; background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; position: relative; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow:hidden; font-family: 'Outfit', sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1.5px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <img src="./logo.png" style="width:22px; height:22px; object-fit:contain;" onerror="this.style.display='none';">
              <span style="font-family: 'Outfit', sans-serif; font-size:12px; font-weight:800; letter-spacing:0.5px; color:#6366f1;">CYBER ONE CSC</span>
            </div>
            <span style="font-size:9px; color:var(--text-muted); font-weight:800; letter-spacing:0.5px;">ATTINGAL CENTER</span>
          </div>
          
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="width:65px; height:65px; border-radius:50%; background:rgba(99, 102, 241, 0.2); border: 2.5px solid #6366f1; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:24px; color:#fff; box-shadow: 0 0 10px rgba(99,102,241,0.4);">
              ${customer.name.charAt(0)}
            </div>
            <div>
              <h4 style="font-family: 'Outfit', sans-serif; font-size:15px; font-weight:700; margin:0; color:#fff;">${customer.name}</h4>
              <span style="font-size:11px; color:#06b6d4; font-weight:700; font-family:monospace;">ID: ${customer.uniqueNumber}</span>
              <div style="font-size: 10px; color:#9ca3af; margin-top:4px;">Mob: ${customer.phone}</div>
              <div style="font-size: 10px; color:#9ca3af;">Email: ${customer.email || '—'}</div>
            </div>
          </div>
          <div style="position:absolute; bottom:12px; left:15px; right:15px; font-size:9px; color:#9ca3af; display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
            <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Address: ${customer.address || 'Attingal'}</span>
            <span style="font-weight:700; color:#6366f1;">CITIZEN IDENTITY</span>
          </div>
        </div>

        <!-- Back Side -->
        <div class="idcard-back" style="width: 330px; height: 200px; background: linear-gradient(135deg, #090e17 0%, #1e1b4b 100%); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; position: relative; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.5); display:flex; flex-direction:column; justify-content:space-between; align-items:center; font-family: 'Outfit', sans-serif;">
          <div style="width: 100%; border-bottom: 1.5px solid rgba(255,255,255,0.05); padding-bottom:5px; font-size: 10px; font-weight:800; color:#9ca3af; text-align:center; letter-spacing:0.8px;">
            SCAN FOR QUICK UPI PAYMENT
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-grow:1; padding: 10px 0;">
            <div style="text-align:left; max-width:170px;">
              <h5 style="font-family: 'Outfit', sans-serif; font-size:11px; font-weight:800; margin:0 0-4px 0; color:#6366f1; text-transform:uppercase;">CYBER ONE Attingal</h5>
              <p style="font-size:8px; color:#9ca3af; margin:2px 0; line-height:1.2;">Room 4B, Central Arcade, Attingal, Trivandrum</p>
              <p style="font-size:8px; color:#9ca3af; margin:2px 0;">Mob: 9048123456</p>
              <p style="font-size:8px; color:#9ca3af; margin:2px 0;">UPI: cyberone@sbi</p>
            </div>
            
            <!-- UPI QR Code -->
            <div style="background:#fff; padding:5px; border-radius:6px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=upi://pay?pa=cyberone@sbi%26pn=CYBERONE%20Attingal" style="width:80px; height:80px; display:block;">
            </div>
          </div>
          
          <div style="width:100%; font-size:8px; color:#6b7280; border-top:1px solid rgba(255,255,255,0.05); padding-top:5px; text-align:center; font-weight:500;">
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
      </td>
    </tr>
  `).join('');
}
export default renderCustomers;
