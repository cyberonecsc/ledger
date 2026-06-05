/* ==========================================================================
   CYBERONE Center Management Platform - Audit Log & Other Operations (views/audit.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderAuditLog(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const log = store.getOrCreateDailyLog(activeDate);
  const currentBalances = store.getCurrentBalances();

  // Helper to format currency
  const fmt = (val) => val !== undefined && val !== 0 ? `₹${parseFloat(val).toFixed(2)}` : '—';

  // Helper to format timestamp
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    } catch (e) {
      return isoString || '—';
    }
  };

  // State for tabs
  let activeTab = 'audit'; // 'audit' or 'operations'

  // State for audit log pagination & search
  let auditPage = 1;
  const auditItemsPerPage = 10;
  let auditSearchQuery = '';

  // State for operations table search & pagination
  let opsSearchQuery = '';
  let opsPage = 1;
  const opsItemsPerPage = 10;

  // State for batch selection
  const selectedOps = new Set();

  // Render main layout
  mountPoint.innerHTML = `
    <!-- Top Nav Tabs -->
    <div class="tab-row" style="margin-bottom: 25px; display: flex; gap: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 8px;">
      <button class="btn btn-secondary tab-btn-nav active" data-tab="audit" style="flex: 1; outline: none; cursor: pointer;">
        <i data-lucide="history" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Audit History
      </button>
      <button class="btn btn-secondary tab-btn-nav" data-tab="operations" style="flex: 1; outline: none; cursor: pointer;">
        <i data-lucide="sliders" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Other Operations Ledger
      </button>
    </div>

    <!-- Dynamic Content Area -->
    <div id="audit-tab-content"></div>

    <!-- Floating Batch Action Bar -->
    <div id="ops-batch-action-bar" class="batch-action-bar">
      <span style="font-size: 14px; font-weight: 600; color: #fff;"><span id="batch-select-count">0</span> items selected</span>
      <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.15);"></div>
      <button id="btn-ops-batch-delete" class="btn btn-sm btn-danger" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 30px; cursor: pointer; border: none; font-weight: 600;">
        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete Selected
      </button>
      <button id="btn-ops-batch-cancel" class="btn btn-sm btn-secondary" style="padding: 8px 16px; border-radius: 30px; cursor: pointer; border: none; font-weight: 600;">
        Cancel
      </button>
    </div>

    <!-- Expense Modal Backdrop -->
    <div id="expense-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header" style="position: relative;">
          <h4 id="expense-modal-title">Record Expense</h4>
          <button id="expense-modal-close" class="modal-close" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; outline: none;">&times;</button>
        </div>
        <div id="expense-form-mount" style="padding-top: 15px;"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Audit & System Action Logs';
  document.getElementById('page-heading-sub').innerText = `System action logs and auxiliary operations for ${activeDate}`;

  // Tab switching references
  const navTabs = mountPoint.querySelectorAll('.tab-btn-nav');
  const modalBackdrop = document.getElementById('expense-modal-backdrop');
  const btnCloseModal = document.getElementById('expense-modal-close');

  const switchTab = (tab) => {
    activeTab = tab;

    // Clear selections and hide batch bar when switching tabs
    selectedOps.clear();
    const batchBar = document.getElementById('ops-batch-action-bar');
    if (batchBar) batchBar.classList.remove('show');

    navTabs.forEach(btn => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });

    renderActiveTabContent();
  };

  navTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selected = e.currentTarget.getAttribute('data-tab');
      switchTab(selected);
    });
  });

  const openExpenseModal = (editTxn = null) => {
    const title = document.getElementById('expense-modal-title');
    title.innerText = editTxn ? `Edit Expense (${editTxn.id})` : 'Record Expense';
    
    const mount = document.getElementById('expense-form-mount');
    mount.innerHTML = `
      <form id="form-log-expense">
        <div class="form-group">
          <label class="form-label">Expense Description / Payee</label>
          <input type="text" id="exp-desc" class="form-control" placeholder="e.g. Tea & Snacks, Shop Rent, Broadband Bill" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="exp-category" class="form-control">
              <option value="Utilities">Utilities (Electricity, Internet)</option>
              <option value="Supplies">Office Supplies / Printing Materials</option>
              <option value="Refreshments">Refreshments / Food</option>
              <option value="Rent">Rent & Taxes</option>
              <option value="Salary">Staff Payouts</option>
              <option value="Drawings">Owner Drawings (Shibu Draw)</option>
              <option value="Other">Other Miscellaneous</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Amount (₹)</label>
            <input type="number" step="0.01" id="exp-amount" class="form-control" placeholder="0.00" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Source</label>
          <select id="exp-source" class="form-control">
            <option value="cash">Cash In Hand (Physical Cash)</option>
            <option value="account">Bank Account (BOB / UPI)</option>
          </select>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-success" style="flex-grow:1;">
            <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> ${editTxn ? 'Update Expense' : 'Log Expense'}
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    mount.querySelector('.btn-modal-cancel').addEventListener('click', closeExpenseModal);

    if (editTxn) {
      document.getElementById('exp-desc').value = editTxn.description || '';
      document.getElementById('exp-category').value = editTxn.category || 'Other';
      document.getElementById('exp-amount').value = editTxn.amount || 0;
      document.getElementById('exp-source').value = editTxn.source || 'cash';
    }

    document.getElementById('form-log-expense').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('exp-amount').value);

      const txnData = {
        type: 'expense',
        description: document.getElementById('exp-desc').value.trim(),
        amount: amount,
        category: document.getElementById('exp-category').value,
        source: document.getElementById('exp-source').value
      };

      if (editTxn) {
        store.updateTransaction(editTxn.dateStr || activeDate, editTxn.id, txnData);
        appInstance.showToast('Expense updated successfully!', 'success');
      } else {
        store.addTransaction(activeDate, txnData);
        appInstance.showToast('Expense recorded successfully!', 'success');
      }

      closeExpenseModal();
      
      // Refresh current operations layout
      renderActiveTabContent();
    });

    lucide.createIcons();
    modalBackdrop.classList.add('show');
  };

  const closeExpenseModal = () => {
    modalBackdrop.classList.remove('show');
    document.getElementById('expense-form-mount').innerHTML = '';
  };

  btnCloseModal.addEventListener('click', closeExpenseModal);
  // Backdrop click close disabled - modal only closes via Cancel/X button

  const renderActiveTabContent = () => {
    const container = document.getElementById('audit-tab-content');
    if (!container) return;

    if (activeTab === 'audit') {
      const rawLogs = store.getActivityLogs();
      
      // Filter activity logs based on search
      const query = auditSearchQuery.toLowerCase();
      const filteredLogs = rawLogs.filter(entry => 
        entry.action.toLowerCase().includes(query) ||
        (entry.details || '').toLowerCase().includes(query) ||
        entry.user.toLowerCase().includes(query)
      );

      const totalItems = filteredLogs.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / auditItemsPerPage));

      if (auditPage > totalPages) auditPage = totalPages;
      if (auditPage < 1) auditPage = 1;

      const startIndex = (auditPage - 1) * auditItemsPerPage;
      const endIndex = Math.min(startIndex + auditItemsPerPage, totalItems);
      const pageLogs = filteredLogs.slice(startIndex, endIndex);

      let rowsHtml = '';
      if (pageLogs.length === 0) {
        rowsHtml = `<tr><td colspan="4" style="text-align: center; color: var(--text-dimmed); padding: 30px 0;">No system logs found matching search criteria.</td></tr>`;
      } else {
        rowsHtml = pageLogs.map(entry => {
          let actionClass = 'badge-secondary';
          if (entry.action.includes('Delete')) actionClass = 'badge danger';
          else if (entry.action.includes('Edit')) actionClass = 'badge warning';
          else if (entry.action.includes('Create')) actionClass = 'badge sale';
          else if (entry.action.includes('Adjust')) actionClass = 'badge deposit';

          let detailsText = entry.details || '';
          // Format JSON strings if present to make them cleaner
          if (detailsText.startsWith('{') || detailsText.startsWith('[')) {
            try {
              detailsText = `<pre style="font-family: monospace; font-size: 11px; margin: 0; color: #a5f3fc; overflow-x: auto; max-width: 400px; white-space: pre-wrap;">${JSON.stringify(JSON.parse(detailsText), null, 2)}</pre>`;
            } catch (err) {}
          }

          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap; font-family: monospace; color: var(--text-muted);">${formatTime(entry.timestamp)}</td>
              <td style="font-weight: 600; color: #fff;">${entry.user}</td>
              <td><span class="${actionClass}" style="border: 1px solid rgba(255,255,255,0.05); font-size: 10px; padding: 2px 6px;">${entry.action}</span></td>
              <td style="font-size: 13px; color: var(--text-main); font-weight: 500;">${detailsText}</td>
            </tr>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div class="search-filter-row">
          <div class="search-input-wrapper" style="flex-grow: 1;">
            <i data-lucide="search" style="width: 16px; height: 16px;"></i>
            <input type="text" id="audit-search" class="form-control" placeholder="Search logs by action, details, or user..." value="${auditSearchQuery}">
          </div>
        </div>

        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
          <div class="table-responsive ledger-table-container" style="max-height: 480px;">
            <table class="custom-table" style="min-width: 800px;">
              <thead>
                <tr>
                  <th style="width: 180px;">Timestamp</th>
                  <th style="width: 150px;">Operator User</th>
                  <th style="width: 120px;">Action Type</th>
                  <th>Log Details</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Audit Pagination Controls -->
          <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid var(--panel-border); font-size: 13px;">
            <div style="color: var(--text-muted);">
              Showing <span id="audit-p-start">${totalItems > 0 ? startIndex + 1 : 0}</span> to <span id="audit-p-end">${endIndex}</span> of <span id="audit-p-total">${totalItems}</span> entries
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button id="btn-audit-prev" class="btn btn-sm btn-secondary" ${auditPage === 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> Previous
              </button>
              <span style="color: #fff; padding: 0 8px;">Page ${auditPage} of ${totalPages}</span>
              <button id="btn-audit-next" class="btn btn-sm btn-secondary" ${auditPage === totalPages ? 'disabled' : ''}>
                Next <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listeners for search/filters
      const auditSearchInput = document.getElementById('audit-search');
      auditSearchInput.addEventListener('input', (e) => {
        auditSearchQuery = e.target.value;
        auditPage = 1;
        renderActiveTabContent();
      });

      const btnAuditPrev = document.getElementById('btn-audit-prev');
      btnAuditPrev.addEventListener('click', () => {
        if (auditPage > 1) {
          auditPage--;
          renderActiveTabContent();
        }
      });

      const btnAuditNext = document.getElementById('btn-audit-next');
      btnAuditNext.addEventListener('click', () => {
        if (auditPage < totalPages) {
          auditPage++;
          renderActiveTabContent();
        }
      });

    } else if (activeTab === 'operations') {
      const nonSalesTxns = [];
      Object.keys(store.dailyLogs || {}).forEach(dateStr => {
        const logObj = store.dailyLogs[dateStr];
        if (logObj && logObj.transactions) {
          logObj.transactions.forEach(t => {
            if (t.type !== 'sale') {
              const timestamp = t.timestamp || new Date(dateStr + 'T00:00:00').toISOString();
              nonSalesTxns.push({
                ...t,
                timestamp,
                dateStr: dateStr
              });
            }
          });
        }
      });

      // Sort chronological (newest first)
      nonSalesTxns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Filter non-sales based on query
      const query = opsSearchQuery.toLowerCase();
      const filteredOps = nonSalesTxns.filter(t => 
        (t.description || '').toLowerCase().includes(query) ||
        (t.id || '').toLowerCase().includes(query)
      );
      // Pagination logic
      const totalOpsItems = filteredOps.length;
      const totalOpsPages = Math.max(1, Math.ceil(totalOpsItems / opsItemsPerPage));
      if (opsPage > totalOpsPages) opsPage = totalOpsPages;
      if (opsPage < 1) opsPage = 1;
      
      const opsStartIndex = (opsPage - 1) * opsItemsPerPage;
      const opsEndIndex = Math.min(opsStartIndex + opsItemsPerPage, totalOpsItems);
      
      const pagedOps = filteredOps.slice(opsStartIndex, opsEndIndex);

      // Determine if all visible items on this page are selected
      const allSelected = pagedOps.length > 0 && pagedOps.every(t => selectedOps.has(t.id));

      let rowsHtml = '';
      if (pagedOps.length === 0) {
        rowsHtml = `<tr><td colspan="8" style="text-align: center; color: var(--text-dimmed); padding: 30px 0;">No operational logs (expenses, deposits, adjustments) found.</td></tr>`;
      } else {
        rowsHtml = pagedOps.map(t => {
          let typeBadge = '';
          let sourceName = '-';
          
          if (t.type === 'expense') {
            typeBadge = `<span class="badge expense">Expense</span>`;
            sourceName = t.source === 'account' ? 'Bank (BOB)' : 'Cash Drawer';
          } else if (t.type === 'deposit') {
            typeBadge = `<span class="badge deposit">Deposit</span>`;
            const bank = store.bankAccounts.find(b => b.id === t.source);
            sourceName = t.source === 'cash' ? 'Cash' : (t.source === 'petty_cash' ? 'Petty Cash' : (t.source === 'outside' ? 'Outside Source' : (bank ? bank.name : t.source)));
          } else if (t.type === 'salary') {
            typeBadge = `<span class="badge expense" style="background: rgba(220, 38, 38, 0.1); color:#fca5a5;">Salary</span>`;
            sourceName = t.source === 'account' ? 'Bank (BOB)' : 'Cash Drawer';
          } else if (t.type === 'adjustment') {
            typeBadge = `<span class="badge deposit" style="background: rgba(245, 158, 11, 0.1); color: var(--color-warning);">Adjustment</span>`;
            sourceName = t.sourceId || '-';
          }

          const isEditable = (t.type === 'expense');

          return `
            <tr>
              <td style="width: 40px; text-align: center;"><input type="checkbox" class="ops-checkbox" data-id="${t.id}" ${selectedOps.has(t.id) ? 'checked' : ''}></td>
              <td><span style="font-size: 12px; white-space: nowrap; font-family: monospace; color: var(--text-muted);">${formatTime(t.timestamp)}</span></td>
              <td><span style="font-family: monospace; font-size: 11px; color: var(--text-muted); font-weight:600;">${t.id}</span></td>
              <td>${typeBadge}</td>
              <td><strong>${t.description}</strong></td>
              <td style="font-weight:700; color: #fff;">${fmt(t.amount)}</td>
              <td><code>${sourceName}</code></td>
              <td style="text-align: center; white-space: nowrap;">
                ${isEditable ? `
                  <button class="btn btn-sm btn-secondary btn-edit-op" data-id="${t.id}" style="padding: 4px; color: var(--color-info); border: 1px solid rgba(14,165,233,0.15); background: rgba(14,165,233,0.02); margin-right: 4px;">
                    <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
                  </button>
                ` : ''}
                <button class="btn btn-sm btn-secondary btn-delete-op" data-id="${t.id}" style="padding: 4px; color: var(--color-danger); border: 1px solid rgba(239,68,68,0.15); background: rgba(239,68,68,0.02);">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div class="search-filter-row">
          <div class="search-input-wrapper" style="flex-grow: 1;">
            <i data-lucide="search" style="width: 16px; height: 16px;"></i>
            <input type="text" id="ops-search" class="form-control" placeholder="Search other operations by description or transaction ID..." value="${opsSearchQuery}">
          </div>
          <button id="btn-ops-add-expense" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Record Expense
          </button>
        </div>

        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
          <div class="table-responsive ledger-table-container" style="max-height: 480px;">
            <table class="custom-table" style="table-layout: fixed; width: 100%;">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllOps" ${allSelected ? 'checked' : ''}></th>
                  <th style="width: 130px;">Date & Time</th>
                  <th style="width: 100px;">ID</th>
                  <th style="width: 90px;">Type</th>
                  <th>Description</th>
                  <th style="width: 90px;">Amount</th>
                  <th style="width: 120px;">Payment Source</th>
                  <th style="width: 90px; text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div class="table-footer" style="padding: 15px; border-top: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <div style="font-size: 12px; color: var(--text-muted);">
              Showing <span>${totalOpsItems > 0 ? opsStartIndex + 1 : 0}</span> to <span>${opsEndIndex}</span> of <span>${totalOpsItems}</span> entries
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button id="btn-ops-prev" class="btn btn-sm btn-secondary" ${opsPage === 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> Prev
              </button>
              <span style="color: #fff; padding: 0 8px; font-size: 12px;">Page ${opsPage} of ${totalOpsPages}</span>
              <button id="btn-ops-next" class="btn btn-sm btn-secondary" ${opsPage === totalOpsPages ? 'disabled' : ''}>
                Next <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listeners for search & actions
      document.getElementById('ops-search').addEventListener('input', (e) => {
        opsSearchQuery = e.target.value;
        opsPage = 1; // Reset to page 1 on search
        renderActiveTabContent();
      });

      const btnOpsPrev = document.getElementById('btn-ops-prev');
      if (btnOpsPrev) {
        btnOpsPrev.addEventListener('click', () => {
          if (opsPage > 1) {
            opsPage--;
            renderActiveTabContent();
          }
        });
      }

      const btnOpsNext = document.getElementById('btn-ops-next');
      if (btnOpsNext) {
        btnOpsNext.addEventListener('click', () => {
          if (opsPage < totalOpsPages) {
            opsPage++;
            renderActiveTabContent();
          }
        });
      }

      document.getElementById('btn-ops-add-expense').addEventListener('click', () => {
        openExpenseModal();
      });

      // Bind row actions (edit/delete expense or general non-sales)
      document.querySelectorAll('.btn-edit-op').forEach(btn => {
        btn.onclick = (e) => {
          const txnId = e.currentTarget.getAttribute('data-id');
          const txn = nonSalesTxns.find(t => t.id === txnId);
          if (txn) {
            openExpenseModal(txn);
          }
        };
      });

      document.querySelectorAll('.btn-delete-op').forEach(btn => {
        btn.onclick = (e) => {
          const txnId = e.currentTarget.getAttribute('data-id');
          const txn = nonSalesTxns.find(t => t.id === txnId);
          if (!txn) return;
          if (confirm(`Are you sure you want to delete this operational log (${txnId})? This will roll back all bank account, physical cash and inventory adjustments.`)) {
            const deleted = store.deleteTransaction(txn.dateStr, txnId);
            if (deleted) {
              selectedOps.delete(txnId); // Clear selection for this item
              appInstance.showToast('Log deleted successfully', 'success');
              renderActiveTabContent();
            } else {
              appInstance.showToast('Failed to delete log', 'error');
            }
          }
        };
      });

      // Update function for batch selection action bar
      const updateBatchActionBar = () => {
        const batchBar = document.getElementById('ops-batch-action-bar');
        const countSpan = document.getElementById('batch-select-count');
        if (!batchBar || !countSpan) return;

        if (selectedOps.size > 0 && activeTab === 'operations') {
          countSpan.innerText = selectedOps.size;
          batchBar.classList.add('show');
        } else {
          batchBar.classList.remove('show');
        }
      };

      // Select All header checkbox change listener
      const selectAllCheckbox = document.getElementById('selectAllOps');
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          const checked = e.target.checked;
          pagedOps.forEach(t => {
            if (checked) {
              selectedOps.add(t.id);
            } else {
              selectedOps.delete(t.id);
            }
          });
          renderActiveTabContent();
        });
      }

      // Individual checkboxes change listener
      document.querySelectorAll('.ops-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const txnId = e.target.getAttribute('data-id');
          if (e.target.checked) {
            selectedOps.add(txnId);
          } else {
            selectedOps.delete(txnId);
          }
          updateBatchActionBar();
          if (selectAllCheckbox) {
            const allChecked = pagedOps.length > 0 && pagedOps.every(t => selectedOps.has(t.id));
            selectAllCheckbox.checked = allChecked;
          }
        });
      });

      // Batch Delete action click listener
      const btnBatchDelete = document.getElementById('btn-ops-batch-delete');
      if (btnBatchDelete) {
        btnBatchDelete.onclick = () => {
          if (selectedOps.size === 0) return;
          
          if (confirm(`Are you sure you want to delete the ${selectedOps.size} selected operational logs? This will roll back all associated bank account, cash, and stock adjustments.`)) {
            let successCount = 0;
            let failureCount = 0;
            
            selectedOps.forEach(txnId => {
              const txn = nonSalesTxns.find(t => t.id === txnId);
              if (txn) {
                const deleted = store.deleteTransaction(txn.dateStr, txnId);
                if (deleted) {
                  successCount++;
                } else {
                  failureCount++;
                }
              }
            });
            
            if (successCount > 0) {
              appInstance.showToast(`Successfully deleted ${successCount} logs`, 'success');
            }
            if (failureCount > 0) {
              appInstance.showToast(`Failed to delete ${failureCount} logs`, 'error');
            }
            
            selectedOps.clear();
            renderActiveTabContent();
          }
        };
      }

      // Batch Cancel action click listener
      const btnBatchCancel = document.getElementById('btn-ops-batch-cancel');
      if (btnBatchCancel) {
        btnBatchCancel.onclick = () => {
          selectedOps.clear();
          renderActiveTabContent();
        };
      }

      // Initialize batch action bar state on render
      updateBatchActionBar();
    }

    lucide.createIcons();
  };

  // Initial draw
  switchTab('audit');
}

export default renderAuditLog;
