/* ==========================================================================
   CYBERONE Center Management Platform - AEPS & Money Transfer (views/aeps.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderAEPS(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const wallets = store.wallets.filter(w => w.isAEPS);
  const currentBalances = store.getCurrentBalances();
  const dailyLog = store.getOrCreateDailyLog(activeDate);

  if (!dailyLog.aepsTransferred) {
    dailyLog.aepsTransferred = {};
  }

  mountPoint.innerHTML = `
    <!-- AEPS Section Header -->
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h3>AEPS & Money Transfer Dashboard</h3>
        <span style="font-size:12px; color:var(--text-muted);">Manage AEPS portals, withdrawals and money transfer volumes</span>
      </div>
      <button id="btn-add-aeps-wallet" class="btn btn-primary btn-sm">
        <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Add AEPS Wallet
      </button>
    </div>

    <!-- Stats row for today's volume -->
    <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 25px;">
      ${wallets.map(w => {
        const bal = currentBalances[w.id] !== undefined ? currentBalances[w.id] : 0.00;
        const dailyTsf = dailyLog.aepsTransferred[w.id] || 0.00;
        return `
          <div class="glass-card" style="padding: 20px; border-left: 4px solid var(--color-success); display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong style="font-size: 15px; color:#fff; display:block;">${w.name}</strong>
                <span style="font-size:11px; color:var(--text-muted);">ID: <code>${w.loginId}</code></span>
              </div>
              <button class="btn btn-sm btn-secondary btn-edit-aeps" data-id="${w.id}" style="padding: 4px;">
                <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i>
              </button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid var(--panel-border); padding-top:10px;">
              <div>
                <span style="font-size: 10px; color:var(--text-dimmed); text-transform:uppercase; display:block;">Wallet Balance</span>
                <span style="font-family:var(--font-display); font-size: 18px; font-weight:700; color:var(--color-success);">₹${bal.toFixed(2)}</span>
              </div>
              <div style="text-align:right;">
                <span style="font-size: 10px; color:var(--text-dimmed); text-transform:uppercase; display:block;">Daily Transferred</span>
                <span style="font-family:var(--font-display); font-size: 16px; font-weight:700; color:var(--color-info);">₹${dailyTsf.toFixed(2)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Dynamic Modal Backdrops -->
    <div id="aeps-modal-backdrop" class="modal-backdrop">
      <div class="modal-container">
        <div class="modal-header">
          <h4 id="aeps-modal-title">Edit AEPS Parameters</h4>
          <button id="aeps-modal-close" class="modal-close" style="display:none;">&times;</button>
        </div>
        <div id="aeps-form-mount"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'AEPS & Money Transfer Services';
  document.getElementById('page-heading-sub').innerText = `Reconciliation parameters for digital cash-out volumes on ${activeDate}`;

  lucide.createIcons();

  const backdrop = document.getElementById('aeps-modal-backdrop');
  const formMount = document.getElementById('aeps-form-mount');

  const closeModal = () => backdrop.classList.remove('show');

  const bindCancelBtn = () => {
    const cancelBtn = formMount.querySelector('.btn-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
    }
  };

  // Add AEPS Wallet Binder
  document.getElementById('btn-add-aeps-wallet').addEventListener('click', () => {
    document.getElementById('aeps-modal-title').innerText = 'Add AEPS Portal Wallet';
    formMount.innerHTML = `
      <form id="form-add-aeps">
        <div class="form-group">
          <label class="form-label">AEPS Wallet Name</label>
          <input type="text" id="aeps-name" class="form-control" placeholder="e.g. Digipay AEPS" required>
        </div>
        <div class="form-group">
          <label class="form-label">Portal Login ID / Terminal ID</label>
          <input type="text" id="aeps-login" class="form-control" placeholder="Enter Login ID" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Commission Rate (%)</label>
            <input type="number" step="0.001" id="aeps-comm" class="form-control" value="0.20" required>
          </div>
          <div class="form-group">
            <label class="form-label">Initial Balance (₹)</label>
            <input type="number" step="0.01" id="aeps-balance" class="form-control" value="0.00" required>
          </div>
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

    document.getElementById('form-add-aeps').addEventListener('submit', (e) => {
      e.preventDefault();
      const walletId = 'aeps_' + Math.random().toString(36).substr(2, 5);
      const name = document.getElementById('aeps-name').value;
      const balance = parseFloat(document.getElementById('aeps-balance').value || 0);

      store.wallets.push({
        id: walletId,
        name: name,
        loginId: document.getElementById('aeps-login').value,
        commissionRate: parseFloat(document.getElementById('aeps-comm').value || 0) / 100,
        isActive: true,
        isAEPS: true
      });
      store.persistAll();

      if (balance > 0) {
        store.adjustBalance(activeDate, walletId, balance, auth.currentUser ? auth.currentUser.name : 'System');
      }

      appInstance.showToast('AEPS Wallet registered successfully!', 'success');
      closeModal();
      appInstance.handleRouting();
    });
  });

  // Edit AEPS parameters
  const editBtns = document.querySelectorAll('.btn-edit-aeps');
  editBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const walletId = e.currentTarget.getAttribute('data-id');
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return;

      const bal = currentBalances[walletId] !== undefined ? currentBalances[walletId] : 0.00;
      const dailyTsf = dailyLog.aepsTransferred[walletId] || 0.00;

      document.getElementById('aeps-modal-title').innerText = `Manage ${wallet.name}`;
      formMount.innerHTML = `
        <form id="form-edit-aeps-details">
          <div class="form-group">
            <label class="form-label">Wallet Login ID / Terminal ID</label>
            <input type="text" id="edit-aeps-login" class="form-control" value="${wallet.loginId}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Wallet Balance (₹)</label>
              <input type="number" step="0.01" id="edit-aeps-balance" class="form-control" value="${bal.toFixed(2)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Daily Transferred (₹)</label>
              <input type="number" step="0.01" id="edit-aeps-transferred" class="form-control" value="${dailyTsf.toFixed(2)}" required>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="save" style="width:16px; height:16px;"></i> Save Parameters
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      bindCancelBtn();
      backdrop.classList.add('show');

      document.getElementById('form-edit-aeps-details').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Update login ID
        store.updateWalletDetails(walletId, {
          loginId: document.getElementById('edit-aeps-login').value
        });

        // Update balance adjustments
        const newBal = parseFloat(document.getElementById('edit-aeps-balance').value || 0);
        store.adjustBalance(activeDate, walletId, newBal, auth.currentUser ? auth.currentUser.name : 'System');

        // Update daily transferred
        const newTsf = parseFloat(document.getElementById('edit-aeps-transferred').value || 0);
        store.updateAEPSDailyTransferred(activeDate, walletId, newTsf);

        appInstance.showToast('AEPS wallet details updated!', 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });
}

export default renderAEPS;
