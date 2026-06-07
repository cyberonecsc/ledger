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

    <!-- Custom Brand Logo Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 25px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>Custom Brand Logo</h3>
        <span style="font-size:12px; color:var(--text-muted);">Change the logo displayed on the login screen, receipts, and invoices</span>
      </div>
      <form id="form-custom-logo">
        <div class="form-group" style="margin-bottom:15px;">
          <label class="form-label" style="font-size:11px;">Logo Image URL (or upload from device)</label>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="custom-logo-url" class="form-control" value="${localStorage.getItem('cyberone_v2_custom_logo') || ''}" style="font-size:12px; flex: 1; min-width: 250px;" placeholder="https://example.com/logo.png">
            <label class="btn btn-sm btn-secondary" style="display: inline-flex; align-items: center; cursor: pointer; white-space: nowrap; margin: 0; padding: 0 12px; height: 32px;">
              <i data-lucide="upload" style="width: 14px; height: 14px; margin-right: 6px;"></i> Browse File
              <input type="file" id="custom-logo-file" accept="image/*" style="display: none;">
            </label>
          </div>
          <span style="font-size:10px; color:var(--text-dimmed); margin-top: 4px; display:block;">
            *Leave blank to use the default platform logo. Recommended size under 1MB.
          </span>
        </div>
        <button type="submit" class="btn btn-sm btn-primary" style="width:200px;">Save Custom Logo</button>
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

  // Custom Logo Save Handler
  const logoFileInp = document.getElementById('custom-logo-file');
  const logoUrlInp = document.getElementById('custom-logo-url');
  if (logoFileInp && logoUrlInp) {
    logoFileInp.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        appInstance.showToast('File is too large. Please select an image under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => { logoUrlInp.value = ev.target.result; };
      reader.onerror = () => { appInstance.showToast('Failed to read file.', 'error'); };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('form-custom-logo').addEventListener('submit', (e) => {
    e.preventDefault();
    const logoUrl = document.getElementById('custom-logo-url').value.trim();

    if (logoUrl) {
      localStorage.setItem('cyberone_v2_custom_logo', logoUrl);
    } else {
      localStorage.removeItem('cyberone_v2_custom_logo');
    }

    // Trigger immediate disk save and git push
    store.persistAll();

    // Dynamically update the logo on the current page to avoid full reload
    const sidebarLogo = document.getElementById('sidebar-logo-img');
    const headerLogo = document.getElementById('header-logo-img');
    const newSrc = logoUrl || './logo.png';
    if (sidebarLogo) {
      sidebarLogo.src = newSrc;
      sidebarLogo.style.display = 'block';
    }
    if (headerLogo) {
      headerLogo.src = newSrc;
      headerLogo.style.display = 'block';
    }

    appInstance.showToast('Custom logo saved successfully!', 'success');
  });
}

export default renderSettings;

