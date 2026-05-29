/* ==========================================================================
   Akshaya Center Management Platform - SPA Router & Layout (app.js)
   ========================================================================== */

import { auth } from './auth.js';
import { getTodayDateString } from './store.js';

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


// Route configurations and permission keys
const ROUTES = {
  '#login': { render: renderLogin, public: true },
  '#dashboard': { render: renderDashboard, permission: 'manage_ledger' }, // Base landing
  '#transactions': { render: renderTransactions, permission: 'manage_ledger' },
  '#applications': { render: renderApplications, permission: 'manage_applications' },
  '#invoices': { render: renderInvoices, permission: 'manage_ledger' },
  '#accounts': { render: renderAccounts, permission: 'manage_accounts' },
  '#customers': { render: renderCustomers, permission: 'manage_customers' },
  '#inventory': { render: renderInventory, permission: 'manage_inventory' },
  '#payroll': { render: renderPayroll, permission: 'manage_payroll' },
  '#reports': { render: renderReports, permission: 'manage_ledger' },
  '#users': { render: renderUserManagement, permission: 'manage_settings' },
  '#settings': { render: renderSettings, permission: 'manage_settings' },
  '#aeps': { render: renderAEPS, permission: 'manage_accounts' }
};

class Application {
  constructor() {
    this.root = document.getElementById('app-root');
    this.activeRoute = null;
    this.init();
  }

  init() {
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

    // Bind hash change listener
    window.addEventListener('hashchange', () => this.handleRouting());

    // Trigger initial route load
    this.handleRouting();
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

    // Route guards
    const route = ROUTES[hash];

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

    if (isLoggedIn && hash === '#login') {
      window.location.hash = '#dashboard';
      return;
    }

    // Privilege validation
    if (isLoggedIn && route.permission && !auth.hasPermission(route.permission)) {
      this.renderAccessDenied();
      return;
    }

    this.activeRoute = hash;
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

    const currentYear = new Date().getFullYear();
    const activeDate = this.getActiveDate();
    const isCollapsed = localStorage.getItem('cyberone_v2_sidebar_collapsed') === 'true';

    // Core layout container
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
            
            <ul class="sidebar-menu sidebar-footer-menu" style="padding: 0; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; border-top: 1px solid var(--panel-border); padding-top: 8px; flex-grow: 0; overflow-y: visible;">
              <li class="sidebar-item ${this.activeRoute === '#accounts' ? 'active' : ''}">
                <a href="#accounts" style="padding: 8px 12px; font-size: 13px;"><i data-lucide="wallet" style="width: 16px; height: 16px;"></i><span>Accounts</span></a>
              </li>
              <li class="sidebar-item ${this.activeRoute === '#users' ? 'active' : ''}">
                <a href="#users" style="padding: 8px 12px; font-size: 13px;"><i data-lucide="shield-check" style="width: 16px; height: 16px;"></i><span>User Management</span></a>
              </li>
              <li class="sidebar-item ${this.activeRoute === '#settings' ? 'active' : ''}">
                <a href="#settings" style="padding: 8px 12px; font-size: 13px;"><i data-lucide="settings" style="width: 16px; height: 16px;"></i><span>Settings</span></a>
              </li>
            </ul>

            <button id="sidebar-logout" class="btn-logout">
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
            <div class="header-actions">
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
