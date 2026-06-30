/* ==========================================================================
   CYBERONE Center Management Platform - Transactions View (views/transactions.js)
   ========================================================================== */

import { store, getTodayDateString } from '../store.js';
import { auth } from '../auth.js';

export function renderTransactions(mountPoint, appInstance) {
  let activeDate = appInstance.getActiveDate();
  let log = store.getOrCreateDailyLog(activeDate);
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
  let itemsPerPage = parseInt(localStorage.getItem('cyberone_ledger_page_size') || 10);
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
        <input type="date" id="txn-date-picker" value="${activeDate}" style="background: var(--datepicker-bg); border: 1px solid var(--panel-border); color: var(--datepicker-color); font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; color-scheme: var(--datepicker-color-scheme); font-family: var(--font-primary); height: 38px; box-sizing: border-box;">
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
              <th style="text-align: center; width: 110px;">Actions</th>
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
            </tr>
          </thead>
          <tbody id="ledger-tbody">
            <!-- Rendered dynamically via redrawTable -->
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: var(--bg-card-medium); border-top: 1px solid var(--panel-border); font-size: 13px;">
        <div style="color: var(--text-muted); display: flex; align-items: center; gap: 15px;">
          <span>Showing <span id="pagination-start">0</span> to <span id="pagination-end">0</span> of <span id="pagination-total">0</span> transactions</span>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: 15px;">
            <label for="select-page-size" style="font-size: 12px; font-weight: 500;">Show:</label>
            <select id="select-page-size" style="background: var(--datepicker-bg); border: 1px solid var(--panel-border); color: var(--text-white-invert); font-size: 11px; padding: 4px 8px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; height: 26px; box-sizing: border-box; font-family: inherit;">
              <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-prev-page" class="btn btn-sm btn-secondary" style="padding: 6px 12px; font-weight: 600; outline: none; border: 1px solid var(--panel-border); display: flex; align-items: center; gap: 4px; cursor: pointer;">
            <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> Previous
          </button>
          <span style="font-weight: 600; color: var(--text-white-invert); padding: 0 8px; font-family: var(--font-primary);">Page <span id="pagination-current">1</span> of <span id="pagination-max">1</span></span>
          <button id="btn-next-page" class="btn btn-sm btn-secondary" style="padding: 6px 12px; font-weight: 600; outline: none; border: 1px solid var(--panel-border); display: flex; align-items: center; gap: 4px; cursor: pointer;">
            Next <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
    </div>



    <!-- Modals backdrop and containers -->
    <div id="txn-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header" style="position: relative; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); padding-bottom: 12px;">
          <h4 style="margin: 0;">Record Daily Sale</h4>
          <div id="txn-type-switch" style="display: flex; gap: 8px; margin-right: 35px;">
            <button type="button" id="btn-switch-sale" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 600;">Sale</button>
            <button type="button" id="btn-switch-expense" class="btn btn-sm btn-secondary" style="padding: 4px 10px; font-size: 11px; font-weight: 600;">Expense</button>
          </div>
          <button id="txn-modal-close" class="modal-close" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; outline: none; transition: var(--transition-smooth);">&times;</button>
        </div>

        <!-- Dynamic Form Body mount -->
        <div id="txn-form-mount"></div>
      </div>
    </div>

    <!-- Receipt Preview Modal Backdrop -->
    <div id="receipt-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" id="receipt-modal-container" style="max-width: 650px;">
        <!-- Dynamic receipt content mounts here -->
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
    const typeSwitch = document.getElementById('txn-type-switch');
    if (typeSwitch) {
      typeSwitch.style.display = 'flex';
      document.getElementById('btn-switch-sale').className = 'btn btn-sm btn-primary';
      document.getElementById('btn-switch-expense').className = 'btn btn-sm btn-secondary';
    }

    const headerTitle = modalBackdrop.querySelector('.modal-header h4');
    if (headerTitle) headerTitle.innerText = 'Record Daily Sale';

    modalBackdrop.classList.add('show');
    loadTabForm('sale');
  };

  const openEditModal = (txn) => {
    const typeSwitch = document.getElementById('txn-type-switch');
    if (typeSwitch) typeSwitch.style.display = 'none';

    const headerTitle = modalBackdrop.querySelector('.modal-header h4');
    
    if (txn.type === 'expense') {
      if (headerTitle) headerTitle.innerText = `Edit Daily Expense (${txn.id})`;
      modalBackdrop.classList.add('show');
      loadTabForm('expense', txn);
    } else {
      if (headerTitle) headerTitle.innerText = `Edit Daily Sale (${txn.id})`;
      modalBackdrop.classList.add('show');
      loadTabForm('sale', txn);
    }
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

  const btnSwitchSale = document.getElementById('btn-switch-sale');
  const btnSwitchExpense = document.getElementById('btn-switch-expense');

  if (btnSwitchSale && btnSwitchExpense) {
    btnSwitchSale.addEventListener('click', () => {
      btnSwitchSale.className = 'btn btn-sm btn-primary';
      btnSwitchExpense.className = 'btn btn-sm btn-secondary';
      const headerTitle = modalBackdrop.querySelector('.modal-header h4');
      if (headerTitle) headerTitle.innerText = 'Record Daily Sale';
      loadTabForm('sale');
    });

    btnSwitchExpense.addEventListener('click', () => {
      btnSwitchExpense.className = 'btn btn-sm btn-primary';
      btnSwitchSale.className = 'btn btn-sm btn-secondary';
      const headerTitle = modalBackdrop.querySelector('.modal-header h4');
      if (headerTitle) headerTitle.innerText = 'Record Daily Expense';
      loadTabForm('expense');
    });
  }
  // Backdrop click close disabled - modal only closes via Cancel/X button

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

  const selectPageSize = document.getElementById('select-page-size');
  if (selectPageSize) {
    selectPageSize.addEventListener('change', (e) => {
      itemsPerPage = parseInt(e.target.value);
      localStorage.setItem('cyberone_ledger_page_size', itemsPerPage);
      currentPage = 1;
      redrawTable();
    });
  }

  const txnDatePicker = document.getElementById('txn-date-picker');
  if (txnDatePicker) {
    txnDatePicker.addEventListener('change', (e) => {
      appInstance.setActiveDate(e.target.value);
    });
  }

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
        log = store.getOrCreateDailyLog(activeDate);
        redrawTable();
        updateBalanceCards();
      }
    };
  }

  // Redraw the table rows based on filters, pagination, and sorting
  const redrawTable = () => {
    const query = searchInput.value.toLowerCase();
    
    // Filter transactions based on query, showing all transactions
    let filteredTxns = log.transactions;
    if (query) {
      filteredTxns = filteredTxns.filter(t => 
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

  // View printable receipt helper
  const openReceiptPreview = (t) => {
    const customers = store.customers;
    const client = customers.find(c => c.id === t.customerId);
    
    // Generate virtual invoice variables
    const taxRate = t.hasGst ? (t.gstRate || 0.18) : 0.00;
    const subtotal = t.taxableAmount || t.amount;
    const taxAmount = t.gstAmount || 0;
    
    const invNo = t.id.replace('TXN-', 'REC-');

    const container = document.getElementById('receipt-modal-container');
    const backdrop = document.getElementById('receipt-modal-backdrop');
    const closeModal = () => backdrop.classList.remove('show');

    container.innerHTML = `
      <div class="modal-header" style="border-bottom:1px solid var(--panel-border); padding-bottom:10px;">
        <h4 style="font-family:var(--font-display); font-size: 16px; margin: 0;">Transaction Receipt Details</h4>
        <button id="rec-modal-close" class="modal-close" style="display: block !important; background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer;">&times;</button>
      </div>

      <div id="printable-invoice-receipt" class="preview-normal" style="padding: 15px; background: #fff; color: #000; border-radius: var(--border-radius-sm);">
        <div class="receipt-header" style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; text-align: left;">
          <div class="header-left" style="display: flex; gap: 8px; align-items: flex-start; max-width: 65%;">
            <img class="receipt-logo" src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" alt="logo" style="width: 40px; height: 40px; object-fit: contain;" onerror="this.style.display='none';">
            <div class="company-info" style="display: flex; flex-direction: column; gap: 2px;">
              <h3 style="font-size: 14px; margin: 0; color: #1e1b4b; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">${store.centerProfile.name}</h3>
              <div style="font-size: 9px; font-weight: 700; color: #4338ca; display: flex; gap: 4px; align-items: center; margin-bottom: 2px;">
                <span>CODE: ${store.centerProfile.code}</span>
                ${store.centerProfile.gstin ? `<span>|</span><span>GSTIN: ${store.centerProfile.gstin}</span>` : ''}
              </div>
              <p style="margin: 0; font-size: 9px; color: #4b5563; line-height: 1.3;">
                ${store.centerProfile.address}, ${store.centerProfile.city}, ${store.centerProfile.state} - ${store.centerProfile.pin}
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 9px; color: #1f2937; font-weight: 500; margin-top: 2px;">
                <span>📞 ${store.centerProfile.mobile}</span>
                <span>•</span>
                <span>✉️ ${store.centerProfile.email}</span>
              </div>
            </div>
          </div>
          <div class="header-right" style="text-align: right; min-width: 30%;">
            <h2 class="doc-type-title" style="margin: 0 0 5px 0; font-size: 18px; color: #10b981; font-weight: 800; text-transform: uppercase;">Receipt</h2>
            <table class="meta-details-table" style="font-size: 10px; margin-left: auto; text-align: right; border-collapse: collapse; line-height: 1.3;">
              <tr>
                <td style="color: #6b7280; padding-right: 5px;">Receipt No:</td>
                <td style="font-weight: 600; font-family: monospace;">${invNo}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding-right: 5px;">Citizen:</td>
                <td style="font-weight: 600;">${client ? client.name : 'Walk-in'}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding-right: 5px;">Date:</td>
                <td style="font-weight: 600;">${activeDate}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding-right: 5px;">Mode:</td>
                <td style="font-weight: 700; text-transform: uppercase; color: #10b981;">
                  ${t.paidByUPI > 0 ? 'UPI' : t.paidByCash > 0 ? 'CASH' : t.paidByCredit > 0 ? 'CREDIT' : 'SETTLED'}
                </td>
              </tr>
            </table>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border-top:1px solid #000; border-bottom:1px solid #000; font-size: 11px; margin-top: 10px; line-height: 1.4;">
          <thead>
            <tr style="border-bottom:1px solid #ddd; background: rgba(0,0,0,0.02);">
              <th style="text-align: left; padding: 6px 4px; font-weight: 600;">Description</th>
              <th style="text-align: center; padding: 6px 4px; width:40px; font-weight: 600;">Qty</th>
              <th style="text-align: right; padding: 6px 4px; width:70px; font-weight: 600;">Rate</th>
              <th style="text-align: right; padding: 6px 4px; width:80px; font-weight: 600;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 4px; text-align: left;">${t.description}</td>
              <td style="text-align: center; padding: 6px 4px;">${t.quantity || 1}</td>
              <td style="text-align: right; padding: 6px 4px;">₹${(subtotal / (t.quantity || 1)).toFixed(2)}</td>
              <td style="text-align: right; padding: 6px 4px;">₹${subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <table style="width: 50%; border-collapse: collapse; margin-left: auto; font-size:10px; margin-bottom:15px; line-height: 1.3;">
          <tr>
            <td style="padding:2px 0; text-align: left; color: #6b7280;">Subtotal:</td>
            <td style="text-align: right; padding:2px 0; font-weight: 500;">₹${subtotal.toFixed(2)}</td>
          </tr>
          ${t.hasGst ? `
          <tr>
            <td style="padding:2px 0; text-align: left; color: #6b7280;">GST (${(taxRate * 100).toFixed(0)}%):</td>
            <td style="text-align: right; padding:2px 0; font-weight: 500;">₹${taxAmount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr style="font-weight:700; font-size:12px; border-top:1px solid #000;">
            <td style="padding:4px 0; text-align: left; color: #000;">Total Paid:</td>
            <td style="text-align: right; padding:4px 0; color:#0891b2; font-size: 13px;">₹${t.amount.toFixed(2)}</td>
          </tr>
        </table>

        <div style="text-align:center; font-size: 9px; color:#555; border-top:1px dashed #ddd; padding-top:10px; margin-top:15px; font-style: italic;">
          Thank you for choosing CYBERONE CSC. Keep this copy for future reference.
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid var(--panel-border); padding-top:15px;" class="no-print">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Print Layout:</span>
        <div style="display:flex; gap:5px;">
          <button id="btn-rec-format-normal" class="btn btn-xs btn-primary" style="font-size:10px; padding: 4px 8px;">A4 Normal</button>
          <button id="btn-rec-format-thermal" class="btn btn-xs btn-secondary" style="font-size:10px; padding: 4px 8px;">80mm Thermal</button>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:15px;" class="no-print">
        <button id="btn-print-rec" class="btn btn-primary" style="flex-grow:1;">
          <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Receipt
        </button>
        <button id="btn-download-rec" class="btn btn-secondary" style="flex-grow:1;">
          <i data-lucide="download" style="width:16px; height:16px;"></i> Download PDF
        </button>
        <button id="btn-close-rec" class="btn btn-secondary">Close</button>
      </div>
    `;

    lucide.createIcons();
    document.getElementById('rec-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-close-rec').addEventListener('click', closeModal);
    backdrop.classList.add('show');

    let printFormat = 'normal';
    const btnFormatNormal = document.getElementById('btn-rec-format-normal');
    const btnFormatThermal = document.getElementById('btn-rec-format-thermal');
    const receiptContainer = document.getElementById('printable-invoice-receipt');

    btnFormatNormal.addEventListener('click', () => {
      printFormat = 'normal';
      receiptContainer.className = 'preview-normal';
      btnFormatNormal.classList.replace('btn-secondary', 'btn-primary');
      btnFormatThermal.classList.replace('btn-primary', 'btn-secondary');
    });

    btnFormatThermal.addEventListener('click', () => {
      printFormat = 'thermal';
      receiptContainer.className = 'preview-thermal';
      btnFormatThermal.classList.replace('btn-secondary', 'btn-primary');
      btnFormatNormal.classList.replace('btn-primary', 'btn-secondary');
    });

    document.getElementById('btn-print-rec').addEventListener('click', () => {
      appInstance.printElement(printFormat);
    });

    document.getElementById('btn-download-rec').addEventListener('click', () => {
      appInstance.downloadElementAsPDF('printable-invoice-receipt', `Receipt_${invNo}.pdf`, printFormat === 'thermal');
    });
  };

  // Bind click handlers for edit/delete icons in rows
  const bindRowActions = () => {
    // Receipt action handler
    document.querySelectorAll('.btn-view-txn-receipt').forEach(btn => {
      btn.onclick = (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        const txn = log.transactions.find(t => t.id === txnId);
        if (txn) {
          openReceiptPreview(txn);
        }
      };
    });

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
            log = store.getOrCreateDailyLog(activeDate);
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

      const consumableProductOptions = store.products
        .filter(p => p.type === 'product')
        .map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`)
        .join('');

      const createConsumableRow = (productId = '', quantity = 1) => {
        const row = document.createElement('div');
        row.className = 'consumable-row';
        row.style = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
        row.innerHTML = `
          <select class="form-control consumable-select" style="flex: 2; height: 32px; font-size: 12px; padding: 4px 8px;">
            <option value="">-- Choose Material --</option>
            ${consumableProductOptions}
          </select>
          <input type="number" class="form-control consumable-qty" value="${quantity}" min="1" style="flex: 1; height: 32px; font-size: 12px; padding: 4px 8px; min-width: 60px;">
          <button type="button" class="btn btn-danger btn-sm btn-delete-consumable" style="height: 32px; width: 32px; padding: 0; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        `;
        if (productId) {
          row.querySelector('.consumable-select').value = productId;
        }
        row.querySelector('.btn-delete-consumable').addEventListener('click', () => {
          row.remove();
        });
        return row;
      };

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

          <!-- Essential Details Section -->
          <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
            <!-- Service Description Field (Conditional) -->
            <div id="service-desc-group" style="flex: 2; display: ${initialType === 'service' ? 'block' : 'none'};">
              <label class="form-label">Service Type / Description</label>
              <input type="text" id="sale-desc" class="form-control" placeholder="e.g. Recharge, Print, Caste Certificate" list="service-presets" ${initialType === 'service' ? 'required' : ''}>
              <datalist id="service-presets">
                ${store.serviceTypes.map(s => `<option value="${s}">`).join('')}
              </datalist>
            </div>
            
            <!-- Product Link Field (Conditional) -->
            <div id="product-link-group" style="flex: 2; display: ${initialType === 'product' ? 'block' : 'none'};">
              <label class="form-label">Select Inventory Product</label>
              <select id="sale-product-link" class="form-control" ${initialType === 'product' ? 'required' : ''}>
                <option value="">-- Choose Product --</option>
                ${productOptions}
              </select>
            </div>
            
            <!-- Quantity Field (Conditional) -->
            <div id="product-qty-group" style="flex: 1; display: ${initialType === 'product' ? 'block' : 'none'};">
              <label class="form-label">Quantity</label>
              <input type="number" id="sale-product-qty" class="form-control" value="1" min="1">
            </div>

            <!-- Total Bill Amount -->
            <div style="flex: 1.2;">
              <label class="form-label">Total Bill Amount (₹)</label>
              <input type="number" step="0.01" id="sale-amount" class="form-control" placeholder="0.00" required>
            </div>
          </div>

          <!-- Payment Fields -->
          <div class="form-row-3" style="margin-bottom: 15px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Paid By Cash (₹)</label>
              <input type="number" step="0.01" id="sale-cash" class="form-control" value="0.00">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Paid By UPI / Bank (₹)</label>
              <input type="number" step="0.01" id="sale-upi" class="form-control" value="0.00">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Add to Credit (₹)</label>
              <input type="number" step="0.01" id="sale-credit" class="form-control" value="0.00">
            </div>
          </div>

          <!-- Customer Link -->
          <div class="form-group" style="position: relative; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <label class="form-label" style="margin-bottom: 0;">Customer Link (Optional)</label>
              <a href="javascript:void(0);" id="btn-quick-add-customer" style="font-size: 11px; font-weight: 600; color: var(--color-primary); text-decoration: none;">+ Quick Register</a>
            </div>
            <select id="sale-customer" class="form-control">
              <option value="">-- Unregistered Walk-in --</option>
              ${customerOptions}
            </select>
          </div>

          <!-- Quick Register Customer Section -->
          <div id="quick-customer-section" style="display: none; background: var(--bg-card-medium); border: 1px solid var(--panel-border); padding: 12px; border-radius: var(--border-radius-sm); margin-bottom: 15px; width: 100%; box-sizing: border-box;">
            <h4 style="font-size: 12px; font-weight: 700; color: var(--text-white-invert); margin-bottom: 8px;">Quick Register Customer</h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <input type="text" id="quick-cust-name" class="form-control" placeholder="Customer Name" style="flex: 1; min-width: 120px; font-size: 12px; padding: 6px 10px; height: 32px; background: rgba(0,0,0,0.2);">
              <input type="text" id="quick-cust-phone" class="form-control" placeholder="Phone Number" style="flex: 1; min-width: 120px; font-size: 12px; padding: 6px 10px; height: 32px; background: rgba(0,0,0,0.2);">
              <button type="button" id="btn-save-quick-customer" class="btn btn-primary btn-sm" style="height: 32px; padding: 0 12px; font-size: 11px; font-weight: 600;">Save</button>
              <button type="button" id="btn-cancel-quick-customer" class="btn btn-secondary btn-sm" style="height: 32px; padding: 0 12px; font-size: 11px; font-weight: 600;">Cancel</button>
            </div>
          </div>

          <!-- Additional Details (Deductions, Material, GST) -->
          <div style="border-top: 1px solid var(--border-hairline-solid); padding-top: 15px; margin-top: 15px;">
            
            <!-- Service Specific Cost Deductions (Conditional) -->
            <div id="service-specific-fields" style="display: ${initialType === 'service' ? 'block' : 'none'}; margin-bottom: 15px;">
              <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">Cost Deductions (Multi-source)</label>
                <div id="deductions-list-container" style="display: flex; flex-direction: column; gap: 8px;">
                  <!-- Dynamic rows go here -->
                </div>
                <button type="button" id="btn-add-deduction-row" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;">
                  <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add Deduction Source
                </button>
              </div>

              <!-- Material Deductions (Consumables) -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Material Deductions (Consumables)</label>
                <div id="consumables-list-container" style="display: flex; flex-direction: column; gap: 8px;">
                  <!-- Rows dynamically appended -->
                </div>
                <button type="button" id="btn-add-consumable-row" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;">
                  <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add Material
                </button>
              </div>
            </div>

            <!-- GST Options -->
            <div class="form-group" style="margin-bottom: 15px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <input type="checkbox" id="sale-has-gst" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-primary);">
                <label for="sale-has-gst" style="font-size: 11px; font-weight: 600; color: var(--text-white-invert); margin: 0; cursor: pointer; user-select: none;">Apply GST (Optional)</label>
              </div>
              <div id="gst-config-container" style="display: none; gap: 10px; grid-template-columns: 1fr 1fr; margin-bottom: 10px;">
                <select id="sale-gst-rate" class="form-control" style="font-size: 11px; height: 32px; padding: 4px 8px;">
                  <option value="0.18" selected>18% GST (Standard)</option>
                  <option value="0.12">12% GST</option>
                  <option value="0.05">5% GST</option>
                  <option value="0.28">28% GST</option>
                </select>
                <select id="sale-gst-type" class="form-control" style="font-size: 11px; height: 32px; padding: 4px 8px;">
                  <option value="inclusive" selected>Inclusive (Tax in Bill)</option>
                  <option value="exclusive">Exclusive (Add Tax on Top)</option>
                </select>
              </div>
            </div>

            <!-- GST Breakdown Summary Card -->
            <div id="gst-breakdown-container" style="display: none; margin-bottom: 15px; padding: 10px; background: var(--bg-card-medium); border: 1px dashed var(--panel-border); border-radius: var(--border-radius-sm); font-size: 11px; color: var(--text-muted);">
              <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                <span>Base Taxable Value:</span>
                <span id="gst-lbl-base" style="color: var(--text-white-invert); font-weight:600;">₹0.00</span>
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

            <!-- Profit Preview -->
            <div class="form-group" style="margin-bottom: 0;">
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

      const selectProduct = document.getElementById('sale-product-link');
      const inputProductQty = document.getElementById('sale-product-qty');

      const btnAddDeductionRow = document.getElementById('btn-add-deduction-row');
      const containerDeductions = document.getElementById('deductions-list-container');

      const createDeductionRow = (source = 'none', amount = 0) => {
        const row = document.createElement('div');
        row.className = 'deduction-row';
        row.style = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
        row.innerHTML = `
          <select class="form-control deduction-select" style="flex: 2; height: 32px; font-size: 12px; padding: 4px 8px;">
            <option value="none">None (No Deduction)</option>
            <option value="account">Direct Bank Account</option>
            ${walletOptions}
          </select>
          <input type="number" step="0.01" class="form-control deduction-amount" value="${parseFloat(amount).toFixed(2)}" placeholder="0.00" style="flex: 1; height: 32px; font-size: 12px; padding: 4px 8px; min-width: 80px;">
          <button type="button" class="btn btn-danger btn-sm btn-delete-deduction" style="height: 32px; width: 32px; padding: 0; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        `;
        if (source) {
          row.querySelector('.deduction-select').value = source;
        }

        // Add auto-calc commission on change for this specific source
        row.querySelector('.deduction-select').addEventListener('change', (e) => {
          const src = e.target.value;
          const enteredAmount = parseFloat(inputAmount.value || 0);
          const amtInput = row.querySelector('.deduction-amount');
          
          if (src !== 'none' && src !== 'account') {
            const wallet = store.wallets.find(w => w.id === src);
            if (wallet) {
              const rate = wallet.commissionRate || 0;
              const calculatedCost = enteredAmount * (1 - rate);
              amtInput.value = calculatedCost.toFixed(2);
            }
          }
          updateProfitMath();
        });

        row.querySelector('.deduction-amount').addEventListener('input', updateProfitMath);
        row.querySelector('.btn-delete-deduction').addEventListener('click', () => {
          row.remove();
          updateProfitMath();
        });
        return row;
      };

      if (btnAddDeductionRow && containerDeductions) {
        btnAddDeductionRow.addEventListener('click', () => {
          containerDeductions.appendChild(createDeductionRow('none', 0));
          lucide.createIcons();
          updateProfitMath();
        });
      }

      const getGstDetails = () => {
        const hasGst = document.getElementById('sale-has-gst').checked;
        const gstConfigContainer = document.getElementById('gst-config-container');
        const gstBreakdownContainer = document.getElementById('gst-breakdown-container');
        
        const enteredAmount = parseFloat(inputAmount.value || 0);
        
        let cost = 0;
        if (currentSaleType === 'service') {
          if (containerDeductions) {
            containerDeductions.querySelectorAll('.deduction-row').forEach(row => {
              const src = row.querySelector('.deduction-select').value;
              const amt = parseFloat(row.querySelector('.deduction-amount').value || 0);
              if (src !== 'none') {
                cost += amt;
              }
            });
          }
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
        
        const serviceDescGroup = document.getElementById('service-desc-group');
        const productLinkGroup = document.getElementById('product-link-group');
        const productQtyGroup = document.getElementById('product-qty-group');
        const serviceSpecificFields = document.getElementById('service-specific-fields');
        
        const descInput = document.getElementById('sale-desc');
        const prodSelect = document.getElementById('sale-product-link');

        if (type === 'service') {
          btnServiceType.className = 'btn btn-sm btn-primary';
          btnProductType.className = 'btn btn-sm btn-secondary';
          
          if (serviceDescGroup) serviceDescGroup.style.display = 'block';
          if (productLinkGroup) productLinkGroup.style.display = 'none';
          if (productQtyGroup) productQtyGroup.style.display = 'none';
          if (serviceSpecificFields) serviceSpecificFields.style.display = 'block';
          
          if (descInput) descInput.required = true;
          if (prodSelect) prodSelect.required = false;

          // Reset product selector to prevent stock deduction
          selectProduct.value = '';
          inputProductQty.value = '1';
        } else {
          btnServiceType.className = 'btn btn-sm btn-secondary';
          btnProductType.className = 'btn btn-sm btn-primary';
          
          if (serviceDescGroup) serviceDescGroup.style.display = 'none';
          if (productLinkGroup) productLinkGroup.style.display = 'block';
          if (productQtyGroup) productQtyGroup.style.display = 'block';
          if (serviceSpecificFields) serviceSpecificFields.style.display = 'none';
          
          if (descInput) descInput.required = false;
          if (prodSelect) prodSelect.required = true;

          // Reset service fields
          if (descInput) descInput.value = '';
          if (containerDeductions) {
            containerDeductions.innerHTML = '';
          }

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

      // Automatic Wallet cost deduction calculation for all active rows
      const updateAutoDeductions = () => {
        if (!containerDeductions) return;
        const gstDetails = getGstDetails();
        const enteredAmount = gstDetails.billAmount;
        
        containerDeductions.querySelectorAll('.deduction-row').forEach(row => {
          const selectDeductSource = row.querySelector('.deduction-select');
          const inputDeductAmount = row.querySelector('.deduction-amount');
          
          if (selectDeductSource && inputDeductAmount) {
            const source = selectDeductSource.value;
            if (source !== 'none' && source !== 'account') {
              const wallet = store.wallets.find(w => w.id === source);
              if (wallet) {
                const rate = wallet.commissionRate || 0;
                const calculatedCost = enteredAmount * (1 - rate);
                inputDeductAmount.value = calculatedCost.toFixed(2);
              }
            }
          }
        });
      };

      selectProduct.addEventListener('change', updateProductDetails);
      inputProductQty.addEventListener('input', updateProductDetails);

      // Initialize layout and state on load
      setSaleType(initialType);

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

      // Add consumable button click handler
      const btnAddConsumable = document.getElementById('btn-add-consumable-row');
      const containerConsumables = document.getElementById('consumables-list-container');
      if (btnAddConsumable && containerConsumables) {
        btnAddConsumable.addEventListener('click', () => {
          containerConsumables.appendChild(createConsumableRow());
          lucide.createIcons();
        });
      }

      // Pre-fill values if editing
      if (editTxn) {
        if (editTxn.productId) {
          selectProduct.value = editTxn.productId;
          inputProductQty.value = editTxn.quantity || 1;
        } else {
          document.getElementById('sale-desc').value = editTxn.description || '';
          if (containerConsumables) {
            if (editTxn.consumables && Array.isArray(editTxn.consumables)) {
              editTxn.consumables.forEach(c => {
                containerConsumables.appendChild(createConsumableRow(c.productId, c.quantity));
              });
            } else if (editTxn.pagesPrinted > 0) {
              const a4Paper = store.products.find(p => p.sku === 'A4-PAPER' || p.name.toLowerCase() === 'a4 paper');
              if (a4Paper) {
                containerConsumables.appendChild(createConsumableRow(a4Paper.id, editTxn.pagesPrinted));
              }
            }
          }
          
          if (containerDeductions) {
            containerDeductions.innerHTML = '';
            if (editTxn.deductions && Array.isArray(editTxn.deductions) && editTxn.deductions.length > 0) {
              editTxn.deductions.forEach(d => {
                containerDeductions.appendChild(createDeductionRow(d.source, d.amount));
              });
            } else if (editTxn.deductedFrom && editTxn.deductedFrom !== 'none') {
              containerDeductions.appendChild(createDeductionRow(editTxn.deductedFrom, editTxn.deductedAmount));
            } else {
              containerDeductions.appendChild(createDeductionRow('none', 0));
            }
          }
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
      } else {
        // If recording a new service transaction, add a default empty deduction row
        if (containerDeductions) {
          containerDeductions.innerHTML = '';
          containerDeductions.appendChild(createDeductionRow('none', 0));
        }
      }

      // Automatically fill payment distributions based on total amount
      inputAmount.addEventListener('input', (e) => {
        const gstDetails = getGstDetails();
        inputCash.value = gstDetails.billAmount.toFixed(2);
        inputUPI.value = '0.00';
        inputCredit.value = '0.00';
        updateAutoDeductions();
        updateProfitMath();
      });

      const adjustPayments = () => {
        const gstDetails = getGstDetails();
        const amt = gstDetails.billAmount;
        const cash = parseFloat(inputCash.value || 0);
        const credit = parseFloat(inputCredit.value || 0);
        inputUPI.value = Math.max(0, amt - cash - credit).toFixed(2);
        updateAutoDeductions();
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
        updateAutoDeductions();
        updateProfitMath();
      });

      // Quick Register Customer Event Handlers
      const btnQuickAdd = document.getElementById('btn-quick-add-customer');
      const quickSection = document.getElementById('quick-customer-section');
      const btnSaveQuick = document.getElementById('btn-save-quick-customer');
      const btnCancelQuick = document.getElementById('btn-cancel-quick-customer');
      const selectCustomer = document.getElementById('sale-customer');

      if (btnQuickAdd && quickSection) {
        btnQuickAdd.addEventListener('click', () => {
          quickSection.style.display = 'block';
          document.getElementById('quick-cust-name').focus();
        });

        btnCancelQuick.addEventListener('click', () => {
          quickSection.style.display = 'none';
          document.getElementById('quick-cust-name').value = '';
          document.getElementById('quick-cust-phone').value = '';
        });

        btnSaveQuick.addEventListener('click', () => {
          const nameVal = document.getElementById('quick-cust-name').value.trim();
          const phoneVal = document.getElementById('quick-cust-phone').value.trim();

          if (!nameVal) {
            alert('Please enter a customer name!');
            return;
          }

          // Save the customer in database
          const newCust = store.addCustomer({
            name: nameVal,
            phone: phoneVal
          });

          if (newCust) {
            // Append to dropdown and select
            const opt = document.createElement('option');
            opt.value = newCust.id;
            opt.text = `${newCust.name} (${newCust.uniqueNumber})`;
            opt.selected = true;
            selectCustomer.add(opt);

            // Hide quick section and clean inputs
            quickSection.style.display = 'none';
            document.getElementById('quick-cust-name').value = '';
            document.getElementById('quick-cust-phone').value = '';

            appInstance.showToast(`Customer "${newCust.name}" registered and linked!`, 'success');
          }
        });
      }

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
        const deductions = [];
        const consumables = [];

        if (containerConsumables) {
          containerConsumables.querySelectorAll('.consumable-row').forEach(row => {
            const prodId = row.querySelector('.consumable-select').value;
            const qty = parseInt(row.querySelector('.consumable-qty').value || 1);
            if (prodId) {
              consumables.push({ productId: prodId, quantity: qty });
            }
          });
        }

        // Set pagesPrinted for legacy compatibility if A4 Paper is deducted
        const a4PaperItem = consumables.find(c => {
          const p = store.products.find(prod => prod.id === c.productId);
          return p && (p.sku === 'A4-PAPER' || p.name.toLowerCase() === 'a4 paper');
        });
        if (a4PaperItem) {
          pagesPrinted = a4PaperItem.quantity;
        }

        if (isProd) {
          const selectedProduct = store.products.find(p => p.id === productId);
          description = `${selectedProduct.name} (x${quantity})`;
          deductedAmount = selectedProduct.buyPrice * quantity;
          deductedFrom = 'none';
        } else {
          description = document.getElementById('sale-desc').value.trim();
          store.addServiceType(description); // Save service type automatically
          
          if (containerDeductions) {
            containerDeductions.querySelectorAll('.deduction-row').forEach(row => {
              const src = row.querySelector('.deduction-select').value;
              const amt = parseFloat(row.querySelector('.deduction-amount').value || 0);
              if (src !== 'none') {
                deductions.push({ source: src, amount: amt });
              }
            });
          }

          if (deductions.length > 0) {
            deductedFrom = deductions.length === 1 ? deductions[0].source : 'multiple';
            deductedAmount = deductions.reduce((sum, d) => sum + d.amount, 0);
          }
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
          consumables,
          deductedFrom,
          deductedAmount,
          deductions,
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
          staffId: editTxn ? editTxn.staffId : (auth.currentUser ? auth.currentUser.staffId : 'STAFF-04')
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
        log = store.getOrCreateDailyLog(activeDate);
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
                <option value="Drawings">Owner Drawings (SHIBU RAMACHANDRAN Draw)</option>
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
              <option value="petty_cash">Petty Cash</option>
              <option value="account">Bank Account (UPI / Transfer)</option>
              ${store.wallets.filter(w => w.isActive).map(w => `<option value="${w.id}">${w.name} (Wallet)</option>`).join('')}
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
        log = store.getOrCreateDailyLog(activeDate);
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
      columns[5] = fmt(t.serviceChargeToCash);
      columns[6] = fmt(t.serviceChargeToAccount);

      // Deduction logic columns (supports multiple source split)
      if (t.deductions && Array.isArray(t.deductions) && t.deductions.length > 0) {
        t.deductions.forEach(d => {
          const source = d.source === 'account' ? 'main_bob' : d.source;
          const amt = parseFloat(d.amount || 0);
          if (amt > 0) {
            let colIdx = -1;
            if (source === 'main_bob') colIdx = 7;
            else if (source === 'csc') colIdx = 8;
            else if (source === 'paynearby') colIdx = 9;
            else if (source === 'airtel_pb') colIdx = 10;
            else if (source === 'ibkart') colIdx = 11;
            else if (source === 'bsnl') colIdx = 12;
            else if (source === 'vi') colIdx = 13;
            else if (source === 'airtel') colIdx = 14;
            
            if (colIdx !== -1) {
              columns[colIdx] = columns[colIdx] === '—' ? fmt(amt) : fmt(parseFloat(columns[colIdx].replace('₹', '')) + amt);
            }
          }
        });
      } else {
        const source = t.deductedFrom === 'account' ? 'main_bob' : t.deductedFrom;
        if (source === 'main_bob') columns[7] = fmt(t.deductedAmount);
        else if (source === 'csc') columns[8] = fmt(t.deductedAmount);
        else if (source === 'paynearby') columns[9] = fmt(t.deductedAmount);
        else if (source === 'airtel_pb') columns[10] = fmt(t.deductedAmount);
        else if (source === 'ibkart') columns[11] = fmt(t.deductedAmount);
        else if (source === 'bsnl') columns[12] = fmt(t.deductedAmount);
        else if (source === 'vi') columns[13] = fmt(t.deductedAmount);
        else if (source === 'airtel') columns[14] = fmt(t.deductedAmount);
      }

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
      if (source === 'cash') columns[2] = `-${fmt(t.amount)}`;
      else if (source === 'main_bob') columns[7] = `-${fmt(t.amount)}`;
      else if (source === 'csc') columns[8] = `-${fmt(t.amount)}`;
      else if (source === 'paynearby') columns[9] = `-${fmt(t.amount)}`;
      else if (source === 'airtel_pb') columns[10] = `-${fmt(t.amount)}`;
      else if (source === 'ibkart') columns[11] = `-${fmt(t.amount)}`;
      else if (source === 'bsnl') columns[12] = `-${fmt(t.amount)}`;
      else if (source === 'vi') columns[13] = `-${fmt(t.amount)}`;
      else if (source === 'airtel') columns[14] = `-${fmt(t.amount)}`;
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

    // Only allow editing for sales and expenses (the ones loggable via this screen)
    const isEditable = (t.type === 'sale' || t.type === 'expense');

    return `
      <tr>
        <td style="text-align: center; vertical-align: middle;"><input type="checkbox" class="select-txn-checkbox" data-id="${t.id}" style="cursor: pointer;"></td>
        <td style="text-align: center; white-space: nowrap;">
          ${t.type === 'sale' ? `
            <button class="btn btn-sm btn-secondary btn-view-txn-receipt" data-id="${t.id}" style="padding: 4px; color: var(--color-success); border: 1px solid rgba(16,185,129,0.15); background: rgba(16,185,129,0.02); margin-right: 4px;" title="Print Receipt">
              <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
          ${isEditable ? `
            <button class="btn btn-sm btn-secondary btn-edit-txn" data-id="${t.id}" style="padding: 4px; color: var(--color-info); border: 1px solid rgba(14,165,233,0.15); background: rgba(14,165,233,0.02); margin-right: 4px;">
              <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary btn-delete-txn" data-id="${t.id}" style="padding: 4px; color: var(--color-danger); border: 1px solid rgba(239,68,68,0.15); background: rgba(239,68,68,0.02);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
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
      </tr>
    `;
  }).join('');
}

export default renderTransactions;
