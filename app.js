/* ==========================================================================
   CYBERONE Center Management Platform - SPA Router & Layout (app.js)
   ========================================================================== */

import { auth } from './auth.js';
import { store, getTodayDateString } from './store.js';

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
    this.init();
  }

  async init() {
    // Hide initial loading screen
    const loadingScreen = document.getElementById('app-loading');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    // Load sidebar collapse state
    const isCollapsed = localStorage.getItem('cyberone_v2_sidebar_collapsed') === 'true';
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    }

    // Set active date globally on first boot if not set
    if (!localStorage.getItem('cyberone_v2_active_date')) {
      localStorage.setItem('cyberone_v2_active_date', getTodayDateString());
    }

    // Load database from GitHub Pages db.json relative location on boot
    await this.loadDatabaseFromGitHub();

    // Trigger scheduled backup check
    this.checkScheduledBackup();
    setInterval(() => this.checkScheduledBackup(), 60000);

    // Bind hash change listener
    window.addEventListener('hashchange', () => this.handleRouting());

    // Trigger initial route load
    this.handleRouting();
  }

  async loadDatabaseFromGitHub() {
    try {
      const response = await fetch('./db.json?t=' + Date.now());
      if (response.ok) {
        const remoteData = await response.json();
        let updated = false;
        
        Object.keys(remoteData).forEach(key => {
          const localVal = localStorage.getItem(key);
          if (localVal !== remoteData[key]) {
            localStorage.setItem(key, remoteData[key]);
            updated = true;
          }
        });
        
        if (updated) {
          console.log("Database successfully synced from db.json");
          store.loadState();
        }
      }
    } catch (e) {
      console.error("Could not fetch database from GitHub Pages:", e);
    }
  }

  getActiveDate() {
    return localStorage.getItem('cyberone_v2_active_date') || getTodayDateString();
  }

  setActiveDate(dateString) {
    localStorage.setItem('cyberone_v2_active_date', dateString);
    this.showToast(`Selected Date: ${dateString}`, 'info');
    
    // Force re-render of current view to update data
    this.handleRouting();
  }

  handleRouting() {
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
    if (appContainer) {
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
            <img src="./logo.png" alt="logo" style="width:28px; height:28px; object-fit:contain;" onerror="this.style.display='none';">
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
              <img src="./logo.png" alt="logo" style="width:38px; height:38px; object-fit:contain;" onerror="this.style.display='none';">
              <div class="page-title">
                <h2 id="page-heading-title">CYBERONE CSC</h2>
                <p id="page-heading-sub">Operations & Ledger Management</p>
              </div>
            </div>
            <div class="header-actions" style="display:flex; align-items:center; gap:12px;">
              <!-- Universal Date Picker Badge -->
              <div class="date-badge">
                <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--color-primary);"></i>
                <input type="date" id="global-date-picker" value="${activeDate}" style="background:none; border:none; color:inherit; font-weight:inherit; outline:none; cursor:pointer;">
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



    // Date picker handler
    const datePicker = document.getElementById('global-date-picker');
    datePicker.addEventListener('change', (e) => {
      this.setActiveDate(e.target.value);
    });

    // Mount page view
    const mountPoint = document.getElementById('page-mount');
    contentRenderer(mountPoint, this);

    // Dynamic icon replacement
    lucide.createIcons();
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

  mergeSyncData(remoteBackup) {
    const keys = Object.keys(remoteBackup);
    keys.forEach(key => {
      if (key.startsWith('cyberone_v2_')) {
        const localRaw = localStorage.getItem(key);
        const remoteRaw = remoteBackup[key];
        
        if (!localRaw || localRaw === '[]' || localRaw === '{}') {
          localStorage.setItem(key, remoteRaw);
          return;
        }
        
        if (key === 'cyberone_v2_daily_logs') {
          try {
            const localLogs = JSON.parse(localRaw || '{}');
            const remoteLogs = JSON.parse(remoteRaw || '{}');
            const mergedLogs = { ...remoteLogs, ...localLogs };
            
            Object.keys(mergedLogs).forEach(date => {
              if (localLogs[date] && remoteLogs[date]) {
                const localTxns = localLogs[date].transactions || [];
                const remoteTxns = remoteLogs[date].transactions || [];
                const txnMap = new Map();
                
                remoteTxns.forEach(t => txnMap.set(t.id, t));
                localTxns.forEach(t => txnMap.set(t.id, t));
                
                mergedLogs[date].transactions = Array.from(txnMap.values());
              }
            });
            localStorage.setItem(key, JSON.stringify(mergedLogs));
          } catch (e) {
            console.error("Failed to merge daily logs", e);
            localStorage.setItem(key, remoteRaw);
          }
        } else if (key === 'cyberone_v2_activity_logs') {
          try {
            const localAct = JSON.parse(localRaw || '[]');
            const remoteAct = JSON.parse(remoteRaw || '[]');
            const actMap = new Map();
            remoteAct.forEach(a => actMap.set(a.id, a));
            localAct.forEach(a => actMap.set(a.id, a));
            const mergedAct = Array.from(actMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            localStorage.setItem(key, JSON.stringify(mergedAct));
          } catch(e) {
            localStorage.setItem(key, remoteRaw);
          }
        } else {
          try {
            const localData = JSON.parse(localRaw);
            const remoteData = JSON.parse(remoteRaw);
            
            if (Array.isArray(localData) && Array.isArray(remoteData)) {
              const map = new Map();
              localData.forEach(item => { if (item && item.id) map.set(item.id, item); });
              remoteData.forEach(item => {
                if (item && item.id) {
                  const existing = map.get(item.id);
                  map.set(item.id, existing ? { ...existing, ...item } : item);
                }
              });
              localStorage.setItem(key, JSON.stringify(Array.from(map.values())));
            } else if (localData && typeof localData === 'object' && remoteData && typeof remoteData === 'object') {
              const mergedObj = { ...localData, ...remoteData };
              localStorage.setItem(key, JSON.stringify(mergedObj));
            } else {
              localStorage.setItem(key, remoteRaw);
            }
          } catch(e) {
            console.error("Failed to merge key " + key, e);
            localStorage.setItem(key, remoteRaw);
          }
        }
      }
    });
  }

  syncDatabase() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      alert("You are on the online GitHub Pages version. Active database sync can only be initiated from your local server version (e.g. running on http://localhost:8080) to bypass browser cross-origin policy restrictions.\n\nPlease open your local server in a new tab to sync database between local and GitHub versions.");
      return;
    }

    this.showToast('Initiating two-way database synchronization...', 'info');
    
    let iframe = document.getElementById('cyberone-manual-sync-iframe');
    if (iframe) iframe.remove();
    
    iframe = document.createElement('iframe');
    iframe.id = 'cyberone-manual-sync-iframe';
    iframe.src = 'https://cyberonecsc.github.io/ledger/sync.html';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const self = this;
    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener('message', handleManualSync);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      self.showToast('Sync failed: Connection timed out.', 'error');
    }, 10000);

    function handleManualSync(event) {
      if (event.origin === 'https://cyberonecsc.github.io') {
        if (event.data && event.data.type === 'sync_data_response') {
          clearTimeout(timeoutId);
          const remoteBackup = event.data.data;
          const keys = Object.keys(remoteBackup);
          
          if (keys.length > 0) {
            self.mergeSyncData(remoteBackup);
            
            const localPayload = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('cyberone_v2_')) {
                localPayload[k] = localStorage.getItem(k);
              }
            }
            
            iframe.contentWindow.postMessage({
              type: 'write_sync_data',
              data: localPayload
            }, 'https://cyberonecsc.github.io');
          } else {
            const localPayload = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('cyberone_v2_')) {
                localPayload[k] = localStorage.getItem(k);
              }
            }
            iframe.contentWindow.postMessage({
              type: 'write_sync_data',
              data: localPayload
            }, 'https://cyberonecsc.github.io');
          }
        } else if (event.data && event.data.type === 'sync_write_response') {
          clearTimeout(timeoutId);
          self.showToast('Two-way database sync completed successfully!', 'success');
          cleanup();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    }

    window.addEventListener('message', handleManualSync);

    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage('request_sync_data', 'https://cyberonecsc.github.io');
        }
      }, 800);
    };
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
              if (key.startsWith('cyberone_v2_') && key !== 'cyberone_v2_last_sync_date' && key !== 'cyberone_v2_sidebar_collapsed') {
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
