/* ==========================================================================
   CYBERONE Center Management Platform - Backup & Restore View (views/backup.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderBackupRestore(mountPoint, appInstance) {
  mountPoint.innerHTML = `
    <!-- Database Backup & Sync Config -->
    <div class="glass-card" style="padding:24px; max-width: 700px;">
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

    <!-- Automatic Backup & Local Snapshots -->
    <div class="glass-card" style="padding:24px; max-width: 700px; margin-top: 30px;">
      <div class="section-header" style="margin-bottom:15px;">
        <h3>Automatic Backup & Restore Points</h3>
        <span style="font-size:12px; color:var(--text-muted);">Ensure 100% data safety with automatic checkpoints and download schedules</span>
      </div>
      
      <!-- Auto Backup Config Form -->
      <form id="form-auto-backup-config" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--panel-border);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; align-items: flex-end;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Enable Auto-Backup</label>
            <select id="auto-backup-enabled" class="form-control" style="font-size:12px;">
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Frequency</label>
            <select id="auto-backup-frequency" class="form-control" style="font-size:12px;">
              <option value="session">On Session Load</option>
              <option value="hourly">Hourly</option>
              <option value="4hours">Every 4 Hours</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Backup Action</label>
            <select id="auto-backup-type" class="form-control" style="font-size:12px;">
              <option value="local">Silent browser restore point</option>
              <option value="file">Trigger file download (.json)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-sm btn-primary" style="margin-top:15px; width: 200px;">Save Backup Schedule</button>
      </form>

      <!-- Local Snapshots / Checkpoints Table -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-size: 13px; font-weight: 600; color: #fff; margin: 0;">Local Browser Checkpoints</h4>
          <button id="btn-create-manual-snapshot" class="btn btn-xs btn-success" style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding: 4px 8px; width:auto; border-radius: var(--border-radius-sm);">
            <i data-lucide="plus" style="width:12px; height:12px;"></i> Create Checkpoint Now
          </button>
        </div>
        
        <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
          Note: Local checkpoints are saved in your browser cache (local storage). They will be deleted if you clear your browser's site data. Download a physical backup file for long-term safety.
        </p>

        <div style="overflow-x: auto;">
          <table class="table" style="font-size:12px; width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--panel-border);">
                <th style="padding: 8px;">Checkpoint Date & Time</th>
                <th style="padding: 8px;">Checkpoint Label</th>
                <th style="padding: 8px;">Size</th>
                <th style="padding: 8px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="snapshots-table-body">
              <!-- Snapshots list will be rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Database Backup & Restore';
  document.getElementById('page-heading-sub').innerText = 'Export backups, sync between localhost and online, or configure checkpoints';

  lucide.createIcons();

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
        
        const keys = Object.keys(backup);
        if (keys.length === 0 || !keys.some(k => k.startsWith('cyberone_v2_'))) {
          throw new Error('Invalid backup file. Missing Cyberone ledger keys.');
        }

        keys.forEach(key => {
          if (key.startsWith('cyberone_v2_')) {
            localStorage.setItem(key, backup[key]);
            importedCount++;
          }
        });

        appInstance.showToast(`Imported ${importedCount} keys successfully! Reloading...`, 'success');
        
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

  // Auto-backup configuration form setup
  const backupConfig = store.getAutoBackupConfig();
  const enabledSelect = document.getElementById('auto-backup-enabled');
  const freqSelect = document.getElementById('auto-backup-frequency');
  const typeSelect = document.getElementById('auto-backup-type');

  if (enabledSelect && freqSelect && typeSelect) {
    enabledSelect.value = String(backupConfig.enabled);
    freqSelect.value = backupConfig.frequency;
    typeSelect.value = backupConfig.type;
  }

  const formAutoBackup = document.getElementById('form-auto-backup-config');
  if (formAutoBackup) {
    formAutoBackup.addEventListener('submit', (e) => {
      e.preventDefault();
      const enabled = document.getElementById('auto-backup-enabled').value === 'true';
      const frequency = document.getElementById('auto-backup-frequency').value;
      const type = document.getElementById('auto-backup-type').value;
      
      const config = store.getAutoBackupConfig();
      config.enabled = enabled;
      config.frequency = frequency;
      config.type = type;
      
      store.saveAutoBackupConfig(config);
      appInstance.showToast('Automatic backup schedule saved successfully!', 'success');
      
      appInstance.checkScheduledBackup();
    });
  }

  // Create manual checkpoint restore point
  const btnCreateSnapshot = document.getElementById('btn-create-manual-snapshot');
  if (btnCreateSnapshot) {
    btnCreateSnapshot.addEventListener('click', () => {
      const label = prompt("Enter a label/description for this restore checkpoint:", `Manual Checkpoint (${new Date().toLocaleDateString()})`);
      if (label === null) return;
      
      const cleanLabel = label.trim() || `Checkpoint (${new Date().toLocaleDateString()})`;
      const success = store.createLocalSnapshot(cleanLabel);
      
      if (success) {
        appInstance.showToast('Manual restore point checkpoint created!', 'success');
        renderBackupRestore(mountPoint, appInstance);
      } else {
        appInstance.showToast('Failed to create checkpoint.', 'error');
      }
    });
  }

  // Render snapshots list and attach actions
  const snapshots = store.getLocalSnapshots();
  const snapshotsTableBody = document.getElementById('snapshots-table-body');
  if (snapshotsTableBody) {
    if (snapshots.length === 0) {
      snapshotsTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 15px; text-align: center; color: var(--text-muted); font-style: italic;">No checkpoints created yet. Click "Create Checkpoint Now" or configure auto-backups.</td>
        </tr>
      `;
    } else {
      snapshotsTableBody.innerHTML = snapshots.map(snap => {
        const dateStr = new Date(snap.timestamp).toLocaleString();
        let byteSize = 0;
        try {
          byteSize = new Blob([JSON.stringify(snap.data)]).size;
        } catch(e) {
          byteSize = 12288;
        }
        const sizeStr = (byteSize / 1024).toFixed(1) + ' KB';
        
        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 8px; color: #fff; font-weight: 500;">${dateStr}</td>
            <td style="padding: 8px; color: var(--text-muted);">${snap.label}</td>
            <td style="padding: 8px; color: var(--text-muted);">${sizeStr}</td>
            <td style="padding: 8px; text-align: right;">
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-xs btn-primary btn-restore-snap" data-ts="${snap.timestamp}" style="padding: 2px 8px; font-size: 11px;">Restore</button>
                <button class="btn btn-xs btn-danger btn-delete-snap" data-ts="${snap.timestamp}" style="padding: 2px 8px; font-size: 11px; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.3); color: #f87171;">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      
      snapshotsTableBody.querySelectorAll('.btn-restore-snap').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const ts = btn.getAttribute('data-ts');
          const snap = snapshots.find(s => s.timestamp === ts);
          if (!snap) return;
          
          const confirmRestore = confirm(`Are you sure you want to restore the database to checkpoint "${snap.label}" from ${new Date(snap.timestamp).toLocaleString()}?\n\nWARNING: All transactions and settings entered after this checkpoint will be replaced!`);
          if (confirmRestore) {
            const success = store.restoreFromSnapshot(ts);
            if (success) {
              appInstance.showToast('Database restored successfully! Reloading portal...', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              appInstance.showToast('Failed to restore checkpoint.', 'error');
            }
          }
        });
      });
      
      snapshotsTableBody.querySelectorAll('.btn-delete-snap').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const ts = btn.getAttribute('data-ts');
          const snap = snapshots.find(s => s.timestamp === ts);
          if (!snap) return;
          
          if (confirm(`Delete checkpoint "${snap.label}"?`)) {
            store.deleteSnapshot(ts);
            appInstance.showToast('Checkpoint deleted.', 'success');
            renderBackupRestore(mountPoint, appInstance);
          }
        });
      });
    }
  }
}
