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

  // Render view layout
  mountPoint.innerHTML = `
    <!-- Top Action bar with Search/Filters & Log Transaction button -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="ledger-search" class="form-control" placeholder="Search by description or customer ID...">
      </div>

      <div class="filter-actions">
        <button id="btn-open-txn-modal" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Transaction
        </button>
      </div>
    </div>

    <!-- Wide Google Sheet-based Ledger Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
      <div class="table-responsive">
        <table class="custom-table" id="ledger-table" style="min-width: 1500px;">
          <thead>
            <tr>
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
            ${renderLedgerRows(log.transactions, fmt)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Opening vs Closing Balances Summary -->
    <div class="section-header">
      <h3>Day Balance Summary</h3>
      <span style="font-size: 12px; color: var(--text-muted);">Opening $\rightarrow$ Closing reconciliation</span>
    </div>

    <div class="card-grid day-balance-grid" style="gap: 15px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      ${cardsHtml}
    </div>

    <!-- Modals backdrop and containers -->
    <div id="txn-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 600px;">
        <div class="modal-header">
          <h4>Record New Log</h4>
          <button id="txn-modal-close" class="modal-close" style="display:none;">&times;</button>
        </div>

        <!-- Form tabs selector -->
        <div class="tab-row" style="margin-bottom:15px;">
          <button class="btn btn-sm btn-primary tab-btn" data-tab="sale">Service Sale</button>
          <button class="btn btn-sm btn-secondary tab-btn" data-tab="expense">Log Expense</button>
        </div>

        <!-- Dynamic Form Body mount -->
        <div id="txn-form-mount"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Daily Transactions Ledger';
  document.getElementById('page-heading-sub').innerText = `Reconciliation sheet for ${activeDate}`;

  lucide.createIcons();

  // Initialize Search filter functionality
  const searchInput = document.getElementById('ledger-search');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#ledger-tbody tr');
    
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  // Modal open/close handlers
  const modalBackdrop = document.getElementById('txn-modal-backdrop');
  const btnOpenModal = document.getElementById('btn-open-txn-modal');

  btnOpenModal.addEventListener('click', () => {
    modalBackdrop.classList.add('show');
    loadTabForm('sale', activeDate, appInstance);
  });

  // Tab switching inside modal
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      e.target.classList.add('btn-primary');
      e.target.classList.remove('btn-secondary');
      
      const selectedTab = e.target.getAttribute('data-tab');
      loadTabForm(selectedTab, activeDate, appInstance);
    });
  });

  // Delete transaction action bindings
  const deleteButtons = document.querySelectorAll('.btn-delete-txn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txnId = e.currentTarget.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete this transaction (${txnId})?`)) {
        const deleted = store.deleteTransaction(activeDate, txnId);
        if (deleted) {
          appInstance.showToast('Transaction deleted successfully', 'success');
          appInstance.handleRouting(); // Reload view
        } else {
          appInstance.showToast('Failed to delete transaction', 'error');
        }
      }
    });
  });
}

