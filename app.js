/* ==========================================================================
   CYBERONE Center Management Platform - SPA Router & Layout (app.js)
   ========================================================================== */

import { auth } from './auth.js';
import { store, getTodayDateString } from './store.js';
import { firebaseService, DEFAULT_FIREBASE_CONFIG } from './firebase.js';


// Import View Modules
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderApplications } from './views/applications.js';
import { renderAccounts } from './views/accounts.js';
import { renderCustomers } from './views/customers.js';
import { renderInventory } from './views/inventory.js';
import { renderPayroll } from './views/payroll.js';
import { renderSettings } from './views/settings.js';
import { renderInvoices } from './views/invoices.js';
import { renderReports } from './views/reports.js';
import { renderUserManagement } from './views/users.js';
import { renderAEPS } from './views/aeps.js';
import { renderAuditLog } from './views/audit.js';
import { renderBackupRestore } from './views/backup.js';
import { renderWebsites } from './views/websites.js';


// Route configurations and permission keys
const ROUTES = {
  '#login': { render: renderLogin, public: true },
  '#dashboard': { render: renderDashboard, permission: 'manage_ledger' }, // Base landing
  '#transactions': { render: renderTransactions, permission: 'manage_ledger' },
  '#websites': { render: renderWebsites, permission: 'manage_applications' },
  '#applications': { render: renderApplications, permission: 'manage_applications' },
  '#invoices': { render: renderInvoices, permission: 'manage_ledger' },
  '#accounts': { render: renderAccounts, permission: 'manage_accounts' },
  '#customers': { render: renderCustomers, permission: 'manage_customers' },
  '#inventory': { render: renderInventory, permission: 'manage_inventory' },
  '#payroll': { render: renderPayroll, permission: 'manage_payroll' },
  '#reports': { render: renderReports, permission: 'manage_ledger' },
  '#users': { render: renderUserManagement, permission: 'manage_settings' },
  '#settings': { render: renderSettings, permission: 'manage_settings' },
  '#aeps': { render: renderAEPS, permission: 'manage_accounts' },
  '#audit-log': { render: renderAuditLog, permission: 'manage_settings' },
  '#backup': { render: renderBackupRestore, permission: 'manage_settings' }
};

class Application {
  constructor() {
    this.root = document.getElementById('app-root');
    this.activeRoute = null;
    this.needsUIRefresh = false;
    this.lastPollTime = 0;
    this._viewDates = {};
    this.init();
  }

  async init() {
    // Hide initial loading screen
    const loadingScreen = document.getElementById('app-loading');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    // Load saved theme on boot
    const savedTheme = localStorage.getItem('cyberone_v2_theme') || 'cyberone';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Load sidebar collapse state
    const isCollapsed = localStorage.getItem('cyberone_v2_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    }

    // Initialize active date to today's date on first session load
    if (!sessionStorage.getItem('cyberone_session_active')) {
      localStorage.setItem('cyberone_v2_active_date', getTodayDateString());
      sessionStorage.setItem('cyberone_session_active', 'true');
    }

    // Listen to store sync status changes to update the visual badge
    store.onSyncStatusChange((status) => {
      this.updateSyncBadge(status);
    });

    // Load database from local server db.json relative location on boot
    await this.loadDatabase();

    // Initialize Firebase configuration if not already present
    let firebaseConfig = localStorage.getItem('cyberone_v2_firebase_config');
    if (!firebaseConfig) {
      firebaseConfig = JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
      localStorage.setItem('cyberone_v2_firebase_config', firebaseConfig);
    }

    if (firebaseConfig) {
      firebaseService.initialize(firebaseConfig);
      
      const isDesktop = !/Mobi|Android|iPhone/i.test(navigator.userAgent);
      if (isDesktop && store.justMigratedCenterCode) {
        console.log("Migration: Force-uploading local database from Desktop PC to Firebase on first migration");
        store.justMigratedCenterCode = false; // Reset flag
        
        // Compile and force save local data to Firebase
        const payload = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cyberone_v2_')) {
            if ([
              'cyberone_v2_current_user',
              'cyberone_v2_active_date',
              'cyberone_v2_sidebar_collapsed',
              'cyberone_v2_last_sync_date',
              'cyberone_v2_local_snapshots',
              'cyberone_v2_firebase_config',
              'cyberone_v2_github_token',
              'cyberone_v2_github_repo',
              'cyberone_v2_github_branch'
            ].includes(key)) {
              continue;
            }
            payload[key] = localStorage.getItem(key);
          }
        }
        const users = localStorage.getItem('cyberone_v2_users');
        if (users) {
          payload['cyberone_v2_users'] = users;
        }
        
        // Set last modified to now so it's newer than any Android syncs
        payload['cyberone_v2_last_modified'] = new Date().toISOString();
        localStorage.setItem('cyberone_v2_last_modified', payload['cyberone_v2_last_modified']);
        
        firebaseService.saveData(store.centerProfile.code, payload)
          .then(success => {
            if (success) {
              console.log("Migration: Local database state successfully uploaded and synced to Firebase!");
              store.setSyncStatus('synced');
            } else {
              console.error("Migration: Failed to upload data to Firebase");
            }
            this.setupFirebaseSubscription();
          });
      } else {
        this.setupFirebaseSubscription();
      }
    }

    // Trigger scheduled backup check
    this.checkScheduledBackup();
    setInterval(() => this.checkScheduledBackup(), 60000);

    // Live database polling (syncs like a Google Sheet)
    setInterval(() => {
      // Skip polling if Firebase Realtime Sync is active
      if (firebaseService.isInitialized()) return;
      
      // Skip if tab is hidden
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      const lastPoll = this.lastPollTime || 0;
      const pollInterval = 30000; // Poll local server every 30s

      if (now - lastPoll >= pollInterval) {
        this.lastPollTime = now;
        console.log("Live-polling latest data from local server...");
        this.loadDatabase();
      }
    }, 1000);

