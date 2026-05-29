/* ==========================================================================
   CYBERONE Center Management Platform - Applications View (views/applications.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderApplications(mountPoint, appInstance) {
  // Retrieve list of applications
  const apps = store.applications;
  const customers = store.customers;
  const staff = store.staff;

  mountPoint.innerHTML = `
    <!-- Top toolbar with search, view switcher & add application button -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="app-search" class="form-control" placeholder="Search by citizen name or file ID...">
      </div>

      <div class="filter-actions">
        <!-- View Toggle -->
        <div style="display: flex; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: var(--border-radius-sm); padding: 2px; margin-right: 10px;">
          <button id="view-kanban" class="btn btn-sm btn-primary" style="padding: 6px 12px; border-radius: 4px;">Kanban Board</button>
          <button id="view-list" class="btn btn-sm btn-secondary" style="padding: 6px 12px; border-radius: 4px; border:none; background:none;">Table List</button>
        </div>

        <button id="btn-add-app" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> New File
        </button>
      </div>
    </div>

    <!-- Kanban View Container -->
    <div class="app-tracker-wrapper">
      <div id="applications-kanban-container" class="app-tracker-columns">
        ${renderKanbanBoard(apps, customers)}
      </div>
    </div>

    <!-- Table View Container (hidden by default) -->
    <div id="applications-table-container" class="glass-card" style="padding: 0; overflow: hidden; display: none;">
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>File ID</th>
              <th>Citizen Name</th>
              <th>Service</th>
              <th>Ref / Application No.</th>
              <th>Status</th>
              <th>Assigned Staff</th>
              <th>Paid Fee</th>
              <th>CYBER ONE Charge</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="app-tbody">
            ${renderAppTableRows(apps, customers, staff)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Application Modal -->
    <div id="app-modal-backdrop" class="modal-backdrop">
      <div class="modal-container">
        <div class="modal-header">
          <h4>Register Government Application</h4>
          <button id="app-modal-close" class="modal-close">&times;</button>
        </div>

        <form id="form-add-app">
          <div class="form-group">
            <label class="form-label">Citizen / Customer</label>
            <select id="app-customer-id" class="form-control" required>
              <option value="" disabled selected>-- Select Citizen --</option>
              ${customers.map(c => `<option value="${c.id}">${c.name} (ID: ${c.uniqueNumber})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Service Type</label>
            <input type="text" id="app-service" class="form-control" placeholder="e-District Income, PAN Card, Passport" required list="g2c-presets">
            <datalist id="g2c-presets">
              <option value="e-District Income Certificate">
              <option value="e-District Caste Certificate">
              <option value="e-District Domicile Certificate">
              <option value="New PAN Card Registration">
              <option value="Aadhaar Enrolment / Update">
              <option value="New Passport Application">
              <option value="KSEB Electricity Meter Shift">
              <option value="Calicut University Admission Reg">
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label">Application Number / Reference ID (Optional)</label>
            <input type="text" id="app-ref" class="form-control" placeholder="e.g. KL-ED-2026-X">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Govt Fee (Deducted from Wallet) (₹)</label>
              <input type="number" step="0.01" id="app-fee" class="form-control" value="15.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">CYBER ONE Service Charge (₹)</label>
              <input type="number" step="0.01" id="app-charge" class="form-control" value="20.00" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Assigned Staff</label>
              <select id="app-staff" class="form-control">
                ${staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Status</label>
              <select id="app-status" class="form-control">
                <option value="draft">Draft</option>
                <option value="submitted" selected>Submitted</option>
                <option value="pending_docs">Pending Documents</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes / Remarks</label>
            <textarea id="app-notes" class="form-control" rows="2" placeholder="Scan details, pending certificates..."></textarea>
          </div>

          <div style="display:flex; gap:10px; margin-top: 15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Register File
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Government G2C File Tracker';
  document.getElementById('page-heading-sub').innerText = 'e-District, PAN, Aadhaar and Passport file status dashboard';

  lucide.createIcons();

  // View Switching handlers
  const btnKanban = document.getElementById('view-kanban');
  const btnList = document.getElementById('view-list');
  const kanbanContainer = document.getElementById('applications-kanban-container');
  const tableContainer = document.getElementById('applications-table-container');

  btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('btn-primary');
    btnKanban.classList.remove('btn-secondary');
    btnList.classList.remove('btn-primary');
    btnList.classList.add('btn-secondary');
    kanbanContainer.style.display = 'grid';
    tableContainer.style.display = 'none';
  });

  btnList.addEventListener('click', () => {
    btnList.classList.add('btn-primary');
    btnList.classList.remove('btn-secondary');
    btnKanban.classList.remove('btn-primary');
    btnKanban.classList.add('btn-secondary');
    kanbanContainer.style.display = 'none';
    tableContainer.style.display = 'block';
  });

  // Modal open/close handlers
  const backdrop = document.getElementById('app-modal-backdrop');
  const btnAddApp = document.getElementById('btn-add-app');
  const btnCloseApp = document.getElementById('app-modal-close');

  btnAddApp.addEventListener('click', () => backdrop.classList.add('show'));
  const closeModal = () => backdrop.classList.remove('show');
  btnCloseApp.addEventListener('click', closeModal);
  
  const btnCancelApp = document.querySelector('#app-modal-backdrop .btn-modal-cancel');
  if (btnCancelApp) {
    btnCancelApp.addEventListener('click', closeModal);
  }

  // Form submit handler
  document.getElementById('form-add-app').addEventListener('submit', (e) => {
    e.preventDefault();

    const customerId = document.getElementById('app-customer-id').value;
    const serviceType = document.getElementById('app-service').value;
    const feePaid = parseFloat(document.getElementById('app-fee').value || 0);
    const serviceCharge = parseFloat(document.getElementById('app-charge').value || 0);
    
    // Register G2C application
    const newApp = store.addApplication({
      customerId,
      serviceType,
      applicationNumber: document.getElementById('app-ref').value,
      feePaid,
      serviceCharge,
      assignedStaffId: document.getElementById('app-staff').value,
      status: document.getElementById('app-status').value,
      notes: document.getElementById('app-notes').value
    });

    // Automatically post transaction in daily ledger
    const customer = customers.find(c => c.id === customerId);
    store.addTransaction(appInstance.getActiveDate(), {
      type: 'sale',
      description: `${serviceType} application`,
      amount: feePaid + serviceCharge,
      paidByCash: feePaid + serviceCharge, // Default to Cash In Hand payment
      paidByUPI: 0,
      deductedFrom: 'csc', // CSC portal wallet
      deductedAmount: feePaid,
      customerId: customerId,
      staffId: document.getElementById('app-staff').value
    });

    appInstance.showToast('G2C file registered & ledger updated!', 'success');
    closeModal();
    appInstance.handleRouting();
  });

  // Kanban card click status transition bindings
  const kanbanCards = document.querySelectorAll('.tracker-item-card');
  kanbanCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const appId = e.currentTarget.getAttribute('data-id');
      const app = store.applications.find(a => a.id === appId);
      if (!app) return;

      const statuses = ['draft', 'submitted', 'pending_docs', 'approved', 'delivered'];
      const currentIdx = statuses.indexOf(app.status);
      const nextStatus = statuses[currentIdx + 1];

      if (nextStatus) {
        if (confirm(`Move application ${app.applicationNumber || app.id} to "${nextStatus.replace('_', ' ')}"?`)) {
          store.updateApplicationStatus(appId, nextStatus);
          appInstance.showToast(`Status updated to ${nextStatus}`, 'success');
          appInstance.handleRouting();
        }
      }
    });
  });

  // Table status dropdown actions
  const statusSelectors = document.querySelectorAll('.table-status-select');
  statusSelectors.forEach(select => {
    select.addEventListener('change', (e) => {
      const appId = e.target.getAttribute('data-id');
      store.updateApplicationStatus(appId, e.target.value);
      appInstance.showToast('Status updated successfully', 'success');
      appInstance.handleRouting();
    });
  });

  // Live search functionality
  const appSearch = document.getElementById('app-search');
  appSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    // Search in Kanban
    const cards = document.querySelectorAll('.tracker-item-card');
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(query) ? '' : 'none';
    });

    // Search in Table list
    const rows = document.querySelectorAll('#app-tbody tr');
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

// Generate Kanban Board Columns
function renderKanbanBoard(apps, customers) {
  const columns = {
    draft: { title: 'Draft Files', count: 0, items: [] },
    submitted: { title: 'Submitted to Portal', count: 0, items: [] },
    pending_docs: { title: 'Pending Documents', count: 0, items: [] },
    approved: { title: 'Ready to Print', count: 0, items: [] },
    delivered: { title: 'Completed & Delivered', count: 0, items: [] }
  };

  apps.forEach(app => {
    if (columns[app.status]) {
      columns[app.status].items.push(app);
      columns[app.status].count += 1;
    }
  });

  return Object.keys(columns).map(statusKey => {
    const col = columns[statusKey];
    
    let statusHeaderColor = 'var(--text-muted)';
    if (statusKey === 'submitted') statusHeaderColor = 'var(--color-info)';
    if (statusKey === 'pending_docs') statusHeaderColor = 'var(--color-warning)';
    if (statusKey === 'approved') statusHeaderColor = 'var(--color-success)';
    if (statusKey === 'delivered') statusHeaderColor = 'var(--text-dimmed)';

    const cardsHtml = col.items.map(app => {
      const citizen = customers.find(c => c.id === app.customerId);
      return `
        <div class="tracker-item-card" data-id="${app.id}">
          <div class="tracker-item-name">${citizen ? citizen.name : 'Unknown'}</div>
          <div class="tracker-item-service">${app.serviceType}</div>
          <div class="tracker-item-footer">
            <span># ${app.applicationNumber || 'No Ref'}</span>
            <span>${app.lastUpdated}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="tracker-column">
        <div class="tracker-column-title" style="color: ${statusHeaderColor};">
          <span>${col.title}</span>
          <span class="tracker-column-count">${col.count}</span>
        </div>
        <div class="tracker-card-list">
          ${cardsHtml.length === 0 ? `
            <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; border: 1px dashed var(--panel-border); border-radius: var(--border-radius-sm); color: var(--text-dimmed); font-size:11px; padding: 20px 0; text-align:center;">
              Column empty
            </div>
          ` : cardsHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Generate table rows for List View
function renderAppTableRows(apps, customers, staff) {
  if (apps.length === 0) {
    return `<tr><td colspan="9" style="text-align:center; color:var(--text-dimmed); padding:20px;">No government applications logged.</td></tr>`;
  }

  return apps.map(app => {
    const citizen = customers.find(c => c.id === app.customerId);
    const employee = staff.find(s => s.id === app.assignedStaffId);
    
    return `
      <tr>
        <td><code>${app.id}</code></td>
        <td><strong>${citizen ? citizen.name : 'Unknown'}</strong></td>
        <td>${app.serviceType}</td>
        <td><code>${app.applicationNumber || 'PENDING'}</code></td>
        <td>
          <select class="form-control table-status-select" data-id="${app.id}" style="padding: 4px; font-size:12px; max-width:150px; background: rgba(0,0,0,0.2);">
            <option value="draft" ${app.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="submitted" ${app.status === 'submitted' ? 'selected' : ''}>Submitted</option>
            <option value="pending_docs" ${app.status === 'pending_docs' ? 'selected' : ''}>Pending Docs</option>
            <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>Ready to Print</option>
            <option value="delivered" ${app.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
        <td>${employee ? employee.name : 'Unassigned'}</td>
        <td>₹${app.feePaid.toFixed(2)}</td>
        <td>₹${app.serviceCharge.toFixed(2)}</td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-secondary" onclick="alert('File Notes:\\n${app.notes || 'No remarks recorded.'}')" style="padding: 4px;">
            <i data-lucide="info" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export default renderApplications;
