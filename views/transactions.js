/* ==========================================================================
   CYBERONE Center Management Platform - Transactions View (views/transactions.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderTransactions(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const log = store.getOrCreateDailyLog(activeDate);
  const currentBalances = store.getCurrentBalances();

  // Helper to format currency
  const fmt = (val) => val !== undefined && val !== 0 ? `₹${parseFloat(val).toFixed(2)}` : '—';

  const accountsToDisplay = [
    { key: 'cash', name: 'Cash In Hand', icon: 'wallet', color: 'var(--color-success)', class: 'success' }
  ];

  store.bankAccounts.forEach(b => {
    accountsToDisplay.push({
      key: b.id,
      name: b.name,
      icon: 'landmark',
      color: b.id === 'main_bob' ? 'var(--color-info)' : '#0ea5e9',
      class: 'info'
    });
  });

  store.wallets.filter(w => w.isActive || (log.openingBalances[w.id] || 0) !== 0 || (log.closingBalances[w.id] || 0) !== 0).forEach(w => {
    let icon = 'globe';
    if (w.isAEPS) icon = 'smartphone';
    accountsToDisplay.push({
      key: w.id,
      name: w.name,
      icon: icon,
      color: '#fff',
      class: 'primary'
    });
  });

  const cardsHtml = accountsToDisplay.map(acc => {
    const op = (log.openingBalances[acc.key] || 0).toFixed(2);
    const cl = (log.closingBalances[acc.key] || 0).toFixed(2);
    return `
      <div class="glass-card ${acc.class}" style="padding: 16px;">
        <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight:600; color:var(--text-muted); align-items: center;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${acc.name}</span>
          <i data-lucide="${acc.icon}" style="width: 14px; height: 14px; color: ${acc.color}; flex-shrink: 0;"></i>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
          <span style="font-size: 11px; color: var(--text-dimmed); white-space: nowrap;">Op: ₹${op}</span>
          <span style="font-family: var(--font-display); font-size: 16px; font-weight: 700; color: ${acc.class === 'success' ? 'var(--color-success)' : acc.class === 'info' ? 'var(--color-info)' : '#fff'}; white-space: nowrap;">Cl: ₹${cl}</span>
        </div>
      </div>
    `;
  }).join('');

  // State for pagination & bulk selection
  let currentPage = 1;
  const itemsPerPage = 10;
  const selectedTxnIds = new Set();

  // Render view layout
  mountPoint.innerHTML = `
    <!-- Top Action bar with Search/Filters & Log Transaction button -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="ledger-search" class="form-control" placeholder="Search by description or customer ID...">
      </div>

      <div class="filter-actions" style="display: flex; gap: 10px; align-items: center;">
        <button id="btn-delete-selected" class="btn btn-danger" style="display: none;">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Delete Selected (<span id="delete-selected-count">0</span>)
        </button>
        <button id="btn-open-txn-modal" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Transaction
        </button>
      </div>
    </div>

    <!-- Wide Google Sheet-based Ledger Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
      <div class="table-responsive ledger-table-container">
        <table class="custom-table" id="ledger-table" style="min-width: 1600px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-txns" style="cursor: pointer;"></th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Paid Cash</th>
              <th>Paid UPI</th>
              <th>Paid Credit</th>
              <th>SC Cash</th>
              <th>SC Account</th>
              <th>From Bank</th>
              <th>From CSC</th>
              <th>From PayNearby</th>
              <th>From APB</th>
              <th>From IBKART</th>
              <th>From BSNL</th>
              <th>From VI</th>
              <th>From Airtel</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="ledger-tbody">
            <!-- Rendered dynamically via redrawTable -->
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid var(--panel-border); font-size: 13px;">
        <div style="color: var(--text-muted);">
          Showing <span id="pagination-start">0</span> to <span id="pagination-end">0</span> of <span id="pagination-total">0</span> transactions
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-prev-page" class="btn btn-sm btn-secondary" style="padding: 6px 12px; font-weight: 600; outline: none; border: 1px solid var(--panel-border); display: flex; align-items: center; gap: 4px; cursor: pointer;">
            <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> Previous
          </button>
          <span style="font-weight: 600; color: #fff; padding: 0 8px; font-family: var(--font-primary);">Page <span id="pagination-current">1</span> of <span id="pagination-max">1</span></span>
          <button id="btn-next-page" class="btn btn-sm btn-secondary" style="padding: 6px 12px; font-weight: 600; outline: none; border: 1px solid var(--panel-border); display: flex; align-items: center; gap: 4px; cursor: pointer;">
            Next <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    </div>



    <!-- Modals backdrop and containers -->
    <div id="txn-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header" style="position: relative;">
          <h4>Record Daily Sale</h4>
          <button id="txn-modal-close" class="modal-close" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; outline: none; transition: var(--transition-smooth);">&times;</button>
        </div>

        <!-- Dynamic Form Body mount -->
        <div id="txn-form-mount"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Daily Transactions Ledger';
  document.getElementById('page-heading-sub').innerText = `Reconciliation sheet for ${activeDate}`;

  // Modal selector references
  const modalBackdrop = document.getElementById('txn-modal-backdrop');
  const btnOpenModal = document.getElementById('btn-open-txn-modal');
  const btnCloseModalX = document.getElementById('txn-modal-close');
  const searchInput = document.getElementById('ledger-search');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');

  // Unified modal handlers
  const openAddModal = () => {
    const headerTitle = modalBackdrop.querySelector('.modal-header h4');
    if (headerTitle) headerTitle.innerText = 'Record Daily Sale';

    modalBackdrop.classList.add('show');
    loadTabForm('sale');
  };

  const openEditModal = (txn) => {
    const headerTitle = modalBackdrop.querySelector('.modal-header h4');
    if (headerTitle) headerTitle.innerText = `Edit Daily Sale (${txn.id})`;

    modalBackdrop.classList.add('show');
    loadTabForm('sale', txn);
  };

  const closeModal = () => {
    modalBackdrop.classList.remove('show');
    document.getElementById('txn-form-mount').innerHTML = '';
    if (window.location.hash.includes('action=new-sale')) {
      history.replaceState(null, "", "#transactions");
    }
  };

  btnOpenModal.addEventListener('click', openAddModal);
  btnCloseModalX.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Search input handler
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    redrawTable();
  });

  // Pagination navigation handlers
  btnPrevPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      redrawTable();
    }
  });

  btnNextPage.addEventListener('click', () => {
    currentPage++;
    redrawTable();
  });

  const updateBulkDeleteButton = () => {
    const btnDelete = document.getElementById('btn-delete-selected');
    const deleteCount = document.getElementById('delete-selected-count');
    if (btnDelete && deleteCount) {
      const count = selectedTxnIds.size;
      deleteCount.innerText = count;
      btnDelete.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  };

  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  if (btnDeleteSelected) {
    btnDeleteSelected.onclick = () => {
      const count = selectedTxnIds.size;
      if (count === 0) return;
      if (confirm(`Are you sure you want to delete the ${count} selected transactions? This will revert all associated wallet balances, physical cash, customer credit, and printing/laminating stocks.`)) {
        let deletedCount = 0;
        let failedCount = 0;

        selectedTxnIds.forEach(id => {
          const deleted = store.deleteTransaction(activeDate, id);
          if (deleted) {
            deletedCount++;
          } else {
            failedCount++;
          }
        });

        if (deletedCount > 0) {
          appInstance.showToast(`${deletedCount} transaction(s) deleted successfully`, 'success');
        }
        if (failedCount > 0) {
          appInstance.showToast(`Failed to delete ${failedCount} transaction(s)`, 'error');
        }

        selectedTxnIds.clear();
        const freshLog = store.getOrCreateDailyLog(activeDate);
        log.transactions = freshLog.transactions;
        redrawTable();
        updateBalanceCards();
      }
    };
  }

  // Redraw the table rows based on filters, pagination, and sorting
  const redrawTable = () => {
    const query = searchInput.value.toLowerCase();
    
    // Filter transactions based on query
    let filteredTxns = log.transactions;
    if (query) {
      filteredTxns = log.transactions.filter(t => 
        (t.description || '').toLowerCase().includes(query) ||
        (t.id || '').toLowerCase().includes(query) ||
        (t.customerId || '').toLowerCase().includes(query)
      );
    }

    // Sort transactions: newest first (reverse order)
    const reversedTxns = [...filteredTxns].reverse();

    const totalItems = reversedTxns.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageTxns = reversedTxns.slice(startIndex, endIndex);

    const tbody = document.getElementById('ledger-tbody');
    if (tbody) {
      tbody.innerHTML = renderLedgerRows(pageTxns);
    }

    // Update pagination indicator text
    document.getElementById('pagination-start').innerText = totalItems > 0 ? startIndex + 1 : 0;
    document.getElementById('pagination-end').innerText = endIndex;
    document.getElementById('pagination-total').innerText = totalItems;
    document.getElementById('pagination-current').innerText = currentPage;
    document.getElementById('pagination-max').innerText = totalPages;

    btnPrevPage.disabled = (currentPage === 1);
    btnNextPage.disabled = (currentPage === totalPages);

    // Bind checkbox event listeners
    const selectAllCheckbox = document.getElementById('select-all-txns');
    if (selectAllCheckbox) {
      const pageTxnIds = pageTxns.map(t => t.id);
      const allPageItemsSelected = pageTxnIds.length > 0 && pageTxnIds.every(id => selectedTxnIds.has(id));
      selectAllCheckbox.checked = allPageItemsSelected;

      selectAllCheckbox.onchange = (e) => {
        const checked = e.target.checked;
        pageTxnIds.forEach(id => {
          if (checked) {
            selectedTxnIds.add(id);
          } else {
            selectedTxnIds.delete(id);
          }
        });
        document.querySelectorAll('.select-txn-checkbox').forEach(cb => {
          const id = cb.getAttribute('data-id');
          cb.checked = selectedTxnIds.has(id);
        });
        updateBulkDeleteButton();
      };
    }

    document.querySelectorAll('.select-txn-checkbox').forEach(cb => {
      const id = cb.getAttribute('data-id');
      cb.checked = selectedTxnIds.has(id);
      cb.onchange = (e) => {
        if (e.target.checked) {
          selectedTxnIds.add(id);
        } else {
          selectedTxnIds.delete(id);
        }
        const pageTxnIds = pageTxns.map(t => t.id);
        const allPageItemsSelected = pageTxnIds.length > 0 && pageTxnIds.every(id => selectedTxnIds.has(id));
        if (selectAllCheckbox) selectAllCheckbox.checked = allPageItemsSelected;
        updateBulkDeleteButton();
      };
    });

    updateBulkDeleteButton();

    // Bind action events on buttons
    bindRowActions();
    lucide.createIcons();
  };

  // Re-render the bottom summary balance cards
  const updateBalanceCards = () => {
    const cardsContainer = document.querySelector('.day-balance-grid');
    if (cardsContainer) {
      const freshLog = store.getOrCreateDailyLog(activeDate);
      const freshCardsHtml = accountsToDisplay.map(acc => {
        const op = (freshLog.openingBalances[acc.key] || 0).toFixed(2);
        const cl = (freshLog.closingBalances[acc.key] || 0).toFixed(2);
        return `
          <div class="glass-card ${acc.class}" style="padding: 16px;">
            <div style="display:flex; justify-content:space-between; font-size: 13px; font-weight:600; color:var(--text-muted); align-items: center;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${acc.name}</span>
              <i data-lucide="${acc.icon}" style="width: 14px; height: 14px; color: ${acc.color}; flex-shrink: 0;"></i>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
              <span style="font-size: 11px; color: var(--text-dimmed); white-space: nowrap;">Op: ₹${op}</span>
              <span style="font-family: var(--font-display); font-size: 16px; font-weight: 700; color: ${acc.class === 'success' ? 'var(--color-success)' : acc.class === 'info' ? 'var(--color-info)' : '#fff'}; white-space: nowrap;">Cl: ₹${cl}</span>
            </div>
          </div>
        `;
      }).join('');
      cardsContainer.innerHTML = freshCardsHtml;
      lucide.createIcons();
    }
  };

  // Bind click handlers for edit/delete icons in rows
  const bindRowActions = () => {
    // Delete action handler
    document.querySelectorAll('.btn-delete-txn').forEach(btn => {
      btn.onclick = (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete this transaction (${txnId})?`)) {
          const deleted = store.deleteTransaction(activeDate, txnId);
          if (deleted) {
            selectedTxnIds.delete(txnId); // Remove from bulk selection Set if present
            appInstance.showToast('Transaction deleted successfully', 'success');
            // Refresh logic and redraw
            const freshLog = store.getOrCreateDailyLog(activeDate);
            log.transactions = freshLog.transactions;
            redrawTable();
            updateBalanceCards();
          } else {
            appInstance.showToast('Failed to delete transaction', 'error');
          }
        }
      };
    });

    // Edit action handler
    document.querySelectorAll('.btn-edit-txn').forEach(btn => {
      btn.onclick = (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        const txn = log.transactions.find(t => t.id === txnId);
        if (txn) {
          openEditModal(txn);
        }
      };
    });
  };

  // Dynamic Form loader for modal (sale or expense)
  const loadTabForm = (tab, editTxn = null) => {
    const mount = document.getElementById('txn-form-mount');
    if (!mount) return;

    if (tab === 'sale') {
      const walletOptions = store.wallets
        .filter(w => w.isActive)
        .map(w => `<option value="${w.id}">${w.name}</option>`)
        .join('');

      const customerOptions = store.customers
        .map(c => `<option value="${c.id}">${c.name} (${c.uniqueNumber})</option>`)
        .join('');

      const productOptions = store.products
        .map(p => `<option value="${p.id}">${p.name} (SKU: ${p.sku || 'N/A'}, Price: ₹${p.sellPrice})</option>`)
        .join('');

      // Determine initial sale type based on edit state
      const initialType = (editTxn && editTxn.productId) ? 'product' : 'service';

      mount.innerHTML = `
        <form id="form-add-sale">
          <!-- Sale Type Toggle Segmented Buttons -->
          <div class="sale-type-toggle" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--panel-border); padding-bottom: 15px;">
            <button type="button" id="btn-sale-type-service" class="btn btn-sm ${initialType === 'service' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; font-weight: 600;">
              <i data-lucide="wrench" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: middle;"></i>Service Sale
            </button>
            <button type="button" id="btn-sale-type-product" class="btn btn-sm ${initialType === 'product' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; font-weight: 600;">
              <i data-lucide="shopping-bag" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: middle;"></i>Product Sale
            </button>
          </div>

          <!-- Section 1: Service Fields (Conditional) -->
          <div id="service-fields-container" style="display: ${initialType === 'service' ? 'block' : 'none'};">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Service Type / Description</label>
                <input type="text" id="sale-desc" class="form-control" placeholder="e.g. Recharge, Print, Caste Certificate" list="service-presets">
                <datalist id="service-presets">
                  <option value="e-District Application">
                  <option value="PAN Card Application">
                  <option value="Passport Registration">
                  <option value="Aadhaar Update">
                  <option value="Print / Copy Service">
                  <option value="Mobile Recharge">
                  <option value="KSEB Bill Payout">
                  <option value="AEPS Cash Withdrawal">
                  <option value="PVC Card Service">
                  <option value="PVC Lamination">
                </datalist>
              </div>
              <div class="form-group">
                <label class="form-label">Pages Printed (Deducts A4 paper)</label>
                <input type="number" id="sale-pages-printed" class="form-control" value="0" min="0">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Deducted Cost Source</label>
                <select id="sale-deduct-source" class="form-control">
                  <option value="none">None (DTP/Print - 100% Service Charge)</option>
                  <option value="account">Direct Bank Account</option>
                  ${walletOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Deducted Wallet/Portal Cost (₹)</label>
                <input type="number" step="0.01" id="sale-deduct-amount-service" class="form-control" value="0.00">
              </div>
            </div>
          </div>

          <!-- Section 2: Product Fields (Conditional) -->
          <div id="product-fields-container" style="display: ${initialType === 'product' ? 'block' : 'none'};">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Select Inventory Product</label>
                <select id="sale-product-link" class="form-control">
                  <option value="">-- Choose Product --</option>
                  ${productOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Quantity Sold</label>
                <input type="number" id="sale-product-qty" class="form-control" value="1" min="1">
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px; margin-top: -5px; padding-left: 2px;">
              Stock details and wholesale cost will auto-fill from the inventory catalog upon product selection.
            </div>
          </div>

          <!-- Common Core Financial Fields -->
          <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 15px; margin-top: 10px;">
            <!-- GST Options Row -->
            <div class="form-row" style="margin-bottom: 12px; align-items: center;">
              <div class="form-group" style="margin-bottom: 0; display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="sale-has-gst" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-primary);">
                <label for="sale-has-gst" style="font-size: 11px; font-weight: 600; color: #fff; margin: 0; cursor: pointer; user-select: none;">Apply GST (Optional)</label>
              </div>
              <div id="gst-config-container" style="display: none; width: 100%; gap: 10px; grid-template-columns: 1fr 1fr;">
                <div class="form-group" style="margin-bottom:0;">
                  <select id="sale-gst-rate" class="form-control" style="font-size:11px; padding: 4px 8px; height: 32px;">
                    <option value="0.18" selected>18% GST (Standard)</option>
                    <option value="0.12">12% GST</option>
                    <option value="0.05">5% GST</option>
                    <option value="0.28">28% GST</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <select id="sale-gst-type" class="form-control" style="font-size:11px; padding: 4px 8px; height: 32px;">
                    <option value="inclusive" selected>Inclusive (Tax in Bill)</option>
                    <option value="exclusive">Exclusive (Add Tax on Top)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- GST Breakdown Summary Card -->
            <div id="gst-breakdown-container" style="display: none; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px dashed var(--panel-border); border-radius: var(--border-radius-sm); font-size: 11px; color: var(--text-muted);">
              <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                <span>Base Taxable Value:</span>
                <span id="gst-lbl-base" style="color:#fff; font-weight:600;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                <span>CGST (Central Tax):</span>
                <span id="gst-lbl-cgst" style="color:var(--color-info); font-weight:600;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>SGST (State / UT Tax):</span>
                <span id="gst-lbl-sgst" style="color:var(--color-info); font-weight:600;">₹0.00</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Total Customer Bill Amount (₹)</label>
                <input type="number" step="0.01" id="sale-amount" class="form-control" placeholder="0.00" required>
              </div>
              <div class="form-group">
                <label class="form-label">Customer Link (Optional)</label>
                <select id="sale-customer" class="form-control">
                  <option value="">-- Unregistered Walk-in --</option>
                  ${customerOptions}
                </select>
              </div>
            </div>

            <div class="form-row-3" style="margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Paid By Cash (₹)</label>
                <input type="number" step="0.01" id="sale-cash" class="form-control" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Paid By UPI / Bank (₹)</label>
                <input type="number" step="0.01" id="sale-upi" class="form-control" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Add to Credit (₹)</label>
                <input type="number" step="0.01" id="sale-credit" class="form-control" value="0.00">
              </div>
            </div>

            <div class="form-group" style="margin-top: 15px; margin-bottom: 0;">
              <label class="form-label">Calculated Service Charge (Net Profit)</label>
              <div id="sale-profit-preview" style="padding: 10px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--border-radius-sm); color: var(--color-success); font-family: var(--font-display); font-weight:700;">
                ₹0.00
              </div>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="submit" class="btn btn-success" style="flex-grow:1;">
              <i data-lucide="${editTxn ? 'check-circle' : 'plus-circle'}" style="width: 16px; height: 16px;"></i> ${editTxn ? 'Update Sale' : 'Log Sale'}
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      // Cancel button click
      mount.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);

      // DOM form elements for calculations
      const inputAmount = document.getElementById('sale-amount');
      const inputCash = document.getElementById('sale-cash');
      const inputUPI = document.getElementById('sale-upi');
      const inputCredit = document.getElementById('sale-credit');
      const profitDiv = document.getElementById('sale-profit-preview');

      // Sale Type state variables and buttons
      let currentSaleType = initialType;
      const btnServiceType = document.getElementById('btn-sale-type-service');
      const btnProductType = document.getElementById('btn-sale-type-product');
      const containerService = document.getElementById('service-fields-container');
      const containerProduct = document.getElementById('product-fields-container');

      const selectProduct = document.getElementById('sale-product-link');
      const inputProductQty = document.getElementById('sale-product-qty');

      const getGstDetails = () => {
        const hasGst = document.getElementById('sale-has-gst').checked;
        const gstConfigContainer = document.getElementById('gst-config-container');
        const gstBreakdownContainer = document.getElementById('gst-breakdown-container');
        
        const enteredAmount = parseFloat(inputAmount.value || 0);
        
        let cost = 0;
        if (currentSaleType === 'service') {
          cost = parseFloat(document.getElementById('sale-deduct-amount-service').value || 0);
        } else if (currentSaleType === 'product') {
          const prodId = selectProduct.value;
          const qty = parseInt(inputProductQty.value || 1);
          if (prodId) {
            const product = store.products.find(p => p.id === prodId);
            if (product) {
              cost = product.buyPrice * qty;
            }
          }
        }
        
        if (hasGst) {
          gstConfigContainer.style.display = 'grid';
          gstBreakdownContainer.style.display = 'block';
          
          const rate = parseFloat(document.getElementById('sale-gst-rate').value);
          const type = document.getElementById('sale-gst-type').value;
          
          let billAmount = enteredAmount;
          let taxableAmount = 0;
          let gstAmount = 0;
          
          if (type === 'inclusive') {
            billAmount = enteredAmount;
            taxableAmount = billAmount / (1 + rate);
            gstAmount = billAmount - taxableAmount;
          } else {
            // Exclusive
            taxableAmount = enteredAmount;
            gstAmount = taxableAmount * rate;
            billAmount = taxableAmount + gstAmount;
          }
          
          const cgst = gstAmount / 2;
          const sgst = gstAmount / 2;
          
          document.getElementById('gst-lbl-base').innerText = `₹${taxableAmount.toFixed(2)}`;
          document.getElementById('gst-lbl-cgst').innerText = `₹${cgst.toFixed(2)}`;
          document.getElementById('gst-lbl-sgst').innerText = `₹${sgst.toFixed(2)}`;
          
          return { billAmount, costAmount: cost, gstAmount, taxableAmount, cgst, sgst, hasGst, rate, type };
        } else {
          gstConfigContainer.style.display = 'none';
          gstBreakdownContainer.style.display = 'none';
          
          const billAmount = enteredAmount;
          return { billAmount, costAmount: cost, gstAmount: 0, taxableAmount: billAmount, cgst: 0, sgst: 0, hasGst: false, rate: 0, type: 'inclusive' };
        }
      };

      const updateProfitMath = () => {
        const gstDetails = getGstDetails();
        
        const cash = parseFloat(inputCash.value || 0);
        const upi = parseFloat(inputUPI.value || 0);
        const credit = parseFloat(inputCredit.value || 0);
        
        const totalReceived = cash + upi + credit;
        const profit = totalReceived - gstDetails.costAmount - gstDetails.gstAmount;
        
        profitDiv.innerText = `₹${profit.toFixed(2)}`;
        
        if (profit < 0) {
          profitDiv.style.color = 'var(--color-danger)';
          profitDiv.style.background = 'rgba(239, 68, 68, 0.05)';
          profitDiv.style.borderColor = 'rgba(239, 68, 68, 0.15)';
        } else {
          profitDiv.style.color = 'var(--color-success)';
          profitDiv.style.background = 'rgba(16, 185, 129, 0.05)';
          profitDiv.style.borderColor = 'rgba(16, 185, 129, 0.15)';
        }
      };

      const setSaleType = (type) => {
        currentSaleType = type;
        if (type === 'service') {
          btnServiceType.className = 'btn btn-sm btn-primary';
          btnProductType.className = 'btn btn-sm btn-secondary';
          containerService.style.display = 'block';
          containerProduct.style.display = 'none';

          // Reset product selector to prevent stock deduction
          selectProduct.value = '';
          inputProductQty.value = '1';
        } else {
          btnServiceType.className = 'btn btn-sm btn-secondary';
          btnProductType.className = 'btn btn-sm btn-primary';
          containerService.style.display = 'none';
          containerProduct.style.display = 'block';

          // Reset service fields
          document.getElementById('sale-desc').value = '';
          document.getElementById('sale-pages-printed').value = '0';
          document.getElementById('sale-deduct-source').value = 'none';
          document.getElementById('sale-deduct-amount-service').value = '0.00';

          // Trigger initial product calculation
          updateProductDetails();
        }
        updateProfitMath();
      };

      btnServiceType.addEventListener('click', () => setSaleType('service'));
      btnProductType.addEventListener('click', () => setSaleType('product'));

      // Product link helper to populate pricing
      const updateProductDetails = () => {
        const prodId = selectProduct.value;
        const qty = parseInt(inputProductQty.value || 1);
        if (prodId) {
          const product = store.products.find(p => p.id === prodId);
          if (product) {
            const totalPrice = product.sellPrice * qty;
            inputAmount.value = totalPrice.toFixed(2);
            inputCash.value = totalPrice.toFixed(2);
            inputUPI.value = '0.00';
            inputCredit.value = '0.00';
            updateProfitMath();
          }
        }
      };

      selectProduct.addEventListener('change', updateProductDetails);
      inputProductQty.addEventListener('input', updateProductDetails);

      const inputDeductService = document.getElementById('sale-deduct-amount-service');
      if (inputDeductService) {
        inputDeductService.addEventListener('input', updateProfitMath);
      }

      // GST Event Listeners
      const hasGstCheckbox = document.getElementById('sale-has-gst');
      const selectGstRate = document.getElementById('sale-gst-rate');
      const selectGstType = document.getElementById('sale-gst-type');

      hasGstCheckbox.addEventListener('change', () => {
        adjustPayments();
      });
      selectGstRate.addEventListener('change', () => {
        adjustPayments();
      });
      selectGstType.addEventListener('change', () => {
        adjustPayments();
      });

      // Pre-fill values if editing
      if (editTxn) {
        if (editTxn.productId) {
          selectProduct.value = editTxn.productId;
          inputProductQty.value = editTxn.quantity || 1;
        } else {
          document.getElementById('sale-desc').value = editTxn.description || '';
          document.getElementById('sale-pages-printed').value = editTxn.pagesPrinted || 0;
          document.getElementById('sale-deduct-source').value = editTxn.deductedFrom || 'none';
          document.getElementById('sale-deduct-amount-service').value = editTxn.deductedAmount || 0;
        }

        // Initialize GST fields
        if (editTxn.hasGst) {
          hasGstCheckbox.checked = true;
          selectGstRate.value = editTxn.gstRate;
          selectGstType.value = editTxn.gstType;
        } else {
          hasGstCheckbox.checked = false;
        }

        inputAmount.value = editTxn.taxableAmount || editTxn.amount || 0;
        inputCash.value = editTxn.paidByCash || 0;
        inputUPI.value = editTxn.paidByUPI || 0;
        inputCredit.value = editTxn.paidByCredit || 0;
        document.getElementById('sale-customer').value = editTxn.customerId || '';
        updateProfitMath();
      }

      // Automatically fill payment distributions based on total amount
      inputAmount.addEventListener('input', (e) => {
        const gstDetails = getGstDetails();
        inputCash.value = gstDetails.billAmount.toFixed(2);
        inputUPI.value = '0.00';
        inputCredit.value = '0.00';
        updateProfitMath();
      });

      const adjustPayments = () => {
        const gstDetails = getGstDetails();
        const amt = gstDetails.billAmount;
        const cash = parseFloat(inputCash.value || 0);
        const credit = parseFloat(inputCredit.value || 0);
        inputUPI.value = Math.max(0, amt - cash - credit).toFixed(2);
        updateProfitMath();
      };

      inputCash.addEventListener('input', adjustPayments);
      inputCredit.addEventListener('input', adjustPayments);
      inputUPI.addEventListener('input', () => {
        const gstDetails = getGstDetails();
        const amt = gstDetails.billAmount;
        const upi = parseFloat(inputUPI.value || 0);
        const credit = parseFloat(inputCredit.value || 0);
        inputCash.value = Math.max(0, amt - upi - credit).toFixed(2);
        updateProfitMath();
      });

      // Submit handler
      document.getElementById('form-add-sale').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const gstDetails = getGstDetails();
        const amount = gstDetails.billAmount;
        const cash = parseFloat(inputCash.value || 0);
        const upi = parseFloat(inputUPI.value || 0);
        const credit = parseFloat(inputCredit.value || 0);
        const customerId = document.getElementById('sale-customer').value;

        if (Math.abs((cash + upi + credit) - amount) > 0.05) {
          alert(`Total of Cash + UPI + Credit payments must match the total bill amount of ₹${amount.toFixed(2)}!`);
          return;
        }

        if (credit > 0 && !customerId) {
          alert('You must select a registered Customer to link outstanding credit!');
          return;
        }

        // Validate based on active tab
        if (currentSaleType === 'service' && !document.getElementById('sale-desc').value.trim()) {
          alert('Please enter a service type or description!');
          return;
        }
        if (currentSaleType === 'product' && !selectProduct.value) {
          alert('Please select a product from your inventory!');
          return;
        }

        // Assemble variables based on type
        const isProd = (currentSaleType === 'product');
        const productId = isProd ? selectProduct.value : null;
        const quantity = isProd ? parseInt(inputProductQty.value || 1) : 0;
        
        let description = '';
        let pagesPrinted = 0;
        let deductedFrom = 'none';
        let deductedAmount = 0;

        if (isProd) {
          const selectedProduct = store.products.find(p => p.id === productId);
          description = `${selectedProduct.name} (x${quantity})`;
          deductedAmount = selectedProduct.buyPrice * quantity;
        } else {
          description = document.getElementById('sale-desc').value.trim();
          pagesPrinted = parseInt(document.getElementById('sale-pages-printed').value || 0);
          deductedFrom = document.getElementById('sale-deduct-source').value;
          deductedAmount = parseFloat(document.getElementById('sale-deduct-amount-service').value || 0);
        }

        if (gstDetails.hasGst) {
          description += ` (+${(gstDetails.rate * 100).toFixed(0)}% GST)`;
        }

        const txnData = {
          type: 'sale',
          description,
          amount,
          paidByCash: cash,
          paidByUPI: upi,
          paidByCredit: credit,
          pagesPrinted,
          deductedFrom,
          deductedAmount,
          customerId,
          productId,
          quantity,
          hasGst: gstDetails.hasGst,
          gstRate: gstDetails.rate,
          gstType: gstDetails.type,
          gstAmount: gstDetails.gstAmount,
          cgst: gstDetails.cgst,
          sgst: gstDetails.sgst,
          taxableAmount: gstDetails.taxableAmount,
          staffId: editTxn ? editTxn.staffId : 'STAFF-04'
        };

        if (editTxn) {
          store.updateTransaction(activeDate, editTxn.id, txnData);
          appInstance.showToast('Transaction updated successfully', 'success');
        } else {
          store.addTransaction(activeDate, txnData);
          appInstance.showToast('Sale transaction recorded successfully!', 'success');
        }

        closeModal();
        
        // Refresh local data & UI
        const freshLog = store.getOrCreateDailyLog(activeDate);
        log.transactions = freshLog.transactions;
        redrawTable();
        updateBalanceCards();
      });

    } else if (tab === 'expense') {
      mount.innerHTML = `
        <form id="form-add-expense">
          <div class="form-group">
            <label class="form-label">Expense Description / Payee</label>
            <input type="text" id="expense-desc" class="form-control" placeholder="e.g. Tea and Snacks, Shop Rent, Paper purchase" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="expense-category" class="form-control">
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
              <input type="number" step="0.01" id="expense-amount" class="form-control" placeholder="0.00" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Source</label>
            <select id="expense-source" class="form-control">
              <option value="cash">Cash In Hand (Physical Cash)</option>
              <option value="account">Bank Account (UPI / Transfer)</option>
            </select>
          </div>

          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-success" style="flex-grow:1;">
              <i data-lucide="${editTxn ? 'check-circle' : 'plus-circle'}" style="width: 16px; height: 16px;"></i> ${editTxn ? 'Update Expense' : 'Log Expense'}
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      mount.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);

      // Pre-fill values if editing
      if (editTxn) {
        document.getElementById('expense-desc').value = editTxn.description || '';
        document.getElementById('expense-category').value = editTxn.category || 'Other';
        document.getElementById('expense-amount').value = editTxn.amount || 0;
        document.getElementById('expense-source').value = editTxn.source || 'cash';
      }

      document.getElementById('form-add-expense').addEventListener('submit', (e) => {
        e.preventDefault();

        const txnData = {
          type: 'expense',
          description: document.getElementById('expense-desc').value,
          amount: parseFloat(document.getElementById('expense-amount').value),
          category: document.getElementById('expense-category').value,
          source: document.getElementById('expense-source').value
        };

        if (editTxn) {
          store.updateTransaction(activeDate, editTxn.id, txnData);
          appInstance.showToast('Transaction updated successfully', 'success');
        } else {
          store.addTransaction(activeDate, txnData);
          appInstance.showToast('Expense recorded successfully', 'success');
        }

        closeModal();
        
        // Refresh local data & UI
        const freshLog = store.getOrCreateDailyLog(activeDate);
        log.transactions = freshLog.transactions;
        redrawTable();
        updateBalanceCards();
      });
    }

    lucide.createIcons();
  };

  // Auto-open new sale modal if query parameter action=new-sale is present
  if (appInstance.queryParams && appInstance.queryParams.action === 'new-sale') {
    openAddModal();
  }

  // Initial draw of the table when view renders
  redrawTable();
}

// Generate rows based on transactions
function renderLedgerRows(txns) {
  // Helper to format currency inside rows
  const fmt = (val) => val !== undefined && val !== 0 ? `₹${parseFloat(val).toFixed(2)}` : '—';

  if (txns.length === 0) {
    return `<tr><td colspan="18" style="text-align: center; color: var(--text-dimmed); padding: 30px 0;">No transactions logged for this day.</td></tr>`;
  }

  return txns.map(t => {
    let typeBadge = '';
    let columns = Array(15).fill('—');

    if (t.type === 'sale') {
      typeBadge = `<span class="badge sale">Sale</span>`;
      columns[0] = t.description + (t.productId ? ` <span style="font-size:10px; color:var(--color-primary); background:rgba(139,92,246,0.15); padding:1px 4px; border-radius:3px; font-weight: 500; margin-left: 5px;">Product</span>` : '');
      columns[1] = fmt(t.amount);
      columns[2] = fmt(t.paidByCash);
      columns[3] = fmt(t.paidByUPI);
      columns[4] = fmt(t.paidByCredit);
      columns[5] = fmt(t.serviceChargeToAccount);
      columns[6] = fmt(t.serviceChargeToCash);

      // Deduction logic columns
      const source = t.deductedFrom === 'account' ? 'main_bob' : t.deductedFrom;
      if (source === 'main_bob') columns[7] = fmt(t.deductedAmount);
      else if (source === 'csc') columns[8] = fmt(t.deductedAmount);
      else if (source === 'paynearby') columns[9] = fmt(t.deductedAmount);
      else if (source === 'airtel_pb') columns[10] = fmt(t.deductedAmount);
      else if (source === 'ibkart') columns[11] = fmt(t.deductedAmount);
      else if (source === 'bsnl') columns[12] = fmt(t.deductedAmount);
      else if (source === 'vi') columns[13] = fmt(t.deductedAmount);
      else if (source === 'airtel') columns[14] = fmt(t.deductedAmount);

    } else if (t.type === 'deposit') {
      typeBadge = `<span class="badge deposit">Deposit</span>`;
      columns[0] = t.description;
      columns[1] = fmt(t.amount);
      
      const source = t.source === 'account' ? 'main_bob' : t.source;
      if (source === 'cash') {
        columns[2] = `-${fmt(t.amount)}`;
        columns[7] = `+${fmt(t.amount)}`;
      } else {
        if (source === 'main_bob') columns[7] = fmt(t.amount);
        const target = t.targetWallet === 'account' ? 'main_bob' : t.targetWallet;
        if (target === 'csc') columns[8] = `+${fmt(t.amount)}`;
        else if (target === 'paynearby') columns[9] = `+${fmt(t.amount)}`;
        else if (target === 'airtel_pb') columns[10] = `+${fmt(t.amount)}`;
        else if (target === 'ibkart') columns[11] = `+${fmt(t.amount)}`;
        else if (target === 'bsnl') columns[12] = `+${fmt(t.amount)}`;
        else if (target === 'vi') columns[13] = `+${fmt(t.amount)}`;
        else if (target === 'airtel') columns[14] = `+${fmt(t.amount)}`;
      }
    } else if (t.type === 'expense' || t.type === 'salary') {
      typeBadge = `<span class="badge expense">Expense</span>`;
      columns[0] = t.description;
      columns[1] = fmt(t.amount);
      const source = t.source === 'account' ? 'main_bob' : t.source;
      if (source === 'cash') {
        columns[2] = `-${fmt(t.amount)}`;
      } else if (source === 'main_bob') {
        columns[7] = `-${fmt(t.amount)}`;
      }
    } else if (t.type === 'adjustment') {
      typeBadge = `<span class="badge deposit" style="background:rgba(245,158,11,0.1); color:var(--color-warning);">Adjustment</span>`;
      columns[0] = t.description;
      columns[1] = fmt(t.amount);
      const source = t.sourceId;
      const sign = (t.diff || 0) >= 0 ? '+' : '';
      if (source === 'cash') columns[2] = `${sign}${fmt(t.diff)}`;
      else if (source === 'main_bob') columns[7] = `${sign}${fmt(t.diff)}`;
      else if (source === 'csc') columns[8] = `${sign}${fmt(t.diff)}`;
      else if (source === 'paynearby') columns[9] = `${sign}${fmt(t.diff)}`;
      else if (source === 'airtel_pb') columns[10] = `${sign}${fmt(t.diff)}`;
      else if (source === 'ibkart') columns[11] = `${sign}${fmt(t.diff)}`;
      else if (source === 'bsnl') columns[12] = `${sign}${fmt(t.diff)}`;
      else if (source === 'vi') columns[13] = `${sign}${fmt(t.diff)}`;
      else if (source === 'airtel') columns[14] = `${sign}${fmt(t.diff)}`;
    }

    // Only allow editing for sales (the ones loggable via this screen)
    const isEditable = (t.type === 'sale');

    return `
      <tr>
        <td style="text-align: center; vertical-align: middle;"><input type="checkbox" class="select-txn-checkbox" data-id="${t.id}" style="cursor: pointer;"></td>
        <td>${typeBadge}</td>
        <td><strong>${columns[0]}</strong></td>
        <td>${columns[1]}</td>
        <td>${columns[2]}</td>
        <td>${columns[3]}</td>
        <td style="color: var(--color-warning);">${columns[4]}</td>
        <td style="color: var(--color-info); font-weight: 500;">${columns[5]}</td>
        <td style="color: var(--color-success); font-weight: 500;">${columns[6]}</td>
        <td>${columns[7]}</td>
        <td>${columns[8]}</td>
        <td>${columns[9]}</td>
        <td>${columns[10]}</td>
        <td>${columns[11]}</td>
        <td>${columns[12]}</td>
        <td>${columns[13]}</td>
        <td>${columns[14]}</td>
        <td style="text-align: center; white-space: nowrap;">
          ${isEditable ? `
            <button class="btn btn-sm btn-secondary btn-edit-txn" data-id="${t.id}" style="padding: 4px; color: var(--color-info); border: 1px solid rgba(14,165,233,0.15); background: rgba(14,165,233,0.02); margin-right: 4px;">
              <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary btn-delete-txn" data-id="${t.id}" style="padding: 4px; color: var(--color-danger); border: 1px solid rgba(239,68,68,0.15); background: rgba(239,68,68,0.02);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export default renderTransactions;