// Generate rows based on transactions
function renderLedgerRows(txns, fmt) {
  if (txns.length === 0) {
    return `<tr><td colspan="17" style="text-align: center; color: var(--text-dimmed); padding: 30px 0;">No transactions logged for this day.</td></tr>`;
  }

  return txns.map(t => {
    let typeBadge = '';
    let columns = Array(15).fill('—');

    if (t.type === 'sale') {
      typeBadge = `<span class="badge sale">Sale</span>`;
      columns[0] = t.description;
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
        columns[2] = `-${fmt(t.amount)}`; // deducted from cash
        columns[7] = `+${fmt(t.amount)}`; // credited to BOB bank account
      } else {
        if (source === 'main_bob') columns[7] = fmt(t.amount);
        // Credit to target wallet column
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

    return `
      <tr>
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
        <td style="text-align: center;">
          <button class="btn btn-sm btn-secondary btn-delete-txn" data-id="${t.id}" style="padding: 4px; color: var(--color-danger); border: 1px solid rgba(239,68,68,0.15); background: rgba(239,68,68,0.02);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render dynamic forms inside the modal based on selected tab
function loadTabForm(tab, activeDate, appInstance) {
  const mount = document.getElementById('txn-form-mount');
  if (!mount) return;

  if (tab === 'sale') {
    // Generate options for wallets
    const walletOptions = store.wallets
      .filter(w => w.isActive)
      .map(w => `<option value="${w.id}">${w.name}</option>`)
      .join('');

    // Generate option list for customers
    const customerOptions = store.customers
      .map(c => `<option value="${c.id}">${c.name} (${c.uniqueNumber})</option>`)
      .join('');

    mount.innerHTML = `
      <form id="form-add-sale">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Service Type / Description</label>
            <input type="text" id="sale-desc" class="form-control" placeholder="e.g. Recharge, Print, Caste Certificate" required list="service-presets">
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
            <label class="form-label">Total Customer Bill Amount (₹)</label>
            <input type="number" step="0.01" id="sale-amount" class="form-control" placeholder="0.00" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Paid By Cash (₹)</label>
            <input type="number" step="0.01" id="sale-cash" class="form-control" value="0.00">
          </div>
          <div class="form-group">
            <label class="form-label">Paid By UPI / Bank (₹)</label>
            <input type="number" step="0.01" id="sale-upi" class="form-control" value="0.00">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Add to Citizen Credit (₹)</label>
            <input type="number" step="0.01" id="sale-credit" class="form-control" value="0.00">
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
            <input type="number" step="0.01" id="sale-deduct-amount" class="form-control" value="0.00">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Customer Link (Required for Credit/App)</label>
            <select id="sale-customer" class="form-control">
              <option value="">-- Unregistered Walk-in --</option>
              ${customerOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Calculated Service Charge (Profit)</label>
            <div id="sale-profit-preview" style="padding: 10px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--border-radius-sm); color: var(--color-success); font-family: var(--font-display); font-weight:700;">
              ₹0.00
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-success" style="flex-grow:1;">
            <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i> Log Sale
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();

    // Cancel click handler
    mount.querySelector('.btn-modal-cancel').addEventListener('click', () => {
      document.getElementById('txn-modal-backdrop').classList.remove('show');
    });

    // Attach automation handlers for calculation
    const inputAmount = document.getElementById('sale-amount');
    const inputCash = document.getElementById('sale-cash');
    const inputUPI = document.getElementById('sale-upi');
    const inputCredit = document.getElementById('sale-credit');
    const inputDeduct = document.getElementById('sale-deduct-amount');
    const profitDiv = document.getElementById('sale-profit-preview');

    const updateProfitMath = () => {
      const amt = parseFloat(inputAmount.value || 0);
      const cash = parseFloat(inputCash.value || 0);
      const upi = parseFloat(inputUPI.value || 0);
      const credit = parseFloat(inputCredit.value || 0);
      const cost = parseFloat(inputDeduct.value || 0);
      
      const profit = (cash + upi + credit) - cost;
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

    // Auto calculate paid values based on Total Customer Bill
    inputAmount.addEventListener('input', (e) => {
      inputCash.value = e.target.value;
      inputUPI.value = '0.00';
      inputCredit.value = '0.00';
      updateProfitMath();
    });

    // Handle interactive distributions
    const adjustPayments = () => {
      const amt = parseFloat(inputAmount.value || 0);
      const cash = parseFloat(inputCash.value || 0);
      const credit = parseFloat(inputCredit.value || 0);
      inputUPI.value = Math.max(0, amt - cash - credit).toFixed(2);
      updateProfitMath();
    };

    inputCash.addEventListener('input', adjustPayments);
    inputCredit.addEventListener('input', adjustPayments);
    inputUPI.addEventListener('input', () => {
      const amt = parseFloat(inputAmount.value || 0);
      const upi = parseFloat(inputUPI.value || 0);
      const credit = parseFloat(inputCredit.value || 0);
      inputCash.value = Math.max(0, amt - upi - credit).toFixed(2);
      updateProfitMath();
    });

    inputDeduct.addEventListener('input', updateProfitMath);

    // Form submit
    document.getElementById('form-add-sale').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const amount = parseFloat(inputAmount.value);
      const cash = parseFloat(inputCash.value || 0);
      const upi = parseFloat(inputUPI.value || 0);
      const credit = parseFloat(inputCredit.value || 0);
      const deductCost = parseFloat(inputDeduct.value || 0);
      const customerId = document.getElementById('sale-customer').value;

      if (Math.abs((cash + upi + credit) - amount) > 0.02) {
        alert('Total of Cash + UPI + Credit payments must match the total bill amount!');
        return;
      }

      if (credit > 0 && !customerId) {
        alert('You must select a registered Customer to link outstanding credit!');
        return;
      }

      store.addTransaction(activeDate, {
        type: 'sale',
        description: document.getElementById('sale-desc').value,
        amount,
        paidByCash: cash,
        paidByUPI: upi,
        paidByCredit: credit,
        pagesPrinted: parseInt(document.getElementById('sale-pages-printed').value || 0),
        deductedFrom: document.getElementById('sale-deduct-source').value,
        deductedAmount: deductCost,
        customerId: customerId,
        staffId: 'STAFF-04'
      });

      appInstance.showToast('Service Sale registered successfully', 'success');
      document.getElementById('txn-modal-backdrop').classList.remove('show');
      appInstance.handleRouting();
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
            <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i> Log Expense
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();

    // Cancel click handler
    mount.querySelector('.btn-modal-cancel').addEventListener('click', () => {
      document.getElementById('txn-modal-backdrop').classList.remove('show');
    });

    document.getElementById('form-add-expense').addEventListener('submit', (e) => {
      e.preventDefault();

      store.addTransaction(activeDate, {
        type: 'expense',
        description: document.getElementById('expense-desc').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        category: document.getElementById('expense-category').value,
        source: document.getElementById('expense-source').value
      });

      appInstance.showToast('Expense recorded successfully', 'success');
      document.getElementById('txn-modal-backdrop').classList.remove('show');
      appInstance.handleRouting();
    });
  }
}

export default renderTransactions;
