/* ==========================================================================
   Akshaya Center Management Platform - Accounts View (views/accounts.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderAccounts(mountPoint, appInstance) {
  const wallets = store.wallets.filter(w => !w.isAEPS);
  const bankAccounts = store.bankAccounts;
  const currentBalances = store.getCurrentBalances();

  mountPoint.innerHTML = `
    <!-- Bank Accounts Section -->
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h3>Bank Accounts</h3>
        <span style="font-size:12px; color:var(--text-muted);">Store checking & payment accounts</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="btn-add-bank" class="btn btn-primary btn-sm">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Add Bank Account
        </button>
        <button id="btn-cash-deposit" class="btn btn-success btn-sm">
          <i data-lucide="arrow-up-right" style="width: 14px; height: 14px;"></i> Deposit Cash to Bank
        </button>
      </div>
    </div>

    <div class="wallet-grid" style="margin-bottom: 35px;">
      <!-- Cash In Hand Card -->
      <div class="wallet-card" style="height: 190px; border-left: 4px solid var(--color-success);">
        <div class="wallet-card-header">
          <div>
            <span class="wallet-name">Cash In Hand</span>
            <div class="wallet-meta">Physical cash drawer</div>
          </div>
          <button class="btn btn-sm btn-secondary btn-edit-cash" style="padding: 4px;">
            <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
          <div>Type: <code>Physical Currency</code></div>
          <div>Location: <code>Office Safe / Drawer</code></div>
          <div>Audit: <code>System Recalculated</code></div>
        </div>
        <div class="wallet-card-body" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
          <span class="wallet-balance-label">Balance</span>
          <span class="wallet-balance-val" style="color: var(--color-success);">₹${currentBalances.cash.toFixed(2)}</span>
        </div>
      </div>

      ${bankAccounts.map(bank => {
        const bal = currentBalances[bank.id] !== undefined ? currentBalances[bank.id] : 0.00;
        return `
          <div class="wallet-card" style="height: 190px; border-left: 4px solid var(--color-info);">
            <div class="wallet-card-header">
              <div>
                <span class="wallet-name">${bank.name}</span>
                <div class="wallet-meta">${bank.bankName}</div>
              </div>
              <button class="btn btn-sm btn-secondary btn-edit-bank" data-id="${bank.id}" style="padding: 4px;">
                <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
              <div>A/C: <code>${bank.accountNumber}</code></div>
              <div>IFSC: <code>${bank.ifsc}</code></div>
              <div>UPI: <code>${bank.upiId}</code></div>
            </div>
            <div class="wallet-card-body" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
              <span class="wallet-balance-label">Balance</span>
              <span class="wallet-balance-val" style="color: var(--color-info);">₹${bal.toFixed(2)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- G2C Portal Wallets Section -->
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h3>Government Portal Wallets</h3>
        <span style="font-size:12px; color:var(--text-muted);">Wallets used to pay G2C fees & recharges</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="btn-add-wallet" class="btn btn-secondary btn-sm">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Add Portal Wallet
        </button>
        <button id="btn-wallet-topup" class="btn btn-primary btn-sm">
          <i data-lucide="arrow-right-left" style="width: 14px; height: 14px;"></i> Top-up Portal Wallet
        </button>
      </div>
    </div>

    <div class="wallet-grid">
      ${wallets.map(w => {
        const bal = currentBalances[w.id] !== undefined ? currentBalances[w.id] : 0.00;
        let balColor = '#fff';
        if (bal < 100) balColor = 'var(--color-danger)';
        else if (bal > 1000) balColor = 'var(--color-success)';

        return `
          <div class="wallet-card" style="border-left: 4px solid var(--color-primary);">
            <div class="wallet-card-header">
              <div>
                <span class="wallet-name">${w.name}</span>
                <div class="wallet-meta">Login: <code>${w.loginId}</code></div>
              </div>
              <button class="btn btn-sm btn-secondary btn-edit-wallet" data-id="${w.id}" style="padding: 4px;">
                <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
              Commission Rate: <strong>${(w.commissionRate * 100).toFixed(2)}%</strong>
            </div>
            <div class="wallet-card-body" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
              <span class="wallet-balance-label">Balance</span>
              <span class="wallet-balance-val" style="color: ${balColor};">₹${bal.toFixed(2)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Accounts Editor Modals -->
    <div id="account-modal-backdrop" class="modal-backdrop">
      <div class="modal-container">
        <div class="modal-header">
          <h4 id="account-modal-title">Edit Account Details</h4>
          <button id="account-modal-close" class="modal-close" style="display:none;">&times;</button>
        </div>
        <div id="account-form-mount"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Bank Accounts & Portal Wallets';
  document.getElementById('page-heading-sub').innerText = 'Manage store cash reservoirs, bank credentials and wallet parameters';

  lucide.createIcons();

  const backdrop = document.getElementById('account-modal-backdrop');
  const formMount = document.getElementById('account-form-mount');

  const closeModal = () => backdrop.classList.remove('show');

  // Helper to bind the cancel button click handler
  const bindCancelBtn = () => {
    const cancelBtn = formMount.querySelector('.btn-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
    }
  };

  // Add Bank Account button binder
  const btnAddBank = document.getElementById('btn-add-bank');
  if (btnAddBank) {
    btnAddBank.addEventListener('click', () => {
      document.getElementById('account-modal-title').innerText = 'Register New Bank Account';
      formMount.innerHTML = `
        <form id="form-add-bank">
          <div class="form-group">
            <label class="form-label">Account Label Name</label>
            <input type="text" id="bank-label" class="form-control" placeholder="e.g. SBI Savings" required>
          </div>
          <div class="form-group">
            <label class="form-label">Bank Name</label>
            <input type="text" id="bank-name" class="form-control" placeholder="e.g. State Bank of India" required>
          </div>
          <div class="form-group">
            <label class="form-label">Account Number</label>
            <input type="text" id="bank-acc-no" class="form-control" placeholder="Enter Account number" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">IFSC Code</label>
              <input type="text" id="bank-ifsc" class="form-control" placeholder="SBIN0001234" required>
            </div>
            <div class="form-group">
              <label class="form-label">UPI ID</label>
              <input type="text" id="bank-upi" class="form-control" placeholder="name@upi" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Initial Opening Balance (₹)</label>
            <input type="number" step="0.01" id="bank-balance" class="form-control" value="0.00" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> Register Account
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;
      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-add-bank').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const bankId = 'bank_' + Math.random().toString(36).substr(2, 5);
        const name = document.getElementById('bank-label').value;
        const balance = parseFloat(document.getElementById('bank-balance').value || 0);

        store.bankAccounts.push({
          id: bankId,
          name: name,
          bankName: document.getElementById('bank-name').value,
          accountNumber: document.getElementById('bank-acc-no').value,
          ifsc: document.getElementById('bank-ifsc').value,
          upiId: document.getElementById('bank-upi').value
        });
        store.persistAll();

        if (balance > 0) {
          store.adjustBalance(appInstance.getActiveDate(), bankId, balance);
        }

        appInstance.showToast('Bank Account registered successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }

  // Add Portal Wallet button binder
  const btnAddWallet = document.getElementById('btn-add-wallet');
  if (btnAddWallet) {
    btnAddWallet.addEventListener('click', () => {
      document.getElementById('account-modal-title').innerText = 'Register New Portal Wallet';
      formMount.innerHTML = `
        <form id="form-add-wallet">
          <div class="form-group">
            <label class="form-label">Portal Wallet Name</label>
            <input type="text" id="wallet-name" class="form-control" placeholder="e.g. Digipay" required>
          </div>
          <div class="form-group">
            <label class="form-label">Portal Login ID / Phone</label>
            <input type="text" id="wallet-login" class="form-control" placeholder="Login identifier" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Commission Rate (%)</label>
              <input type="number" step="0.01" id="wallet-comm" class="form-control" value="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">AEPS Wallet?</label>
              <select id="wallet-aeps" class="form-control">
                <option value="false">No (Normal Portal Wallet)</option>
                <option value="true">Yes (AEPS / Money Transfer Wallet)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Initial Opening Balance (₹)</label>
            <input type="number" step="0.01" id="wallet-balance" class="form-control" value="0.00" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> Register Wallet
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;
      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-add-wallet').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const walletId = 'wallet_' + Math.random().toString(36).substr(2, 5);
        const name = document.getElementById('wallet-name').value;
        const balance = parseFloat(document.getElementById('wallet-balance').value || 0);
        const isAEPS = document.getElementById('wallet-aeps').value === 'true';

        store.wallets.push({
          id: walletId,
          name: name,
          loginId: document.getElementById('wallet-login').value,
          commissionRate: parseFloat(document.getElementById('wallet-comm').value || 0) / 100,
          isActive: true,
          isAEPS: isAEPS
        });
        store.persistAll();

        if (balance > 0) {
          store.adjustBalance(appInstance.getActiveDate(), walletId, balance);
        }

        appInstance.showToast('Portal Wallet registered successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }

  // Edit Cash In Hand balance binding
  const btnEditCash = document.querySelector('.btn-edit-cash');
  if (btnEditCash) {
    btnEditCash.addEventListener('click', () => {
      const cashBal = currentBalances.cash !== undefined ? currentBalances.cash : 0.00;

      document.getElementById('account-modal-title').innerText = 'Adjust Cash In Hand';
      formMount.innerHTML = `
        <form id="form-edit-cash">
          <div class="form-group">
            <label class="form-label">Account Label Name</label>
            <input type="text" class="form-control" value="Cash In Hand" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₹)</label>
            <input type="number" step="0.01" id="cash-balance" class="form-control" value="${cashBal.toFixed(2)}" required>
            <span style="font-size: 11px; color: var(--text-dimmed); margin-top: 4px; display:block;">
              *Adjusting this will create a manual ledger balance correction.
            </span>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="save" style="width:16px; height:16px;"></i> Save Cash Balance
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-edit-cash').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const newBal = parseFloat(document.getElementById('cash-balance').value || 0);
        store.adjustBalance(appInstance.getActiveDate(), 'cash', newBal);

        appInstance.showToast('Cash In Hand balance adjusted successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }

  // Edit Bank Account buttons binding
  const editBankBtns = document.querySelectorAll('.btn-edit-bank');
  editBankBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bankId = e.currentTarget.getAttribute('data-id');
      const bank = bankAccounts.find(b => b.id === bankId);
      if (!bank) return;

      const bankBal = currentBalances[bankId] !== undefined ? currentBalances[bankId] : 0.00;

      document.getElementById('account-modal-title').innerText = `Edit ${bank.name}`;
      formMount.innerHTML = `
        <form id="form-edit-bank">
          <div class="form-group">
            <label class="form-label">Account Label Name</label>
            <input type="text" id="bank-label" class="form-control" value="${bank.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Bank Name</label>
            <input type="text" id="bank-name" class="form-control" value="${bank.bankName}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Account Number</label>
            <input type="text" id="bank-acc-no" class="form-control" value="${bank.accountNumber}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">IFSC Code</label>
              <input type="text" id="bank-ifsc" class="form-control" value="${bank.ifsc}" required>
            </div>
            <div class="form-group">
              <label class="form-label">UPI ID</label>
              <input type="text" id="bank-upi" class="form-control" value="${bank.upiId}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₹)</label>
            <input type="number" step="0.01" id="bank-balance" class="form-control" value="${bankBal.toFixed(2)}" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="save" style="width:16px; height:16px;"></i> Save Bank Details
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-edit-bank').addEventListener('submit', (ev) => {
        ev.preventDefault();
        store.updateBankAccountDetails(bankId, {
          name: document.getElementById('bank-label').value,
          bankName: document.getElementById('bank-name').value,
          accountNumber: document.getElementById('bank-acc-no').value,
          ifsc: document.getElementById('bank-ifsc').value,
          upiId: document.getElementById('bank-upi').value
        });

        const newBal = parseFloat(document.getElementById('bank-balance').value || 0);
        store.adjustBalance(appInstance.getActiveDate(), bankId, newBal);

        appInstance.showToast('Bank details updated successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });

  // Edit Wallets buttons binding
  const editWalletBtns = document.querySelectorAll('.btn-edit-wallet');
  editWalletBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const walletId = e.currentTarget.getAttribute('data-id');
      const wallet = store.wallets.find(w => w.id === walletId);
      if (!wallet) return;

      const walletBal = currentBalances[walletId] !== undefined ? currentBalances[walletId] : 0.00;

      document.getElementById('account-modal-title').innerText = `Edit ${wallet.name}`;
      formMount.innerHTML = `
        <form id="form-edit-wallet">
          <div class="form-group">
            <label class="form-label">Portal Wallet Name</label>
            <input type="text" id="wallet-name" class="form-control" value="${wallet.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Portal Login ID / Phone</label>
            <input type="text" id="wallet-login" class="form-control" value="${wallet.loginId}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Commission Rate (%)</label>
              <input type="number" step="0.01" id="wallet-comm" class="form-control" value="${(wallet.commissionRate * 100).toFixed(2)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="wallet-active" class="form-control">
                <option value="true" ${wallet.isActive ? 'selected' : ''}>Active</option>
                <option value="false" ${!wallet.isActive ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₹)</label>
            <input type="number" step="0.01" id="wallet-balance" class="form-control" value="${walletBal.toFixed(2)}" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="save" style="width:16px; height:16px;"></i> Save Wallet Details
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-edit-wallet').addEventListener('submit', (ev) => {
        ev.preventDefault();
        store.updateWalletDetails(walletId, {
          name: document.getElementById('wallet-name').value,
          loginId: document.getElementById('wallet-login').value,
          commissionRate: parseFloat(document.getElementById('wallet-comm').value) / 100,
          isActive: document.getElementById('wallet-active').value === 'true'
        });

        const newBal = parseFloat(document.getElementById('wallet-balance').value || 0);
        store.adjustBalance(appInstance.getActiveDate(), walletId, newBal);

        appInstance.showToast('Wallet parameters updated successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });

  // Deposit Cash to Bank Button click handler
  const btnCashDeposit = document.getElementById('btn-cash-deposit');
  if (btnCashDeposit) {
    btnCashDeposit.addEventListener('click', () => {
      document.getElementById('account-modal-title').innerText = 'Deposit Cash to Bank Account';
      formMount.innerHTML = `
        <form id="form-cash-deposit">
          <div class="form-group">
            <label class="form-label">Source Cash Reservoir</label>
            <input type="text" class="form-control" value="Cash In Hand (Balance: ₹${currentBalances.cash.toFixed(2)})" disabled>
          </div>
          
          <div class="form-group">
            <label class="form-label">Target Bank Account</label>
            <select id="deposit-bank-id" class="form-control" required>
              ${bankAccounts.map(b => `<option value="${b.id}">${b.name} (${b.bankName})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Deposit Amount (₹)</label>
            <input type="number" step="0.01" id="deposit-cash-amount" class="form-control" placeholder="0.00" required min="0.01" max="${currentBalances.cash}">
            <span style="font-size: 11px; color: var(--text-dimmed); margin-top: 4px; display:block;">
              *Deducted from Cash in Hand and added to Bank Account.
            </span>
          </div>

          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-success" style="flex-grow:1;">
              <i data-lucide="check" style="width: 16px; height: 16px;"></i> Complete Cash Deposit
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-cash-deposit').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const bankId = document.getElementById('deposit-bank-id').value;
        const amount = parseFloat(document.getElementById('deposit-cash-amount').value);
        const bank = bankAccounts.find(b => b.id === bankId);
        
        if (amount > currentBalances.cash) {
          alert('Insufficient Cash in Hand to complete this deposit!');
          return;
        }

        store.addTransaction(appInstance.getActiveDate(), {
          type: 'deposit',
          description: `Cash Deposit to ${bank ? bank.name : 'Bank'}`,
          amount,
          source: 'cash',
          targetWallet: bankId
        });

        appInstance.showToast(`Deposited ₹${amount.toFixed(2)} cash to ${bank ? bank.name : 'Bank'} (deducted from Cash in Hand)`, 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }

  // Deposit Wallet Top-up Button click handler
  const btnWalletTopup = document.getElementById('btn-wallet-topup');
  if (btnWalletTopup) {
    btnWalletTopup.addEventListener('click', () => {
      const walletOptions = wallets
        .filter(w => w.isActive)
        .map(w => `<option value="${w.id}">${w.name}</option>`)
        .join('');

      document.getElementById('account-modal-title').innerText = 'Top-up Portal Wallet';
      formMount.innerHTML = `
        <form id="form-wallet-topup">
          <div class="form-group">
            <label class="form-label">Source Bank Account</label>
            <select id="topup-bank-id" class="form-control" required>
              ${bankAccounts.map(b => `<option value="${b.id}">${b.name} (${b.bankName})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Target Portal Wallet</label>
            <select id="topup-wallet-id" class="form-control" required>
              ${walletOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Transfer/Top-up Amount (₹)</label>
            <input type="number" step="0.01" id="topup-amount" class="form-control" placeholder="0.00" required min="0.01">
            <span style="font-size: 11px; color: var(--text-dimmed); margin-top: 4px; display:block;">
              *Deducted from selected Bank Account and added to selected Wallet.
            </span>
          </div>

          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="arrow-right-left" style="width: 16px; height: 16px;"></i> Complete Wallet Top-up
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-wallet-topup').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const bankId = document.getElementById('topup-bank-id').value;
        const walletId = document.getElementById('topup-wallet-id').value;
        const amount = parseFloat(document.getElementById('topup-amount').value);
        const bank = bankAccounts.find(b => b.id === bankId);
        const wallet = wallets.find(w => w.id === walletId);

        store.addTransaction(appInstance.getActiveDate(), {
          type: 'deposit',
          description: `${wallet ? wallet.name : 'Wallet'} Top-up`,
          amount,
          source: bankId,
          targetWallet: walletId
        });

        appInstance.showToast(`Transferred ₹${amount.toFixed(2)} from ${bank ? bank.name : 'Bank'} to ${wallet ? wallet.name : 'Wallet'}`, 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }
}

export default renderAccounts;
