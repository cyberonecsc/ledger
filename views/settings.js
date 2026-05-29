/* ==========================================================================
   CYBERONE Center Management Platform - Settings View (views/settings.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderSettings(mountPoint, appInstance) {
  const profile = store.centerProfile;
  
  const bankAccounts = store.bankAccounts;
  const wallets = store.wallets;
  const initialBalances = store.initialBalances;

  mountPoint.innerHTML = `
    <!-- Global Store Profile Settings Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>CYBERONE CSC Profile</h3>
        <span style="font-size:12px; color:var(--text-muted);">Configure center metadata values</span>
      </div>
      <form id="form-store-profile">
        <div class="form-row" style="margin-bottom:15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Center Name</label>
            <input type="text" id="store-name" class="form-control" value="${profile.name}" style="font-size:12px;" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Center Code</label>
            <input type="text" id="store-code" class="form-control" value="${profile.code}" style="font-size:12px;" required>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Center Address</label>
            <input type="text" id="store-address" class="form-control" value="${profile.address || ''}" style="font-size:12px;" placeholder="Street / Building Address" required>
          </div>
        </div>

        <div class="form-row-3" style="margin-bottom:15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">City</label>
            <input type="text" id="store-city" class="form-control" value="${profile.city || ''}" style="font-size:12px;" placeholder="City / Town" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">State</label>
            <input type="text" id="store-state" class="form-control" value="${profile.state || ''}" style="font-size:12px;" placeholder="State" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">PIN Code</label>
            <input type="text" id="store-pin" class="form-control" value="${profile.pin || ''}" style="font-size:12px;" placeholder="6-digit PIN" required>
          </div>
        </div>

        <div class="form-row-3" style="margin-bottom:15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Land Phone Number</label>
            <input type="text" id="store-land-phone" class="form-control" value="${profile.landPhone || ''}" style="font-size:12px;" placeholder="e.g. 0495-XXXXXXX">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Mobile Number</label>
            <input type="text" id="store-mobile" class="form-control" value="${profile.mobile || ''}" style="font-size:12px;" placeholder="10-digit mobile" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Email Address</label>
            <input type="email" id="store-email" class="form-control" value="${profile.email || ''}" style="font-size:12px;" placeholder="center@domain.com" required>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:20px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">GSTIN (GST Number)</label>
            <input type="text" id="store-gstin" class="form-control" value="${profile.gstin || ''}" style="font-size:12px;" placeholder="e.g. 32AAAAA1111A1Z1">
          </div>
          <div style="margin-bottom:0;"></div>
        </div>

        <button type="submit" class="btn btn-sm btn-primary" style="width:200px;">Save Center Details</button>
      </form>
    </div>

    <!-- Initial Opening Balances Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 30px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>Initial Opening Balances</h3>
        <span style="font-size:12px; color:var(--text-muted);">Set starting balances for all cash, banks and wallets (ledger start)</span>
      </div>
      <form id="form-opening-balances">
        
        <h4 style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 10px; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px;">Cash Reservoirs</h4>
        <div class="form-row" style="margin-bottom:15px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Cash In Hand (₹)</label>
            <input type="number" step="0.01" id="opening-cash" class="form-control" value="${initialBalances.cash || 0.00}" style="font-size:12px;" required>
          </div>
          <div style="margin-bottom:0;"></div>
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
          ${wallets.map(w => `
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">${w.name} (₹)</label>
              <input type="number" step="0.01" data-id="${w.id}" class="form-control wallet-opening-input" value="${initialBalances[w.id] !== undefined ? initialBalances[w.id] : 0.00}" style="font-size:12px;" required>
            </div>
          `).join('')}
        </div>

        <button type="submit" class="btn btn-sm btn-primary" style="width:200px;">Save Opening Balances</button>
      </form>
    </div>

    <!-- Database Backup & Sync Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 30px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>Database Backup & Sync</h3>
        <span style="font-size:12px; color:var(--text-muted);">Synchronize ledger data between GitHub Pages and your local server</span>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: var(--text-muted); margin-bottom: 20px;">
        As browsers isolate local storage by site address, data entered on your GitHub live website is separate from your local server. Use this tool to export a backup file from GitHub and import it here to make your daily balance sheets match perfectly.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
        <button id="btn-export-backup" class="btn btn-sm btn-success" style="display: inline-flex; align-items: center; gap: 8px;">
          <i data-lucide="download" style="width: 14px; height: 14px;"></i> Export Data Backup
        </button>
        <div style="position: relative; overflow: hidden; display: inline-block;">
          <button class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
            <i data-lucide="upload" style="width: 14px; height: 14px;"></i> Import Data Backup
          </button>
          <input type="file" id="input-import-backup" accept=".json" style="position: absolute; font-size: 100px; opacity: 0; right: 0; top: 0; cursor: pointer;">
        </div>
        <button id="btn-github-sync" class="btn btn-sm btn-info" style="display: inline-flex; align-items: center; gap: 8px; background: #8b5cf6; border-color: #8b5cf6;">
          <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Sync Database
        </button>
      </div>
    </div>

    <!-- Database Diagnostics Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 30px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>System Diagnostics</h3>
        <span style="font-size:12px; color:var(--text-muted);">View raw database state (Read-Only)</span>
      </div>
      <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--panel-border); border-radius: var(--border-radius-sm); padding: 15px; font-family: monospace; font-size: 11px; max-height: 250px; overflow-y: auto; color: #a5f3fc; white-space: pre-wrap;"><strong>Initial Balances (cyberone_v2_initial_balances):</strong>
${JSON.stringify(initialBalances, null, 2)}

<strong style="display:block; margin-top: 15px;">Active Wallets (cyberone_v2_wallets):</strong>
${JSON.stringify(wallets, null, 2)}

<strong style="display:block; margin-top: 15px;">Active Bank Accounts:</strong>
${JSON.stringify(bankAccounts, null, 2)}

<strong style="display:block; margin-top: 15px;">Ledger Dates:</strong>
${Object.keys(store.dailyLogs).sort().join(', ')}</div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'System Configuration & Settings';
  document.getElementById('page-heading-sub').innerText = 'Manage store metadata details and profiles';

  lucide.createIcons();

  // Store Profile save handler
  document.getElementById('form-store-profile').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('store-name').value.trim();
    const code = document.getElementById('store-code').value.trim();
    const address = document.getElementById('store-address').value.trim();
    const city = document.getElementById('store-city').value.trim();
    const state = document.getElementById('store-state').value.trim();
    const pin = document.getElementById('store-pin').value.trim();
    const landPhone = document.getElementById('store-land-phone').value.trim();
    const mobile = document.getElementById('store-mobile').value.trim();
    const email = document.getElementById('store-email').value.trim();
    const gstin = document.getElementById('store-gstin').value.trim();

    store.updateCenterProfile({
      name,
      code,
      address,
      city,
      state,
      pin,
      landPhone,
      mobile,
      email,
      gstin
    });

    appInstance.showToast('Center profile updated successfully!', 'success');
  });

  // Opening Balances save handler
  document.getElementById('form-opening-balances').addEventListener('submit', (e) => {
    e.preventDefault();
    const newBalances = {
      cash: parseFloat(document.getElementById('opening-cash').value || 0)
    };

    // Bank account inputs
    mountPoint.querySelectorAll('.bank-opening-input').forEach(input => {
      const id = input.getAttribute('data-id');
      newBalances[id] = parseFloat(input.value || 0);
    });

    // Wallet inputs
    mountPoint.querySelectorAll('.wallet-opening-input').forEach(input => {
      const id = input.getAttribute('data-id');
      newBalances[id] = parseFloat(input.value || 0);
    });

    store.updateInitialBalances(newBalances);
    appInstance.showToast('Initial opening balances saved and all ledger history recalculated!', 'success');
  });

  // Export backup event handler
  document.getElementById('btn-export-backup').addEventListener('click', () => {
    try {
      const backup = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cyberone_v2_')) {
          backup[key] = localStorage.getItem(key);
        }
      }
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `cyberone_ledger_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      appInstance.showToast('Backup file downloaded successfully!', 'success');
    } catch (e) {
      console.error(e);
      appInstance.showToast('Export failed: ' + e.message, 'error');
    }
  });

  // Import backup event handler
  document.getElementById('input-import-backup').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const backup = JSON.parse(evt.target.result);
        let importedCount = 0;
        
        // Basic validation: ensure it's a JSON object with keys starting with cyberone_v2_
        const keys = Object.keys(backup);
        if (keys.length === 0 || !keys.some(k => k.startsWith('cyberone_v2_'))) {
          throw new Error('Invalid backup file. Missing Cyberone ledger keys.');
        }

        // Write keys to local storage
        keys.forEach(key => {
          if (key.startsWith('cyberone_v2_')) {
            localStorage.setItem(key, backup[key]);
            importedCount++;
          }
        });

        appInstance.showToast(`Imported ${importedCount} keys successfully! Reloading...`, 'success');
        
        // Wait 1.5s then reload to let store load the new state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error(err);
        appInstance.showToast('Failed to import backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  // Sync Database handler delegating to application instance
  const btnSync = document.getElementById('btn-github-sync');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      appInstance.syncDatabase();
    });
  }
}

export default renderSettings;
