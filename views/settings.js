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


}

export default renderSettings;
