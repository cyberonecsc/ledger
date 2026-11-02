/* ==========================================================================
   CYBERONE Center Management Platform - Quick Sales POS View (views/pos.js)
   Balanced 3-Column Kiosk Layout:
     - Left (420px):  Daily Data Entry, Cart, Smart Dynamic Consumables & Funding
     - Center (1fr):  Enlarged Touch Service Tiles & Search
     - Right (420px): Full-Length Scrollable Daily Transactions Log (Today)
   ========================================================================== */

import { store, getTodayDateString } from '../store.js';
import { auth } from '../auth.js';

// Pre-defined Consumable Inventory Items for Lamination & Paper Stock
const REQUIRED_CONSUMABLES = [
  { id: 'PROD-POUCH-350', name: '350gsm ID Pouch', sku: 'POUCH-350', category: 'Lamination', buyPrice: 5, sellPrice: 15, stock: 200, minStock: 25, type: 'product' },
  { id: 'PROD-POUCH-120', name: '120gsm ID Pouch', sku: 'POUCH-120', category: 'Lamination', buyPrice: 2, sellPrice: 8, stock: 250, minStock: 30, type: 'product' },
  { id: 'PROD-POUCH-A4', name: 'Normal A4 Lamination Pouch', sku: 'POUCH-A4', category: 'Lamination', buyPrice: 4, sellPrice: 12, stock: 300, minStock: 40, type: 'product' },
  { id: 'PROD-POUCH-QA4', name: 'Quarter A4 Lamination Pouch', sku: 'POUCH-QA4', category: 'Lamination', buyPrice: 3, sellPrice: 10, stock: 200, minStock: 25, type: 'product' },
  { id: 'PROD-PAPER-GLOSSY', name: 'Double Side Glossy Waterproof Paper', sku: 'PAPER-GLOSSY', category: 'Paper', buyPrice: 6, sellPrice: 20, stock: 150, minStock: 20, type: 'product' },
  { id: 'PROD-PAPER-80GSM', name: 'Normal 80gsm A4 Paper', sku: 'PAPER-80GSM', category: 'Paper', buyPrice: 1, sellPrice: 3, stock: 1000, minStock: 100, type: 'product' },
  { id: 'PROD-PAPER-100GSM', name: '100gsm A4 Paper', sku: 'PAPER-100GSM', category: 'Paper', buyPrice: 2, sellPrice: 5, stock: 500, minStock: 50, type: 'product' }
];

// Seed consumables into store if not already present
function ensureConsumablesSeeded() {
  let changed = false;
  if (!store.products) store.products = [];

  REQUIRED_CONSUMABLES.forEach(item => {
    const exists = store.products.some(p => p.id === item.id || p.name.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      store.products.push({ ...item });
      changed = true;
    }
  });

  if (changed) {
    store.saveItem('cyberone_v2_products', store.products);
    store.syncDatabaseState();
  }
}

// Default Service Tiles (Clean: No wallet mention on center tiles)
const DEFAULT_POS_SERVICES = [
  // Lamination & Specialized ID Services
  { 
    id: 'S_ID_350', 
    label: 'ID Card (350gsm Glossy)', 
    price: 100, 
    category: 'printing', 
    icon: 'credit-card',
    consumables: { pouch: 'PROD-POUCH-350', paper: 'PROD-PAPER-GLOSSY' } 
  },
  { 
    id: 'S_ID_120', 
    label: 'ID Card (120gsm Standard)', 
    price: 60, 
    category: 'printing', 
    icon: 'contact',
    consumables: { pouch: 'PROD-POUCH-120', paper: 'PROD-PAPER-80GSM' } 
  },
  { 
    id: 'S_A4_80', 
    label: 'A4 Lamination (80gsm)', 
    price: 40, 
    category: 'printing', 
    icon: 'file-text',
    consumables: { pouch: 'PROD-POUCH-A4', paper: 'PROD-PAPER-80GSM' } 
  },
  { 
    id: 'S_A4_100', 
    label: 'A4 Lamination (100gsm)', 
    price: 60, 
    category: 'printing', 
    icon: 'file-check',
    consumables: { pouch: 'PROD-POUCH-A4', paper: 'PROD-PAPER-100GSM' } 
  },
  { 
    id: 'S_RC_ID', 
    label: 'Ration Card (ID Size)', 
    price: 40, 
    category: 'printing', 
    icon: 'shield-check',
    consumables: { pouch: 'PROD-POUCH-120', paper: 'PROD-PAPER-80GSM' } 
  },
  { 
    id: 'S_RC_QA4', 
    label: 'Ration Card (1/4 A4)', 
    price: 40, 
    category: 'printing', 
    icon: 'layers',
    consumables: { pouch: 'PROD-POUCH-QA4', paper: 'PROD-PAPER-80GSM' } 
  },

  // General Printing, Copies & Photo
  { id: 'S_BW_PRINT', label: 'B/W Printout / Copy', price: 10, category: 'printing', icon: 'printer', consumables: { paper: 'PROD-PAPER-80GSM' } },
  { id: 'S_COLOR_PHOTO', label: 'Color Passport Photo', price: 30, category: 'printing', icon: 'image', consumables: { paper: 'PROD-PAPER-GLOSSY' } },
  { id: 'S_SCAN', label: 'Document Scanning', price: 20, category: 'printing', icon: 'scan' },

  // Government & G2C Services (Applications)
  { id: 'S_EDIST', label: 'e-District Certificate', price: 60, category: 'g2c', icon: 'award', defaultCost: 15, consumables: { paper: 'PROD-PAPER-80GSM' } },
  { id: 'S_PAN', label: 'PAN Card Application', price: 120, category: 'g2c', icon: 'credit-card', defaultCost: 107, consumables: { paper: 'PROD-PAPER-80GSM' } },
  { id: 'S_PASSPORT', label: 'Passport Application', price: 300, category: 'g2c', icon: 'globe', defaultCost: 150, consumables: { paper: 'PROD-PAPER-80GSM' } },
  { id: 'S_AADHAAR', label: 'Aadhaar Demographic Update', price: 100, category: 'g2c', icon: 'fingerprint', defaultCost: 50, consumables: { paper: 'PROD-PAPER-80GSM' } },

  // Utilities & Banking
  { id: 'S_KSEB', label: 'KSEB Electricity Bill', price: 20, category: 'utility', icon: 'zap' },
  { id: 'S_WATER', label: 'Water Authority Bill', price: 20, category: 'utility', icon: 'droplet' },
  { id: 'S_RECHARGE', label: 'Mobile Recharge Plan', price: 299, category: 'utility', icon: 'phone', defaultCost: 294.50 },
  { id: 'S_AEPS_CASH', label: 'AEPS Cash Withdrawal', price: 15, category: 'aeps', icon: 'wallet' }
];

