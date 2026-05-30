/* ==========================================================================
   CYBERONE Center Management Platform - Settings View (views/settings.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderSettings(mountPoint, appInstance) {
  const profile = store.centerProfile;
  
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

    <!-- GitHub Auto-Sync Settings Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 25px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>GitHub Auto-Sync Configurations</h3>
        <span style="font-size:12px; color:var(--text-muted);">Enable remote sync for when you access the portal from other devices</span>
      </div>
      <form id="form-github-sync">
        <div class="form-group" style="margin-bottom:15px;">
          <label class="form-label" style="font-size:11px;">GitHub Personal Access Token (PAT)</label>
          <input type="password" id="github-token" class="form-control" value="${localStorage.getItem('cyberone_v2_github_token') || ''}" style="font-size:12px;" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
          <span style="font-size:10px; color:var(--text-dimmed); margin-top: 4px; display:block;">
            *Required for updating database when accessed on remote locations (GitHub Pages).
          </span>
        </div>
        
        <div class="form-row" style="margin-bottom:20px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Repository Path</label>
            <input type="text" id="github-repo" class="form-control" value="${localStorage.getItem('cyberone_v2_github_repo') || 'cyberonecsc/ledger'}" style="font-size:12px;" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Target Branch</label>
            <input type="text" id="github-branch" class="form-control" value="${localStorage.getItem('cyberone_v2_github_branch') || 'main'}" style="font-size:12px;" required>
          </div>
        </div>

        <button type="submit" class="btn btn-sm btn-primary" style="width:200px;">Save Sync Credentials</button>
      </form>
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

  // GitHub Sync Save Handler
  document.getElementById('form-github-sync').addEventListener('submit', (e) => {
    e.preventDefault();
    const token = document.getElementById('github-token').value.trim();
    const repo = document.getElementById('github-repo').value.trim();
    const branch = document.getElementById('github-branch').value.trim();

    if (token) {
      localStorage.setItem('cyberone_v2_github_token', token);
    } else {
      localStorage.removeItem('cyberone_v2_github_token');
    }
    localStorage.setItem('cyberone_v2_github_repo', repo);
    localStorage.setItem('cyberone_v2_github_branch', branch);

    appInstance.showToast('GitHub Sync parameters saved!', 'success');
  });
}

export default renderSettings;