    // Setup global listeners to refresh UI safely after user interaction ends
    document.addEventListener('focusout', () => {
      setTimeout(() => {
        if (this.needsUIRefresh && !this.isUserInteracting()) {
          if (this.activeRoute === '#accounts' || this.activeRoute === '#settings') {
            console.log("On accounts or settings page, deferring UI reload to prevent resetting input fields.");
            return;
          }
          console.log("User finished interaction. Triggering pending UI reload.");
          this.needsUIRefresh = false;
          this.handleRouting();
        }
      }, 100);
    });

    document.addEventListener('click', () => {
      setTimeout(() => {
        if (this.needsUIRefresh && !this.isUserInteracting()) {
          if (this.activeRoute === '#accounts' || this.activeRoute === '#settings') {
            console.log("On accounts or settings page, deferring UI reload to prevent resetting input fields.");
            return;
          }
          console.log("User finished clicking. Triggering pending UI reload.");
          this.needsUIRefresh = false;
          this.handleRouting();
        }
      }, 150);
    });

    // Bind hash change listener
    window.addEventListener('hashchange', () => this.handleRouting());

    // Trigger initial route load
    this.handleRouting();

    // Check for updates asynchronously
    this.checkForUpdates();
  }

  setupFirebaseSubscription() {
    if (firebaseService.isInitialized()) {
      console.log(`Firebase: Registering real-time subscription for center: ${store.centerProfile.code}`);
      firebaseService.subscribe(store.centerProfile.code, (remoteData) => {
        if (remoteData) {
          console.log("Firebase: Received database update from remote cloud");
          store.setSyncStatus('synced');
          const remoteLastModified = remoteData['cyberone_v2_last_modified'] || '';
          const localLastModified = localStorage.getItem('cyberone_v2_last_modified') || '';
          
          let remoteIsOlder = false;
          if (localLastModified && remoteLastModified && new Date(localLastModified) > new Date(remoteLastModified)) {
            remoteIsOlder = true;
          }
          
          const updated = this.mergeSyncData(remoteData, remoteIsOlder);
          if (updated) {
            console.log("Firebase: Merging remote changes to local store and refreshing UI");
            store.loadState();
            auth.reloadUsers();
            
            // Also write to local server disk if running on localhost
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocalhost) {
              store.syncDatabaseState();
            }
            
            if (this.isUserInteracting() || this.activeRoute === '#accounts' || this.activeRoute === '#settings') {
              this.needsUIRefresh = true;
            } else {
              this.needsUIRefresh = false;
              this.handleRouting();
            }
          }
        }
      });
    }
  }

  async checkForUpdates() {
    const currentVersion = '3.0.7';
    try {
      const response = await fetch('https://api.github.com/repos/cyberonecsc/ledger/releases/latest');
      if (response.ok) {
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        
        // Simple version comparison (e.g. "3.0.4" vs "3.0.3")
        if (latestVersion !== currentVersion) {
          console.log(`Update checker: New version available: v${latestVersion}`);
          this.showUpdateBanner(latestVersion, data.html_url);
        }
      }
    } catch (e) {
      console.warn("Update checker: Failed to look up latest release:", e);
    }
  }

  showUpdateBanner(version, releaseUrl) {
    if (document.getElementById('app-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'app-update-banner';
    banner.style.cssText = `
      background: linear-gradient(135deg, var(--color-primary), #059669);
      color: #fff;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-radius: var(--border-radius-sm);
      margin: 12px 16px 0 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: var(--font-primary);
      animation: slideDown 0.3s ease-out;
    `;
    
    if (!document.getElementById('style-update-banner')) {
      const style = document.createElement('style');
      style.id = 'style-update-banner';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i data-lucide="info" style="width:16px; height:16px;"></i>
        <span>New Update Available! Version <strong>v${version}</strong> is ready.</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="${releaseUrl}" target="_blank" class="btn btn-sm btn-secondary" style="background:rgba(255,255,255,0.2); border:none; padding:4px 10px; font-size:12px; font-weight:700; color:#fff; text-decoration:none; border-radius:4px; transition:0.2s;">
          Get Update
        </a>
        <button id="close-update-banner" style="background:none; border:none; color:#fff; cursor:pointer; padding:2px; display:flex; align-items:center; justify-content:center; opacity:0.8; outline:none;">
          <i data-lucide="x" style="width:14px; height:14px;"></i>
        </button>
      </div>
    `;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      const header = mainContent.querySelector('.main-header');
      if (header) {
        header.insertAdjacentElement('afterend', banner);
        lucide.createIcons();
        
        document.getElementById('close-update-banner').addEventListener('click', () => {
          banner.remove();
        });
      }
    }
  }

  async loadDatabase() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    try {
      let remoteData = null;

      const response = await fetch('./db.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        remoteData = await response.json();
        console.log("Database fetched from relative db.json path");
        store.setSyncStatus(isLocalhost ? 'synced' : 'offline');
      }

      if (remoteData) {
        // Compare remote and local last_modified timestamps
        const remoteLastModified = remoteData['cyberone_v2_last_modified'] || '';
        const localLastModified = localStorage.getItem('cyberone_v2_last_modified') || '';
        
        let remoteIsOlder = false;
        if (localLastModified && remoteLastModified && new Date(localLastModified) > new Date(remoteLastModified)) {
          console.log(`Remote data is stale (${remoteLastModified}) compared to local changes (${localLastModified}). We will do a record-only merge.`);
          remoteIsOlder = true;
        }

        const updated = this.mergeSyncData(remoteData, remoteIsOlder);
        
        if (updated) {
          console.log("LocalStorage updated with local database contents");
          store.loadState();
          auth.reloadUsers(); // Refresh in-memory user list so newly synced accounts work for login
          
          // Sync with local server disk if running on localhost
          if (isLocalhost) {
            store.syncDatabaseState();
          }
          
          // Safeguard active typing/modals before reloading the UI
          if (this.isUserInteracting() || this.activeRoute === '#accounts' || this.activeRoute === '#settings') {
            console.log("Database updated in background, but user is interacting or on Accounts/Settings page. Deferring UI reload.");
            this.needsUIRefresh = true;
          } else {
            console.log("Database updated in background. Triggering UI reload.");
            this.needsUIRefresh = false;
            this.handleRouting();
          }
        }
      }
    } catch (e) {
      console.error("Could not fetch local database:", e);
      store.setSyncStatus('error');
    } finally {
      store.isDatabaseInitialized = true;
    }
  }

  isUserInteracting() {
    // 1. Check if a modal is visible/open
    const openModal = document.querySelector('.modal-backdrop.show');
    if (openModal) return true;

    // 2. Check if user is currently typing in an input, textarea, or selecting options
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.contentEditable === 'true'
    )) {
      return true;
    }

    return false;
  }

  updateSyncBadge(status) {
    const badge = document.getElementById('cloud-sync-badge');
    if (!badge) return;

    badge.className = `sync-badge ${status}`;
    
    let iconName = 'cloud';
    let text = 'Cloud Saved';

    if (status === 'synced') {
      iconName = 'cloud';
      text = 'Cloud Saved';
    } else if (status === 'syncing') {
      iconName = 'refresh-cw';
      text = 'Syncing...';
    } else if (status === 'error') {
      iconName = 'alert-triangle';
      text = 'Sync Error';
    } else if (status === 'offline') {
      iconName = 'cloud-off';
      text = 'Local Mode';
    }

    badge.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${text}</span>
    `;

    lucide.createIcons();
  }

  getActiveDate() {
    if (!this._viewDates) {
      this._viewDates = {};
    }
    const r = this.activeRoute || '#dashboard';
    if (!this._viewDates[r]) {
      this._viewDates[r] = getTodayDateString();
    }
    return this._viewDates[r];
  }

  setActiveDate(dateString) {
    if (!this._viewDates) {
      this._viewDates = {};
    }
    const r = this.activeRoute || '#dashboard';
    this._viewDates[r] = dateString;
    this.showToast(`Selected Date: ${dateString}`, 'info');
    
    // Force re-render of current view to update data
    this.handleRouting();
  }

  handleRouting() {
    this.needsUIRefresh = false;
    let hash = window.location.hash || '#dashboard';

    // Parse query params if any
    let path = hash;
    let queryParams = {};
    if (hash.includes('?')) {
      const parts = hash.split('?');
      path = parts[0];
      const queryStr = parts[1];
      queryStr.split('&').forEach(param => {
        if (!param) return;
        const [key, val] = param.split('=');
        queryParams[key] = decodeURIComponent(val || '');
      });
    }
    
    this.queryParams = queryParams;

    if (path !== '#dashboard') {
      this._dashboardDate = null;
    }

    // Reset date view if navigated to a different route
    const oldRoute = this.activeRoute;
    const pathChanged = (oldRoute !== path);
    if (pathChanged && this._viewDates) {
      delete this._viewDates[path];
    }

    // Route guards
    const route = ROUTES[path];

    if (!route) {
      window.location.hash = '#dashboard';
      return;
    }

    // Auth validation
    const isLoggedIn = !!auth.currentUser;

    if (!isLoggedIn && !route.public) {
      window.location.hash = '#login';
      return;
    }

    if (isLoggedIn && path === '#login') {
      window.location.hash = '#dashboard';
      return;
    }

    // Privilege validation
    if (isLoggedIn && route.permission && !auth.hasPermission(route.permission)) {
      this.renderAccessDenied();
      return;
    }

    this.activeRoute = path;
    this.renderLayout(route.render);
  }

  // Draw core sidebar container if user is authenticated
  renderLayout(contentRenderer) {
    if (this.activeRoute === '#login') {
      this.root.innerHTML = `<div id="login-container"></div>`;
      const mount = document.getElementById('login-container');
      contentRenderer(mount, this);
      return;
    }

    const activeDate = this.getActiveDate();
    const isCollapsed = localStorage.getItem('cyberone_v2_sidebar_collapsed') === 'true';

    // 1. Page Mount Guard - only render layout frame if not already present
    const appContainer = document.getElementById('app-container');
    const pageMount = document.getElementById('page-mount');
    if (appContainer && pageMount) {
      // Update active highlight classes on sidebar items
      const items = appContainer.querySelectorAll('.sidebar-item');
      items.forEach(item => {
        item.classList.remove('active');
      });

      // Update Settings submenu visibility based on active route
      const isSettingsRoute = (this.activeRoute === '#settings' || this.activeRoute === '#users' || this.activeRoute === '#accounts' || this.activeRoute === '#audit-log' || this.activeRoute === '#backup');
      const settingsSubmenu = appContainer.querySelector('.sidebar-item.has-submenu');
      if (settingsSubmenu) {
        if (isSettingsRoute) {
          settingsSubmenu.classList.add('active', 'expanded');
          const list = settingsSubmenu.querySelector('.submenu-list');
          if (list) list.style.display = 'block';
          const arrow = settingsSubmenu.querySelector('.submenu-arrow');
          if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
          settingsSubmenu.classList.remove('active', 'expanded');
          const list = settingsSubmenu.querySelector('.submenu-list');
          if (list) list.style.display = 'none';
          const arrow = settingsSubmenu.querySelector('.submenu-arrow');
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
      }

      // Find the specific item matching activeRoute and set active
      const matchingLink = appContainer.querySelector(`.sidebar-item a[href="${this.activeRoute}"]`);
      if (matchingLink) {
        const li = matchingLink.closest('.sidebar-item');
        if (li) li.classList.add('active');
      }

      // Update date picker value
      const datePicker = document.getElementById('global-date-picker');
      if (datePicker) {
        datePicker.value = activeDate;
      }

      // Mount view inside mount point
      const mountPoint = document.getElementById('page-mount');
      if (mountPoint) {
        mountPoint.innerHTML = '';
        contentRenderer(mountPoint, this);
      }

      lucide.createIcons();
      return;
    }

    // Core layout container (first load only)
    this.root.innerHTML = `
      <div id="app-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
          <div class="sidebar-logo" style="display:flex; align-items:center; gap:10px; position:relative;">
            <img id="sidebar-logo-img" src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" alt="logo" style="width:28px; height:28px; object-fit:contain; background:#ffffff; border-radius:4px; padding:2px;" onerror="this.style.display='none';">
            <h1>CYBERONE CSC</h1>
            <button id="sidebar-toggle" style="position: absolute; right: -12px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 50%; background: var(--color-primary); border: 1px solid var(--panel-border); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.5); outline:none; transition: var(--transition-smooth);">
              <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-left'}" style="width: 12px; height: 12px;"></i>
            </button>
          </div>
          <ul class="sidebar-menu">
            <li class="sidebar-item ${this.activeRoute === '#dashboard' ? 'active' : ''}">
              <a href="#dashboard"><i data-lucide="layout-dashboard" style="width: 18px; height: 18px;"></i><span>Dashboard</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#transactions' ? 'active' : ''}">
              <a href="#transactions"><i data-lucide="receipt" style="width: 18px; height: 18px;"></i><span>Transactions</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#websites' ? 'active' : ''}">
              <a href="#websites"><i data-lucide="globe" style="width: 18px; height: 18px;"></i><span>Important Websites</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#invoices' ? 'active' : ''}">
              <a href="#invoices"><i data-lucide="printer" style="width: 18px; height: 18px;"></i><span>Invoices</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#applications' ? 'active' : ''}">
              <a href="#applications"><i data-lucide="file-text" style="width: 18px; height: 18px;"></i><span>Applications</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#aeps' ? 'active' : ''}">
              <a href="#aeps"><i data-lucide="send" style="width: 18px; height: 18px;"></i><span>AEPS & Transfer</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#customers' ? 'active' : ''}">
              <a href="#customers"><i data-lucide="users" style="width: 18px; height: 18px;"></i><span>Customers</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#inventory' ? 'active' : ''}">
              <a href="#inventory"><i data-lucide="package" style="width: 18px; height: 18px;"></i><span>Inventory</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#payroll' ? 'active' : ''}">
              <a href="#payroll"><i data-lucide="landmark" style="width: 18px; height: 18px;"></i><span>Payroll</span></a>
            </li>
            <li class="sidebar-item ${this.activeRoute === '#reports' ? 'active' : ''}">
              <a href="#reports"><i data-lucide="bar-chart-3" style="width: 18px; height: 18px;"></i><span>Reports</span></a>
            </li>
          </ul>
          
          <div class="sidebar-footer">
            <div class="user-profile">
              ${auth.currentUser.photo ? `
                <img src="${auth.currentUser.photo}" alt="Avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--color-primary); box-shadow: 0 0 8px var(--color-primary-glow);">
              ` : `
                <div class="avatar">${auth.currentUser.name.charAt(0)}</div>
              `}
              <div class="user-details">
                <span class="user-name">${auth.currentUser.name}</span>
                <span class="user-role">${auth.currentUser.role}</span>
              </div>
            </div>
            
            <ul class="sidebar-menu" style="margin: 10px 0 0 0; padding: 0;">
              <li class="sidebar-item has-submenu ${(this.activeRoute === '#settings' || this.activeRoute === '#users' || this.activeRoute === '#accounts' || this.activeRoute === '#audit-log' || this.activeRoute === '#backup') ? 'active expanded' : ''}">
                <a href="javascript:void(0);" class="submenu-toggle" style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
                    <span>Settings</span>
                  </span>
                  <i data-lucide="chevron-down" class="submenu-arrow" style="width: 14px; height: 14px; transition: transform 0.2s; transform: ${(this.activeRoute === '#settings' || this.activeRoute === '#users' || this.activeRoute === '#accounts' || this.activeRoute === '#audit-log' || this.activeRoute === '#backup') ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
                </a>
                <ul class="submenu-list" style="display: ${(this.activeRoute === '#settings' || this.activeRoute === '#users' || this.activeRoute === '#accounts' || this.activeRoute === '#audit-log' || this.activeRoute === '#backup') ? 'block' : 'none'}; padding-left: 20px; list-style: none; margin-top: 4px;">
                  <li class="sidebar-item ${this.activeRoute === '#settings' ? 'active' : ''}">
                    <a href="#settings" style="padding: 6px 12px; font-size: 13px;"><i data-lucide="sliders" style="width: 14px; height: 14px;"></i><span>General</span></a>
                  </li>
                  <li class="sidebar-item ${this.activeRoute === '#users' ? 'active' : ''}">
                    <a href="#users" style="padding: 6px 12px; font-size: 13px;"><i data-lucide="shield-check" style="width: 14px; height: 14px;"></i><span>User Management</span></a>
                  </li>
                  <li class="sidebar-item ${this.activeRoute === '#accounts' ? 'active' : ''}">
                    <a href="#accounts" style="padding: 6px 12px; font-size: 13px;"><i data-lucide="wallet" style="width: 14px; height: 14px;"></i><span>Account Management</span></a>
                  </li>
                  <li class="sidebar-item ${this.activeRoute === '#backup' ? 'active' : ''}">
                    <a href="#backup" style="padding: 6px 12px; font-size: 13px;"><i data-lucide="database" style="width: 14px; height: 14px;"></i><span>Backup & Restore</span></a>
                  </li>
                  <li class="sidebar-item ${this.activeRoute === '#audit-log' ? 'active' : ''}">
                    <a href="#audit-log" style="padding: 6px 12px; font-size: 13px;"><i data-lucide="history" style="width: 14px; height: 14px;"></i><span>Audit Log</span></a>
                  </li>
                </ul>
              </li>
            </ul>

            <button id="sidebar-logout" class="btn-logout" style="margin-top: 15px;">
              <i data-lucide="log-out" style="width: 14px; height: 14px;"></i><span>Logout</span>
            </button>
            <div class="sidebar-version" style="text-align: center; font-size: 10px; color: var(--text-muted); margin-top: 20px; font-family: var(--font-primary); padding: 0 10px; line-height: 1.5; transition: var(--transition-smooth);">
              <div>v3.0.7</div>
              <div style="margin-top: 8px; font-weight: 600; letter-spacing: 0.5px;">© ${new Date().getFullYear()} XTREME SYSTEMS</div>
              <div style="font-size: 8px; opacity: 0.7; margin-top: 2px;">Site Maintained by XTREME SYSTEMS</div>
            </div>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="main-content">
          <!-- Main Top Header -->
          <header class="main-header">
            <div style="display:flex; align-items:center; gap:12px;">
              <button id="mobile-menu-toggle" class="mobile-only-flex" style="display: none; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--panel-border); border-radius: var(--border-radius-sm); color: #fff; width: 34px; height: 34px; align-items: center; justify-content: center; cursor: pointer; outline: none; transition: var(--transition-smooth); margin-right: 4px;">
                <i data-lucide="menu" style="width: 18px; height: 18px;"></i>
              </button>
              <img id="header-logo-img" src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" alt="logo" style="width:38px; height:38px; object-fit:contain; background:#ffffff; border-radius:4px; padding:2px;" onerror="this.style.display='none';">
              <div class="page-title">
                <h2 id="page-heading-title">CYBERONE CSC</h2>
                <p id="page-heading-sub">Operations & Ledger Management</p>
              </div>
            </div>
            <div class="header-actions" style="display:flex; align-items:center; gap:12px;">
                <!-- Cloud Sync Status Badge -->
              <div id="cloud-sync-badge" class="sync-badge offline">
                <i data-lucide="cloud-off"></i>
                <span>Local Mode</span>
              </div>
              
              <!-- Live Header Clock -->
              <div class="header-clock" style="display:flex; flex-direction:column; align-items:flex-end; justify-content:center; background:var(--datepicker-bg); border:1px solid var(--panel-border); padding:4px 12px; border-radius:var(--border-radius-sm); user-select:none; -webkit-user-select:none;">
                <span id="header-clock-time" style="font-family: 'Outfit', 'Inter', monospace; color: var(--color-primary); font-weight:800; font-size:15px; letter-spacing:0.5px; line-height:1.2;"></span>
                <span id="header-clock-date" style="color: #fff; font-size:13px; font-weight:700; margin-top:2px; line-height:1.2;"></span>
              </div>
            </div>
          </header>

          <!-- Dynamic Page Content -->
          <div id="page-mount"></div>
        </main>
      </div>
    `;

    // Initialize Sidebar Event Handlers
    document.getElementById('sidebar-logout').addEventListener('click', () => {
      auth.logout();
      this.showToast('Logged out successfully', 'success');
      window.location.hash = '#login';
    });

    // Collapsible sidebar toggle click
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsedNow = document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('cyberone_v2_sidebar_collapsed', isCollapsedNow);
        
        // Refresh the toggle button icon
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', isCollapsedNow ? 'chevron-right' : 'chevron-left');
        }
        lucide.createIcons();
      });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('cyberone_v2_theme') || 'cyberone';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Submenu expanding toggle
    const submenuToggle = this.root.querySelector('.submenu-toggle');
    if (submenuToggle) {
      submenuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const parent = submenuToggle.parentElement;
        const submenuList = parent.querySelector('.submenu-list');
        const arrow = submenuToggle.querySelector('.submenu-arrow');
        const isExpanded = parent.classList.toggle('expanded');
        
        if (submenuList) {
          submenuList.style.display = isExpanded ? 'block' : 'none';
        }
        if (arrow) {
          arrow.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    // Mobile sidebar toggle click
    const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (mobileToggleBtn && sidebar) {
      mobileToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
      });
      
      // Close sidebar if user clicks outside of it
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }



    // Live ticking clock handler for the header
    const updateHeaderClock = () => {
      const timeEl = document.getElementById('header-clock-time');
      const dateEl = document.getElementById('header-clock-date');
      if (!timeEl || !dateEl) return;
      
      const now = new Date();
      timeEl.innerText = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      dateEl.innerText = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };
    updateHeaderClock();
    if (window.headerClockInterval) clearInterval(window.headerClockInterval);
    window.headerClockInterval = setInterval(updateHeaderClock, 1000);

    // Mount page view
    const mountPoint = document.getElementById('page-mount');
    contentRenderer(mountPoint, this);

    // Dynamic icon replacement
    lucide.createIcons();
    this.updateSyncBadge(store.syncStatus);
  }

  // Display clean unauthorized layout page
  renderAccessDenied() {
    this.root.innerHTML = `
      <div id="app-container">
        <!-- Re-use sidebar for clean navigation out of this page -->
        <aside class="sidebar">
          <div class="sidebar-logo">
            <i data-lucide="shield-check" style="width: 24px; height: 24px;"></i>
            <h1>CYBER ONE Portal</h1>
          </div>
          <ul class="sidebar-menu">
            <li class="sidebar-item"><a href="#dashboard"><i data-lucide="layout-dashboard" style="width: 18px; height: 18px;"></i>Dashboard</a></li>
          </ul>
          <div class="sidebar-footer">
            <button id="sidebar-logout" class="btn-logout"><i data-lucide="log-out" style="width: 14px; height: 14px;"></i>Logout</button>
          </div>
        </aside>
        <main class="main-content" style="align-items: center; justify-content: center; text-align: center;">
          <div class="glass-card danger" style="max-width: 450px; padding: 40px;">
            <i data-lucide="shield-alert" style="width: 60px; height: 60px; color: var(--color-danger); margin-bottom: 20px;"></i>
            <h3 style="font-family: var(--font-display); font-size: 22px; margin-bottom: 10px;">Access Denied</h3>
            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 25px;">
              Your user account role (<strong>${auth.currentUser.role}</strong>) does not have privileges to view this section.
            </p>
            <a href="#dashboard" class="btn btn-primary">Return to Dashboard</a>
          </div>
        </main>
      </div>
    `;

    document.getElementById('sidebar-logout').addEventListener('click', () => {
      auth.logout();
      window.location.hash = '#login';
    });

    lucide.createIcons();
  }

  // Global helper for user alert messages (toast notifications)
  showToast(message, type = 'success') {
    // Remove existing toast if any
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-container';
    toast.className = `toast-notification ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'x-circle';
    if (type === 'warning') icon = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 18px; height: 18px;"></i>
      <span style="font-size: 13px; font-weight: 500;">${message}</span>
    `;

    document.body.appendChild(toast);
    lucide.createIcons();

    // Trigger reflow to run animation
    setTimeout(() => toast.classList.add('show'), 50);

    // Dismiss after 3.5s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Download HTML element as PDF using html2pdf.js loaded from CDN
  downloadElementAsPDF(elementId, filename, isThermal) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Save original button content
    const btn = document.activeElement;
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span style="font-size:11px;">Generating PDF...</span>';

    const triggerDownload = () => {
      const opt = {
        margin:       isThermal ? 2 : 10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        isThermal 
          ? { unit: 'mm', format: [80, 220], orientation: 'portrait' } 
          : { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save().then(() => {
        if (btn) btn.innerHTML = originalHtml;
      }).catch(err => {
        console.error(err);
        if (btn) btn.innerHTML = originalHtml;
        this.showToast('Failed to generate PDF download.', 'error');
      });
    };

    if (window.html2pdf) {
      triggerDownload();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = triggerDownload;
      script.onerror = () => {
        if (btn) btn.innerHTML = originalHtml;
        this.showToast('Could not load PDF library from CDN. Check connection.', 'error');
      };
      document.head.appendChild(script);
    }
  }

  // Print element with thermal or normal layout classes added to body
  printElement(format) {
    const bodyClass = `print-${format}`;
    
    const cleanUp = () => {
      document.body.classList.remove('printing-active', 'print-normal', 'print-thermal');
      window.removeEventListener('afterprint', cleanUp);
    };
    
    window.addEventListener('afterprint', cleanUp);
    document.body.classList.add('printing-active', bodyClass);
    
    window.print();
    
    // Fallback cleanup
    setTimeout(cleanUp, 1000);
  }

  mergeSyncData(remoteBackup, remoteIsOlder = false) {
    let changed = false;
    
    // 1. Merge activity logs first to collect deleted/tombstone entity IDs
    let mergedAct = [];
    const actKey = 'cyberone_v2_activity_logs';
    if (remoteBackup[actKey]) {
      try {
        const localRaw = localStorage.getItem(actKey);
        const remoteRaw = remoteBackup[actKey];
        const localAct = JSON.parse(localRaw || '[]');
        const remoteAct = JSON.parse(remoteRaw || '[]');
        const actMap = new Map();
        remoteAct.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
        localAct.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
        mergedAct = Array.from(actMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (JSON.stringify(localAct) !== JSON.stringify(mergedAct)) {
          localStorage.setItem(actKey, JSON.stringify(mergedAct));
          changed = true;
        }
      } catch (e) {
        console.error("Failed to merge activity logs in pre-pass", e);
      }
    } else {
      try {
        mergedAct = JSON.parse(localStorage.getItem(actKey) || '[]');
      } catch (e) {}
    }

    const deletedCustomerIds = new Set();
    const deletedProductIds = new Set();
    const deletedTransactionIds = new Set();
    const deletedApplicationIds = new Set();
    mergedAct.forEach(log => {
      if (log && log.details) {
        if (log.action === 'Delete Customer') {
          const match = log.details.match(/Deleted registered customer ([^:]+):/);
          if (match) deletedCustomerIds.add(match[1]);
        } else if (log.action === 'Delete Product') {
          const match = log.details.match(/Deleted inventory item ([^:]+):/);
          if (match) deletedProductIds.add(match[1]);
        } else if (log.action === 'Delete Application') {
          const match = log.details.match(/Deleted application log ([^\s]+) for/);
          if (match) deletedApplicationIds.add(match[1]);
        } else if (log.action && log.action.startsWith('Delete ')) {
          const match = log.details.match(/Deleted transaction ([^:]+):/);
          if (match) deletedTransactionIds.add(match[1]);
        }
      }
    });

    const keys = Object.keys(remoteBackup);
    keys.forEach(key => {
      if (key.startsWith('cyberone_v2_')) {
        if ([
          'cyberone_v2_current_user',
          'cyberone_v2_active_date',
          'cyberone_v2_sidebar_collapsed',
          'cyberone_v2_last_sync_date',
          'cyberone_v2_local_snapshots'
        ].includes(key)) {
          return;
        }
        const isRecordKey = [
          'cyberone_v2_daily_logs',
          'cyberone_v2_activity_logs',
          'cyberone_v2_customers',
          'cyberone_v2_products',
          'cyberone_v2_applications'
        ].includes(key);

        if (remoteIsOlder && !isRecordKey) {
          // Skip settings, configuration, and other simple state keys if remote data is older than local data
          return;
        }

        const localRaw = localStorage.getItem(key);
        let remoteRaw = remoteBackup[key];
        
        if (key === 'cyberone_v2_github_token') {
          remoteRaw = deobfuscateToken(remoteRaw);
          // If remote token is empty and local token is valid, skip to prevent overwriting
          if (!remoteRaw && localRaw) return;
        }
        
        if (!localRaw || localRaw === '[]' || localRaw === '{}') {
          if (localRaw !== remoteRaw) {
            localStorage.setItem(key, remoteRaw);
            changed = true;
          }
          return;
        }
        
        if (key === 'cyberone_v2_daily_logs') {
          try {
            const localLogs = JSON.parse(localRaw || '{}');
            const remoteLogs = JSON.parse(remoteRaw || '{}');
            let logChanged = false;
            const mergedLogs = { ...remoteLogs, ...localLogs };
            
            Object.keys(mergedLogs).forEach(date => {
              // Delete daily log keys before June 1st
              if (date.startsWith('2026-05-') || date < '2026-06-01') {
                delete mergedLogs[date];
                logChanged = true;
                return;
              }
              const localTxns = (localLogs[date] && localLogs[date].transactions) || [];
              const remoteTxns = (remoteLogs[date] && remoteLogs[date].transactions) || [];
              const txnMap = new Map();
              
              if (remoteIsOlder) {
                remoteTxns.forEach(t => {
                  if (t && t.id && !deletedTransactionIds.has(t.id)) {
                    txnMap.set(t.id, t);
                  }
                });
                localTxns.forEach(t => {
                  if (t && t.id && !deletedTransactionIds.has(t.id)) {
                    txnMap.set(t.id, t);
                  }
                });
              } else {
                localTxns.forEach(t => {
                  if (t && t.id && !deletedTransactionIds.has(t.id)) {
                    txnMap.set(t.id, t);
                  }
                });
                remoteTxns.forEach(t => {
                  if (t && t.id && !deletedTransactionIds.has(t.id)) {
                    txnMap.set(t.id, t);
                  }
                });
              }
              
              const mergedTxns = Array.from(txnMap.values());
              if (mergedLogs[date]) {
                const currentTxns = mergedLogs[date].transactions || [];
                if (JSON.stringify(currentTxns) !== JSON.stringify(mergedTxns)) {
                  mergedLogs[date].transactions = mergedTxns;
                  logChanged = true;
                }
              }
            });
            
            if (logChanged || JSON.stringify(localLogs) !== JSON.stringify(mergedLogs)) {
              localStorage.setItem(key, JSON.stringify(mergedLogs));
              changed = true;
            }
          } catch (e) {
            console.error("Failed to merge daily logs", e);
            if (localRaw !== remoteRaw) {
              localStorage.setItem(key, remoteRaw);
              changed = true;
            }
          }
        } else if (key === 'cyberone_v2_opening_overrides') {
          try {
            const localData = JSON.parse(localRaw || '{}');
            const remoteData = JSON.parse(remoteRaw || '{}');
            const mergedObj = remoteIsOlder ? { ...remoteData, ...localData } : { ...localData, ...remoteData };
            let overrideChanged = false;
            Object.keys(mergedObj).forEach(date => {
              if (date.startsWith('2026-05-') || date < '2026-06-03') {
                delete mergedObj[date];
                overrideChanged = true;
              }
            });
            if (JSON.stringify(localData) !== JSON.stringify(mergedObj) || overrideChanged) {
              localStorage.setItem(key, JSON.stringify(mergedObj));
              changed = true;
            }
          } catch (e) {
            console.error("Failed to merge opening overrides", e);
          }
        } else if (key === 'cyberone_v2_closing_overrides') {
          try {
            const localData = JSON.parse(localRaw || '{}');
            const remoteData = JSON.parse(remoteRaw || '{}');
            const mergedObj = remoteIsOlder ? { ...remoteData, ...localData } : { ...localData, ...remoteData };
            let overrideChanged = false;
            Object.keys(mergedObj).forEach(date => {
              if (date !== '2026-05-31' && (date.startsWith('2026-05-') || date < '2026-06-03')) {
                delete mergedObj[date];
                overrideChanged = true;
              }
            });
            if (JSON.stringify(localData) !== JSON.stringify(mergedObj) || overrideChanged) {
              localStorage.setItem(key, JSON.stringify(mergedObj));
              changed = true;
            }
          } catch (e) {
            console.error("Failed to merge closing overrides", e);
          }
        } else if (key === 'cyberone_v2_activity_logs') {
          // Already merged in the pre-pass
        } else {
          try {
            const localData = JSON.parse(localRaw);
            const remoteData = JSON.parse(remoteRaw);
            
            if (Array.isArray(localData) && Array.isArray(remoteData)) {
              // Determine unique key property (defaults to 'id', or 'username' if objects have it)
              const keyProp = (localData.length > 0 && localData[0] && localData[0].username) ? 'username' : 'id';
              const map = new Map();
              localData.forEach(item => {
                if (item) {
                  const k = item[keyProp] || item.id;
                  if (k) {
                    if (key === 'cyberone_v2_customers' && deletedCustomerIds.has(k)) return;
                    if (key === 'cyberone_v2_products' && deletedProductIds.has(k)) return;
                    if (key === 'cyberone_v2_applications' && deletedApplicationIds.has(k)) return;
                    map.set(k, item);
                  }
                }
              });
              remoteData.forEach(item => {
                if (item) {
                  const k = item[keyProp] || item.id;
                  if (k) {
                    if (key === 'cyberone_v2_customers' && deletedCustomerIds.has(k)) return;
                    if (key === 'cyberone_v2_products' && deletedProductIds.has(k)) return;
                    if (key === 'cyberone_v2_applications' && deletedApplicationIds.has(k)) return;
                    const existing = map.get(k);
                    map.set(k, existing ? (remoteIsOlder ? { ...item, ...existing } : { ...existing, ...item }) : item);
                  }
                }
              });
              const mergedArr = Array.from(map.values());
              if (JSON.stringify(localData) !== JSON.stringify(mergedArr)) {
                localStorage.setItem(key, JSON.stringify(mergedArr));
                changed = true;
              }
            } else if (localData && typeof localData === 'object' && remoteData && typeof remoteData === 'object') {
              const mergedObj = remoteIsOlder ? { ...remoteData, ...localData } : { ...localData, ...remoteData };
              if (JSON.stringify(localData) !== JSON.stringify(mergedObj)) {
                localStorage.setItem(key, JSON.stringify(mergedObj));
                changed = true;
              }
            } else {
              if (localRaw !== remoteRaw) {
                localStorage.setItem(key, remoteRaw);
                changed = true;
              }
            }
          } catch(e) {
            console.error("Failed to merge key " + key, e);
            if (localRaw !== remoteRaw) {
              localStorage.setItem(key, remoteRaw);
              changed = true;
            }
          }
        }
      }
    });
    return changed;
  }

  async syncDatabase() {
    this.showToast('Initiating database synchronization...', 'info');

    try {
      let token = localStorage.getItem('cyberone_v2_github_token');
      if (!token) {
        token = deobfuscateToken('bm93Zms6P4Fxe2pKSzteOFZRTmFNgVNpP055bX5NV09vXjo+d3lzag==');
        localStorage.setItem('cyberone_v2_github_token', token);
      }
      const repo = localStorage.getItem('cyberone_v2_github_repo') || 'cyberonecsc/ledger';
      const branch = localStorage.getItem('cyberone_v2_github_branch') || 'main';

      const url = `https://api.github.com/repos/${repo}/contents/db.json?ref=${branch}&t=${Date.now()}`;
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let githubData = null;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const fileData = await response.json();
        let base64Content = fileData.content || "";
        
        if (!base64Content && fileData.sha) {
          console.log(`Sync: db.json exceeds 1 MB. Fetching via Git Data Blobs API (SHA: ${fileData.sha})...`);
          const blobUrl = `https://api.github.com/repos/${repo}/git/blobs/${fileData.sha}`;
          const blobRes = await fetch(blobUrl, { headers });
          if (blobRes.ok) {
            const blobData = await blobRes.json();
            base64Content = blobData.content || "";
          } else {
            throw new Error(`Git Data Blobs API fetch failed: ${blobRes.status}`);
          }
        }

        if (base64Content) {
          const cleanBase64 = base64Content.replace(/\s/g, '');
          const decoded = decodeURIComponent(escape(atob(cleanBase64)));
          githubData = JSON.parse(decoded);
          console.log("Sync: Fetched latest data from GitHub REST API");
        } else {
          throw new Error("Could not retrieve contents for db.json from GitHub REST API");
        }
      } else {
        throw new Error(`GitHub fetch failed: ${response.status}`);
      }

      let localServerData = null;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        try {
          const localRes = await fetch('./db.json?t=' + Date.now(), { cache: 'no-store' });
          if (localRes.ok) {
            localServerData = await localRes.json();
            console.log("Sync: Fetched latest data from local server disk");
          }
        } catch (e) {
          console.warn("Sync: Could not fetch local server db.json:", e);
        }
      }

      let changed = false;
      if (githubData) {
        changed = this.mergeSyncData(githubData) || changed;
      }
      if (localServerData) {
        changed = this.mergeSyncData(localServerData) || changed;
      }

      localStorage.setItem('cyberone_v2_last_modified', new Date().toISOString());

      if (isLocal) {
        const payload = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cyberone_v2_')) {
            let val = localStorage.getItem(key);
            if (key === 'cyberone_v2_github_token') {
              if (!val) continue;
              val = obfuscateToken(val);
            }
            payload[key] = val;
          }
        }
        const users = localStorage.getItem('cyberone_v2_users');
        if (users) {
          payload['cyberone_v2_users'] = users;
        }

        const saveRes = await fetch('./api/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (saveRes.ok) {
          console.log("Sync: Saved merged state to local server");
        } else {
          throw new Error("Failed to save merged database to local server");
        }
      } else {
        await store.pushToGitHubAPI();
      }

      this.showToast('Database synchronization completed successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error("Database sync failed:", err);
      this.showToast(`Sync failed: ${err.message}`, 'error');
    }
  }

  // Automatic Background Data Synchronization from GitHub Pages
  checkAutoSync() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;

    const todayStr = getTodayDateString();
    const lastSyncDate = localStorage.getItem('cyberone_v2_last_sync_date');
    if (lastSyncDate === todayStr) return; // Already synced today!

    const iframe = document.createElement('iframe');
    iframe.src = 'https://cyberonecsc.github.io/ledger/sync.html';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener('message', handleMessage);
    };

    const timeoutId = setTimeout(cleanup, 8000);

    const self = this;
    function handleMessage(event) {
      if (event.origin === 'https://cyberonecsc.github.io') {
        if (event.data && event.data.type === 'sync_data_response') {
          clearTimeout(timeoutId);
          const backup = event.data.data;
          const keys = Object.keys(backup);
          
          if (keys.length > 0) {
            let hasChanges = false;
            
            keys.forEach(key => {
              if (key.startsWith('cyberone_v2_') && ![
                'cyberone_v2_current_user',
                'cyberone_v2_active_date',
                'cyberone_v2_sidebar_collapsed',
                'cyberone_v2_last_sync_date',
                'cyberone_v2_local_snapshots'
              ].includes(key)) {
                const localVal = localStorage.getItem(key);
                if (localVal !== backup[key]) {
                  hasChanges = true;
                }
              }
            });

            self.mergeSyncData(backup);
            localStorage.setItem('cyberone_v2_last_sync_date', todayStr);

            if (hasChanges) {
              self.showToast('Background Auto-Sync: Updated data from GitHub Pages.', 'info');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          } else {
            localStorage.setItem('cyberone_v2_last_sync_date', todayStr);
          }
          cleanup();
        }
      }
    }

    window.addEventListener('message', handleMessage);

    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage('request_sync_data', 'https://cyberonecsc.github.io');
        }
      }, 800);
    };
  }

  triggerBackupDownload(backupData) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `cyberone_auto_backup_${timestampStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  checkScheduledBackup() {
    const config = store.getAutoBackupConfig();
    if (!config.enabled) return;

    const now = Date.now();
    const lastBackup = config.lastBackup || 0;
    let shouldBackup = false;

    if (config.frequency === 'session') {
      const sessionKey = sessionStorage.getItem('cyberone_v2_session_backup_done');
      if (!sessionKey) {
        shouldBackup = true;
        sessionStorage.setItem('cyberone_v2_session_backup_done', 'true');
      }
    } else if (config.frequency === 'hourly') {
      if (now - lastBackup >= 3600000) {
        shouldBackup = true;
      }
    } else if (config.frequency === '4hours') {
      if (now - lastBackup >= 14400000) {
        shouldBackup = true;
      }
    } else if (config.frequency === 'daily') {
      const lastBackupDate = new Date(lastBackup).toDateString();
      const currentDate = new Date(now).toDateString();
      if (lastBackupDate !== currentDate) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      config.lastBackup = now;
      store.saveAutoBackupConfig(config);

      if (config.type === 'local') {
        const success = store.createLocalSnapshot(`Auto-Snapshot (${config.frequency})`);
        if (success) {
          this.showToast('Automatic background restore point created!', 'info');
        }
      } else if (config.type === 'file') {
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cyberone_v2_') && key !== 'cyberone_v2_local_snapshots' && key !== 'cyberone_v2_last_sync_date' && key !== 'cyberone_v2_auto_backup_config') {
            backup[key] = localStorage.getItem(key);
          }
        }
        const users = localStorage.getItem('cyberone_v2_users');
        if (users) {
          backup['cyberone_v2_users'] = users;
        }

        this.triggerBackupDownload(backup);
        this.showToast('Scheduled auto-backup file downloaded!', 'success');
      }
    }
  }
}

// Global initialization
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.AppInstance = new Application();
  });
} else {
  window.AppInstance = new Application();
}

export default Application;