export function renderPOS(mountPoint, appInstance) {
  ensureConsumablesSeeded();

  // Load custom services from storage or fall back to defaults
  let services = DEFAULT_POS_SERVICES;
  try {
    const saved = localStorage.getItem('cyberone_v2_pos_services');
    if (saved) services = JSON.parse(saved);
  } catch (e) {
    console.warn("Failed to load saved POS services:", e);
  }

  // Active POS Working State
  let cart = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let selectedCustomerId = '';
  let paymentMode = 'Cash'; // 'Cash', 'UPI', 'Split', 'Credit'
  
  // Wallet / Account Funding Selection (Purely manual selection)
  let activeWalletSource = 'none'; // 'main_bob', 'csc', 'paynearby', or other ID
  let walletActionType = 'debit';  // 'debit' or 'credit'
  let customDeductionAmount = null;
  let isMultiWallet = false;
  let multiWalletDeductions = [];

  // Consumables Deduction State
  let activePouchId = 'none';
  let activePaperId = 'none';
  let pouchDeductQty = 1;
  let paperDeductQty = 1;

  const todayDateString = getTodayDateString();

  mountPoint.innerHTML = `
    <!-- Top Pure POS Navigation Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; padding: 8px 18px; background: rgba(18, 24, 38, 0.85); border: 1px solid var(--panel-border); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.25);">
      
      <!-- Left: Mode Switchers -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="pos-btn-back-selection" class="btn btn-sm btn-secondary" style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; background: rgba(255,255,255,0.06);">
          <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i>
          <span>Mode Selection</span>
        </button>
        <button id="pos-btn-goto-ledger" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 6px; padding: 6px 15px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #4f46e5); border: none; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);">
          <i data-lucide="layout-dashboard" style="width: 14px; height: 14px;"></i>
          <span>Open Ledger</span>
        </button>

        <div style="height: 20px; width: 1px; background: rgba(255,255,255,0.12); margin: 0 6px;"></div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" alt="CYBERONE Logo" style="width: 32px; height: 32px; object-fit: contain; background: #ffffff; border-radius: 6px; padding: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); flex-shrink: 0;" onerror="this.src='./logo.png';">
          <div>
            <h2 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.2; letter-spacing: 0.5px;">CYBERONE POS</h2>
            <span style="font-size: 10px; color: var(--text-muted); font-weight: 600;">Center: ${store.centerProfile?.code || 'CYBERONE'} • ${todayDateString}</span>
          </div>
        </div>
      </div>

      <!-- Right: Tools, Cashier & Actions -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="pos-btn-open-tray" class="btn btn-sm btn-secondary" title="Open POS Cash Tray (Send Drawer Kick pulse)" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px; height: 32px; border-color: rgba(245, 158, 11, 0.4); color: #f59e0b;">
          <i data-lucide="archive" style="width: 14px; height: 14px; color: #f59e0b;"></i> Open Tray
        </button>
        <button id="pos-btn-add-tile" class="btn btn-sm btn-secondary" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px; height: 32px;">
          <i data-lucide="plus-circle" style="width: 13px; height: 13px; color: #10b981;"></i> + Add Tile
        </button>
        <button id="pos-btn-settings" class="btn btn-sm btn-secondary" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px; height: 32px;">
          <i data-lucide="sliders" style="width: 13px; height: 13px;"></i> Tiles Config
        </button>
        <button id="pos-btn-refresh-txns" class="btn btn-sm btn-secondary" title="Refresh Today Log" style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 12px; height: 32px;">
          <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i>
        </button>
        <div style="display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: var(--text-muted);">
          <i data-lucide="user" style="width: 13px; height: 13px; color: var(--color-primary);"></i>
          <span style="font-weight: 600; color: var(--text-main);">${auth.currentUser?.name || auth.currentUser?.username || 'Cashier'}</span>
        </div>
      </div>
    </div>

    <!-- 3-Column Pure POS Layout Grid (Balanced 3-Column Layout: Left Entry - Center Tiles - Right Transactions) -->
    <div class="pos-workspace-grid">
      
      <!-- ======================================================== -->
      <!-- COLUMN 1 (LEFT 460px): DAILY DATA ENTRY & CHECKOUT FORM -->
      <!-- ======================================================== -->
      <div class="pos-left-entry glass-card" style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding: 16px; box-sizing: border-box; gap: 12px;">
        
        <!-- Customer Selection Row -->
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dimmed);">Customer</label>
            <button id="pos-quick-add-cust-btn" style="background: none; border: none; color: var(--color-primary); font-size: 12px; font-weight: 700; cursor: pointer;">+ New Customer</button>
          </div>
          <select id="pos-customer-select" class="form-control" style="font-size: 13.5px; height: 38px;">
            <option value="">👤 Walk-in Customer</option>
            ${store.customers.map(c => `
              <option value="${c.id}" ${c.credit > 0 ? 'style="color: var(--color-warning); font-weight:600;"' : ''}>
                ${c.name} (${c.phone || 'No phone'})${c.credit > 0 ? ` [Credit ₹${c.credit.toFixed(0)}]` : ''}
              </option>
            `).join('')}
          </select>
          <div id="pos-cust-credit-alert" style="display: none; padding: 5px 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); font-size: 12px; color: var(--color-warning); font-weight: 600;">
            Outstanding Credit: ₹<span id="pos-cust-credit-val">0.00</span>
          </div>
        </div>

        <!-- Bill Items (Cart) Table (Expands comfortably) -->
        <div style="display: flex; flex-direction: column; flex: 1; min-height: 140px; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(0,0,0,0.2); padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); padding-bottom: 6px; margin-bottom: 6px;">
            <span style="font-size: 12.5px; font-weight: 700; text-transform: uppercase; color: var(--text-dimmed);">Bill Items (<span id="pos-cart-count">0</span>)</span>
            <button id="pos-cart-clear" style="background: none; border: none; color: var(--color-danger); font-size: 12px; font-weight: 600; cursor: pointer; display: none;">Clear All</button>
          </div>
          <div id="pos-cart-items-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
            <div id="pos-cart-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-dimmed); text-align: center; gap: 6px; padding: 20px 0;">
              <i data-lucide="shopping-bag" style="width: 28px; height: 28px; opacity: 0.35;"></i>
              <span style="font-size: 13px;">Tap tiles in center to add services / products</span>
            </div>
          </div>
        </div>

        <!-- Smart Dynamic Consumable Deduction Section (Only shown when relevant) -->
        <div id="pos-consumables-section" style="display: none; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 10px; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 700; color: #a5b4fc; display: flex; align-items: center; gap: 5px;">
              <i data-lucide="package" style="width: 14px; height: 14px;"></i>
              <span>Consumable Inventory Deduction</span>
            </span>
            <span id="pos-consumable-status-tag" style="font-size: 11px; padding: 2px 7px; border-radius: 4px; background: rgba(99, 102, 241, 0.2); color: #818cf8; font-weight: 700;">Required</span>
          </div>

          <!-- Lamination Pouch Deduction Row (Only for lamination services) -->
          <div id="pos-pouch-row" style="display: none; grid-template-columns: 1fr 80px; gap: 6px; align-items: center;">
            <select id="pos-deduct-pouch-select" class="form-control" style="font-size: 12px; height: 32px; padding: 2px 6px;">
              <option value="none">No Pouch Deduction</option>
              <option value="PROD-POUCH-350">350gsm ID Pouch (Stock: ${getProdStock('PROD-POUCH-350')})</option>
              <option value="PROD-POUCH-120">120gsm ID Pouch (Stock: ${getProdStock('PROD-POUCH-120')})</option>
              <option value="PROD-POUCH-A4">Normal A4 Pouch (Stock: ${getProdStock('PROD-POUCH-A4')})</option>
              <option value="PROD-POUCH-QA4">Quarter A4 Pouch (Stock: ${getProdStock('PROD-POUCH-QA4')})</option>
            </select>
            <input type="number" id="pos-deduct-pouch-qty" value="1" min="1" max="99" class="form-control" placeholder="Qty" style="font-size: 12px; height: 32px; text-align: center; font-weight: 700;">
          </div>

          <!-- Paper Deduction Row (For lamination, print, copy, application services) -->
          <div id="pos-paper-row" style="display: none; grid-template-columns: 1fr 80px; gap: 6px; align-items: center;">
            <select id="pos-deduct-paper-select" class="form-control" style="font-size: 12px; height: 32px; padding: 2px 6px;">
              <option value="none">No Paper Deduction</option>
              <option value="PROD-PAPER-80GSM">Normal 80gsm A4 (Stock: ${getProdStock('PROD-PAPER-80GSM')})</option>
              <option value="PROD-PAPER-100GSM">100gsm A4 Paper (Stock: ${getProdStock('PROD-PAPER-100GSM')})</option>
              <option value="PROD-PAPER-GLOSSY">Glossy Waterproof (Stock: ${getProdStock('PROD-PAPER-GLOSSY')})</option>
            </select>
            <input type="number" id="pos-deduct-paper-qty" value="1" min="1" max="99" class="form-control" placeholder="Qty" style="font-size: 12px; height: 32px; text-align: center; font-weight: 700;">
          </div>
        </div>

        <!-- Manual Funding / Wallet Source Row -->
        <div id="pos-funding-container" style="display: flex; flex-direction: column; gap: 7px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--panel-border); border-radius: 8px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-dimmed);">Funding Source / Wallet</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button id="pos-toggle-multi-wallet" type="button" style="font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1); color: #818cf8; cursor: pointer; font-weight: 700;">+ Multi-Wallet</button>
              <button id="pos-wallet-action-debit" class="pos-action-toggle active" data-action="debit" style="font-size: 11px; padding: 3px 9px; border-radius: 4px; border: 1px solid #10b981; background: rgba(16, 185, 129, 0.2); color: #10b981; cursor: pointer; font-weight: 700;">🔻 Debit</button>
            </div>
          </div>

          <!-- Single Wallet View -->
          <div id="pos-single-wallet-view" style="display: flex; flex-direction: column; gap: 6px;">
            <!-- 3 Primary Buttons: Account, CSC, PayNearby -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <button class="pos-source-btn" data-source="main_bob" style="padding: 8px 4px; font-size: 13px; font-weight: 700; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.04); color: var(--text-main); cursor: pointer; transition: 0.15s; text-align: center;">
                🏦 Account
              </button>
              <button class="pos-source-btn" data-source="csc" style="padding: 8px 4px; font-size: 13px; font-weight: 700; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.04); color: var(--text-main); cursor: pointer; transition: 0.15s; text-align: center;">
                🛡️ CSC
              </button>
              <button class="pos-source-btn" data-source="paynearby" style="padding: 8px 4px; font-size: 13px; font-weight: 700; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.04); color: var(--text-main); cursor: pointer; transition: 0.15s; text-align: center;">
                💼 PayNearby
              </button>
            </div>

            <!-- Dropdown for other accounts & Deduction Amount -->
            <div style="display: grid; grid-template-columns: 1fr 120px; gap: 6px; align-items: center;">
              <select id="pos-other-source-select" class="form-control" style="font-size: 12px; height: 32px; padding: 2px 6px;">
                <option value="none">Direct Shop Profit (No Wallet)</option>
                <option value="airtel_pb">Airtel Payments Bank</option>
                <option value="custom">Other Account / Bank</option>
              </select>
              <input type="number" id="pos-source-cost-input" value="0" min="0" step="any" class="form-control" placeholder="Cost ₹" style="font-size: 13px; height: 32px; font-weight: 700; text-align: right;">
            </div>
          </div>

          <!-- Multi-Wallet View (For Passport Application or 2+ Wallets) -->
          <div id="pos-multi-wallet-view" style="display: none; flex-direction: column; gap: 6px;">
            <div id="pos-multi-wallet-rows" style="display: flex; flex-direction: column; gap: 5px;"></div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 5px; border-top: 1px dashed rgba(255,255,255,0.08);">
              <button id="pos-btn-add-multi-row" type="button" class="btn btn-sm btn-secondary" style="font-size: 11px; padding: 3px 9px; height: 26px;">+ Add Wallet</button>
              <div id="pos-multi-total-cost" style="font-size: 12px; font-weight: 700; color: #f59e0b;">Total Cost: ₹0.00</div>
            </div>
          </div>
        </div>

        <!-- Total Calculation & Net Profit Box -->
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Total Payable</span>
            <div id="pos-profit-summary" style="font-size: 12px; color: #10b981; font-weight: 600;">Net Profit: ₹0.00</div>
          </div>
          <span id="pos-cart-grand-total" style="font-size: 26px; font-weight: 800; color: #10b981; font-family: monospace;">₹0.00</span>
        </div>

        <!-- Payment Method Selector -->
        <div style="display: flex; flex-direction: column; gap: 7px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            <button class="pos-pay-mode-btn active" data-mode="Cash">💵 Cash</button>
            <button class="pos-pay-mode-btn" data-mode="UPI">📱 UPI</button>
            <button class="pos-pay-mode-btn" data-mode="Split">⚖️ Split</button>
            <button class="pos-pay-mode-btn" data-mode="Credit">📒 Credit</button>
          </div>

          <!-- Cash Tender Details -->
          <div id="pos-cash-tender-box" style="display: flex; gap: 6px; align-items: center; background: rgba(255, 255, 255, 0.02); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--panel-border);">
            <input type="number" id="pos-cash-tendered-input" class="form-control" placeholder="Cash Given ₹" style="font-size: 14px; font-weight: 700; height: 36px; flex: 1;">
            <button id="pos-tender-exact-btn" class="btn btn-sm btn-secondary" style="font-size: 12px; padding: 0 12px; height: 36px;">Exact</button>
            <div id="pos-change-display" style="font-size: 13.5px; font-weight: 700; color: #10b981; white-space: nowrap; margin-left: 6px;">Change: ₹0</div>
          </div>

          <!-- Split Tender Box (Fully Editable Cash & UPI with Quick Actions) -->
          <div id="pos-split-tender-box" style="display: none; flex-direction: column; gap: 6px; background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--panel-border);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label style="font-size: 11px; font-weight: 700; color: #f59e0b; text-transform: uppercase;">💵 Cash (₹)</label>
                  <button id="pos-split-all-cash" type="button" style="background: none; border: none; font-size: 10px; color: var(--text-dimmed); cursor: pointer; text-decoration: underline;">All Cash</button>
                </div>
                <input type="number" id="pos-split-cash" class="form-control" placeholder="0.00" min="0" step="any" style="font-size: 14px; font-weight: 700; height: 36px; color: #f59e0b;">
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label style="font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase;">📱 UPI (₹)</label>
                  <button id="pos-split-all-upi" type="button" style="background: none; border: none; font-size: 10px; color: var(--text-dimmed); cursor: pointer; text-decoration: underline;">All UPI</button>
                </div>
                <input type="number" id="pos-split-upi" class="form-control" placeholder="0.00" min="0" step="any" style="font-size: 14px; font-weight: 700; height: 36px; color: #818cf8;">
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 5px; border-top: 1px dashed rgba(255,255,255,0.08); font-size: 12px;">
              <button id="pos-split-half" type="button" class="btn btn-sm btn-secondary" style="font-size: 11px; padding: 3px 9px; height: 26px;">⚖️ 50 / 50 Split</button>
              <div id="pos-split-status-indicator" style="font-weight: 700; color: #10b981;">
                Split: ₹0.00 / ₹0.00
              </div>
            </div>
          </div>
        </div>

        <!-- Checkout Action Button -->
        <button id="pos-checkout-btn" style="width: 100%; padding: 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); transition: 0.15s; margin-top: auto;">
          <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
          <span>Complete Sale (F9)</span>
        </button>

      </div>


      <!-- ======================================================== -->
      <!-- COLUMN 2 (CENTER 1fr): ENLARGED TOUCH SERVICE TILES GRID -->
      <!-- ======================================================== -->
      <div class="pos-center-tiles" style="display: flex; flex-direction: column; height: 100%; overflow: hidden; gap: 12px;">
        
        <!-- Search & Filter Header -->
        <div class="glass-card" style="padding: 10px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <div style="position: relative; flex: 1;">
              <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-dimmed);"></i>
              <input type="text" id="pos-search-input" class="form-control" placeholder="Search service, print, lamination, certificate, recharge..." style="padding-left: 36px; font-size: 13px; height: 36px;">
            </div>
            <button id="pos-search-clear" class="btn btn-sm btn-secondary" style="display: none; height: 36px; padding: 0 12px; font-size: 12px;">Clear</button>
          </div>

          <!-- Category Filter Pills -->
          <div class="pos-category-pills">
            <button class="pos-cat-btn active" data-cat="all">All Services</button>
            <button class="pos-cat-btn" data-cat="printing">🖨️ Lamination & Photo</button>
            <button class="pos-cat-btn" data-cat="g2c">🏛️ Govt / G2C</button>
            <button class="pos-cat-btn" data-cat="utility">⚡ Utilities & Bills</button>
            <button class="pos-cat-btn" data-cat="aeps">🏦 Banking & AEPS</button>
          </div>
        </div>

        <!-- Scrollable Service Tiles Container (Fixed Compact Touch Tiles - Never Auto-Stretching) -->
        <div id="pos-tiles-container" class="pos-tiles-scroll-grid">
          <!-- Dynamically populated -->
        </div>

      </div>


      <!-- ======================================================== -->
      <!-- COLUMN 3 (RIGHT 420px): SCROLLABLE TODAY TRANSACTIONS LOG -->
      <!-- ======================================================== -->
      <div class="pos-right-log glass-card" style="display: flex; flex-direction: column; height: 100%; overflow: hidden; padding: 16px; box-sizing: border-box; gap: 12px;">
        
        <!-- Daily Log Summary Header & Balances Window -->
        <div style="display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13.5px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 7px;">
              <i data-lucide="receipt" style="width: 16px; height: 16px; color: var(--color-primary);"></i>
              <span>Today's Transactions</span>
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span id="pos-log-count-badge" style="font-size: 11px; padding: 2px 7px; border-radius: 8px; background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700;">0 Txns</span>
              <span id="pos-log-total-badge" style="font-size: 11px; padding: 2px 7px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700;">₹0</span>
            </div>
          </div>

          <!-- Live Balances Window (Cash, Account, CSC, PayNearby) -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
            <!-- Cash Balance -->
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">💵 Cash Balance</div>
              <div id="pos-bal-cash-val" style="font-size: 13.5px; font-weight: 800; color: #10b981; font-family: monospace; margin-top: 2px;">₹0.00</div>
            </div>

            <!-- Account / Bank Balance -->
            <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">🏦 Account Balance</div>
              <div id="pos-bal-account-val" style="font-size: 13.5px; font-weight: 800; color: #818cf8; font-family: monospace; margin-top: 2px;">₹0.00</div>
            </div>

            <!-- CSC Wallet Balance -->
            <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">🛡️ CSC Wallet</div>
              <div id="pos-bal-csc-val" style="font-size: 13.5px; font-weight: 800; color: #38bdf8; font-family: monospace; margin-top: 2px;">₹0.00</div>
            </div>

            <!-- PayNearby Balance -->
            <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">💼 PayNearby</div>
              <div id="pos-bal-paynearby-val" style="font-size: 13.5px; font-weight: 800; color: #f59e0b; font-family: monospace; margin-top: 2px;">₹0.00</div>
            </div>
          </div>
        </div>

        <!-- Scrollable Transaction Cards List -->
        <div id="pos-today-log-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
          <!-- Transactions injected here -->
        </div>

      </div>

    </div>

    <!-- Modals Container -->
    <div id="pos-modals-container"></div>
  `;

  // Inject High-Definition Kiosk Styles
  const styleEl = document.createElement('style');
  styleEl.id = 'pos-custom-styles';
  styleEl.innerHTML = `
    .pos-workspace-grid {
      display: grid;
      grid-template-columns: 460px 1fr 390px;
      gap: 14px;
      height: calc(100vh - 72px);
      max-height: calc(100vh - 72px);
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .pos-left-entry, .pos-center-tiles, .pos-right-log {
      min-width: 0;
    }
    .pos-category-pills {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      flex-wrap: nowrap;
      max-width: 100%;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }
    .pos-cat-btn {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--panel-border);
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: 0.15s;
      flex-shrink: 0;
    }
    .pos-cat-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
    }
    .pos-cat-btn.active {
      background: var(--color-primary, #6366f1);
      border-color: var(--color-primary, #6366f1);
      color: #fff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    .pos-tiles-scroll-grid {
      flex: 1;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      grid-auto-rows: minmax(130px, auto);
      align-content: start;
      gap: 10px;
      padding: 4px;
    }
    .pos-service-tile {
      width: 100%;
      min-height: 130px;
      box-sizing: border-box;
      background: rgba(18, 24, 38, 0.7);
      backdrop-filter: blur(8px);
      border: 1.5px solid var(--panel-border);
      border-radius: 12px;
      padding: 12px 6px 10px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      position: relative;
    }
    .pos-service-tile:hover {
      transform: translateY(-2px);
      border-color: rgba(99, 102, 241, 0.6);
      background: rgba(99, 102, 241, 0.12);
      box-shadow: 0 6px 18px rgba(0,0,0,0.35);
    }
    .pos-service-tile:active {
      transform: translateY(0);
    }
    .pos-tile-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.14);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
      flex-shrink: 0;
      transition: 0.15s;
    }
    .pos-service-tile:hover .pos-tile-icon-box {
      background: var(--color-primary, #6366f1);
      color: #fff;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
    }
    .pos-tile-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-height: 34px;
      width: 100%;
    }
    .pos-tile-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-top: auto;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .pos-tile-price {
      font-size: 14.5px;
      font-weight: 800;
      color: #10b981;
      font-family: monospace;
    }
    .pos-tile-badge {
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 3px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-weight: 700;
    }
    .pos-pay-mode-btn {
      padding: 9px 4px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid var(--panel-border);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      cursor: pointer;
      transition: 0.15s;
    }
    .pos-pay-mode-btn.active {
      background: #10b981;
      border-color: #10b981;
      color: #fff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .pos-source-btn.active {
      border-color: var(--color-primary, #6366f1) !important;
      background: rgba(99, 102, 241, 0.25) !important;
      color: #fff !important;
    }
    .pos-tx-log-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: 0.15s;
    }
    .pos-tx-log-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.15);
    }

    @media (max-width: 1450px) {
      .pos-workspace-grid {
        grid-template-columns: 420px 1fr 360px !important;
        gap: 12px !important;
      }
      .pos-tiles-scroll-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      }
    }
    @media (max-width: 1200px) {
      .pos-workspace-grid {
        grid-template-columns: 360px 1fr 320px !important;
        gap: 8px !important;
      }
      .pos-tiles-scroll-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }
      .pos-service-tile {
        min-height: 120px !important;
      }
    }
    @media (max-width: 820px) {
      .pos-workspace-grid {
        grid-template-columns: 1fr !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
      }
      #pos-container {
        height: auto !important;
        overflow-y: auto !important;
      }
    }
  `;
  const oldStyle = document.getElementById('pos-custom-styles');
  if (oldStyle) oldStyle.remove();
  document.head.appendChild(styleEl);

  function getProdStock(id) {
    const p = store.products?.find(x => x.id === id);
    return p ? (p.stock || 0) : 0;
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0);
  }

  function getWalletCost() {
    if (isMultiWallet) {
      return multiWalletDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    }
    if (customDeductionAmount !== null && customDeductionAmount >= 0) {
      return customDeductionAmount;
    }
    return parseFloat(document.getElementById('pos-source-cost-input')?.value || 0) || 0;
  }

  // Render Service Tiles in Center Column (Clean: NO wallet mention)
  function renderTiles() {
    const container = document.getElementById('pos-tiles-container');
    if (!container) return;

    let filtered = services.filter(s => {
      const matchCat = (activeCategory === 'all' || s.category === activeCategory);
      const matchSearch = (!searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });

    let html = filtered.map(s => {
      const isLamination = s.consumables && s.consumables.pouch;
      return `
        <div class="pos-service-tile" data-service-id="${s.id}">
          <div class="pos-tile-icon-box">
            <i data-lucide="${s.icon || 'tag'}" style="width: 22px; height: 22px;"></i>
          </div>
          <div class="pos-tile-title">${s.label}</div>
          <div class="pos-tile-footer">
            <span class="pos-tile-price">₹${s.price}</span>
            ${isLamination ? `<span class="pos-tile-badge">STOCK</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Add "+ Quick Custom Entry" tile at the end
    html += `
      <div id="pos-btn-quick-custom-tile" class="pos-service-tile" style="border-style: dashed; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.04);">
        <div class="pos-tile-icon-box" style="background: rgba(99, 102, 241, 0.1);">
          <i data-lucide="plus" style="width: 22px; height: 22px; color: #818cf8;"></i>
        </div>
        <div class="pos-tile-title" style="color: #818cf8;">+ Custom Entry</div>
        <div class="pos-tile-footer" style="justify-content: center;">
          <span style="font-size: 11px; color: var(--text-dimmed);">Manual Price</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
    lucide.createIcons();

    // Attach click listeners to tiles
    container.querySelectorAll('.pos-service-tile[data-service-id]').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.getAttribute('data-service-id');
        const s = services.find(x => x.id === id);
        if (s) addToCart(s);
      });
    });

    document.getElementById('pos-btn-quick-custom-tile')?.addEventListener('click', openQuickCustomEntryModal);
  }

  // Add Item to Cart
  function addToCart(service) {
    const existing = cart.find(item => item.id === service.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: service.id,
        label: service.label,
        price: service.price,
        quantity: 1,
        category: service.category || 'general',
        consumables: service.consumables || null
      });
    }

    // Auto-detect Passport Application (split across Bank Account and CSC)
    if (service.id === 'S_PASSPORT' || service.label.toLowerCase().includes('passport application')) {
      isMultiWallet = true;
      multiWalletDeductions = [
        { source: 'main_bob', amount: 1500 },
        { source: 'csc', amount: 50 }
      ];
      renderMultiWalletView();
    } else if (service.defaultCost && !isMultiWallet) {
      const costInp = document.getElementById('pos-source-cost-input');
      if (costInp && (parseFloat(costInp.value) || 0) === 0) {
        costInp.value = service.defaultCost;
      }
    }

    renderCart();
  }

  // Render Cart Table & Smart Dynamic Consumables
  function renderCart() {
    const container = document.getElementById('pos-cart-items-container');
    const emptyState = document.getElementById('pos-cart-empty-state');
    const cartCount = document.getElementById('pos-cart-count');
    const clearBtn = document.getElementById('pos-cart-clear');
    const grandTotalEl = document.getElementById('pos-cart-grand-total');
    const profitSummaryEl = document.getElementById('pos-profit-summary');

    // Smart Consumables Elements
    const consumablesSection = document.getElementById('pos-consumables-section');
    const pouchRow = document.getElementById('pos-pouch-row');
    const paperRow = document.getElementById('pos-paper-row');
    const statusTag = document.getElementById('pos-consumable-status-tag');

    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div id="pos-cart-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-dimmed); text-align: center; gap: 6px; padding: 20px 0;">
          <i data-lucide="shopping-bag" style="width: 26px; height: 26px; opacity: 0.35;"></i>
          <span style="font-size: 12px;">Tap tiles in center to add services / products</span>
        </div>
      `;
      lucide.createIcons();
      if (cartCount) cartCount.innerText = '0';
      if (clearBtn) clearBtn.style.display = 'none';
      if (grandTotalEl) grandTotalEl.innerText = '₹0.00';
      if (profitSummaryEl) profitSummaryEl.innerText = 'Net Profit: ₹0.00';

      // Reset cash given, split, cost inputs & multi-wallet
      const cashInp = document.getElementById('pos-cash-tendered-input');
      if (cashInp) cashInp.value = '';
      const changeDisplay = document.getElementById('pos-change-display');
      if (changeDisplay) {
        changeDisplay.innerText = 'Change: ₹0.00';
        changeDisplay.style.color = 'var(--text-muted)';
      }
      const splitCashInp = document.getElementById('pos-split-cash');
      if (splitCashInp) splitCashInp.value = '';
      const splitUpiInp = document.getElementById('pos-split-upi');
      if (splitUpiInp) splitUpiInp.value = '';
      const costInp = document.getElementById('pos-source-cost-input');
      if (costInp) costInp.value = '0';
      customDeductionAmount = null;

      // Reset Multi-Wallet
      isMultiWallet = false;
      multiWalletDeductions = [];
      renderMultiWalletView();
      
      // Completely hide & reset consumables section and options
      if (consumablesSection) consumablesSection.style.display = 'none';
      if (pouchRow) pouchRow.style.display = 'none';
      if (paperRow) paperRow.style.display = 'none';
      const pouchSel = document.getElementById('pos-deduct-pouch-select');
      const paperSel = document.getElementById('pos-deduct-paper-select');
      if (pouchSel) pouchSel.value = 'none';
      if (paperSel) paperSel.value = 'none';
      const pouchQtyInp = document.getElementById('pos-deduct-pouch-qty');
      const paperQtyInp = document.getElementById('pos-deduct-paper-qty');
      if (pouchQtyInp) pouchQtyInp.value = '1';
      if (paperQtyInp) paperQtyInp.value = '1';
      updateTenderCalculations();
      return;
    }

    if (clearBtn) clearBtn.style.display = 'inline';
    if (cartCount) cartCount.innerText = cart.reduce((c, i) => c + i.quantity, 0);

    const total = getCartTotal();
    const sourceCost = getWalletCost();
    const profit = Math.max(0, total - sourceCost);

    if (grandTotalEl) grandTotalEl.innerText = `₹${total.toFixed(2)}`;
    if (profitSummaryEl) profitSummaryEl.innerText = `Net Profit: ₹${profit.toFixed(2)}`;

    // SMART CONSUMABLE VISIBILITY & QUANTITY CALCULATION:
    // 1. If cart has a Lamination / ID card service -> Show BOTH Pouch & Paper
    // 2. If cart has a Print / Copy / Application service (no lamination) -> Show ONLY Paper
    // 3. Consumable quantities auto-scale with total billed quantity of applicable items
    const totalPouchQty = cart.reduce((sum, i) => {
      const isPouch = (i.consumables && i.consumables.pouch) ||
        i.label.toLowerCase().includes('lamination') || 
        i.label.toLowerCase().includes('id card') || 
        i.label.toLowerCase().includes('ration');
      return isPouch ? sum + (i.quantity || 1) : sum;
    }, 0);

    const totalPaperQty = cart.reduce((sum, i) => {
      const isPaper = (i.consumables && i.consumables.paper) ||
        (i.consumables && i.consumables.pouch) || // Lamination consumes paper too
        i.category === 'printing' || 
        i.category === 'g2c' || 
        i.label.toLowerCase().includes('print') || 
        i.label.toLowerCase().includes('copy') || 
        i.label.toLowerCase().includes('lamination') || 
        i.label.toLowerCase().includes('id card') || 
        i.label.toLowerCase().includes('ration') || 
        i.label.toLowerCase().includes('application') ||
        i.label.toLowerCase().includes('certificate') ||
        i.label.toLowerCase().includes('photo');
      return isPaper ? sum + (i.quantity || 1) : sum;
    }, 0);

    const pouchQtyInp = document.getElementById('pos-deduct-pouch-qty');
    const paperQtyInp = document.getElementById('pos-deduct-paper-qty');
    const pouchSel = document.getElementById('pos-deduct-pouch-select');
    const paperSel = document.getElementById('pos-deduct-paper-select');

    if (pouchQtyInp && totalPouchQty > 0) {
      pouchQtyInp.value = totalPouchQty;
    }
    if (paperQtyInp && totalPaperQty > 0) {
      paperQtyInp.value = totalPaperQty;
    }

    const hasLamination = totalPouchQty > 0;
    const hasPrintOrApp = totalPaperQty > 0;

    if (consumablesSection) {
      if (hasLamination) {
        consumablesSection.style.display = 'flex';
        if (pouchRow) pouchRow.style.display = 'grid';
        if (paperRow) paperRow.style.display = 'grid';
        if (statusTag) statusTag.innerText = `Pouch (${totalPouchQty}) & Paper (${totalPaperQty})`;

        // Auto-select corresponding pouch/paper if not set
        const lamiItem = cart.find(i => i.consumables && i.consumables.pouch);
        if (lamiItem && lamiItem.consumables) {
          if (pouchSel && pouchSel.value === 'none') pouchSel.value = lamiItem.consumables.pouch;
          if (paperSel && paperSel.value === 'none' && lamiItem.consumables.paper) paperSel.value = lamiItem.consumables.paper;
        }
      } else if (hasPrintOrApp) {
        consumablesSection.style.display = 'flex';
        if (pouchRow) pouchRow.style.display = 'none';
        if (pouchSel) pouchSel.value = 'none'; // Reset pouch when no lamination
        if (paperRow) paperRow.style.display = 'grid';
        if (statusTag) statusTag.innerText = `Paper (${totalPaperQty})`;

        if (paperSel && paperSel.value === 'none') paperSel.value = 'PROD-PAPER-80GSM';
      } else {
        // Neither lamination nor print/app: hide everything and reset
        consumablesSection.style.display = 'none';
        if (pouchRow) pouchRow.style.display = 'none';
        if (paperRow) paperRow.style.display = 'none';
        if (pouchSel) pouchSel.value = 'none';
        if (paperSel) paperSel.value = 'none';
        if (pouchQtyInp) pouchQtyInp.value = '1';
        if (paperQtyInp) paperQtyInp.value = '1';
      }
    }

    container.innerHTML = cart.map((item, index) => {
      const lineTotal = (item.price * item.quantity).toFixed(2);
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--panel-border); border-radius: 8px; padding: 8px 10px; font-size: 13px; gap: 8px;">
          <!-- Item Title & Unit Rate -->
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.label}">${item.label}</div>
            ${item.quantity > 1 ? `<div style="font-size: 11px; color: var(--text-dimmed); margin-top: 1px;">₹${item.price.toFixed(2)} × ${item.quantity} pcs</div>` : ''}
          </div>

          <!-- Quantity Controls -->
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <button class="pos-qty-minus" data-index="${index}" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.06); color: #fff; font-weight: 700; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">-</button>
            <span style="font-weight: 700; font-size: 13px; min-width: 20px; text-align: center;">${item.quantity}</span>
            <button class="pos-qty-plus" data-index="${index}" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.06); color: #fff; font-weight: 700; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">+</button>
          </div>

          <!-- Direct Editable Line Amount Box -->
          <div style="display: flex; align-items: center; gap: 2px; flex-shrink: 0; background: rgba(16, 185, 129, 0.12); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 6px; padding: 2px 6px;" title="Click to manually edit price for this item">
            <span style="font-weight: 800; color: #10b981; font-size: 13px;">₹</span>
            <input type="number" class="pos-item-amount-input" data-index="${index}" value="${lineTotal}" min="0" step="any" style="width: 78px; height: 28px; font-size: 14px; font-weight: 800; font-family: monospace; background: transparent; border: none; color: #10b981; text-align: right; outline: none;">
          </div>

          <!-- Remove Item Button -->
          <button class="pos-item-remove" data-index="${index}" style="background: none; border: none; color: var(--text-dimmed); cursor: pointer; padding: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 4px;" title="Remove from bill">
            <i data-lucide="x" style="width: 15px; height: 15px;"></i>
          </button>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Attach cart item manual price/amount change (Direct Amount Box)
    container.querySelectorAll('.pos-item-amount-input').forEach(inp => {
      inp.addEventListener('click', (e) => {
        e.stopPropagation();
        inp.select();
      });
      inp.addEventListener('focus', () => {
        inp.select();
      });
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-index'));
        const newTotal = parseFloat(inp.value) || 0;
        const qty = cart[idx].quantity || 1;
        cart[idx].price = newTotal / qty;

        // Update live totals
        const total = getCartTotal();
        const sourceCost = getWalletCost();
        const profit = Math.max(0, total - sourceCost);
        if (grandTotalEl) grandTotalEl.innerText = `₹${total.toFixed(2)}`;
        if (profitSummaryEl) profitSummaryEl.innerText = `Net Profit: ₹${profit.toFixed(2)}`;

        updateTenderCalculations();
      });

      inp.addEventListener('blur', () => {
        renderCart();
      });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          inp.blur();
        }
      });
    });

    // Attach cart item quantity buttons
    container.querySelectorAll('.pos-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
        } else {
          cart.splice(idx, 1);
        }
        renderCart();
      });
    });

    container.querySelectorAll('.pos-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        cart[idx].quantity += 1;
        renderCart();
      });
    });

    container.querySelectorAll('.pos-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        cart.splice(idx, 1);
        renderCart();
      });
    });

    updateTenderCalculations();
  }

  // Update Tender Calculations & Change
  function updateTenderCalculations() {
    const total = getCartTotal();
    const cashInp = document.getElementById('pos-cash-tendered-input');
    const changeDisplay = document.getElementById('pos-change-display');

    if (cashInp && changeDisplay) {
      const valStr = cashInp.value.trim();
      const given = parseFloat(valStr) || 0;

      if (total <= 0 || !valStr) {
        changeDisplay.innerText = `Change: ₹0.00`;
        changeDisplay.style.color = 'var(--text-muted)';
      } else if (given >= total) {
        const change = given - total;
        changeDisplay.innerText = `Change: ₹${change.toFixed(2)}`;
        changeDisplay.style.color = '#10b981';
      } else {
        const due = total - given;
        changeDisplay.innerText = `Due: -₹${due.toFixed(2)}`;
        changeDisplay.style.color = '#f59e0b';
      }
    }

    if (paymentMode === 'Split') {
      updateSplitStatusIndicator();
    }
  }

  // Split Two-Way Auto-Balancing Handlers
  function onSplitCashChanged() {
    const total = getCartTotal();
    const splitCashInp = document.getElementById('pos-split-cash');
    const splitUpiInp = document.getElementById('pos-split-upi');
    if (!splitCashInp || !splitUpiInp) return;

    const cashVal = parseFloat(splitCashInp.value) || 0;
    const upiVal = Math.max(0, total - cashVal);
    splitUpiInp.value = upiVal > 0 ? upiVal.toFixed(2) : '0';
    updateSplitStatusIndicator();
  }

  function onSplitUpiChanged() {
    const total = getCartTotal();
    const splitCashInp = document.getElementById('pos-split-cash');
    const splitUpiInp = document.getElementById('pos-split-upi');
    if (!splitCashInp || !splitUpiInp) return;

    const upiVal = parseFloat(splitUpiInp.value) || 0;
    const cashVal = Math.max(0, total - upiVal);
    splitCashInp.value = cashVal > 0 ? cashVal.toFixed(2) : '0';
    updateSplitStatusIndicator();
  }

  function updateSplitStatusIndicator() {
    const total = getCartTotal();
    const splitCashInp = document.getElementById('pos-split-cash');
    const splitUpiInp = document.getElementById('pos-split-upi');
    const indicator = document.getElementById('pos-split-status-indicator');
    if (!indicator) return;

    const cash = parseFloat(splitCashInp?.value) || 0;
    const upi = parseFloat(splitUpiInp?.value) || 0;
    const sum = parseFloat((cash + upi).toFixed(2));

    if (Math.abs(sum - total) <= 0.1) {
      indicator.style.color = '#10b981';
      indicator.innerHTML = `✓ Matched (₹${cash.toFixed(0)} Cash + ₹${upi.toFixed(0)} UPI)`;
    } else if (sum < total) {
      indicator.style.color = '#f59e0b';
      indicator.innerHTML = `Short by ₹${(total - sum).toFixed(2)}`;
    } else {
      indicator.style.color = '#ef4444';
      indicator.innerHTML = `Over by ₹${(sum - total).toFixed(2)}`;
    }
  }

  // Select Funding Source (Manual)
  function selectFundingSource(sourceId) {
    activeWalletSource = sourceId;
    mountPoint.querySelectorAll('.pos-source-btn').forEach(btn => {
      if (btn.getAttribute('data-source') === sourceId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const otherSelect = document.getElementById('pos-other-source-select');
    if (otherSelect) {
      if (['main_bob', 'csc', 'paynearby'].includes(sourceId)) {
        otherSelect.value = 'none';
      } else {
        otherSelect.value = sourceId;
      }
    }
  }

  function getAllFundingOptions() {
    const list = [
      { id: 'main_bob', name: '🏦 Bank Account (BoB)' },
      { id: 'csc', name: '🛡️ CSC Wallet' },
      { id: 'paynearby', name: '💼 PayNearby' }
    ];
    store.bankAccounts?.forEach(b => {
      if (b.id !== 'main_bob') list.push({ id: b.id, name: `🏦 ${b.name}` });
    });
    store.wallets?.filter(w => w.isActive && w.id !== 'csc' && w.id !== 'paynearby').forEach(w => {
      list.push({ id: w.id, name: `💼 ${w.name}` });
    });
    return list;
  }

  function renderMultiWalletView() {
    const multiView = document.getElementById('pos-multi-wallet-view');
    const singleView = document.getElementById('pos-single-wallet-view');
    const toggleBtn = document.getElementById('pos-toggle-multi-wallet');
    const rowsContainer = document.getElementById('pos-multi-wallet-rows');

    if (!multiView || !singleView) return;

    if (isMultiWallet) {
      multiView.style.display = 'flex';
      singleView.style.display = 'none';
      if (toggleBtn) {
        toggleBtn.innerText = '← Single Wallet';
        toggleBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        toggleBtn.style.color = '#ef4444';
        toggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }

      if (multiWalletDeductions.length === 0) {
        multiWalletDeductions.push({ source: 'main_bob', amount: 0 });
      }

      const options = getAllFundingOptions();
      rowsContainer.innerHTML = multiWalletDeductions.map((row, idx) => `
        <div style="display: flex; gap: 6px; align-items: center;">
          <select class="form-control pos-multi-source-select" data-index="${idx}" style="font-size: 11px; height: 28px; flex: 1; padding: 2px 6px;">
            ${options.map(opt => `<option value="${opt.id}" ${row.source === opt.id ? 'selected' : ''}>${opt.name}</option>`).join('')}
          </select>
          <input type="number" class="form-control pos-multi-amount-input" data-index="${idx}" value="${row.amount || ''}" placeholder="Cost ₹" min="0" step="any" style="font-size: 11px; height: 28px; width: 90px; font-weight: 700; text-align: right;">
          <button type="button" class="pos-multi-remove-btn" data-index="${idx}" style="background: none; border: none; color: var(--color-danger); cursor: pointer; padding: 2px 4px; font-size: 16px; line-height: 1;" title="Remove this deduction">&times;</button>
        </div>
      `).join('');

      rowsContainer.querySelectorAll('.pos-multi-source-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const idx = parseInt(sel.getAttribute('data-index'));
          multiWalletDeductions[idx].source = sel.value;
        });
      });

      rowsContainer.querySelectorAll('.pos-multi-amount-input').forEach(inp => {
        inp.addEventListener('input', () => {
          const idx = parseInt(inp.getAttribute('data-index'));
          multiWalletDeductions[idx].amount = parseFloat(inp.value) || 0;
          updateNetProfitDisplay();
          updateTotalCostDisplay();
        });
      });

      rowsContainer.querySelectorAll('.pos-multi-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'));
          multiWalletDeductions.splice(idx, 1);
          renderMultiWalletView();
          updateNetProfitDisplay();
        });
      });

      updateTotalCostDisplay();
    } else {
      multiView.style.display = 'none';
      singleView.style.display = 'flex';
      if (toggleBtn) {
        toggleBtn.innerText = '+ Multi-Wallet';
        toggleBtn.style.background = 'rgba(99, 102, 241, 0.1)';
        toggleBtn.style.color = '#818cf8';
        toggleBtn.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      }
    }
  }

  function updateTotalCostDisplay() {
    const totalCostEl = document.getElementById('pos-multi-total-cost');
    if (totalCostEl) {
      const sum = multiWalletDeductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      totalCostEl.innerText = `Total Cost: ₹${sum.toFixed(2)}`;
    }
  }

  function updateNetProfitDisplay() {
    const total = getCartTotal();
    const cost = getWalletCost();
    const profit = Math.max(0, total - cost);
    const profitSummaryEl = document.getElementById('pos-profit-summary');
    if (profitSummaryEl) {
      profitSummaryEl.innerText = `Net Profit: ₹${profit.toFixed(2)}`;
    }
  }

  // Render Right Column: Today's Transactions Log (Full-length scrollable)
  function renderDailyTransactionsLog() {
    const logList = document.getElementById('pos-today-log-list');
    const countBadge = document.getElementById('pos-log-count-badge');
    const totalBadge = document.getElementById('pos-log-total-badge');

    if (!logList) return;

    // Retrieve today transactions
    const dailyLog = store.dailyLogs && store.dailyLogs[todayDateString];
    const txns = (dailyLog && dailyLog.transactions) ? [...dailyLog.transactions].reverse() : [];

    let totalAmount = 0;
    let totalCash = 0;
    let totalOnline = 0;

    txns.forEach(t => {
      const amt = parseFloat(t.amount || 0);
      totalAmount += amt;
      totalCash += parseFloat(t.paidByCash || 0);
      totalOnline += parseFloat(t.paidByUPI || 0) + parseFloat(t.paidByCredit || 0);
    });

    if (countBadge) countBadge.innerText = `${txns.length} Txns`;
    if (totalBadge) totalBadge.innerText = `₹${totalAmount.toFixed(0)}`;

    // Populate Live Account & Wallet Balances
    const currentBal = store.getCurrentBalances() || {};
    const bankKey = (store.bankAccounts && store.bankAccounts[0]) ? store.bankAccounts[0].id : 'main_bob';

    const balCashEl = document.getElementById('pos-bal-cash-val');
    const balAccEl = document.getElementById('pos-bal-account-val');
    const balCscEl = document.getElementById('pos-bal-csc-val');
    const balPaynearbyEl = document.getElementById('pos-bal-paynearby-val');

    const cashBal = parseFloat(currentBal.cash || 0);
    const accBal = parseFloat(currentBal[bankKey] !== undefined ? currentBal[bankKey] : (currentBal.main_bob || 0));
    const cscBal = parseFloat(currentBal.csc || 0);
    const paynearbyBal = parseFloat(currentBal.paynearby || 0);

    const fmt = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (balCashEl) balCashEl.innerText = fmt(cashBal);
    if (balAccEl) balAccEl.innerText = fmt(accBal);
    if (balCscEl) balCscEl.innerText = fmt(cscBal);
    if (balPaynearbyEl) balPaynearbyEl.innerText = fmt(paynearbyBal);

    if (txns.length === 0) {
      logList.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; color: var(--text-dimmed); text-align: center; gap: 8px;">
          <i data-lucide="clock" style="width: 28px; height: 28px; opacity: 0.35;"></i>
          <span style="font-size: 12px;">No transactions recorded today yet</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    logList.innerHTML = txns.map(t => {
      const time = t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
      let badgeColor = '#10b981';
      let modeName = 'Cash';

      if (t.paidByCredit > 0) {
        badgeColor = '#ef4444';
        modeName = 'Credit';
      } else if (t.paidByUPI > 0 && t.paidByCash > 0) {
        badgeColor = '#8b5cf6';
        modeName = `Split (₹${t.paidByCash} + ₹${t.paidByUPI})`;
      } else if (t.paidByUPI > 0) {
        badgeColor = '#6366f1';
        modeName = 'UPI';
      }

      // Wallet funding source indicator
      let sourceTag = '';
      if (t.walletDeductions && t.walletDeductions.length > 0) {
        const w = t.walletDeductions[0];
        sourceTag = `<span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-weight: 700; text-transform: uppercase;">${w.walletId} ₹${w.amount}</span>`;
      }

      return `
        <div class="pos-tx-log-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 700; font-size: 12px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">
              ${t.description || 'Sale Transaction'}
            </div>
            <div style="font-size: 14px; font-weight: 800; font-family: monospace; color: #10b981;">
              ₹${(parseFloat(t.amount) || 0).toFixed(2)}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dimmed);">
              <span>${time}</span>
              <span>•</span>
              <span style="color: ${badgeColor}; font-weight: 700;">${modeName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${sourceTag}
              <button class="pos-reprint-btn" data-id="${t.id}" title="Reprint Receipt" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;">
                <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Attach reprint receipt buttons
    logList.querySelectorAll('.pos-reprint-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const found = txns.find(x => x.id === id);
        if (found) showThermalReceiptModal(found);
      });
    });
  }

  // Quick Custom Entry Modal (For arbitrary services not in tiles)
  function openQuickCustomEntryModal() {
    const modalsContainer = document.getElementById('pos-modals-container');
    if (!modalsContainer) return;

    modalsContainer.innerHTML = `
      <div class="modal-backdrop show" style="display: flex; align-items: center; justify-content: center; z-index: 10000; position: fixed; inset: 0; background: rgba(0,0,0,0.85);">
        <div class="glass-card" style="width: 360px; max-width: 90vw; padding: 22px; border-radius: 14px;">
          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="plus-circle" style="width: 18px; height: 18px; color: var(--color-primary);"></i> Quick Custom Sale
          </h3>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-muted);">Service / Item Description *</label>
              <input type="text" id="modal-custom-label" class="form-control" placeholder="e.g. Photo Framing, Gazette Form" style="font-size: 13px; height: 36px;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-muted);">Amount (₹) *</label>
              <input type="number" id="modal-custom-price" class="form-control" placeholder="0.00" min="1" step="any" style="font-size: 15px; font-weight: 800; height: 36px;">
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 18px;">
            <button id="modal-custom-add-btn" class="btn btn-primary" style="flex: 1; padding: 10px; font-weight: 800; font-size: 13px;">Add to Bill</button>
            <button id="modal-custom-cancel-btn" class="btn btn-secondary" style="flex: 1; padding: 10px; font-size: 13px;">Cancel</button>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();

    document.getElementById('modal-custom-cancel-btn')?.addEventListener('click', () => {
      modalsContainer.innerHTML = '';
    });

    document.getElementById('modal-custom-add-btn')?.addEventListener('click', () => {
      const label = document.getElementById('modal-custom-label')?.value.trim();
      const price = parseFloat(document.getElementById('modal-custom-price')?.value) || 0;

      if (!label || price <= 0) {
        appInstance.showToast('Please enter a valid description and price!', 'warning');
        return;
      }

      addToCart({
        id: 'CUSTOM-' + Date.now().toString(36),
        label: label,
        price: price,
        category: 'custom'
      });

      modalsContainer.innerHTML = '';
      appInstance.showToast(`Added ${label} (₹${price}) to bill!`, 'success');
    });
  }

  // Tiles Configuration Modal (Manage, Edit Prices, Add & Remove Service Tiles)
  function openTilesConfigModal() {
    const modalsContainer = document.getElementById('pos-modals-container');
    if (!modalsContainer) return;

    // Deep copy current services for working buffer
    let tempServices = JSON.parse(JSON.stringify(services));

    const closeModal = () => {
      modalsContainer.innerHTML = '';
      window.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);

    function renderTilesConfigRows() {
      const tbody = document.getElementById('pos-config-tiles-tbody');
      if (!tbody) return;

      tbody.innerHTML = tempServices.map((s, idx) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 6px 10px;">
            <input type="text" class="form-control pos-cfg-name" data-index="${idx}" value="${s.label || ''}" style="font-size: 12px; height: 32px; font-weight: 600;">
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <select class="form-control pos-cfg-cat" data-index="${idx}" style="font-size: 11px; height: 32px; padding: 2px 4px;">
              <option value="printing" ${s.category === 'printing' ? 'selected' : ''}>🖨️ Lamination & Photo</option>
              <option value="g2c" ${s.category === 'g2c' ? 'selected' : ''}>🏛️ Govt / G2C</option>
              <option value="utility" ${s.category === 'utility' ? 'selected' : ''}>⚡ Utilities & Bills</option>
              <option value="aeps" ${s.category === 'aeps' ? 'selected' : ''}>🏦 Banking & AEPS</option>
            </select>
          </td>
          <td style="padding: 6px 10px; text-align: right;">
            <input type="number" class="form-control pos-cfg-price" data-index="${idx}" value="${s.price || 0}" min="0" step="any" style="font-size: 12px; height: 32px; font-weight: 700; color: #10b981; text-align: right;">
          </td>
          <td style="padding: 6px 10px; text-align: center;">
            <button class="pos-cfg-delete-btn btn btn-sm btn-secondary" data-index="${idx}" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 4px 8px; cursor: pointer; border-radius: 6px;" title="Delete Tile">
              <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
            </button>
          </td>
        </tr>
      `).join('');

      lucide.createIcons();

      // Row change listeners
      tbody.querySelectorAll('.pos-cfg-name').forEach(inp => {
        inp.addEventListener('input', () => {
          const idx = parseInt(inp.getAttribute('data-index'));
          if (tempServices[idx]) tempServices[idx].label = inp.value;
        });
      });

      tbody.querySelectorAll('.pos-cfg-cat').forEach(sel => {
        sel.addEventListener('change', () => {
          const idx = parseInt(sel.getAttribute('data-index'));
          if (tempServices[idx]) tempServices[idx].category = sel.value;
        });
      });

      tbody.querySelectorAll('.pos-cfg-price').forEach(inp => {
        inp.addEventListener('input', () => {
          const idx = parseInt(inp.getAttribute('data-index'));
          if (tempServices[idx]) tempServices[idx].price = parseFloat(inp.value) || 0;
        });
      });

      tbody.querySelectorAll('.pos-cfg-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'));
          tempServices.splice(idx, 1);
          renderTilesConfigRows();
        });
      });
    }

    modalsContainer.innerHTML = `
      <div id="pos-tiles-config-backdrop" class="modal-backdrop show" style="display: flex; align-items: center; justify-content: center; z-index: 10000; position: fixed; inset: 0; background: rgba(0,0,0,0.85); cursor: pointer;">
        <div class="glass-card" style="width: 650px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; padding: 22px; border-radius: 14px; cursor: default; gap: 14px;" onclick="event.stopPropagation();">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="sliders" style="width: 20px; height: 20px; color: var(--color-primary);"></i>
              <h3 style="font-size: 16px; font-weight: 800; margin: 0; color: #fff;">Service Tiles Configuration</h3>
            </div>
            <button id="pos-btn-close-tiles-config" style="background: none; border: none; font-size: 18px; color: var(--text-dimmed); cursor: pointer;">✕</button>
          </div>

          <!-- Actions toolbar -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="font-size: 12px; color: var(--text-dimmed);">
              Customize service names, default rates, and categories. Changes update the center tiles instantly.
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="pos-btn-add-tile-in-config" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; background: #6366f1;">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add New Tile
              </button>
              <button id="pos-btn-reset-tiles-default" class="btn btn-sm btn-secondary" style="font-size: 11px;">
                Reset Defaults
              </button>
            </div>
          </div>

          <!-- Scrollable Table -->
          <div style="flex: 1; overflow-y: auto; border: 1px solid var(--panel-border); border-radius: 8px; background: rgba(0,0,0,0.25); max-height: 48vh;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--panel-border); background: rgba(255,255,255,0.03); color: var(--text-muted); text-transform: uppercase; font-size: 10px; font-weight: 700;">
                  <th style="padding: 8px 10px; text-align: left;">Tile Name</th>
                  <th style="padding: 8px 10px; text-align: center; width: 140px;">Category</th>
                  <th style="padding: 8px 10px; text-align: right; width: 95px;">Price (₹)</th>
                  <th style="padding: 8px 10px; text-align: center; width: 50px;">Delete</th>
                </tr>
              </thead>
              <tbody id="pos-config-tiles-tbody">
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--panel-border); padding-top: 12px;">
            <span style="font-size: 11px; color: var(--text-dimmed);">Tiles saved to workstation configuration.</span>
            <div style="display: flex; gap: 8px;">
              <button id="pos-btn-cancel-tiles-config" class="btn btn-secondary" style="padding: 8px 16px; font-size: 12px;">Cancel</button>
              <button id="pos-btn-save-tiles-config" class="btn btn-primary" style="padding: 8px 20px; font-size: 12px; font-weight: 700; background: #10b981; border: none; color: #fff;">
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
    renderTilesConfigRows();

    document.getElementById('pos-btn-close-tiles-config')?.addEventListener('click', closeModal);
    document.getElementById('pos-btn-cancel-tiles-config')?.addEventListener('click', closeModal);
    document.getElementById('pos-tiles-config-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'pos-tiles-config-backdrop') closeModal();
    });

    // Add new tile row
    document.getElementById('pos-btn-add-tile-in-config')?.addEventListener('click', () => {
      tempServices.push({
        id: 'S_' + Date.now().toString(36).toUpperCase(),
        label: 'New Service',
        price: 50,
        category: 'printing',
        icon: 'tag'
      });
      renderTilesConfigRows();
    });

    // Reset to defaults
    document.getElementById('pos-btn-reset-tiles-default')?.addEventListener('click', () => {
      if (confirm('Reset all service tiles to standard system defaults?')) {
        tempServices = JSON.parse(JSON.stringify(DEFAULT_POS_SERVICES));
        renderTilesConfigRows();
      }
    });

    // Save changes
    document.getElementById('pos-btn-save-tiles-config')?.addEventListener('click', () => {
      const valid = tempServices.filter(s => s.label && s.label.trim().length > 0);
      services = valid;
      try {
        localStorage.setItem('cyberone_v2_pos_services', JSON.stringify(services));
      } catch (e) {
        console.warn("Failed to persist POS services:", e);
      }
      renderTiles();
      closeModal();
      appInstance.showToast('Service tiles updated successfully!', 'success');
    });
  }

  // Complete Sale & Commit Transaction
  function completeSale() {
    if (cart.length === 0) {
      appInstance.showToast('Please add items to cart before completing sale!', 'warning');
      return;
    }

    const total = getCartTotal();

    // Deductions from wallets / bank accounts
    let deductions = [];
    if (isMultiWallet) {
      deductions = multiWalletDeductions.filter(d => d.source && d.source !== 'none' && (parseFloat(d.amount) || 0) > 0).map(d => ({
        source: d.source,
        amount: parseFloat(d.amount)
      }));
    } else if (activeWalletSource && activeWalletSource !== 'none') {
      const singleCost = parseFloat(document.getElementById('pos-source-cost-input')?.value || 0) || 0;
      if (singleCost > 0) {
        deductions = [{ source: activeWalletSource, amount: singleCost }];
      }
    }

    const sourceCost = deductions.reduce((sum, d) => sum + d.amount, 0);

    let paidByCash = 0;
    let paidByUPI = 0;
    let paidByCredit = 0;

    if (paymentMode === 'Cash') {
      paidByCash = total;
    } else if (paymentMode === 'UPI') {
      paidByUPI = total;
    } else if (paymentMode === 'Credit') {
      if (!selectedCustomerId) {
        appInstance.showToast('Please select a customer before granting Credit!', 'error');
        return;
      }
      paidByCredit = total;
    } else if (paymentMode === 'Split') {
      const splitCashInp = document.getElementById('pos-split-cash');
      const splitUpiInp = document.getElementById('pos-split-upi');
      paidByCash = parseFloat(splitCashInp ? splitCashInp.value : 0) || 0;
      paidByUPI = parseFloat(splitUpiInp ? splitUpiInp.value : 0) || 0;
      if (Math.abs((paidByCash + paidByUPI) - total) > 0.5) {
        appInstance.showToast(`Split total (₹${(paidByCash + paidByUPI).toFixed(2)}) must match bill total (₹${total.toFixed(2)})!`, 'error');
        return;
      }
    }

    // Profit calculation: Total collected minus source deduction cost
    const netProfit = Math.max(0, total - sourceCost);
    let scCash = 0;
    let scAccount = 0;

    if (paidByCash >= netProfit) {
      scCash = netProfit;
    } else {
      scCash = paidByCash;
      scAccount = netProfit - scCash;
    }

    // Build Transaction Object
    const txnDescription = cart.map(i => `${i.label} (x${i.quantity})`).join(', ');
    const newTxn = {
      id: 'TXN-POS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      date: todayDateString,
      timestamp: new Date().toISOString(),
      type: 'sale',
      category: cart[0].category || 'POS Sale',
      description: txnDescription,
      amount: total,
      paidByCash: paidByCash,
      paidByUPI: paidByUPI,
      paidByCredit: paidByCredit,
      bankId: 'main_bob',
      serviceChargeToCash: scCash,
      serviceChargeToAccount: scAccount,
      staffId: auth.currentUser?.staffId || auth.currentUser?.username || 'admin',
      staffName: auth.currentUser?.name || auth.currentUser?.username || 'Staff',
      deductedFrom: deductions.length === 1 ? deductions[0].source : (deductions.length > 1 ? 'multi' : 'none'),
      deductedAmount: sourceCost,
      deductions: deductions,
      walletDeductions: deductions.map(d => ({ walletId: d.source, amount: d.amount }))
    };

    // If Credit was used, record on customer ledger
    if (paidByCredit > 0 && selectedCustomerId) {
      newTxn.customerId = selectedCustomerId;
      const cust = store.customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        cust.credit = (cust.credit || 0) + paidByCredit;
        store.saveItem('cyberone_v2_customers', store.customers);
      }
    }

    // Deduct Consumables from Inventory
    const pouchSelect = document.getElementById('pos-deduct-pouch-select');
    const paperSelect = document.getElementById('pos-deduct-paper-select');
    const pouchQty = parseInt(document.getElementById('pos-deduct-pouch-qty')?.value || 1) || 1;
    const paperQty = parseInt(document.getElementById('pos-deduct-paper-qty')?.value || 1) || 1;

    let invChanged = false;
    if (pouchSelect && pouchSelect.value !== 'none') {
      const p = store.products?.find(x => x.id === pouchSelect.value);
      if (p) {
        p.stock = Math.max(0, (p.stock || 0) - pouchQty);
        invChanged = true;
      }
    }
    if (paperSelect && paperSelect.value !== 'none') {
      const p = store.products?.find(x => x.id === paperSelect.value);
      if (p) {
        p.stock = Math.max(0, (p.stock || 0) - paperQty);
        invChanged = true;
      }
    }
    if (invChanged) {
      store.saveItem('cyberone_v2_products', store.products);
    }

    // Commit Transaction to Ledger Store
    store.addTransaction(todayDateString, newTxn);

    appInstance.showToast('Sale completed & logged into ledger!', 'success');

    // Show Printable Receipt
    showThermalReceiptModal(newTxn);

    // Reset Cart & Input state
    cart = [];
    customDeductionAmount = null;
    const costInp = document.getElementById('pos-source-cost-input');
    if (costInp) costInp.value = '0';

    const cashInp = document.getElementById('pos-cash-tendered-input');
    if (cashInp) cashInp.value = '';

    const splitCashInp = document.getElementById('pos-split-cash');
    if (splitCashInp) splitCashInp.value = '';
    const splitUpiInp = document.getElementById('pos-split-upi');
    if (splitUpiInp) splitUpiInp.value = '';

    renderCart();
    renderDailyTransactionsLog();
  }

  // Cash Drawer / Cash Tray trigger function
  function triggerCashDrawerKick() {
    const win = window.open('', '_blank', 'width=250,height=250');
    if (win) {
      win.document.write(`
        <html>
          <head><title>Opening Cash Tray...</title></head>
          <body style="font-family:sans-serif; text-align:center; padding:20px;" onload="window.print(); window.close();">
            <p style="font-size:12px; color:#666;">Sending drawer kick pulse to POS printer...</p>
          </body>
        </html>
      `);
      win.document.close();
    }
    appInstance.showToast('Cash Tray trigger pulse sent to printer!', 'info');
  }

  // Thermal Receipt Modal (with Easy Dismiss, Click-Outside, ESC, and Auto-Close on Print)
  function showThermalReceiptModal(txn) {
    const modalsContainer = document.getElementById('pos-modals-container');
    if (!modalsContainer) return;

    const center = store.centerProfile || {};
    const timeFormatted = txn.timestamp ? new Date(txn.timestamp).toLocaleString() : new Date().toLocaleString();

    let modeText = 'Cash';
    if (txn.paidByCredit > 0) modeText = 'Credit';
    else if (txn.paidByUPI > 0 && txn.paidByCash > 0) modeText = `Split (Cash ₹${txn.paidByCash} + UPI ₹${txn.paidByUPI})`;
    else if (txn.paidByUPI > 0) modeText = 'UPI';

    const closeModal = () => {
      modalsContainer.innerHTML = '';
      window.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);

    modalsContainer.innerHTML = `
      <div id="pos-receipt-modal-backdrop" class="modal-backdrop show" style="display: flex; align-items: center; justify-content: center; z-index: 10000; position: fixed; inset: 0; background: rgba(0,0,0,0.85); cursor: pointer;">
        <div class="glass-card" style="width: 380px; max-width: 95vw; background: #fff; color: #000; padding: 22px; border-radius: 12px; box-shadow: 0 16px 50px rgba(0,0,0,0.7); position: relative; cursor: default;" onclick="event.stopPropagation();">
          
          <!-- Top Right Close X Button -->
          <button id="btn-x-close-pos-receipt" style="position: absolute; right: 12px; top: 12px; background: rgba(0,0,0,0.06); border: none; font-size: 16px; font-weight: 700; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #333; transition: 0.15s;" title="Close (Esc)">
            ✕
          </button>

          <div id="pos-thermal-slip" style="font-family: 'Courier New', monospace; font-size: 12px; color: #000;">
            <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
              <div style="font-size: 16px; font-weight: bold;">${center.name || 'CYBERONE CSC'}</div>
              <div style="font-size: 10px;">${center.address || 'Attingal'}</div>
              <div style="font-size: 10px;">CSC ID: ${center.code || '465314670016'} • Ph: ${center.phone || ''}</div>
            </div>

            <div style="font-size: 10px; margin-bottom: 6px;">
              <div>Receipt: ${txn.id}</div>
              <div>Date: ${timeFormatted}</div>
              <div>Cashier: ${txn.staffName || 'Operator'}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px;">
              <thead>
                <tr style="border-bottom: 1px dashed #000; border-top: 1px dashed #000;">
                  <th style="text-align: left; padding: 4px 0;">Item</th>
                  <th style="text-align: right; padding: 4px 0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 4px 0;">${txn.description}</td>
                  <td style="text-align: right; font-weight: bold;">₹${parseFloat(txn.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style="border-top: 1px dashed #000; padding-top: 6px; font-weight: bold; font-size: 13px; display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>TOTAL PAID:</span>
              <span>₹${parseFloat(txn.amount || 0).toFixed(2)}</span>
            </div>

            <div style="font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px;">
              Mode: ${modeText}
            </div>

            <div style="text-align: center; font-size: 10px;">
              *** Thank You! Visit Again ***
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button id="btn-print-pos-receipt" class="btn btn-primary" style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; font-weight: 700; background: #10b981; border: none; color: #fff; border-radius: 8px; cursor: pointer;">
              <i data-lucide="printer" style="width: 15px; height: 15px;"></i> Print Slip & Open Tray
            </button>
            <button id="btn-close-pos-receipt" class="btn btn-secondary" style="flex: 1; padding: 10px; font-weight: 600; border-radius: 8px; border: 1px solid #ccc; background: #f3f4f6; color: #333; cursor: pointer;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();

    document.getElementById('btn-close-pos-receipt')?.addEventListener('click', closeModal);
    document.getElementById('btn-x-close-pos-receipt')?.addEventListener('click', closeModal);
    document.getElementById('pos-receipt-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'pos-receipt-modal-backdrop') {
        closeModal();
      }
    });

    document.getElementById('btn-print-pos-receipt')?.addEventListener('click', () => {
      const printContents = document.getElementById('pos-thermal-slip').innerHTML;
      // Close modal immediately so user returns smoothly back to POS window
      closeModal();

      const win = window.open('', '_blank', 'width=380,height=500');
      if (win) {
        win.document.write(`
          <html>
            <head><title>Receipt - ${txn.id}</title></head>
            <body style="font-family:'Courier New', monospace; margin: 0; padding: 10px;" onload="window.print(); window.close();">
              ${printContents}
            </body>
          </html>
        `);
        win.document.close();
      }
    });
  }

  // Quick Add Customer Modal
  function openQuickAddCustomerModal() {
    const modalsContainer = document.getElementById('pos-modals-container');
    if (!modalsContainer) return;

    modalsContainer.innerHTML = `
      <div class="modal-backdrop show" style="display: flex; align-items: center; justify-content: center; z-index: 10000; position: fixed; inset: 0; background: rgba(0,0,0,0.8);">
        <div class="glass-card" style="width: 360px; max-width: 90vw; padding: 20px; border-radius: 12px;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="user-plus" style="width: 16px; height: 16px; color: var(--color-primary);"></i> Quick Add Customer
          </h3>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Customer Name *</label>
              <input type="text" id="modal-cust-name" class="form-control" placeholder="Full Name" style="font-size: 12px; height: 32px;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Phone Number</label>
              <input type="tel" id="modal-cust-phone" class="form-control" placeholder="Mobile Number" style="font-size: 12px; height: 32px;">
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button id="modal-cust-save-btn" class="btn btn-primary" style="flex: 1; padding: 8px; font-weight: 700; font-size: 12px;">Save Customer</button>
            <button id="modal-cust-cancel-btn" class="btn btn-secondary" style="flex: 1; padding: 8px; font-size: 12px;">Cancel</button>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();

    document.getElementById('modal-cust-cancel-btn')?.addEventListener('click', () => {
      modalsContainer.innerHTML = '';
    });

    document.getElementById('modal-cust-save-btn')?.addEventListener('click', () => {
      const name = document.getElementById('modal-cust-name')?.value.trim();
      const phone = document.getElementById('modal-cust-phone')?.value.trim();

      if (!name) {
        appInstance.showToast('Customer name is required!', 'warning');
        return;
      }

      const newCust = {
        id: 'CUST-' + Date.now().toString(36).toUpperCase(),
        name: name,
        phone: phone || '',
        credit: 0
      };

      store.customers.push(newCust);
      store.saveItem('cyberone_v2_customers', store.customers);
      store.syncDatabaseState();

      selectedCustomerId = newCust.id;

      // Update customer select options
      const custSelect = document.getElementById('pos-customer-select');
      if (custSelect) {
        custSelect.innerHTML = `
          <option value="">👤 Walk-in Customer</option>
          ${store.customers.map(c => `
            <option value="${c.id}" ${c.id === selectedCustomerId ? 'selected' : ''}>
              ${c.name} (${c.phone || 'No phone'})${c.credit > 0 ? ` [Credit ₹${c.credit.toFixed(0)}]` : ''}
            </option>
          `).join('')}
        `;
      }

      modalsContainer.innerHTML = '';
      appInstance.showToast(`Customer ${name} added!`, 'success');
    });
  }

  // Bind All Event Handlers
  function bindEventHandlers() {
    // Navigation mode switchers
    document.getElementById('pos-btn-back-selection')?.addEventListener('click', () => {
      window.location.hash = '#selection';
    });

    document.getElementById('pos-btn-goto-ledger')?.addEventListener('click', () => {
      window.location.hash = '#dashboard';
    });

    // Open Cash Tray manual button (Drawer kick pulse via receipt printer)
    document.getElementById('pos-btn-open-tray')?.addEventListener('click', () => {
      triggerCashDrawerKick();
    });

    // Refresh today log
    document.getElementById('pos-btn-refresh-txns')?.addEventListener('click', () => {
      renderDailyTransactionsLog();
      appInstance.showToast('Refreshed today\'s transactions log', 'info');
    });


    // Add Tile & Settings (Tiles Configuration Modal)
    document.getElementById('pos-btn-add-tile')?.addEventListener('click', openTilesConfigModal);
    document.getElementById('pos-btn-settings')?.addEventListener('click', openTilesConfigModal);

    // Quick add customer button
    document.getElementById('pos-quick-add-cust-btn')?.addEventListener('click', openQuickAddCustomerModal);

    // Customer select change
    const custSelect = document.getElementById('pos-customer-select');
    if (custSelect) {
      custSelect.addEventListener('change', () => {
        selectedCustomerId = custSelect.value;
        const alertBox = document.getElementById('pos-cust-credit-alert');
        const creditVal = document.getElementById('pos-cust-credit-val');
        if (selectedCustomerId) {
          const cust = store.customers.find(c => c.id === selectedCustomerId);
          if (cust && cust.credit > 0) {
            if (alertBox) alertBox.style.display = 'block';
            if (creditVal) creditVal.innerText = cust.credit.toFixed(2);
          } else {
            if (alertBox) alertBox.style.display = 'none';
          }
        } else {
          if (alertBox) alertBox.style.display = 'none';
        }
      });
    }

    // Category filter pills
    mountPoint.querySelectorAll('.pos-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        mountPoint.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat') || 'all';
        renderTiles();
      });
    });

    // Search bar
    const searchInp = document.getElementById('pos-search-input');
    const searchClear = document.getElementById('pos-search-clear');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        searchQuery = searchInp.value.trim();
        if (searchClear) searchClear.style.display = searchQuery ? 'block' : 'none';
        renderTiles();
      });
    }
    if (searchClear && searchInp) {
      searchClear.addEventListener('click', () => {
        searchInp.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        renderTiles();
      });
    }

    // Clear cart button
    document.getElementById('pos-cart-clear')?.addEventListener('click', () => {
      cart = [];
      customDeductionAmount = null;
      renderCart();
    });

    // Wallet primary buttons (Account, CSC, PayNearby - pure manual selection)
    mountPoint.querySelectorAll('.pos-source-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const source = btn.getAttribute('data-source');
        if (activeWalletSource === source) {
          selectFundingSource('none');
        } else {
          selectFundingSource(source);
        }
      });
    });

    // Other sources dropdown
    document.getElementById('pos-other-source-select')?.addEventListener('change', (e) => {
      selectFundingSource(e.target.value);
    });

    // Debit / Credit action toggle
    document.getElementById('pos-wallet-action-debit')?.addEventListener('click', () => {
      walletActionType = 'debit';
      document.getElementById('pos-wallet-action-debit').classList.add('active');
      document.getElementById('pos-wallet-action-credit').classList.remove('active');
    });
    document.getElementById('pos-wallet-action-credit')?.addEventListener('click', () => {
      walletActionType = 'credit';
      document.getElementById('pos-wallet-action-credit').classList.add('active');
      document.getElementById('pos-wallet-action-debit').classList.remove('active');
    });

    // Custom source cost input
    document.getElementById('pos-source-cost-input')?.addEventListener('input', (e) => {
      customDeductionAmount = parseFloat(e.target.value) || 0;
      renderCart();
    });

    // Multi-wallet toggle and add row
    document.getElementById('pos-toggle-multi-wallet')?.addEventListener('click', () => {
      isMultiWallet = !isMultiWallet;
      renderMultiWalletView();
      updateNetProfitDisplay();
    });

    document.getElementById('pos-btn-add-multi-row')?.addEventListener('click', () => {
      multiWalletDeductions.push({ source: 'csc', amount: 0 });
      renderMultiWalletView();
      updateNetProfitDisplay();
    });

    // Payment mode tender buttons
    mountPoint.querySelectorAll('.pos-pay-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        mountPoint.querySelectorAll('.pos-pay-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        paymentMode = btn.getAttribute('data-mode') || 'Cash';

        const cashBox = document.getElementById('pos-cash-tender-box');
        const splitBox = document.getElementById('pos-split-tender-box');

        if (paymentMode === 'Cash') {
          if (cashBox) cashBox.style.display = 'flex';
          if (splitBox) splitBox.style.display = 'none';
        } else if (paymentMode === 'Split') {
          if (cashBox) cashBox.style.display = 'none';
          if (splitBox) splitBox.style.display = 'flex';
          
          // Pre-populate split with half-and-half if currently blank
          const total = getCartTotal();
          const splitCashInp = document.getElementById('pos-split-cash');
          const splitUpiInp = document.getElementById('pos-split-upi');
          if (splitCashInp && splitUpiInp) {
            const curCash = parseFloat(splitCashInp.value) || 0;
            const curUpi = parseFloat(splitUpiInp.value) || 0;
            if (curCash === 0 && curUpi === 0 && total > 0) {
              const half = Math.floor(total / 2);
              splitCashInp.value = half > 0 ? half : '0';
              splitUpiInp.value = (total - half).toFixed(2);
            }
          }
          updateSplitStatusIndicator();
        } else {
          if (cashBox) cashBox.style.display = 'none';
          if (splitBox) splitBox.style.display = 'none';
        }
        updateTenderCalculations();
      });
    });

    // Cash tendered input & exact button
    document.getElementById('pos-cash-tendered-input')?.addEventListener('input', updateTenderCalculations);
    document.getElementById('pos-tender-exact-btn')?.addEventListener('click', () => {
      const cashInp = document.getElementById('pos-cash-tendered-input');
      if (cashInp) {
        cashInp.value = getCartTotal().toFixed(0);
        updateTenderCalculations();
      }
    });

    // Split two-way inputs & quick buttons
    document.getElementById('pos-split-cash')?.addEventListener('input', onSplitCashChanged);
    document.getElementById('pos-split-upi')?.addEventListener('input', onSplitUpiChanged);

    document.getElementById('pos-split-half')?.addEventListener('click', () => {
      const total = getCartTotal();
      const half = Math.floor(total / 2);
      const splitCashInp = document.getElementById('pos-split-cash');
      const splitUpiInp = document.getElementById('pos-split-upi');
      if (splitCashInp) splitCashInp.value = half > 0 ? half : '0';
      if (splitUpiInp) splitUpiInp.value = (total - half).toFixed(2);
      updateSplitStatusIndicator();
    });

    document.getElementById('pos-split-all-cash')?.addEventListener('click', () => {
      const total = getCartTotal();
      const splitCashInp = document.getElementById('pos-split-cash');
      const splitUpiInp = document.getElementById('pos-split-upi');
      if (splitCashInp) splitCashInp.value = total.toFixed(2);
      if (splitUpiInp) splitUpiInp.value = '0';
      updateSplitStatusIndicator();
    });

    document.getElementById('pos-split-all-upi')?.addEventListener('click', () => {
      const total = getCartTotal();
      const splitCashInp = document.getElementById('pos-split-cash');
      const splitUpiInp = document.getElementById('pos-split-upi');
      if (splitCashInp) splitCashInp.value = '0';
      if (splitUpiInp) splitUpiInp.value = total.toFixed(2);
      updateSplitStatusIndicator();
    });

    // Complete Checkout button
    document.getElementById('pos-checkout-btn')?.addEventListener('click', completeSale);

    // F9 Keyboard shortcut
    const handleKeydown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        completeSale();
      }
    };
    window.addEventListener('keydown', handleKeydown);

    // Cleanup listener on unmount
    const observer = new MutationObserver(() => {
      if (!document.getElementById('pos-tiles-container')) {
        window.removeEventListener('keydown', handleKeydown);
        observer.disconnect();
      }
    });
    observer.observe(mountPoint, { childList: true });
  }

  // Initial Boot
  bindEventHandlers();
  renderTiles();
  renderCart();
  renderDailyTransactionsLog();
}
