/* ==========================================================================
   CYBERONE Center Management Platform - Applications View (views/applications.js)
   ========================================================================== */

import { store, getTodayDateString } from '../store.js';
import { auth } from '../auth.js';

export function renderApplications(mountPoint, appInstance) {
  let localActiveDate = getTodayDateString();
  const apps = store.applications;
  const customers = store.customers;
  const staff = store.staff;

  let searchQuery = '';
  let currentHistoryPage = 1;
  const itemsPerPage = 10;

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

    // Group apps into 3 active columns and collect history items separately
    const columns = {
      submitted: { title: 'Submitted to Portal', items: [], color: 'var(--color-info)' },
      pending_docs: { title: 'Pending Documents', items: [], color: 'var(--color-warning)' },
      approved: { title: 'Approved / Ready', items: [], color: 'var(--color-success)' }
    };
    const historyItems = [];

    const activeDateStr = localActiveDate;
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

      if (statusKey === 'history') {
        historyItems.push(app);
      } else if (columns[statusKey]) {
        columns[statusKey].items.push(app);
      } else {
        columns.submitted.items.push(app);
      }
    });

    // Calculate pagination for historyItems
    const totalPages = Math.max(1, Math.ceil(historyItems.length / itemsPerPage));
    if (currentHistoryPage > totalPages) currentHistoryPage = totalPages;
    if (currentHistoryPage < 1) currentHistoryPage = 1;

    const startIndex = (currentHistoryPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, historyItems.length);
    const pageItems = historyItems.slice(startIndex, endIndex);

    mountPoint.innerHTML = `
      <!-- Toolbar with Search & New File Action -->
      <div class="search-filter-row no-print" style="margin-bottom: 25px; display: flex; gap: 10px; align-items: center;">
        <div class="search-input-wrapper" style="flex-grow: 1;">
          <i data-lucide="search" style="width: 16px; height: 16px;"></i>
          <input type="text" id="app-search" class="form-control" placeholder="Search by citizen name, file ID, or reference number..." value="${searchQuery}">
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="date" id="app-date-picker" value="${localActiveDate}" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--panel-border); color: #fff; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; color-scheme: dark; font-family: var(--font-primary); height: 38px; box-sizing: border-box;">
          <button id="btn-add-app" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; height: 38px;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> New File
          </button>
        </div>
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
                  }

                  return `
                    <div class="glass-card" style="padding: 12px; border: 1px solid var(--panel-border); background: rgba(255, 255, 255, 0.01); display: flex; flex-direction: column; gap: 8px; position: relative;">
                      <button class="btn-delete-app" data-id="${app.id}" style="position: absolute; right: 8px; top: 8px; background: none; border: none; color: var(--color-danger); opacity: 0.6; cursor: pointer; padding: 4px; outline: none; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Delete Application Log">
                        <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                      </button>
                      <div style="padding-right: 20px;">
                        <div style="font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${citizen ? citizen.name : 'Walk-in Customer'}</div>
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

      <!-- History / Archived Files (Full-width Layout) -->
      <div class="glass-card" style="margin-top: 30px; padding: 20px; border: 1px solid var(--panel-border); background: rgba(255, 255, 255, 0.015);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px;">
          <span style="font-weight: 700; color: #fff; font-size: 15px;">History / Archived Files</span>
          <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--panel-border); font-size: 11px; padding: 2px 8px; border-radius: 20px;">${historyItems.length} Total</span>
        </div>

        ${historyItems.length === 0 ? `
          <div style="text-align: center; color: var(--text-dimmed); padding: 40px 10px; border: 1px dashed rgba(255, 255, 255, 0.05); border-radius: var(--border-radius-sm); font-size: 12px; font-style: italic;">
            No applications in history
          </div>
        ` : `
          <div class="table-responsive">
            <table class="custom-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Citizen Name</th>
                  <th>Service Type</th>
                  <th>Ref / App ID</th>
                  <th style="text-align: right;">Govt Fee</th>
                  <th style="text-align: right;">Service Charge</th>
                  <th>Last Updated</th>
                  <th style="text-align: center; width: 180px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map(app => {
                  const citizen = customers.find(c => c.id === app.customerId);
                  return `
                    <tr>
                      <td><strong>${citizen ? citizen.name : 'Walk-in Customer'}</strong></td>
                      <td>${app.serviceType}</td>
                      <td><code>${app.applicationNumber || '—'}</code></td>
                      <td style="text-align: right;">₹${(app.feePaid || 0).toFixed(2)}</td>
                      <td style="text-align: right;">₹${(app.serviceCharge || 0).toFixed(2)}</td>
                      <td>${app.lastUpdated}</td>
                      <td style="text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                          <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="submitted" style="font-size:10px; padding: 4px 8px; background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.25); color: var(--color-info);">
                            <i data-lucide="send" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Submit
                          </button>
                          <button class="btn btn-xs btn-transition-status" data-id="${app.id}" data-status="pending_docs" style="font-size:10px; padding: 4px 8px; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.25); color: var(--color-warning);">
                            <i data-lucide="file-warning" style="width:10px; height:10px; margin-right:3px; vertical-align:middle;"></i>Pending
                          </button>
                          <button class="btn btn-xs btn-secondary btn-delete-app" data-id="${app.id}" style="padding: 4px 6px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05);" title="Delete Application Log">
                            <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--panel-border);">
            <div style="font-size: 12px; color: var(--text-muted);">
              Showing ${historyItems.length > 0 ? startIndex + 1 : 0} to ${endIndex} of ${historyItems.length} entries
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => `
                <button class="btn btn-sm btn-pagination-page ${pageNum === currentHistoryPage ? 'btn-primary' : 'btn-secondary'}" data-page="${pageNum}" style="padding: 4px 10px; font-size: 11px; font-weight: 600; min-width: 30px;">
                  ${pageNum}
                </button>
              `).join('')}
            </div>
          </div>
        `}
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
      currentHistoryPage = 1;
      redrawTableOnly();
    };

    // Date Picker event
    const appDatePicker = document.getElementById('app-date-picker');
    if (appDatePicker) {
      appDatePicker.onclick = (e) => e.stopPropagation();
      appDatePicker.onchange = (e) => {
        localActiveDate = e.target.value;
        currentHistoryPage = 1;
        redrawLayout();
      };
    }

    // Bind history pagination buttons
    document.querySelectorAll('.btn-pagination-page').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const page = parseInt(btn.getAttribute('data-page'));
        currentHistoryPage = page;
        redrawLayout();
      };
    });

    // Bind delete application log buttons
    document.querySelectorAll('.btn-delete-app').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const app = apps.find(a => a.id === id);
        if (app) {
          if (confirm(`Are you sure you want to delete this application log for "${app.serviceType}"? This will not remove any associated ledger transactions.`)) {
            store.deleteApplication(id);
            appInstance.showToast('Application log deleted successfully', 'success');
            redrawLayout();
          }
        }
      };
    });

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

      const app = store.addApplication({
        customerId,
        serviceType,
        applicationNumber: document.getElementById('app-ref').value,
        feePaid,
        serviceCharge,
        assignedStaffId: staffId,
        status: status,
        notes: document.getElementById('app-notes').value
      });

      // Automatically post transaction in daily ledger, linking to the newly created application
      store.addTransaction(localActiveDate, {
        type: 'sale',
        description: `${serviceType} application`,
        amount: feePaid + serviceCharge,
        paidByCash: feePaid + serviceCharge,
        paidByUPI: 0,
        deductedFrom: 'csc',
        deductedAmount: feePaid,
        customerId: customerId,
        staffId: staffId,
        applicationId: app.id
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
