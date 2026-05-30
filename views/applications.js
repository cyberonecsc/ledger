/* ==========================================================================
   CYBERONE Center Management Platform - Applications View (views/applications.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderApplications(mountPoint, appInstance) {
  const apps = store.applications;
  const customers = store.customers;
  const staff = store.staff;

  let searchQuery = '';

  const redrawLayout = () => {
    // Filter apps based on search query
    let filteredApps = apps;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredApps = apps.filter(app => {
        const citizen = customers.find(c => c.id === app.customerId);
        return (
          app.serviceType.toLowerCase().includes(q) ||
          (app.applicationNumber || '').toLowerCase().includes(q) ||
          (citizen && citizen.name.toLowerCase().includes(q))
        );
      });
    }

    // Group apps into 4 columns
    const columns = {
      submitted: { title: 'Submitted to Portal', items: [], color: 'var(--color-info)' },
      pending_docs: { title: 'Pending Documents', items: [], color: 'var(--color-warning)' },
      approved: { title: 'Approved / Ready', items: [], color: 'var(--color-success)' },
      history: { title: 'History / Archived', items: 'var(--text-muted)'.startsWith('var') ? [] : [], color: 'var(--text-muted)' }
    };

    const activeDateStr = appInstance.getActiveDate();
    const activeDate = new Date(activeDateStr);

    filteredApps.forEach(app => {
      // Map other status values safely into these columns
      let statusKey = app.status;
      if (statusKey === 'draft') statusKey = 'submitted';
      if (statusKey === 'ready_to_print' || statusKey === 'delivered') statusKey = 'approved';

      if (statusKey === 'approved' && app.lastUpdated) {
        const lastUpdatedDate = new Date(app.lastUpdated);
        const diffTime = activeDate - lastUpdatedDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays >= 3) {
          statusKey = 'history';
        }
      }

      if (columns[statusKey]) {
        columns[statusKey].items.push(app);
      } else {
        columns.submitted.items.push(app);
      }
    });

    mountPoint.innerHTML = `
      <!-- Toolbar with Search & New File Action -->
      <div class="search-filter-row no-print" style="margin-bottom: 25px;">
        <div class="search-input-wrapper" style="flex-grow: 1;">
          <i data-lucide="search" style="width: 16px; height: 16px;"></i>
          <input type="text" id="app-search" class="form-control" placeholder="Search by citizen name, file ID, or reference number..." value="${searchQuery}">
        </div>
        <button id="btn-add-app" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; height: 38px;">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> New File
        </button>
      </div>

      <!-- 3-Column Tracker Layout -->
      <div class="app-tracker-columns" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start;">
        ${Object.keys(columns).map(statusKey => {
          const col = columns[statusKey];
          const count = col.items.length;
          
          return `
            <div class="tracker-column" style="background: rgba(255, 255, 255, 0.015); border: 1px solid var(--panel-border); border-radius: var(--border-radius-md); padding: 15px; display: flex; flex-direction: column; gap: 12px; min-height: 400px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${col.color}; padding-bottom: 8px; margin-bottom: 5px;">
                <span style="font-weight: 700; color: #fff; font-size: 14px;">${col.title}</span>
                <span class="badge" style="background: ${col.color}20; color: ${col.color}; border: 1px solid ${col.color}40; font-size: 11px; padding: 2px 8px; border-radius: 20px;">${count}</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${count === 0 ? `
                  <div style="text-align: center; color: var(--text-dimmed); padding: 30px 10px; border: 1px dashed rgba(255, 255, 255, 0.05); border-radius: var(--border-radius-sm); font-size: 12px; font-style: italic;">
                    No files in this stage
                  </div>
                ` : col.items.map(app => {
                  const citizen = customers.find(c => c.id === app.customerId);
                  
                  // Render transition buttons based on column
                  let buttonsHtml = '';
                  if (statusKey === 'submitted') {
                    buttonsHtml = `
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="pending_docs" style="flex:1; font-size:10px; padding: 3px; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.25); color: var(--color-warning);">
                        <i data-lucide="file-warning" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Pending
                      </button>
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="approved" style="flex:1; font-size:10px; padding: 3px; background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.25); color: var(--color-success);">
                        <i data-lucide="check" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Approve
                      </button>
                    `;
                  } else if (statusKey === 'pending_docs') {
                    buttonsHtml = `
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="submitted" style="flex:1; font-size:10px; padding: 3px; background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.25); color: var(--color-info);">
                        <i data-lucide="send" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Submit
                      </button>
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="approved" style="flex:1; font-size:10px; padding: 3px; background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.25); color: var(--color-success);">
                        <i data-lucide="check" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Approve
                      </button>
                    `;
                  } else if (statusKey === 'approved') {
                    buttonsHtml = `
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="submitted" style="flex:1; font-size:10px; padding: 3px; background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.25); color: var(--color-info);">
                        <i data-lucide="send" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Submit
                      </button>
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="pending_docs" style="flex:1; font-size:10px; padding: 3px; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.25); color: var(--color-warning);">
                        <i data-lucide="file-warning" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Pending
                      </button>
                    `;
                  } else if (statusKey === 'history') {
                    buttonsHtml = `
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="submitted" style="flex:1; font-size:10px; padding: 3px; background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.25); color: var(--color-info);">
                        <i data-lucide="send" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Submit
                      </button>
                      <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="pending_docs" style="flex:1; font-size:10px; padding: 3px; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.25); color: var(--color-warning);">
                        <i data-lucide="file-warning" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Pending
                      </button>
                    `;
                  }

                  return `
                    <div class="glass-card" style="padding: 12px; border: 1px solid var(--panel-border); background: rgba(255, 255, 255, 0.01); display: flex; flex-direction: column; gap: 8px;">
                      <div>
                        <div style="font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${citizen ? citizen.name : 'Unknown Citizen'}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${app.serviceType}</div>
                      </div>
                      
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-dimmed); border-top: 1px dashed rgba(255,255,255,0.04); padding-top: 6px;">
                        <span>Ref: ${app.applicationNumber || 'No Ref No.'}</span>
                        <span>${app.lastUpdated}</span>
                      </div>
                      
                      <!-- Transition Action Button Row -->
                      <div style="display: flex; gap: 6px; margin-top: 4px;">
                        ${buttonsHtml}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Add Application Modal (Kept for creating new files) -->
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
                  <option value="submitted" selected>Submitted</option>
                  <option value="pending_docs">Pending Documents</option>
                  <option value="approved">Approved</option>
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

    bindActionHandlers();
    lucide.createIcons();
  };

  const bindActionHandlers = () => {
    // Dynamic status transition buttons inside cards (Instant state update with no confirms/dialogs)
    document.querySelectorAll('.btn-transition-status').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nextStatus = btn.getAttribute('data-status');
        store.updateApplicationStatus(id, nextStatus);
        appInstance.showToast(`File status updated to ${nextStatus.replace('_', ' ')}`, 'success');
        redrawLayout();
      };
    });

    // Search filter
    document.getElementById('app-search').oninput = (e) => {
      searchQuery = e.target.value;
      redrawTableOnly();
    };

    // Modal helpers
    const backdrop = document.getElementById('app-modal-backdrop');
    document.getElementById('btn-add-app').onclick = () => backdrop.classList.add('show');
    const closeModal = () => backdrop.classList.remove('show');
    document.getElementById('app-modal-close').onclick = closeModal;
    backdrop.querySelector('.btn-modal-cancel').onclick = closeModal;

    // Form submit
    document.getElementById('form-add-app').onsubmit = (e) => {
      e.preventDefault();

      const customerId = document.getElementById('app-customer-id').value;
      const serviceType = document.getElementById('app-service').value;
      const feePaid = parseFloat(document.getElementById('app-fee').value || 0);
      const serviceCharge = parseFloat(document.getElementById('app-charge').value || 0);
      const staffId = document.getElementById('app-staff').value;
      const status = document.getElementById('app-status').value;

      store.addApplication({
        customerId,
        serviceType,
        applicationNumber: document.getElementById('app-ref').value,
        feePaid,
        serviceCharge,
        assignedStaffId: staffId,
        status: status,
        notes: document.getElementById('app-notes').value
      });

      // Automatically post transaction in daily ledger
      store.addTransaction(appInstance.getActiveDate(), {
        type: 'sale',
        description: `${serviceType} application`,
        amount: feePaid + serviceCharge,
        paidByCash: feePaid + serviceCharge,
        paidByUPI: 0,
        deductedFrom: 'csc',
        deductedAmount: feePaid,
        customerId: customerId,
        staffId: staffId
      });

      appInstance.showToast('G2C file registered & ledger updated!', 'success');
      closeModal();
      redrawLayout();
    };
  };

  const redrawTableOnly = () => {
    redrawLayout();
  };

  // Initial draw
  redrawLayout();
}

export default renderApplications;
