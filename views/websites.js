/* ==========================================================================
   CYBERONE Center Management Platform - Websites Credentials Vault (views/websites.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderWebsites(mountPoint, appInstance) {
  let searchQuery = '';
  let editingWebId = null;

  const redrawLayout = () => {
    const websites = store.websites || [];
    
    // Sort and get top 5 frequently used websites
    const topWebsites = [...websites]
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, 5);

    // Filter websites based on search query
    let filteredWebs = websites;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredWebs = websites.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.url || '').toLowerCase().includes(q) ||
        (w.userId || '').toLowerCase().includes(q) ||
        (w.notes || '').toLowerCase().includes(q)
      );
    }

    mountPoint.innerHTML = `
      <!-- 5 columns for frequently used websites -->
      <div style="margin-bottom: 30px;">
        <h4 style="font-family: var(--font-display); font-weight: 700; color: var(--text-white-invert); font-size: 14px; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-muted);">
          Frequently Used Portals
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
          ${topWebsites.map(web => {
            let hostname = '';
            try {
              hostname = new URL(web.url).hostname;
            } catch(e) {
              hostname = web.url;
            }

            return `
              <div class="glass-card clickable-web-tile" data-id="${web.id}" style="padding: 15px; border: 1px solid var(--panel-border); background: rgba(99, 102, 241, 0.03); display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: var(--transition-smooth); position: relative; overflow: hidden;">
                <!-- Decorative background glow -->
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; border-radius: 50%; background: var(--color-primary-glow); filter: blur(20px); opacity: 0.15; pointer-events: none;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--text-white-invert); line-height: 1.2; word-break: break-word;">${web.name}</span>
                  <span class="badge" style="background: rgba(99,102,241,0.1); color: var(--color-primary); border: 1px solid rgba(99,102,241,0.2); font-size: 9px; padding: 1px 5px; border-radius: 10px; flex-shrink: 0;">
                    ${web.visitCount || 0} visits
                  </span>
                </div>
                
                <div style="font-size: 10px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${hostname}
                </div>
                
                <div style="display: flex; gap: 6px; margin-top: auto; padding-top: 5px; border-top: 1px dashed var(--border-hairline);">
                  <button class="btn btn-xs btn-secondary btn-copy-uid" data-id="${web.id}" style="flex: 1; font-size: 9px; padding: 2px; height: 22px; display: inline-flex; align-items: center; justify-content: center; gap: 3px;">
                    <i data-lucide="copy" style="width: 10px; height: 10px;"></i> ID
                  </button>
                  <button class="btn btn-xs btn-secondary btn-copy-pwd" data-id="${web.id}" style="flex: 1; font-size: 9px; padding: 2px; height: 22px; display: inline-flex; align-items: center; justify-content: center; gap: 3px;">
                    <i data-lucide="lock" style="width: 10px; height: 10px;"></i> Pass
                  </button>
                </div>
              </div>
            `;
          }).join('')}
          ${websites.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dimmed); padding: 20px; background: var(--bg-card-transparent); border: 1px dashed var(--panel-border); border-radius: var(--border-radius-md); font-size: 12px; font-style: italic;">
              No portals registered. Add websites below to populate quick access list.
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Action & Search Bar -->
      <div class="search-filter-row" style="margin-bottom: 25px;">
        <div class="search-input-wrapper" style="flex-grow: 1;">
          <i data-lucide="search" style="width: 16px; height: 16px;"></i>
          <input type="text" id="web-search" class="form-control" placeholder="Search portals by name, URL, username, or notes..." value="${searchQuery}">
        </div>
        <button id="btn-add-web" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; height: 38px;">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Website
        </button>
      </div>

      <!-- Credentials Vault Table -->
      <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Portal Name</th>
                <th>URL / Link</th>
                <th>User ID / Login ID</th>
                <th>Password</th>
                <th style="max-width: 250px;">Notes / Remarks</th>
                <th style="text-align: center; width: 100px;">Hits</th>
                <th style="text-align: center; width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredWebs.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-dimmed); padding: 30px;">
                    No websites found matching current filters.
                  </td>
                </tr>
              ` : filteredWebs.map(web => `
                <tr>
                  <td><strong>${web.name}</strong></td>
                  <td>
                    <a href="${web.url}" target="_blank" class="btn-web-visit-link" data-id="${web.id}" style="color: var(--color-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                      Open Portal <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                    </a>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <code style="background: var(--border-hairline); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${web.userId || '—'}</code>
                      ${web.userId ? `
                        <button class="btn btn-xs btn-secondary btn-copy-uid" data-id="${web.id}" style="padding: 2px 4px; height: 20px;" title="Copy User ID">
                          <i data-lucide="copy" style="width: 11px; height: 11px;"></i>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <input type="password" class="form-control web-pwd-field" value="${web.password || ''}" disabled style="background: none; border: none; padding: 0; width: 100px; color: var(--text-white-invert); font-family: monospace; font-size: 12px;">
                      ${web.password ? `
                        <button class="btn btn-xs btn-secondary btn-toggle-pwd" style="padding: 2px 4px; height: 20px;">
                          <i data-lucide="eye" style="width: 11px; height: 11px;"></i>
                        </button>
                        <button class="btn btn-xs btn-secondary btn-copy-pwd" data-id="${web.id}" style="padding: 2px 4px; height: 20px;" title="Copy Password">
                          <i data-lucide="copy" style="width: 11px; height: 11px;"></i>
                        </button>
                      ` : '—'}
                    </div>
                  </td>
                  <td style="color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${web.notes || ''}">
                    ${web.notes || '—'}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge" style="background: var(--bg-card-medium); color: var(--text-muted); border: 1px solid var(--panel-border); font-size: 11px;">
                      ${web.visitCount || 0}
                    </span>
                  </td>
                  <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-sm btn-secondary btn-edit-web" data-id="${web.id}" style="margin-right: 5px;">
                      <i data-lucide="edit" style="width: 13px; height: 13px; margin-right: 3px;"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-web" data-id="${web.id}">
                      <i data-lucide="trash-2" style="width: 13px; height: 13px; margin-right: 3px;"></i> Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add/Edit Website Modal dialog -->
      <div id="web-modal-backdrop" class="modal-backdrop">
        <div class="modal-container">
          <div class="modal-header">
            <h4 id="web-modal-title">Register Website Credentials</h4>
            <button id="web-modal-close" class="modal-close">&times;</button>
          </div>

          <form id="form-add-web">
            <div class="form-group">
              <label class="form-label">Portal / Website Name</label>
              <input type="text" id="web-form-name" class="form-control" placeholder="e.g. e-District Kerala" required>
            </div>

            <div class="form-group">
              <label class="form-label">Website URL</label>
              <input type="url" id="web-form-url" class="form-control" placeholder="https://edistrict.kerala.gov.in" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">User ID / Username</label>
                <input type="text" id="web-form-userid" class="form-control" placeholder="e.g. cyberone_att">
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="text" id="web-form-password" class="form-control" placeholder="Enter portal password">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notes / Remarks</label>
              <textarea id="web-form-notes" class="form-control" rows="2" placeholder="e.g. OTP linked to phone 9048..."></textarea>
            </div>

            <div style="display:flex; gap:10px; margin-top: 15px;">
              <button type="submit" class="btn btn-primary" style="flex-grow:1;">
                <i data-lucide="save" style="width: 16px; height: 16px;"></i> <span id="web-submit-text">Register Portal</span>
              </button>
              <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    bindActionHandlers();
    lucide.createIcons();
  };

  const bindActionHandlers = () => {
    // Top tiles click to open portal & track visit
    document.querySelectorAll('.clickable-web-tile').forEach(tile => {
      tile.onclick = (e) => {
        // If clicking buttons inside tile, skip opening URL here
        if (e.target.closest('button')) return;
        
        const id = tile.getAttribute('data-id');
        const web = store.websites.find(w => w.id === id);
        if (web) {
          store.incrementWebsiteVisit(id);
          window.open(web.url, '_blank');
          redrawLayout();
        }
      };
    });

    // Links click track visit
    document.querySelectorAll('.btn-web-visit-link').forEach(link => {
      link.onclick = (e) => {
        const id = link.getAttribute('data-id');
        store.incrementWebsiteVisit(id);
        setTimeout(() => redrawLayout(), 300);
      };
    });

    // Copy to clipboard helpers
    const copyText = (text, message) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        appInstance.showToast(message, 'success');
      }).catch(err => {
        appInstance.showToast('Copy failed.', 'error');
      });
    };

    document.querySelectorAll('.btn-copy-uid').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const web = store.websites.find(w => w.id === id);
        if (web && web.userId) {
          copyText(web.userId, 'Copied Username/ID to clipboard!');
        }
      };
    });

    document.querySelectorAll('.btn-copy-pwd').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const web = store.websites.find(w => w.id === id);
        if (web && web.password) {
          copyText(web.password, 'Copied Password to clipboard!');
        }
      };
    });

    // Password view togglers
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const input = btn.closest('div').querySelector('.web-pwd-field');
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.setAttribute('data-id', 'eye-off');
          btn.innerHTML = `<i data-lucide="eye-off" style="width:11px; height:11px;"></i>`;
        } else {
          input.type = 'password';
          btn.innerHTML = `<i data-lucide="eye" style="width:11px; height:11px;"></i>`;
        }
        lucide.createIcons();
      };
    });

    // Search filter
    document.getElementById('web-search').oninput = (e) => {
      searchQuery = e.target.value;
      const rows = document.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchQuery.toLowerCase()) ? '' : 'none';
      });
    };

    // Modal dialog controls
    const backdrop = document.getElementById('web-modal-backdrop');
    const modalClose = document.getElementById('web-modal-close');
    const modalCancel = backdrop.querySelector('.btn-modal-cancel');
    const modalTitle = document.getElementById('web-modal-title');
    const submitText = document.getElementById('web-submit-text');

    const openAddModal = () => {
      editingWebId = null;
      modalTitle.innerText = 'Register Website Credentials';
      submitText.innerText = 'Register Portal';
      document.getElementById('form-add-web').reset();
      backdrop.classList.add('show');
    };

    const openEditModal = (web) => {
      editingWebId = web.id;
      modalTitle.innerText = `Edit ${web.name} Credentials`;
      submitText.innerText = 'Save Credentials';
      
      document.getElementById('web-form-name').value = web.name;
      document.getElementById('web-form-url').value = web.url;
      document.getElementById('web-form-userid').value = web.userId || '';
      document.getElementById('web-form-password').value = web.password || '';
      document.getElementById('web-form-notes').value = web.notes || '';
      
      backdrop.classList.add('show');
    };

    const closeModal = () => backdrop.classList.remove('show');

    document.getElementById('btn-add-web').onclick = openAddModal;
    modalClose.onclick = closeModal;
    modalCancel.onclick = closeModal;

    // Add/Edit Submit Form Handler
    document.getElementById('form-add-web').onsubmit = (e) => {
      e.preventDefault();
      const webData = {
        name: document.getElementById('web-form-name').value.trim(),
        url: document.getElementById('web-form-url').value.trim(),
        userId: document.getElementById('web-form-userid').value.trim(),
        password: document.getElementById('web-form-password').value.trim(),
        notes: document.getElementById('web-form-notes').value.trim()
      };

      if (editingWebId) {
        store.updateWebsite(editingWebId, webData);
        appInstance.showToast('Credentials updated successfully!', 'success');
      } else {
        store.addWebsite(webData);
        appInstance.showToast('Portal credential registered!', 'success');
      }

      closeModal();
      redrawLayout();
    };

    // Edit button handlers
    document.querySelectorAll('.btn-edit-web').forEach(btn => {
      btn.onclick = (e) => {
        const id = btn.getAttribute('data-id');
        const web = store.websites.find(w => w.id === id);
        if (web) {
          openEditModal(web);
        }
      };
    });

    // Delete credentials handler
    document.querySelectorAll('.btn-delete-web').forEach(btn => {
      btn.onclick = (e) => {
        const id = btn.getAttribute('data-id');
        const web = store.websites.find(w => w.id === id);
        if (web && confirm(`Are you sure you want to remove credentials for "${web.name}"?`)) {
          store.deleteWebsite(id);
          appInstance.showToast('Credentials removed.', 'success');
          redrawLayout();
        }
      };
    });
  };

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Important Websites & Credentials Vault';
  document.getElementById('page-heading-sub').innerText = 'Access commonly used citizen service portals and manage login usernames & passwords securely';

  // Initial draw
  redrawLayout();
}

export default renderWebsites;
