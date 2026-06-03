/* ==========================================================================
   CYBERONE Center Management Platform - Accounts View (views/accounts.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderAccounts(mountPoint, appInstance) {
  const bankAccounts = store.bankAccounts;
  const activeDate = appInstance.getActiveDate();
  const dailyLog = store.getOrCreateDailyLog(activeDate);
  const currentBalances = store.getCurrentBalances();
  const initialBalances = store.initialBalances || {};
  const sortedDates = Object.keys(store.dailyLogs).sort();

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
        <button id="btn-unified-deposit" class="btn btn-success btn-sm">
          <i data-lucide="arrow-up-right" style="width: 14px; height: 14px;"></i> Deposit
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
            <i data-lucide="edit" style="width: 12px; height: 12px;"></i>
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

      <!-- Petty Cash Card -->
      <div class="wallet-card" style="height: 190px; border-left: 4px solid #fb923c;">
        <div class="wallet-card-header">
          <div>
            <span class="wallet-name">Petty Cash</span>
            <div class="wallet-meta">Secondary cash fund</div>
          </div>
          <button class="btn btn-sm btn-secondary btn-edit-petty" style="padding: 4px;">
            <i data-lucide="edit" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">
          <div>Type: <code>Physical Currency</code></div>
          <div>Location: <code>Petty Cash Box</code></div>
          <div>Audit: <code>System Recalculated</code></div>
        </div>
        <div class="wallet-card-body" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
          <span class="wallet-balance-label">Balance</span>
          <span class="wallet-balance-val" style="color: #fb923c;">₹${(currentBalances.petty_cash !== undefined ? currentBalances.petty_cash : 0.00).toFixed(2)}</span>
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
                <i data-lucide="edit" style="width: 12px; height: 12px;"></i>
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

    <!-- Wallets Section -->
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h3>Wallets</h3>
        <span style="font-size:12px; color:var(--text-muted);">Wallets used for G2C services, recharges, and AEPS/money transfer transactions</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="btn-add-wallet" class="btn btn-secondary btn-sm">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Add Wallet
        </button>
        <button id="btn-wallet-deposit" class="btn btn-primary btn-sm">
          <i data-lucide="arrow-right-left" style="width: 14px; height: 14px;"></i> Deposit
        </button>
      </div>
    </div>

    <div class="wallet-grid">
      ${store.wallets.map(w => {
        const bal = currentBalances[w.id] !== undefined ? currentBalances[w.id] : 0.00;
        let balColor = '#fff';
        if (bal < 100) balColor = 'var(--color-danger)';
        else if (bal > 1000) balColor = 'var(--color-success)';

        return `
          <div class="wallet-card" style="border-left: 4px solid ${w.isAEPS ? 'var(--color-info)' : 'var(--color-primary)'};">
            <div class="wallet-card-header">
              <div>
                <span class="wallet-name">${w.name}</span>
                <div class="wallet-meta">Login: <code>${w.loginId}</code>${w.isAEPS ? ' <span style="font-size: 10px; font-weight: 500; color: var(--color-info); background: rgba(0, 180, 216, 0.1); padding: 1px 4px; border-radius: 3px; margin-left: 4px;">AEPS</span>' : ''}</div>
              </div>
              <button class="btn btn-sm btn-secondary btn-edit-wallet" data-id="${w.id}" style="padding: 4px;">
                <i data-lucide="edit" style="width: 12px; height: 12px;"></i>
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

    <!-- Initial Opening Balances Config Card -->
    <div class="glass-card" style="padding:24px; max-width: 100%; margin-top: 35px;">
      <div class="section-header" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:15px;">
        <div style="flex:1; min-width:200px;">
          <h3 id="override-section-title">Initial Opening Balances</h3>
          <span id="override-section-subtitle" style="font-size:12px; color:var(--text-muted);">Set starting balances for all cash, banks and wallets (ledger start)</span>
        </div>
        <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
          <div>
            <label style="font-size:11px; display:block; margin-bottom:2px; color:var(--text-muted);">Type (Optional)</label>
            <select id="override-type" class="form-control" style="font-size:12px; padding:4px 8px; height:auto; width:120px;">
              <option value="opening">Opening Bal.</option>
              <option value="closing">Closing Bal.</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px; display:block; margin-bottom:2px; color:var(--text-muted);">Date</label>
            <input type="date" id="opening-override-date" class="form-control" style="font-size:12px; padding:4px 8px; height:auto; width:120px;">
          </div>
          <div>
            <label style="font-size:11px; display:block; margin-bottom:2px; color:var(--text-muted);">Owner PIN</label>
            <input type="password" id="override-pin" class="form-control" style="font-size:12px; padding:4px 8px; height:auto; width:90px;" placeholder="****">
          </div>
        </div>
      </div>
      <form id="form-opening-balances">
        <h4 style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px;">Cash Reservoirs</h4>
        <div class="form-row" style="margin-bottom:15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Cash In Hand (₹)</label>
            <input type="number" step="0.01" id="opening-cash" class="form-control" value="${initialBalances.cash !== undefined ? initialBalances.cash : 0.00}" style="font-size:12px;" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Petty Cash (₹)</label>
            <input type="number" step="0.01" id="opening-petty-cash" class="form-control" value="${initialBalances.petty_cash !== undefined ? initialBalances.petty_cash : 0.00}" style="font-size:12px;" required>
          </div>
        </div>

        <h4 style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px;">Bank Accounts</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
          ${bankAccounts.map(b => `
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">${b.name} (₹)</label>
              <input type="number" step="0.01" data-id="${b.id}" class="form-control bank-opening-input" value="${initialBalances[b.id] !== undefined ? initialBalances[b.id] : 0.00}" style="font-size:12px;" required>
            </div>
          `).join('')}
        </div>

        <h4 style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px;">Wallets</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          ${store.wallets.map(w => `
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">${w.name} (₹)</label>
              <input type="number" step="0.01" data-id="${w.id}" class="form-control wallet-opening-input" value="${initialBalances[w.id] !== undefined ? initialBalances[w.id] : 0.00}" style="font-size:12px;" required>
            </div>
          `).join('')}
        </div>

        <button type="submit" class="btn btn-sm btn-primary" style="width:200px;">Save Opening Balances</button>
      </form>
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
      let bankQrCodeBase64 = '';
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
            <label class="form-label">Custom Payment QR Code Image (Optional)</label>
            <input type="file" id="bank-qr-upload" class="form-control" accept="image/*" style="font-size:12px; padding:6px 12px;">
            <div id="bank-qr-preview-container" style="display:none; align-items:center; gap:10px; margin-top:8px;">
              <img id="bank-qr-preview" src="" alt="QR Preview" style="width:50px; height:50px; object-fit:contain; border:1px solid var(--panel-border); border-radius:4px; padding:2px; background:#fff;">
              <span style="font-size:10px; color:var(--text-muted);">Custom QR loaded</span>
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

      const bankQrUpload = document.getElementById('bank-qr-upload');
      if (bankQrUpload) {
        bankQrUpload.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              bankQrCodeBase64 = evt.target.result;
              const preview = document.getElementById('bank-qr-preview');
              const container = document.getElementById('bank-qr-preview-container');
              if (preview && container) {
                preview.src = bankQrCodeBase64;
                container.style.display = 'flex';
              }
            };
            reader.readAsDataURL(file);
          }
        });
      }

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
          upiId: document.getElementById('bank-upi').value,
          qrCode: bankQrCodeBase64
        });
        store.persistAll();

        if (balance > 0) {
          store.adjustBalance(activeDate, bankId, balance, auth.currentUser ? auth.currentUser.name : 'System');
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
          store.adjustBalance(activeDate, walletId, balance, auth.currentUser ? auth.currentUser.name : 'System');
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
        store.adjustBalance(activeDate, 'cash', newBal, auth.currentUser ? auth.currentUser.name : 'System');

        appInstance.showToast('Cash In Hand balance adjusted successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  }

  // Edit Petty Cash balance binding
  const btnEditPetty = document.querySelector('.btn-edit-petty');
  if (btnEditPetty) {
    btnEditPetty.addEventListener('click', () => {
      const pettyBal = currentBalances.petty_cash !== undefined ? currentBalances.petty_cash : 0.00;

      document.getElementById('account-modal-title').innerText = 'Adjust Petty Cash';
      formMount.innerHTML = `
        <form id="form-edit-petty">
          <div class="form-group">
            <label class="form-label">Account Label Name</label>
            <input type="text" class="form-control" value="Petty Cash" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₹)</label>
            <input type="number" step="0.01" id="petty-balance" class="form-control" value="${pettyBal.toFixed(2)}" required>
            <span style="font-size: 11px; color: var(--text-dimmed); margin-top: 4px; display:block;">
              *Adjusting this will create a manual ledger balance correction.
            </span>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="save" style="width:16px; height:16px;"></i> Save Petty Cash Balance
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-edit-petty').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const newBal = parseFloat(document.getElementById('petty-balance').value || 0);
        store.adjustBalance(activeDate, 'petty_cash', newBal, auth.currentUser ? auth.currentUser.name : 'System');

        appInstance.showToast('Petty Cash balance adjusted successfully!', 'success');
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
      let bankQrCodeBase64 = bank.qrCode || '';

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
            <label class="form-label">Custom Payment QR Code Image (Optional)</label>
            <input type="file" id="bank-qr-upload" class="form-control" accept="image/*" style="font-size:12px; padding:6px 12px;">
            <div id="bank-qr-preview-container" style="display:${bank.qrCode ? 'flex' : 'none'}; align-items:center; gap:10px; margin-top:8px;">
              <img id="bank-qr-preview" src="${bank.qrCode || ''}" alt="QR Preview" style="width:50px; height:50px; object-fit:contain; border:1px solid var(--panel-border); border-radius:4px; padding:2px; background:#fff;">
              <span style="font-size:10px; color:var(--text-muted);">Custom QR loaded</span>
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

      const bankQrUpload = document.getElementById('bank-qr-upload');
      if (bankQrUpload) {
        bankQrUpload.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              bankQrCodeBase64 = evt.target.result;
              const preview = document.getElementById('bank-qr-preview');
              const container = document.getElementById('bank-qr-preview-container');
              if (preview && container) {
                preview.src = bankQrCodeBase64;
                container.style.display = 'flex';
              }
            };
            reader.readAsDataURL(file);
          }
        });
      }

      backdrop.classList.add('show');

      document.getElementById('form-edit-bank').addEventListener('submit', (ev) => {
        ev.preventDefault();
        store.updateBankAccountDetails(bankId, {
          name: document.getElementById('bank-label').value,
          bankName: document.getElementById('bank-name').value,
          accountNumber: document.getElementById('bank-acc-no').value,
          ifsc: document.getElementById('bank-ifsc').value,
          upiId: document.getElementById('bank-upi').value,
          qrCode: bankQrCodeBase64
        });

        const newBal = parseFloat(document.getElementById('bank-balance').value || 0);
        store.adjustBalance(activeDate, bankId, newBal, auth.currentUser ? auth.currentUser.name : 'System');

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
        store.adjustBalance(activeDate, walletId, newBal, auth.currentUser ? auth.currentUser.name : 'System');

        appInstance.showToast('Wallet parameters updated successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });

  // Unified Deposit / Transfer Modal Handler
  const openDepositModal = () => {
    document.getElementById('account-modal-title').innerText = 'Deposit';
    
    const sources = [
      { id: 'cash', name: 'Cash In Hand', bal: currentBalances.cash },
      { id: 'petty_cash', name: 'Petty Cash', bal: currentBalances.petty_cash || 0 }
    ];
    bankAccounts.forEach(b => {
      sources.push({ id: b.id, name: b.name, bal: currentBalances[b.id] || 0 });
    });

    formMount.innerHTML = `
      <form id="form-unified-deposit">
        <div class="form-group">
          <label class="form-label">Source Account</label>
          <select id="deposit-source-id" class="form-control" required>
            ${sources.map(s => `<option value="${s.id}">${s.name} (Bal: ₹${s.bal.toFixed(2)})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Target Account / Wallet</label>
          <select id="deposit-target-id" class="form-control" required>
            <!-- Target list dynamically filtered -->
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Transfer/Deposit Amount (₹)</label>
          <input type="number" step="0.01" id="deposit-amount" class="form-control" placeholder="0.00" required min="0.01">
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-success" style="flex-grow:1;">
            <i data-lucide="check" style="width: 16px; height: 16px;"></i> Complete Deposit
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();
    bindCancelBtn();

    const selectSource = document.getElementById('deposit-source-id');
    const selectTarget = document.getElementById('deposit-target-id');
    const inputAmount = document.getElementById('deposit-amount');

    const updateTargets = () => {
      const selectedSource = selectSource.value;
      const targets = [
        { id: 'cash', name: 'Cash In Hand' },
        { id: 'petty_cash', name: 'Petty Cash' }
      ];
      bankAccounts.forEach(b => {
        targets.push({ id: b.id, name: `${b.name} (${b.bankName})` });
      });
      store.wallets.filter(w => w.isActive).forEach(w => {
        targets.push({ id: w.id, name: w.name });
      });

      const filteredTargets = targets.filter(t => t.id !== selectedSource);
      selectTarget.innerHTML = filteredTargets.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

      const sourceObj = sources.find(s => s.id === selectedSource);
      if (sourceObj) {
        inputAmount.max = sourceObj.bal;
      }
    };

    selectSource.addEventListener('change', updateTargets);
    updateTargets();

    backdrop.classList.add('show');

    document.getElementById('form-unified-deposit').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const sourceId = selectSource.value;
      const targetId = selectTarget.value;
      const amount = parseFloat(inputAmount.value);

      const sourceObj = sources.find(s => s.id === sourceId);
      if (sourceObj && amount > sourceObj.bal) {
        alert(`Insufficient balance in ${sourceObj.name} to complete this deposit!`);
        return;
      }

      const sourceName = sourceId === 'cash' ? 'Cash' : (sourceId === 'petty_cash' ? 'Petty Cash' : (bankAccounts.find(b => b.id === sourceId)?.name || 'Bank'));
      const targetName = targetId === 'cash' ? 'Cash' : (targetId === 'petty_cash' ? 'Petty Cash' : (bankAccounts.find(b => b.id === targetId)?.name || store.wallets.find(w => w.id === targetId)?.name || 'Wallet'));

      store.addTransaction(appInstance.getActiveDate(), {
        type: 'deposit',
        description: `Deposit: ${sourceName} to ${targetName}`,
        amount,
        source: sourceId,
        targetWallet: targetId
      });

      appInstance.showToast(`Transferred ₹${amount.toFixed(2)} from ${sourceName} to ${targetName}`, 'success');
      closeModal();
      appInstance.handleRouting();
    });
  };

  const btnUnifiedDeposit = document.getElementById('btn-unified-deposit');
  if (btnUnifiedDeposit) {
    btnUnifiedDeposit.addEventListener('click', openDepositModal);
  }

  const btnWalletDeposit = document.getElementById('btn-wallet-deposit');
  if (btnWalletDeposit) {
    btnWalletDeposit.addEventListener('click', openDepositModal);
  }

  // Initial Opening Balances Form submit handler
  const formOpeningBalances = document.getElementById('form-opening-balances');
  if (formOpeningBalances) {
    formOpeningBalances.addEventListener('submit', (e) => {
      e.preventDefault();

      // Read the CURRENT stored values so we can preserve them if input is left blank
      const existingBalances = store.initialBalances || {};

      const cashInput = document.getElementById('opening-cash');
      const pettyInput = document.getElementById('opening-petty-cash');
      const newBalances = {};

      if (cashInput && cashInput.value !== '') {
        newBalances.cash = parseFloat(cashInput.value);
      } else {
        newBalances.cash = existingBalances.cash !== undefined ? existingBalances.cash : 0;
      }

      if (pettyInput && pettyInput.value !== '') {
        newBalances.petty_cash = parseFloat(pettyInput.value);
      } else {
        newBalances.petty_cash = existingBalances.petty_cash !== undefined ? existingBalances.petty_cash : 0;
      }

      // Gather bank opening balances — preserve existing if input is blank
      const bankInputs = document.querySelectorAll('.bank-opening-input');
      bankInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        if (input.value !== '') {
          newBalances[id] = parseFloat(input.value);
        } else {
          newBalances[id] = existingBalances[id] !== undefined ? existingBalances[id] : 0;
        }
      });

      // Gather wallet opening balances — preserve existing if input is blank
      const walletInputs = document.querySelectorAll('.wallet-opening-input');
      walletInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        if (input.value !== '') {
          newBalances[id] = parseFloat(input.value);
        } else {
          newBalances[id] = existingBalances[id] !== undefined ? existingBalances[id] : 0;
        }
      });

      // Check if a specific date was selected for overriding
      const overrideDateInput = document.getElementById('opening-override-date');
      const overrideTypeInput = document.getElementById('override-type');
      const overridePinInput = document.getElementById('override-pin');
      
      const overrideDate = overrideDateInput ? overrideDateInput.value : '';
      const overrideType = overrideTypeInput ? overrideTypeInput.value : 'opening';
      const overridePin = overridePinInput ? overridePinInput.value : '';

      if (overrideDate) {
        if (!auth.currentUser || auth.currentUser.role !== 'owner') {
          appInstance.showToast('❌ Only owners can perform date overrides.', 'error');
          return;
        }
        const ownerUser = auth.getPresetUsers().find(u => u.username.toUpperCase() === 'SHIBURCN');
        if (!ownerUser || ownerUser.password !== overridePin) {
          appInstance.showToast('❌ Incorrect Owner PIN.', 'error');
          return;
        }

        if (overrideType === 'closing') {
          store.setClosingOverride(overrideDate, newBalances);
          appInstance.showToast(`✅ Closing balances overridden for ${overrideDate}!`, 'success');
        } else {
          // Apply override to a specific date
          store.setOpeningOverride(overrideDate, newBalances);
          appInstance.showToast(`✅ Opening balances overridden for ${overrideDate}!`, 'success');
        }
      } else {
        // Save to initial genesis balances
        store.updateInitialBalances(newBalances);
        appInstance.showToast('✅ Initial opening balances saved successfully!', 'success');
      }
      // Update displayed card values in-place without full page re-render
      const updatedBalances = store.getCurrentBalances();
      const cashCard = document.querySelector('.wallet-balance-val[data-balance-id="cash"]');
      if (cashCard) cashCard.textContent = `₹${(updatedBalances.cash || 0).toFixed(2)}`;
      document.querySelectorAll('[data-balance-id]').forEach(el => {
        const bid = el.getAttribute('data-balance-id');
        if (bid && updatedBalances[bid] !== undefined) {
          el.textContent = `₹${updatedBalances[bid].toFixed(2)}`;
        }
      });
    });
  }

  // Dynamic overrides fields syncing:
  const dateInp = document.getElementById('opening-override-date');
  const typeInp = document.getElementById('override-type');
  const sectionTitle = document.getElementById('override-section-title');
  const sectionSub = document.getElementById('override-section-subtitle');

  const updateInputsWithOverride = () => {
    const dateVal = dateInp ? dateInp.value : '';
    const typeVal = typeInp ? typeInp.value : 'opening';
    
    let balances = { ...store.initialBalances };
    
    if (dateVal) {
      sectionTitle.innerText = `${typeVal === 'closing' ? 'Closing' : 'Opening'} Balance Override: ${dateVal}`;
      sectionSub.innerText = `Adjust the ${typeVal} balance figures for the specific date of ${dateVal}`;
      
      const overrides = typeVal === 'closing' ? store.closingOverrides : store.openingOverrides;
      if (overrides && overrides[dateVal]) {
        balances = { ...balances, ...overrides[dateVal] };
      } else {
        const dailyLog = store.dailyLogs[dateVal];
        if (dailyLog) {
          balances = typeVal === 'closing' ? { ...dailyLog.closingBalances } : { ...dailyLog.openingBalances };
        }
      }
    } else {
      sectionTitle.innerText = 'Initial Genesis Opening Balances';
      sectionSub.innerText = 'Set starting balances for all cash, banks and wallets (ledger start)';
    }

    const cashInp = document.getElementById('opening-cash');
    if (cashInp) cashInp.value = balances.cash !== undefined ? balances.cash : 0;
    
    const pettyInp = document.getElementById('opening-petty-cash');
    if (pettyInp) pettyInp.value = balances.petty_cash !== undefined ? balances.petty_cash : 0;

    const bankInputs = document.querySelectorAll('.bank-opening-input');
    bankInputs.forEach(inp => {
      const id = inp.getAttribute('data-id');
      inp.value = balances[id] !== undefined ? balances[id] : 0;
    });

    const walletInputs = document.querySelectorAll('.wallet-opening-input');
    walletInputs.forEach(inp => {
      const id = inp.getAttribute('data-id');
      inp.value = balances[id] !== undefined ? balances[id] : 0;
    });
  };

  if (dateInp) dateInp.addEventListener('change', updateInputsWithOverride);
  if (typeInp) typeInp.addEventListener('change', updateInputsWithOverride);
}

export default renderAccounts;
