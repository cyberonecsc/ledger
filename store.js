/* ==========================================================================
   CYBERONE Center Management Platform - State & Data Layer (store.js)
   ========================================================================== */

import { auth } from './auth.js';
import { firebaseService } from './firebase.js';
import { localSyncService } from './local_sync.js';


// Helper to get today's date in YYYY-MM-DD format
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial configuration for default opening balances (May 28, 2026)
const INITIAL_BALANCES = {
  cash: 0,
  petty_cash: 0,
  main_bob: 17729.76,
  csc: 1606.28,
  ibkart: 11.15,
  airtel_pb: 113.94,
  paynearby: 209.29,
  bsnl: 44,
  vi: 0,
  airtel: 448.35
};

const INITIAL_SERVICE_TYPES = [
  "e-District Application",
  "PAN Card Application",
  "Passport Registration",
  "Aadhaar Update",
  "Print / Copy Service",
  "Mobile Recharge",
  "KSEB Bill Payout",
  "AEPS Cash Withdrawal",
  "PVC Card Service",
  "PVC Lamination"
];

// Initial Wallets metadata
const INITIAL_WALLETS = [
  { id: 'csc', name: 'CSC Wallet', loginId: 'CSC-889920', commissionRate: 0.015, isActive: true, isAEPS: false },
  { id: 'paynearby', name: 'PayNearby (AEPS)', loginId: 'PNB-9844001', commissionRate: 0.002, isActive: true, isAEPS: true },
  { id: 'airtel_pb', name: 'Airtel Payments Bank', loginId: 'APB-773349', commissionRate: 0.0015, isActive: true, isAEPS: true },
  { id: 'ibkart', name: 'IBKART', loginId: 'IBK-6648', commissionRate: 0.01, isActive: true, isAEPS: false },
  { id: 'bsnl', name: 'BSNL Top-up', loginId: 'BSNL-8829', commissionRate: 0.03, isActive: true, isAEPS: false },
  { id: 'vi', name: 'VI Top-up', loginId: 'VI-99201', commissionRate: 0.032, isActive: true, isAEPS: false },
  { id: 'airtel', name: 'Airtel Retail', loginId: 'ARTL-4491', commissionRate: 0.028, isActive: true, isAEPS: false }
];

// Initial Bank accounts
const INITIAL_BANK_ACCOUNTS = [
  { id: 'main_bob', name: 'BOB A/C', bankName: 'Bank of Baroda', accountNumber: '34488299102', ifsc: 'BARB0ATTING', upiId: 'cyberone@barodampay' }
];

// Initial pre-registered customers matching common Kerala CYBER ONE citizen logs
const INITIAL_CUSTOMERS = [];

// Initial Staff profiles
const INITIAL_STAFF = [
  { id: '465314670016', name: 'SHIBU RAMACHANDRAN', role: 'owner', phone: '9048123456', baseSalary: 35000, isActive: true },
  { id: 'STAFF-02', name: 'Anil Kumar (Admin)', role: 'admin', phone: '9048111222', baseSalary: 20000, isActive: true },
  { id: 'STAFF-03', name: 'Saritha (Accountant)', role: 'accountant', phone: '9048333444', baseSalary: 18000, isActive: true },
  { id: 'STAFF-04', name: 'Manu (Staff)', role: 'staff', phone: '9048555666', baseSalary: 12000, isActive: true }
];

// Initial Products / Inventory items for CYBERONE/CSC stores
const INITIAL_PRODUCTS = [
  { id: 'PROD-A4', name: 'A4 paper', sku: 'A4-PAPER', category: 'Materials', buyPrice: 0.8, sellPrice: 2, stock: 500, minStock: 50, type: 'product', barcode: '' },
  { id: 'PROD-PVC', name: 'PVC Lamination pouch', sku: 'PVC-POUCH', category: 'Materials', buyPrice: 5, sellPrice: 10, stock: 100, minStock: 10, type: 'product', barcode: '' }
];

// Initial seeded Government G2C applications
const INITIAL_APPLICATIONS = [];

// Initial preseed websites for Kerala CSC operator
const INITIAL_WEBSITES = [
  { id: 'WEB-1', name: 'e-District Kerala', url: 'https://edistrict.kerala.gov.in/', userId: '', password: '', notes: 'Certificate applications & revenue services', visitCount: 0 },
  { id: 'WEB-2', name: 'Digital Seva / CSC', url: 'https://connect.digitalseva.gov.in/', userId: '', password: '', notes: 'CSC portal wallet & G2C services', visitCount: 0 },
  { id: 'WEB-3', name: 'Aadhaar Portal (UIDAI)', url: 'https://myaadhaar.uidai.gov.in/', userId: '', password: '', notes: 'Aadhaar downloads, updates, and verify', visitCount: 0 },
  { id: 'WEB-4', name: 'Income Tax Portal', url: 'https://www.incometax.gov.in/', userId: '', password: '', notes: 'PAN card services & filing return', visitCount: 0 },
  { id: 'WEB-5', name: 'EPFO Member Portal', url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', userId: '', password: '', notes: 'PF balance & withdrawal portal', visitCount: 0 }
];

// Master data structure loading from LocalStorage or initializing
class StateStore {
  constructor() {
    this.isDatabaseInitialized = false;
    this.syncStatus = 'synced';
    this.syncListeners = [];
    this.justMigratedCenterCode = false;
    this.loadState();
    
    // Auto-sync when auth state changes (user management / privileges updates)
    auth.onStateChange(() => {
      this.persistAll();
    });
  }

  onSyncStatusChange(listener) {
    this.syncListeners.push(listener);
    listener(this.syncStatus);
  }

  setSyncStatus(status) {
    if (this.syncStatus !== status) {
      this.syncStatus = status;
      this.syncListeners.forEach(listener => {
        try {
          listener(status);
        } catch (e) {
          console.error('Error triggering sync status listener:', e);
        }
      });
    }
  }

  loadState() {
    if (auth && typeof auth.reloadUsers === 'function') {
      auth.reloadUsers();
    }
    
    // Force a one-off database sync refresh to clear stale local timestamp blockages
    if (localStorage.getItem('cyberone_v2_sync_force_v4') !== 'true') {
      localStorage.setItem('cyberone_v2_last_modified', '1970-01-01T00:00:00Z');
      localStorage.setItem('cyberone_v2_sync_force_v4', 'true');
    }
    
    this.wallets = this.getItem('cyberone_v2_wallets', INITIAL_WALLETS);
    // Remove the extra wallets added in the previous version if they exist
    this.wallets = this.wallets.filter(w => w.id !== 'digipay_lite_w1' && w.id !== 'digipay_lite_w2' && w.id !== 'digipay');
    this.saveItem('cyberone_v2_wallets', this.wallets);

    this.bankAccounts = this.getItem('cyberone_v2_bank_accounts', INITIAL_BANK_ACCOUNTS);
    this.websites = this.getItem('cyberone_v2_websites', INITIAL_WEBSITES);
    this.initialBalances = this.getItem('cyberone_v2_initial_balances', INITIAL_BALANCES);
    if (this.initialBalances.petty_cash === undefined) {
      this.initialBalances.petty_cash = 0;
      this.saveItem('cyberone_v2_initial_balances', this.initialBalances);
    }
    
    // Seed initial sub-wallet balances dynamically for any dual wallets
    this.wallets.forEach(w => {
      const isDual = w.id === 'aeps_kntny' || w.name.toLowerCase().includes('digipay lite');
      if (isDual) {
        if (this.initialBalances[w.id + '_w1'] === undefined) this.initialBalances[w.id + '_w1'] = 0;
        if (this.initialBalances[w.id + '_w2'] === undefined) this.initialBalances[w.id + '_w2'] = 0;
      }
    });

    this.aepsTransactions = this.getItem('cyberone_v2_aeps_transactions', []);
    this.customers = this.getItem('cyberone_v2_customers', INITIAL_CUSTOMERS);
    
    // Reconstruct staff list dynamically from active credentials
    const storedStaff = this.getItem('cyberone_v2_staff', INITIAL_STAFF);
    const rawUsers = localStorage.getItem('cyberone_v2_users');
    const activeUsers = rawUsers ? JSON.parse(rawUsers) : [{ username: 'SHIBURCN', name: 'SHIBU RAMACHANDRAN', role: 'owner', password: 'John@392091', staffId: '465314670016' }];
    this.staff = activeUsers.map(user => {
      const existing = storedStaff.find(s => s.id === user.username || s.id === `STAFF-${user.username}` || s.name === user.name || s.id === user.staffId);
      let baseSal = user.baseSalary !== undefined && user.baseSalary !== null ? parseFloat(user.baseSalary) : (user.role === 'owner' ? 35000 : (user.role === 'admin' ? 20000 : (user.role === 'accountant' ? 18000 : 12000)));
      if (existing && (user.baseSalary === undefined || user.baseSalary === null)) {
        baseSal = existing.baseSalary;
      }
      return {
        id: user.staffId || user.username,
        name: user.name,
        role: user.role,
        phone: user.mobile || (existing ? existing.phone : ''),
        baseSalary: baseSal,
        isActive: true
      };
    });
    this.saveItem('cyberone_v2_staff', this.staff);

    this.products = this.getItem('cyberone_v2_products', INITIAL_PRODUCTS);
    this.serviceTypes = this.getItem('cyberone_v2_service_types', INITIAL_SERVICE_TYPES);
    this.applications = this.getItem('cyberone_v2_applications', INITIAL_APPLICATIONS);
    this.invoices = this.getItem('cyberone_v2_invoices', this.getSeededInvoices());
    this.openingOverrides = this.getItem('cyberone_v2_opening_overrides', {});
    this.closingOverrides = this.getItem('cyberone_v2_closing_overrides', {});
    this.dailyLogs = this.getItem('cyberone_v2_daily_logs', null);
    
    // Default Center Profile
    const defaultProfile = {
      name: "CYBERONE CSC",
      code: "465314670016",
      address: "Room 4B, Central Arcade, Attingal",
      city: "ATTINGAL",
      state: "KERALA",
      pin: "695101",
      landPhone: "0470-2998476",
      mobile: "9072809735",
      email: "attingal@cyberonecsc.com",
      gstin: "32ARKPR0860N1ZF"
    };
    this.centerProfile = { ...defaultProfile, ...this.getItem('cyberone_v2_center_profile', {}) };
    
    // Auto-migrate legacy default center code to the real active center code
    if (this.centerProfile.code === 'CYBER-ATT-14') {
      console.log("Migration: Migrating legacy default center code CYBER-ATT-14 to 465314670016");
      this.centerProfile.code = '465314670016';
      this.centerProfile.name = 'CYBERONE CSC';
      this.centerProfile.landPhone = '0470-2998476';
      this.centerProfile.mobile = '9072809735';
      this.centerProfile.gstin = '32ARKPR0860N1ZF';
      this.saveItem('cyberone_v2_center_profile', this.centerProfile);
      this.justMigratedCenterCode = true;
    }

    this.activityLogs = this.getItem('cyberone_v2_activity_logs', []);
    
    // If dailyLogs doesn't exist, we seed an empty ledger sheet for today's date
    if (!this.dailyLogs) {
      this.dailyLogs = {};
      const seedDate = getTodayDateString();
      this.dailyLogs[seedDate] = {
        date: seedDate,
        openingBalances: { ...this.initialBalances },
        transactions: [],
        closingBalances: { ...this.initialBalances }
      };
      
      this.recalculateAllBalances();
    }

    // Clean up/remove edistrict wallet if it is present in active state database
    if (this.wallets.some(w => w.id === 'edistrict')) {
      this.wallets = this.wallets.filter(w => w.id !== 'edistrict');
      this.saveItem('cyberone_v2_wallets', this.wallets);
    }



    // Auto-remove Federal Bank (fed_retail) if present in active state database
    if (this.bankAccounts.some(b => b.id === 'fed_retail')) {
      this.bankAccounts = this.bankAccounts.filter(b => b.id !== 'fed_retail');
      this.saveItem('cyberone_v2_bank_accounts', this.bankAccounts);
    }

    // Migration: Migrate SBI Bank Account (main_sbi) to Bank of Baroda (main_bob)
    let needRecalculate = false;
    let migratedBank = false;

    this.bankAccounts.forEach(b => {
      if (b.id === 'main_sbi') {
        b.id = 'main_bob';
        b.name = 'BOB A/C';
        b.bankName = 'Bank of Baroda';
        b.accountNumber = '34488299102';
        b.ifsc = 'BARB0ATTING';
        b.upiId = 'cyberone@barodampay';
        migratedBank = true;
      }
    });

    if (migratedBank) {
      this.saveItem('cyberone_v2_bank_accounts', this.bankAccounts);
    }

    if (this.initialBalances && this.initialBalances.main_sbi !== undefined) {
      this.initialBalances.main_bob = this.initialBalances.main_sbi;
      delete this.initialBalances.main_sbi;
      this.saveItem('cyberone_v2_initial_balances', this.initialBalances);
      needRecalculate = true;
    }

    if (this.dailyLogs) {
      Object.keys(this.dailyLogs).forEach(date => {
        const log = this.dailyLogs[date];
        if (!log) return;
        
        // Migrate opening/closing balances keys
        if (log.openingBalances) {
          if (log.openingBalances.main_sbi !== undefined) {
            log.openingBalances.main_bob = log.openingBalances.main_sbi;
            delete log.openingBalances.main_sbi;
            needRecalculate = true;
          }
        }
        if (log.closingBalances) {
          if (log.closingBalances.main_sbi !== undefined) {
            log.closingBalances.main_bob = log.closingBalances.main_sbi;
            delete log.closingBalances.main_sbi;
            needRecalculate = true;
          }
        }

        // Migrate transactions referencing main_sbi
        if (log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.bankId === 'main_sbi') {
              txn.bankId = 'main_bob';
              needRecalculate = true;
            }
            if (txn.deductedFrom === 'main_sbi') {
              txn.deductedFrom = 'main_bob';
              needRecalculate = true;
            }
            if (txn.targetWallet === 'main_sbi') {
              txn.targetWallet = 'main_bob';
              needRecalculate = true;
            }
            if (txn.source === 'main_sbi') {
              txn.source = 'main_bob';
              needRecalculate = true;
            }
            if (txn.sourceId === 'main_sbi') {
              txn.sourceId = 'main_bob';
              needRecalculate = true;
            }
          });
        }
      });
    }

    if (this.dailyLogs) {
      Object.keys(this.dailyLogs).forEach(date => {
        const log = this.dailyLogs[date];
        // Clean up any transactions referencing edistrict or digipay
        if (log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.deductedFrom === 'edistrict' || txn.deductedFrom === 'digipay') {
              txn.deductedFrom = 'csc';
              needRecalculate = true;
            }
            if (txn.targetWallet === 'edistrict' || txn.targetWallet === 'digipay') {
              txn.targetWallet = 'csc';
              needRecalculate = true;
            }
            if (txn.source === 'edistrict' || txn.source === 'digipay') {
              txn.source = 'csc';
              needRecalculate = true;
            }
          });
        }
        if (log.openingBalances && log.openingBalances.edistrict !== undefined) {
          delete log.openingBalances.edistrict;
          needRecalculate = true;
        }
        if (log.closingBalances && log.closingBalances.edistrict !== undefined) {
          delete log.closingBalances.edistrict;
          needRecalculate = true;
        }

      });
    }

    // Migration: Clean up all data before June 1, 2026 to start fresh
    let clearedMay = false;
    if (this.dailyLogs) {
      Object.keys(this.dailyLogs).forEach(date => {
        if (date.startsWith('2026-05-') || date < '2026-06-01') {
          delete this.dailyLogs[date];
          clearedMay = true;
        }
      });
    }
    if (this.openingOverrides) {
      Object.keys(this.openingOverrides).forEach(date => {
        if (date.startsWith('2026-05-') || date < '2026-06-03') {
          delete this.openingOverrides[date];
          clearedMay = true;
        }
      });
    }
    if (this.closingOverrides) {
      Object.keys(this.closingOverrides).forEach(date => {
        if (date !== '2026-05-31' && (date.startsWith('2026-05-') || date < '2026-06-03')) {
          delete this.closingOverrides[date];
          clearedMay = true;
        }
      });
    }
    if (this.activityLogs) {
      const originalLength = this.activityLogs.length;
      this.activityLogs = this.activityLogs.filter(log => {
        if (log.timestamp && (log.timestamp.startsWith('2026-05-') || log.timestamp < '2026-06-01T00:00:00')) {
          return false;
        }
        if (log.details && (log.details.includes('2026-05-') || log.details.includes('on date 2026-05-') || log.details.includes('date 2026-05-') || log.details.includes('date 2026-04-'))) {
          return false;
        }
        return true;
      });
      if (this.activityLogs.length !== originalLength) {
        clearedMay = true;
      }
    }
    if (clearedMay) {
      this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
      this.saveItem('cyberone_v2_opening_overrides', this.openingOverrides);
      this.saveItem('cyberone_v2_closing_overrides', this.closingOverrides);
      this.saveItem('cyberone_v2_activity_logs', this.activityLogs);
      this.saveItem('cyberone_v2_last_modified', new Date().toISOString());
      this.persistAll();
    }

    // Migration: Update existing sale transactions to split service charge proportionally
    let updatedServiceCharges = false;
    if (this.dailyLogs) {
      Object.keys(this.dailyLogs).forEach(date => {
        const log = this.dailyLogs[date];
        if (log && log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.type === 'sale') {
              const amount = parseFloat(txn.amount || 0);
              let cost = 0;
              if (txn.deductions && Array.isArray(txn.deductions)) {
                cost = txn.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
              } else {
                cost = parseFloat(txn.deductedAmount || 0);
              }
              const gst = parseFloat(txn.gstAmount || 0);
              const profit = amount - cost - gst;

              const cash = parseFloat(txn.paidByCash || 0);
              const upi = parseFloat(txn.paidByUPI || 0);
              const totalPaid = cash + upi;

              let newScCash = 0;
              let newScAcc = 0;
              if (totalPaid > 0) {
                const cashRatio = cash / totalPaid;
                newScCash = parseFloat((profit * cashRatio).toFixed(2));
                newScAcc = parseFloat((profit * (1 - cashRatio)).toFixed(2));
              } else {
                newScAcc = parseFloat(profit.toFixed(2));
              }

              if (txn.serviceChargeToCash !== newScCash || txn.serviceChargeToAccount !== newScAcc) {
                txn.serviceChargeToCash = newScCash;
                txn.serviceChargeToAccount = newScAcc;
                updatedServiceCharges = true;
              }
            }
          });
        }
      });
    }
    if (updatedServiceCharges) {
      this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
      this.saveItem('cyberone_v2_last_modified', new Date().toISOString());
    }

    // Migration: Retroactively register missing G2C applications for existing transactions
    let updatedMissingApps = false;
    if (this.dailyLogs) {
      const g2cKeywords = ['application', 'certificate', 'registration', 'passport', 'aadhaar', 'pan card', 'pancard', 'license', 'licence', 'admission', 'pension', 'edistrict', 'e-district'];
      Object.keys(this.dailyLogs).forEach(date => {
        const log = this.dailyLogs[date];
        if (log && log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.type === 'sale') {
              const descLower = (txn.description || '').toLowerCase();
              const isG2C = g2cKeywords.some(kw => descLower.includes(kw));
              if (isG2C) {
                const txnId = txn.id;
                const hasApp = this.applications.some(a => a.transactionId === txnId || a.id === txn.applicationId || (a.notes && a.notes.includes(`Auto-created from transaction ${txnId}`)));
                if (!hasApp) {
                  const appId = 'APP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                  let cost = 0;
                  if (txn.deductions && Array.isArray(txn.deductions)) {
                    cost = txn.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                  } else {
                    cost = parseFloat(txn.deductedAmount || 0);
                  }
                  const amount = parseFloat(txn.amount || 0);
                  const newApp = {
                    id: appId,
                    customerId: txn.customerId || '',
                    serviceType: txn.description,
                    applicationNumber: '',
                    status: 'submitted',
                    assignedStaffId: txn.staffId || '465314670016',
                    feePaid: cost,
                    serviceCharge: parseFloat((amount - cost).toFixed(2)),
                    lastUpdated: date,
                    notes: `Auto-created from transaction ${txnId}`,
                    transactionId: txnId
                  };
                  this.applications.push(newApp);
                  txn.applicationId = appId;
                  updatedMissingApps = true;
                  console.log(`Auto-created missing application ${appId} for transaction ${txnId} (${txn.description}) on date ${date}`);
                }
              }
            }
          });
        }
      });
    }
    if (updatedMissingApps) {
      this.saveItem('cyberone_v2_applications', this.applications);
      this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
      this.saveItem('cyberone_v2_last_modified', new Date().toISOString());
    }

    // Migration: retroactively create customer visit log entries for past AEPS/DMT transactions
    if (this.aepsTransactions && this.customers) {
      this.aepsTransactions.forEach(t => {
        if (t.customerName && t.mobile && t.status === 'Success') {
          this.registerCustomerFromAeps(t.customerName, t.mobile, t.date, t);
        }
      });
    }

    // Always recalculate all balances on startup to guarantee database consistency
    this.recalculateAllBalances(true);
  }

  getSeededInvoices() {
    return [];
  }

  getItem(key, fallback) {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return fallback;
    try {
      return JSON.parse(val);
    } catch (e) {
      console.error("Error parsing localStorage key: " + key, e);
      return fallback;
    }
  }

  saveItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  saveToLocalStorage() {
    this.saveItem('cyberone_v2_wallets', this.wallets);
    this.saveItem('cyberone_v2_bank_accounts', this.bankAccounts);
    this.saveItem('cyberone_v2_initial_balances', this.initialBalances);
    this.saveItem('cyberone_v2_customers', this.customers);
    this.saveItem('cyberone_v2_staff', this.staff);
    this.saveItem('cyberone_v2_products', this.products);
    this.saveItem('cyberone_v2_service_types', this.serviceTypes);
    this.saveItem('cyberone_v2_applications', this.applications);
    this.saveItem('cyberone_v2_invoices', this.invoices);
    this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
    this.saveItem('cyberone_v2_center_profile', this.centerProfile);
    this.saveItem('cyberone_v2_websites', this.websites);
    this.saveItem('cyberone_v2_aeps_transactions', this.aepsTransactions);
  }

  persistAll() {
    if (!this.isDatabaseInitialized) {
      console.log("Sync: Database not initialized yet. Skipping persistAll to avoid overwriting with defaults.");
      return;
    }
    
    // Set offline changes flag to true before saving locally and writing to Firebase
    this.hasOfflineChanges = true;
    localStorage.setItem('cyberone_v2_has_offline_changes', 'true');
    localStorage.setItem('cyberone_v2_last_modified', new Date().toISOString());
    
    this.saveToLocalStorage();
    
    // Always write to local server disk immediately to keep local copy updated in real-time
    this.syncDatabaseState();
    
    const syncProvider = localStorage.getItem('cyberone_v2_sync_provider') || 'firebase';

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
          'cyberone_v2_github_branch',
          'cyberone_v2_has_offline_changes' // Exclude local offline changes flag from payload
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

    if (syncProvider === 'selfhosted' && localSyncService.isInitialized()) {
      this.setSyncStatus('syncing');
      localSyncService.saveData(payload)
        .then(success => {
          if (success) {
            console.log("Self-Hosted: Saved database state successfully");
            this.hasOfflineChanges = false;
            localStorage.setItem('cyberone_v2_has_offline_changes', 'false');
            this.setSyncStatus('synced');
          } else {
            console.error("Self-Hosted: Database save failed");
            this.setSyncStatus('error');
          }
        });
    } else if (syncProvider === 'firebase' && firebaseService.isInitialized()) {
      this.setSyncStatus('syncing');
      firebaseService.saveData(this.centerProfile.code, payload)
        .then(success => {
          if (success) {
            console.log("Firebase: Saved database state successfully");
            this.hasOfflineChanges = false;
            localStorage.setItem('cyberone_v2_has_offline_changes', 'false');
            this.setSyncStatus('synced');
          } else {
            console.error("Firebase: Database save failed");
            this.setSyncStatus('error');
          }
        });
    }
  }

  updateInitialBalances(balances) {
    this.initialBalances = { ...this.initialBalances, ...balances };
    
    // Clear any overrides for June 1st and June 2nd to prevent conflicts
    let overridesCleared = false;
    ['2026-06-01', '2026-06-02'].forEach(date => {
      if (this.openingOverrides && this.openingOverrides[date]) {
        delete this.openingOverrides[date];
        overridesCleared = true;
      }
      if (this.closingOverrides && this.closingOverrides[date]) {
        delete this.closingOverrides[date];
        overridesCleared = true;
      }
    });
    if (this.closingOverrides && this.closingOverrides['2026-05-31']) {
      this.closingOverrides['2026-05-31'] = { ...this.closingOverrides['2026-05-31'], ...balances };
      overridesCleared = true;
    }
    if (overridesCleared) {
      this.saveItem('cyberone_v2_opening_overrides', this.openingOverrides);
      this.saveItem('cyberone_v2_closing_overrides', this.closingOverrides);
    }

    this.logActivity('Edit Initial Balances', `Updated initial opening balances: ${JSON.stringify(balances)}`);
    this.persistAll();
    this.recalculateAllBalances();
    return true;
  }

  setOpeningOverride(dateString, balances) {
    if (!this.openingOverrides) this.openingOverrides = {};
    this.openingOverrides[dateString] = { ...this.openingOverrides[dateString], ...balances };
    this.saveItem('cyberone_v2_opening_overrides', this.openingOverrides);
    this.recalculateAllBalances();
    this.persistAll();
  }

  setClosingOverride(dateString, balances) {
    if (!this.closingOverrides) this.closingOverrides = {};
    this.closingOverrides[dateString] = { ...this.closingOverrides[dateString], ...balances };
    this.saveItem('cyberone_v2_closing_overrides', this.closingOverrides);
    this.recalculateAllBalances();
    this.persistAll();
  }

  resetDatabaseToJuneFirst() {
    this.dailyLogs = {};
    this.customers = [];
    this.applications = [];
    this.invoices = [];
    this.activityLogs = [];
    this.aepsTransactions = [];
    this.openingOverrides = {};
    this.closingOverrides = {};
    
    this.initialBalances = {
      cash: 0,
      petty_cash: 0
    };
    
    this.bankAccounts.forEach(b => {
      this.initialBalances[b.id] = 0;
    });
    this.wallets.forEach(w => {
      this.initialBalances[w.id] = 0;
    });

    const cleanDate = '2026-06-01';
    this.dailyLogs[cleanDate] = {
      date: cleanDate,
      openingBalances: { ...this.initialBalances },
      transactions: [],
      closingBalances: { ...this.initialBalances }
    };

    localStorage.setItem('cyberone_v2_active_date', cleanDate);

    this.saveItem('cyberone_v2_opening_overrides', this.openingOverrides);
    this.saveItem('cyberone_v2_closing_overrides', this.closingOverrides);
    this.saveItem('cyberone_v2_activity_logs', this.activityLogs);
    
    this.persistAll();
    this.recalculateAllBalances();
    this.logActivity('System Reset', 'Database reset to a clean June 1, 2026 starting state.');
  }

  updateCenterProfile(profileData) {
    this.centerProfile = {
      ...this.centerProfile,
      ...profileData
    };
    this.logActivity('Edit Profile', `Updated center profile settings: ${profileData.name}`);
    this.persistAll();
    return true;
  }

  addServiceType(name) {
    if (!name) return;
    const trimmed = name.trim();
    if (trimmed && !this.serviceTypes.includes(trimmed)) {
      this.serviceTypes.push(trimmed);
      this.persistAll();
    }
  }

  findProductByBarcode(barcode) {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim().toLowerCase();
    return this.products.find(p => p.barcode && p.barcode.trim().toLowerCase() === cleanBarcode) || null;
  }

  logActivity(action, details) {
    const username = (auth && auth.currentUser) ? auth.currentUser.name : 'System';
    const logEntry = {
      id: 'ACT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      user: username,
      action: action,
      details: details
    };
    if (!this.activityLogs) {
      this.activityLogs = [];
    }
    this.activityLogs.unshift(logEntry);
    this.saveItem('cyberone_v2_activity_logs', this.activityLogs);
    return logEntry;
  }

  getActivityLogs() {
    return this.activityLogs || [];
  }

  // Double-entry automation calculations for the whole chain
  recalculateAllBalances(preventPersist = false) {
    // Sort log dates chronologically
    const sortedDates = Object.keys(this.dailyLogs).sort();
    if (sortedDates.length === 0) return;

    let previousClosingBalances = null;

    sortedDates.forEach((dateString, idx) => {
      const log = this.dailyLogs[dateString];

      // If it is the first day, its opening balance is either initialized or set manually
      if (idx === 0) {
        // Check if there is a closing override for the day before this date (e.g. May 31st closing balance)
        const parts = dateString.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(Date.UTC(y, m, d));
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        const dayBefore = dateObj.toISOString().split('T')[0];

        if (this.closingOverrides && this.closingOverrides[dayBefore]) {
          log.openingBalances = { ...this.initialBalances, ...this.closingOverrides[dayBefore] };
        } else {
          log.openingBalances = { ...this.initialBalances };
        }
      } else {
        // Roll forward from the previous day's closing balances
        log.openingBalances = { ...previousClosingBalances };
      }

      // Apply overrides for the specific day if any exist
      if (this.openingOverrides && this.openingOverrides[dateString]) {
        log.openingBalances = { ...log.openingBalances, ...this.openingOverrides[dateString] };
      }

      // Compute closing balances for the day
      const balances = { ...log.openingBalances };

      // Ensure all current wallets and bank accounts exist in balances
      this.bankAccounts.forEach(b => {
        if (balances[b.id] === undefined) {
          balances[b.id] = 0;
        }
      });
      this.wallets.forEach(w => {
        const isDual = w.id === 'aeps_kntny' || w.name.toLowerCase().includes('digipay lite');
        if (isDual) {
          if (balances[w.id + '_w1'] === undefined) balances[w.id + '_w1'] = 0;
          if (balances[w.id + '_w2'] === undefined) balances[w.id + '_w2'] = 0;
        } else {
          if (balances[w.id] === undefined) balances[w.id] = 0;
        }
      });

      if (log.transactions) {
        log.transactions.forEach(txn => {
          if (txn.type === 'sale') {
          // Cash income
          if (txn.paidByCash) {
            balances.cash = parseFloat((balances.cash + parseFloat(txn.paidByCash)).toFixed(2));
          }
          // UPI/Bank income
          if (txn.paidByUPI) {
            const bankId = txn.bankId || 'main_bob';
            balances[bankId] = parseFloat(((balances[bankId] || 0) + parseFloat(txn.paidByUPI)).toFixed(2));
          }
          // Wallet/Account cost deduction
          if (txn.deductions && Array.isArray(txn.deductions)) {
            txn.deductions.forEach(ded => {
              const walletId = ded.source;
              const cost = parseFloat(ded.amount || 0);
              if (walletId && walletId !== 'none') {
                const targetId = walletId === 'account' ? 'main_bob' : walletId;
                if (balances[targetId] !== undefined) {
                  balances[targetId] = parseFloat((balances[targetId] - cost).toFixed(2));
                } else {
                  balances[targetId] = parseFloat((-cost).toFixed(2));
                }
              }
            });
          } else if (txn.deductedFrom && txn.deductedFrom !== 'none') {
            let walletId = txn.deductedFrom;
            if (walletId === 'aeps_kntny') {
              walletId = 'aeps_kntny_w1';
            }
            const cost = parseFloat(txn.deductedAmount || 0);

            const targetId = walletId === 'account' ? 'main_bob' : walletId;
            if (balances[targetId] !== undefined) {
              balances[targetId] = parseFloat((balances[targetId] - cost).toFixed(2));
            } else {
              balances[targetId] = parseFloat((-cost).toFixed(2));
            }
          }
        } else if (txn.type === 'deposit') {
          const amt = parseFloat(txn.amount);
          let walletId = txn.targetWallet;
          if (walletId === 'aeps_kntny') {
            walletId = 'aeps_kntny_w2';
          }
          
          if (txn.source === 'cash') {
            // Cash Deposit to Bank
            balances.cash = parseFloat((balances.cash - amt).toFixed(2));
            const targetId = walletId === 'account' ? 'main_bob' : walletId;
            balances[targetId] = parseFloat(((balances[targetId] || 0) + amt).toFixed(2));
          } else {
            // Transfer from Bank Account to Digital Wallet
            let sourceId = txn.source === 'account' ? 'main_bob' : txn.source;
            if (sourceId === 'aeps_kntny') {
              sourceId = 'aeps_kntny_w2';
            }
            if (balances[sourceId] !== undefined) {
              balances[sourceId] = parseFloat((sourceId === 'cash' ? balances.cash : balances[sourceId] - amt).toFixed(2));
            }
            
            const targetId = walletId === 'account' ? 'main_bob' : walletId;
            if (balances[targetId] !== undefined) {
              balances[targetId] = parseFloat((balances[targetId] + amt).toFixed(2));
            } else {
              balances[targetId] = amt;
            }
          }
        } else if (txn.type === 'expense' || txn.type === 'salary') {
          // Outflow expense
          const amt = parseFloat(txn.amount);
          const source = txn.source === 'account' ? 'main_bob' : txn.source; // 'cash' or bank account ID
          
          if (balances[source] !== undefined) {
            balances[source] = parseFloat((balances[source] - amt).toFixed(2));
          }
        } else if (txn.type === 'adjustment') {
          const target = txn.sourceId;
          const diff = parseFloat(txn.diff || 0);
          if (balances[target] !== undefined) {
            balances[target] = parseFloat((balances[target] + diff).toFixed(2));
          } else {
            balances[target] = diff;
          }
        }
      });
      }

      // Reconcile AEPS / DMT transactions
      if (this.aepsTransactions) {
        const dateAepsTxns = this.aepsTransactions.filter(t => t.date === dateString && t.status === 'Success');
        dateAepsTxns.forEach(t => {
          const amt = parseFloat(t.amount || 0);
          const wallet = this.wallets.find(w => w.id === t.walletId);
          const isDual = wallet && (wallet.id === 'aeps_kntny' || wallet.name.toLowerCase().includes('digipay lite'));
          const svc = parseFloat(t.serviceCharge || 0);
          const comm = parseFloat(t.commission || 0);

          if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
            // Wallet balance increases by amount - serviceCharge + commission, Cash decreases by amount (cash paid to customer)
            // primarily all withdrawal cash is coming to Wallet 2
            const key = isDual ? `${t.walletId}_w2` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] + amt - svc + comm).toFixed(2));
            }
            balances.cash = parseFloat((balances.cash - amt).toFixed(2));
          } else if (t.type === 'DMT') {
            // Wallet 1 is only for DMT. Service charge is deducted, commission is credited.
            // If customer pays by UPI, target bank increases, otherwise cash drawer increases.
            const key = isDual ? `${t.walletId}_w1` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] - amt - svc + comm).toFixed(2));
            }
            if (t.paymentMethod === 'UPI') {
              const bId = t.bankId || 'main_bob';
              if (balances[bId] !== undefined) {
                balances[bId] = parseFloat((balances[bId] + amt + svc).toFixed(2));
              }
            } else {
              balances.cash = parseFloat((balances.cash + amt + svc).toFixed(2));
            }
          } else if (t.type === 'Deposit' || t.type === 'Account Opening') {
            // Deposits and Account Openings go to Wallet 1
            const key = isDual ? `${t.walletId}_w1` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] - amt - svc + comm).toFixed(2));
            }
            if (t.paymentMethod === 'UPI') {
              const bId = t.bankId || 'main_bob';
              if (balances[bId] !== undefined) {
                balances[bId] = parseFloat((balances[bId] + amt).toFixed(2));
              }
            } else {
              balances.cash = parseFloat((balances.cash + amt).toFixed(2));
            }
          } else if (t.type === 'Agent Authorisation') {
            // Daily Agent Authorisation Charge - direct wallet debit, cash drawer unaffected.
            // Deducted from Wallet 2 for dual wallets.
            const key = isDual ? `${t.walletId}_w2` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] - amt - svc + comm).toFixed(2));
            }
          } else if (t.type === 'Bank Cashout') {
            // Wallet balance decreases, Bank Account increases
            // bank cashouts happen from Wallet 2
            const key = isDual ? `${t.walletId}_w2` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] - amt - svc + comm).toFixed(2));
            }
            const bankId = t.bankId || 'main_bob';
            if (balances[bankId] !== undefined) {
              balances[bankId] = parseFloat((balances[bankId] + amt).toFixed(2));
            }
          } else if (t.type === 'Wallet Transfer') {
            // Transfer between Wallet 1 and Wallet 2
            if (isDual) {
              const srcKey = t.direction === 'w2_to_w1' ? `${t.walletId}_w2` : `${t.walletId}_w1`;
              const tgtKey = t.direction === 'w2_to_w1' ? `${t.walletId}_w1` : `${t.walletId}_w2`;
              if (balances[srcKey] !== undefined) {
                balances[srcKey] = parseFloat((balances[srcKey] - amt).toFixed(2));
              }
              if (balances[tgtKey] !== undefined) {
                balances[tgtKey] = parseFloat((balances[tgtKey] + amt).toFixed(2));
              }
            }
          } else if (t.type === 'CSC Top-up') {
            // From Digipay (or Digipay Lite Wallet 2) to CSC Wallet
            const key = isDual ? `${t.walletId}_w2` : t.walletId;
            if (balances[key] !== undefined) {
              balances[key] = parseFloat((balances[key] - amt - svc + comm).toFixed(2));
            }
            if (balances.csc !== undefined) {
              balances.csc = parseFloat((balances.csc + amt).toFixed(2));
            }
          }

          // Customer Service Fee reconciliation (do not log on register but reconcile with cash/bank)
          const custFee = parseFloat(t.customerServiceFee || 0);
          if (custFee > 0) {
            if (t.customerServiceFeeMethod === 'UPI') {
              const bankId = t.bankId || 'main_bob';
              if (balances[bankId] !== undefined) {
                balances[bankId] = parseFloat((balances[bankId] + custFee).toFixed(2));
              }
            } else {
              balances.cash = parseFloat((balances.cash + custFee).toFixed(2));
            }
          }
        });
      }


      log.closingBalances = balances;
      if (this.closingOverrides && this.closingOverrides[dateString]) {
        log.closingBalances = { ...log.closingBalances, ...this.closingOverrides[dateString] };
      }
      previousClosingBalances = log.closingBalances;
    });

    if (!preventPersist) {
      this.persistAll();
    } else {
      this.saveToLocalStorage();
    }
  }

  // Retrieve current active balances (corresponds to the latest date's closing balances)
  getCurrentBalances() {
    const sortedDates = Object.keys(this.dailyLogs).sort();
    if (sortedDates.length === 0) return this.initialBalances;
    const latestDate = sortedDates[sortedDates.length - 1];
    return this.dailyLogs[latestDate].closingBalances;
  }

  // Get log for a specific date (auto-creates if missing, rolling forward previous closing balance)
  getOrCreateDailyLog(dateString) {
    if (this.dailyLogs[dateString]) {
      return this.dailyLogs[dateString];
    }

    // Find the latest day prior to this dateString
    const sortedDates = Object.keys(this.dailyLogs).sort();
    let prevBalances = { ...this.initialBalances };

    for (let i = sortedDates.length - 1; i >= 0; i--) {
      if (sortedDates[i] < dateString) {
        prevBalances = { ...this.dailyLogs[sortedDates[i]].closingBalances };
        break;
      }
    }

    this.dailyLogs[dateString] = {
      date: dateString,
      openingBalances: prevBalances,
      transactions: [],
      closingBalances: prevBalances
    };

    this.recalculateAllBalances();
    return this.dailyLogs[dateString];
  }

  // CRUD for Transactions
  addTransaction(dateString, txnData) {
    const log = this.getOrCreateDailyLog(dateString);
    const id = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Auto-calculate service charge parameters
    let serviceChargeToCash = 0;
    let serviceChargeToAccount = 0;

    let linkedApplicationId = txnData.applicationId || null;

    if (txnData.type === 'sale') {
      const descLower = (txnData.description || '').toLowerCase();
      const amount = parseFloat(txnData.amount || 0);
      let cost = 0;
      if (txnData.deductions && Array.isArray(txnData.deductions)) {
        cost = txnData.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      } else {
        cost = parseFloat(txnData.deductedAmount || 0);
      }
      const gst = parseFloat(txnData.gstAmount || 0);
      const profit = amount - cost - gst;

      const cash = parseFloat(txnData.paidByCash || 0);
      const upi = parseFloat(txnData.paidByUPI || 0);
      const totalPaid = cash + upi;

      if (totalPaid > 0) {
        const cashRatio = cash / totalPaid;
        serviceChargeToCash = parseFloat((profit * cashRatio).toFixed(2));
        serviceChargeToAccount = parseFloat((profit * (1 - cashRatio)).toFixed(2));
      } else {
        serviceChargeToAccount = parseFloat(profit.toFixed(2));
      }

      // Decrement Inventory stock if a product was sold
      if (txnData.productId) {
        this.adjustStock(txnData.productId, -Math.abs(txnData.quantity || 1));
      }

      // Process consumables array
      if (txnData.consumables && Array.isArray(txnData.consumables)) {
        txnData.consumables.forEach(c => {
          if (c.productId) {
            this.adjustStock(c.productId, -Math.abs(c.quantity || 1));
          }
        });
      } else {
        // Fallback auto-deductions for PVC Lamination pouch and A4 paper if consumables array is not provided
        if (descLower.includes('pvc card') || descLower.includes('pvc lamination')) {
          const pvcPouch = this.products.find(p => p.name.toLowerCase() === 'pvc lamination pouch' || p.sku.toLowerCase() === 'pvc-pouch');
          if (pvcPouch) {
            this.adjustStock(pvcPouch.id, -1);
          }
        }
        if (txnData.pagesPrinted > 0) {
          const a4Paper = this.products.find(p => p.name.toLowerCase() === 'a4 paper' || p.sku.toLowerCase() === 'a4-paper');
          if (a4Paper) {
            this.adjustStock(a4Paper.id, -Math.abs(txnData.pagesPrinted));
          }
        }
      }

      // Log Customer Loyalty visits & Adjust credit if credit was used
      if (txnData.customerId) {
        this.logCustomerVisit(txnData.customerId, dateString);
        if (txnData.paidByCredit > 0) {
          this.adjustCustomerCredit(txnData.customerId, parseFloat(txnData.paidByCredit));
        }
      }

      // Auto-create pending application if it matches G2C service keywords
      const g2cKeywords = ['application', 'certificate', 'registration', 'passport', 'aadhaar', 'pan card', 'pancard', 'license', 'licence', 'admission', 'pension', 'edistrict', 'e-district'];
      const isG2C = g2cKeywords.some(kw => descLower.includes(kw));
      if (isG2C && !linkedApplicationId) {
        const app = this.addApplication({
          customerId: txnData.customerId || '',
          serviceType: txnData.description,
          applicationNumber: '',
          status: 'submitted',
          assignedStaffId: txnData.staffId || '465314670016',
          feePaid: cost,
          serviceCharge: parseFloat((amount - cost).toFixed(2)),
          notes: `Auto-created from transaction ${id}`,
          transactionId: id
        });
        linkedApplicationId = app.id;
      }
    }

    const newTxn = {
      id,
      ...txnData,
      applicationId: linkedApplicationId,
      serviceChargeToCash,
      serviceChargeToAccount,
      timestamp: new Date().toISOString()
    };

    if (txnData.applicationId) {
      const app = this.applications.find(a => a.id === txnData.applicationId);
      if (app) {
        app.transactionId = id;
      }
    }

    log.transactions.push(newTxn);
    this.logActivity('Create ' + newTxn.type.toUpperCase(), `Created transaction ${newTxn.id}: "${newTxn.description}" for ₹${newTxn.amount.toFixed(2)} on date ${dateString}`);
    this.recalculateAllBalances();
    return newTxn;
  }

  adjustBalance(dateString, sourceId, targetBalance, adjustedBy = 'System') {
    const log = this.getOrCreateDailyLog(dateString);
    const currentVal = log.closingBalances[sourceId] || 0;
    const diff = parseFloat((targetBalance - currentVal).toFixed(2));
    if (Math.abs(diff) < 0.01) return;

    this.addTransaction(dateString, {
      type: 'adjustment',
      description: `Manual Balance Adjustment (by ${adjustedBy})`,
      amount: Math.abs(diff),
      sourceId: sourceId,
      diff: diff,
      staffId: adjustedBy,
      timestamp: new Date().toISOString()
    });
  }

  updateAEPSDailyTransferred(dateString, walletId, amount) {
    const log = this.getOrCreateDailyLog(dateString);
    if (!log.aepsTransferred) {
      log.aepsTransferred = {};
    }
    log.aepsTransferred[walletId] = parseFloat(amount || 0);
    this.persistAll();
  }

  deleteTransaction(dateString, txnId) {
    const log = this.dailyLogs[dateString];
    if (!log) return false;

    const idx = log.transactions.findIndex(t => t.id === txnId);
    if (idx === -1) return false;

    const txn = log.transactions[idx];
    
    // Rollback stock and customer credit if sale is deleted
    if (txn.type === 'sale') {
      if (txn.productId) {
        this.adjustStock(txn.productId, Math.abs(txn.quantity || 1));
      }
      if (txn.consumables && Array.isArray(txn.consumables)) {
        txn.consumables.forEach(c => {
          if (c.productId) {
            this.adjustStock(c.productId, Math.abs(c.quantity || 1));
          }
        });
      } else {
        const descLower = (txn.description || '').toLowerCase();
        if (descLower.includes('pvc card') || descLower.includes('pvc lamination')) {
          const pvcPouch = this.products.find(p => p.name.toLowerCase() === 'pvc lamination pouch' || p.sku.toLowerCase() === 'pvc-pouch');
          if (pvcPouch) {
            this.adjustStock(pvcPouch.id, 1);
          }
        }
        if (txn.pagesPrinted > 0) {
          const a4Paper = this.products.find(p => p.name.toLowerCase() === 'a4 paper' || p.sku.toLowerCase() === 'a4-paper');
          if (a4Paper) {
            this.adjustStock(a4Paper.id, Math.abs(txn.pagesPrinted));
          }
        }
      }
      if (txn.customerId && txn.paidByCredit > 0) {
        this.adjustCustomerCredit(txn.customerId, -parseFloat(txn.paidByCredit));
      }
    }

    // Cascade delete associated application from store.applications
    const appId = txn.applicationId;
    this.applications = this.applications.filter(a => {
      const matchId = appId && a.id === appId;
      const matchTxnId = a.transactionId === txnId;
      const matchNotes = a.notes && a.notes.includes(`Auto-created from transaction ${txnId}`);
      if (matchId || matchTxnId || matchNotes) {
        this.logActivity('Delete Application', `Cascaded deletion of application ${a.id} associated with transaction ${txnId}`);
        return false;
      }
      return true;
    });

    this.logActivity('Delete ' + txn.type.toUpperCase(), `Deleted transaction ${txn.id}: "${txn.description}" for ₹${txn.amount.toFixed(2)} on date ${dateString}`);
    log.transactions.splice(idx, 1);
    this.recalculateAllBalances();
    return true;
  }

  updateTransaction(dateString, txnId, updatedData) {
    const log = this.dailyLogs[dateString];
    if (!log) return false;

    const idx = log.transactions.findIndex(t => t.id === txnId);
    if (idx === -1) return false;

    const oldTxn = log.transactions[idx];

    // 1. Rollback stock changes and credit from the old transaction state
    if (oldTxn.type === 'sale') {
      if (oldTxn.productId) {
        this.adjustStock(oldTxn.productId, Math.abs(oldTxn.quantity || 1));
      }
      if (oldTxn.consumables && Array.isArray(oldTxn.consumables)) {
        oldTxn.consumables.forEach(c => {
          if (c.productId) {
            this.adjustStock(c.productId, Math.abs(c.quantity || 1));
          }
        });
      } else {
        const descLower = (oldTxn.description || '').toLowerCase();
        if (descLower.includes('pvc card') || descLower.includes('pvc lamination')) {
          const pvcPouch = this.products.find(p => p.name.toLowerCase() === 'pvc lamination pouch' || p.sku.toLowerCase() === 'pvc-pouch');
          if (pvcPouch) {
            this.adjustStock(pvcPouch.id, 1);
          }
        }
        if (oldTxn.pagesPrinted > 0) {
          const a4Paper = this.products.find(p => p.name.toLowerCase() === 'a4 paper' || p.sku.toLowerCase() === 'a4-paper');
          if (a4Paper) {
            this.adjustStock(a4Paper.id, Math.abs(oldTxn.pagesPrinted));
          }
        }
      }
      if (oldTxn.customerId && oldTxn.paidByCredit > 0) {
        this.adjustCustomerCredit(oldTxn.customerId, -parseFloat(oldTxn.paidByCredit));
      }
    }

    // 2. Compute variables and apply stock adjustments for the new transaction state
    let serviceChargeToCash = 0;
    let serviceChargeToAccount = 0;

    if (updatedData.type === 'sale') {
      const amount = parseFloat(updatedData.amount || 0);
      let cost = 0;
      if (updatedData.deductions && Array.isArray(updatedData.deductions)) {
        cost = updatedData.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      } else {
        cost = parseFloat(updatedData.deductedAmount || 0);
      }
      const gst = parseFloat(updatedData.gstAmount || 0);
      const profit = amount - cost - gst;

      const cash = parseFloat(updatedData.paidByCash || 0);
      const upi = parseFloat(updatedData.paidByUPI || 0);
      const totalPaid = cash + upi;

      if (totalPaid > 0) {
        const cashRatio = cash / totalPaid;
        serviceChargeToCash = parseFloat((profit * cashRatio).toFixed(2));
        serviceChargeToAccount = parseFloat((profit * (1 - cashRatio)).toFixed(2));
      } else {
        serviceChargeToAccount = parseFloat(profit.toFixed(2));
      }

      if (updatedData.productId) {
        this.adjustStock(updatedData.productId, -Math.abs(updatedData.quantity || 1));
      }

      if (updatedData.consumables && Array.isArray(updatedData.consumables)) {
        updatedData.consumables.forEach(c => {
          if (c.productId) {
            this.adjustStock(c.productId, -Math.abs(c.quantity || 1));
          }
        });
      } else {
        const descLower = (updatedData.description || '').toLowerCase();
        if (descLower.includes('pvc card') || descLower.includes('pvc lamination')) {
          const pvcPouch = this.products.find(p => p.name.toLowerCase() === 'pvc lamination pouch' || p.sku.toLowerCase() === 'pvc-pouch');
          if (pvcPouch) {
            this.adjustStock(pvcPouch.id, -1);
          }
        }
        if (updatedData.pagesPrinted > 0) {
          const a4Paper = this.products.find(p => p.name.toLowerCase() === 'a4 paper' || p.sku.toLowerCase() === 'a4-paper');
          if (a4Paper) {
            this.adjustStock(a4Paper.id, -Math.abs(updatedData.pagesPrinted));
          }
        }
      }
      if (updatedData.customerId && updatedData.paidByCredit > 0) {
        this.adjustCustomerCredit(updatedData.customerId, parseFloat(updatedData.paidByCredit));
      }
    }

    // 3. Update the transaction in database log
    log.transactions[idx] = {
      ...oldTxn,
      ...updatedData,
      serviceChargeToCash,
      serviceChargeToAccount
    };

    this.logActivity('Edit ' + oldTxn.type.toUpperCase(), `Updated transaction ${txnId} on date ${dateString}: "${oldTxn.description}" (₹${oldTxn.amount}) changed to "${updatedData.description}" (₹${updatedData.amount})`);
    this.recalculateAllBalances();
    return true;
  }

  // CRUD for Customer Registration
  addCustomer(customerData) {
    // Use timestamp + random suffix to ensure ID uniqueness even after deletions
    const uniqueSuffix = Math.random().toString(36).substr(2, 5).toUpperCase();
    const id = 'CO-' + Date.now().toString(36).toUpperCase() + uniqueSuffix;
    const newCustomer = {
      id,
      uniqueNumber: id,
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email || '',
      address: customerData.address || '',
      creditBalance: parseFloat(customerData.creditBalance || 0),
      visitCount: 0,
      lastVisitedAt: '',
      createdAt: getTodayDateString(),
      visitLogs: []
    };
    this.customers.push(newCustomer);
    this.persistAll();
    return newCustomer;
  }

  registerCustomerFromAeps(customerName, mobile, dateString, txn) {
    if (!mobile || !customerName) return;
    const phoneClean = mobile.trim();
    const nameClean = customerName.trim();
    if (!phoneClean || !nameClean) return;

    let customer = this.customers.find(c => c.phone === phoneClean);
    if (!customer) {
      customer = this.addCustomer({
        name: nameClean,
        phone: phoneClean,
        email: '',
        address: '',
        creditBalance: 0
      });
    }
    this.logCustomerVisit(customer.id, dateString || getTodayDateString());

    if (txn) {
      if (!customer.visitLogs) {
        customer.visitLogs = [];
      }
      const existingLog = customer.visitLogs.find(log => log.aepsTxnId === txn.id);
      if (existingLog) {
        existingLog.purpose = `${txn.type} Transaction (₹${txn.amount})`;
        existingLog.staff = txn.staffId || 'System';
        existingLog.date = dateString || getTodayDateString();
      } else {
        customer.visitLogs.push({
          id: 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          date: dateString || getTodayDateString(),
          purpose: `${txn.type} Transaction (₹${txn.amount})`,
          staff: txn.staffId || 'System',
          isWebReg: false,
          aepsTxnId: txn.id
        });
      }
      this.persistAll();
    }
  }


  logCustomerVisitPurpose(customerId, logEntry) {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      if (!customer.visitLogs) {
        customer.visitLogs = [];
      }
      customer.visitLogs.push({
        id: 'LOG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        date: getTodayDateString(),
        ...logEntry
      });
      customer.visitCount += 1;
      customer.lastVisitedAt = getTodayDateString();
      this.persistAll();
    }
  }

  updateCustomer(customerId, updatedData) {
    const idx = this.customers.findIndex(c => c.id === customerId);
    if (idx === -1) return null;
    
    const oldCredit = this.customers[idx].creditBalance || 0;
    this.customers[idx] = {
      ...this.customers[idx],
      ...updatedData,
      creditBalance: updatedData.creditBalance !== undefined ? parseFloat(updatedData.creditBalance) : oldCredit
    };
    this.logActivity('Edit Customer', `Updated customer ${customerId}: name set to "${updatedData.name}"`);
    this.persistAll();
    return this.customers[idx];
  }

  deleteCustomer(customerId) {
    const idx = this.customers.findIndex(c => c.id === customerId);
    if (idx === -1) return false;
    const name = this.customers[idx].name;
    this.customers.splice(idx, 1);
    this.logActivity('Delete Customer', `Deleted registered customer ${customerId}: "${name}"`);
    this.persistAll();
    return true;
  }

  logCustomerVisit(customerId, dateString) {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.visitCount += 1;
      customer.lastVisitedAt = dateString;
      this.persistAll();
    }
  }

  adjustCustomerCredit(customerId, amount) {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.creditBalance = parseFloat((customer.creditBalance + amount).toFixed(2));
      this.persistAll();
    }
  }

  // G2C Applications Tracker Methods
  addApplication(appData) {
    const id = 'APP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newApp = {
      id,
      customerId: appData.customerId,
      serviceType: appData.serviceType,
      applicationNumber: appData.applicationNumber || '',
      status: appData.status || 'draft',
      assignedStaffId: appData.assignedStaffId || '',
      feePaid: parseFloat(appData.feePaid || 0),
      serviceCharge: parseFloat(appData.serviceCharge || 0),
      lastUpdated: getTodayDateString(),
      notes: appData.notes || ''
    };
    this.applications.push(newApp);
    this.persistAll();
    return newApp;
  }

  updateApplicationStatus(appId, status) {
    const app = this.applications.find(a => a.id === appId);
    if (app) {
      const oldStatus = app.status;
      app.status = status;
      app.lastUpdated = getTodayDateString();
      this.logActivity('Edit Application', `Updated application ${appId} status from "${oldStatus}" to "${status}"`);
      this.persistAll();
    }
  }

  deleteApplication(appId) {
    const idx = this.applications.findIndex(a => a.id === appId);
    if (idx === -1) return false;
    const app = this.applications[idx];
    this.applications.splice(idx, 1);
    this.logActivity('Delete Application', `Deleted application log ${appId} for "${app.serviceType}"`);
    this.persistAll();
    return true;
  }

  getIncentiveSettings() {
    const rawSettings = localStorage.getItem('cyberone_v2_incentive_settings');
    if (rawSettings) {
      try {
        return JSON.parse(rawSettings);
      } catch (e) {
        console.error('Failed to parse incentive settings:', e);
      }
    }
    // Default values if not configured
    return {
      g2cTier1Limit: 20,
      g2cTier1Rate: 10,
      g2cTier2Limit: 50,
      g2cTier2Rate: 15,
      g2cTier3Rate: 20,
      salesCommRate: 5,   // in percent (5%)
      aepsCommRate: 10     // in percent (10%)
    };
  }

  saveIncentiveSettings(settings) {
    localStorage.setItem('cyberone_v2_incentive_settings', JSON.stringify(settings));
    this.persistAll();
    return true;
  }

  // Get Staff Performance metrics and incentive suggestions for a month
  getStaffPerformanceMetrics(staffId, monthString) {
    // 1. G2C Files processed by this staff in selected month
    const staffApps = this.applications.filter(a => a.assignedStaffId === staffId && a.lastUpdated.startsWith(monthString));
    const appCount = staffApps.length;
    
    // 2. Sales volume and collected service charges
    let salesVolume = 0;
    let scVolume = 0;
    Object.keys(this.dailyLogs).forEach(d => {
      if (d.startsWith(monthString)) {
        this.dailyLogs[d].transactions.forEach(t => {
          if (t.type === 'sale' && t.staffId === staffId) {
            salesVolume += t.amount;
            scVolume += (t.serviceChargeToCash || 0) + (t.serviceChargeToAccount || 0);
          }
        });
      }
    });

    // 3. AEPS volume and commission earnings
    let aepsVolume = 0;
    let aepsSc = 0;
    let aepsComm = 0;
    if (this.aepsTransactions) {
      this.aepsTransactions.forEach(t => {
        if (t.staffId === staffId && t.status === 'Success' && t.date && t.date.startsWith(monthString)) {
          aepsVolume += t.amount;
          aepsSc += (t.serviceCharge || 0);
          aepsComm += (t.commission || 0);
        }
      });
    }

    const incSettings = this.getIncentiveSettings();
    const t1Limit = incSettings.g2cTier1Limit;
    const t1Rate = incSettings.g2cTier1Rate;
    const t2Limit = incSettings.g2cTier2Limit;
    const t2Rate = incSettings.g2cTier2Rate;
    const t3Rate = incSettings.g2cTier3Rate;
    const sCommPct = incSettings.salesCommRate / 100;
    const aCommPct = incSettings.aepsCommRate / 100;

    // Calculate suggested incentives:
    // - Tiered G2C files incentive:
    let g2cIncentive = 0;
    if (appCount > t2Limit) {
      g2cIncentive = (t1Limit * t1Rate) + ((t2Limit - t1Limit) * t2Rate) + ((appCount - t2Limit) * t3Rate);
    } else if (appCount > t1Limit) {
      g2cIncentive = (t1Limit * t1Rate) + ((appCount - t1Limit) * t2Rate);
    } else {
      g2cIncentive = appCount * t1Rate;
    }

    // - Sales Service Charge commission: sCommPct of service charge volume
    const salesComm = parseFloat((scVolume * sCommPct).toFixed(2));

    // - AEPS/DMT Commission Sharing: aCommPct of commission earned
    const aepsCommShare = parseFloat((aepsComm * aCommPct).toFixed(2));

    const totalSuggestedIncentive = parseFloat((g2cIncentive + salesComm + aepsCommShare).toFixed(2));

    return {
      appCount,
      salesVolume,
      scVolume,
      aepsVolume,
      aepsSc,
      aepsComm,
      g2cIncentive,
      salesComm,
      aepsCommShare,
      totalSuggestedIncentive
    };
  }

  // Inventory Product Management
  addProduct(prodData) {
    const id = 'PROD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newProduct = {
      id,
      name: prodData.name,
      sku: prodData.sku || '',
      barcode: prodData.barcode || '',
      category: prodData.category || 'General',
      buyPrice: parseFloat(prodData.buyPrice || 0),
      sellPrice: parseFloat(prodData.sellPrice || 0),
      stock: prodData.type === 'service' ? 0 : parseInt(prodData.stock || 0),
      minStock: prodData.type === 'service' ? 0 : parseInt(prodData.minStock || 0),
      type: prodData.type || 'product'
    };
    this.products.push(newProduct);
    this.persistAll();
    return newProduct;
  }

  updateProduct(prodId, updatedData) {
    const idx = this.products.findIndex(p => p.id === prodId);
    if (idx === -1) return null;
    
    const oldProduct = this.products[idx];
    this.products[idx] = {
      ...this.products[idx],
      ...updatedData,
      barcode: updatedData.barcode || '',
      buyPrice: parseFloat(updatedData.buyPrice || 0),
      sellPrice: parseFloat(updatedData.sellPrice || 0),
      stock: updatedData.type === 'service' ? 0 : parseInt(updatedData.stock || 0),
      minStock: updatedData.type === 'service' ? 0 : parseInt(updatedData.minStock || 0),
      type: updatedData.type || 'product'
    };
    this.logActivity('Edit Product', `Updated product ${prodId}: changed name from "${oldProduct.name}" to "${updatedData.name}", stock to ${updatedData.stock}, price to ₹${updatedData.sellPrice}`);
    this.persistAll();
    return this.products[idx];
  }

  deleteProduct(prodId) {
    const idx = this.products.findIndex(p => p.id === prodId);
    if (idx === -1) return false;
    const name = this.products[idx].name;
    const sku = this.products[idx].sku;
    this.products.splice(idx, 1);
    this.logActivity('Delete Product', `Deleted inventory item ${prodId}: "${name}" (SKU/HSN: ${sku})`);
    this.persistAll();
    return true;
  }

  adjustStock(prodId, qty) {
    const product = this.products.find(p => p.id === prodId);
    if (product) {
      product.stock = Math.max(0, product.stock + qty);
      this.persistAll();
    }
  }

  // Accounts & Wallets Settings CRUD
  updateWalletDetails(walletId, data) {
    const idx = this.wallets.findIndex(w => w.id === walletId);
    if (idx === -1) return false;
    
    this.wallets[idx] = {
      ...this.wallets[idx],
      ...data
    };
    this.logActivity('Edit Wallet', `Updated wallet details for ${walletId}`);
    this.persistAll();
    return true;
  }

  updateBankAccountDetails(accountId, data) {
    const idx = this.bankAccounts.findIndex(a => a.id === accountId);
    if (idx === -1) return false;

    this.bankAccounts[idx] = {
      ...this.bankAccounts[idx],
      ...data
    };
    this.logActivity('Edit Bank', `Updated bank account details for ${accountId}`);
    this.persistAll();
    return true;
  }

  // Invoicing CRUD
  addInvoice(invoiceData) {
    const id = 'INV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newInvoice = {
      id,
      invoiceNumber: 'CO-' + getTodayDateString().replace(/-/g, '') + '-' + (this.invoices.length + 1),
      customerId: invoiceData.customerId,
      items: invoiceData.items || [], // Array of { desc, qty, rate }
      taxRate: parseFloat(invoiceData.taxRate || 0.18),
      discount: parseFloat(invoiceData.discount || 0),
      total: parseFloat(invoiceData.total || 0),
      dueDate: invoiceData.dueDate,
      status: invoiceData.status || 'sent',
      createdAt: invoiceData.createdAt || getTodayDateString()
    };
    this.invoices.push(newInvoice);
    this.persistAll();
    return newInvoice;
  }

  updateInvoiceStatus(invoiceId, status) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.status = status;

      // If marked paid, automatically add a Sale Transaction to today's ledger!
      if (status === 'paid') {
        const desc = `Invoice payment: ${invoice.invoiceNumber}`;
        this.addTransaction(getTodayDateString(), {
          type: 'sale',
          description: desc,
          amount: invoice.total,
          paidByCash: 0,
          paidByUPI: invoice.total, // UPI is standard for invoices
          deductedFrom: 'none',
          deductedAmount: 0,
          customerId: invoice.customerId,
          staffId: 'STAFF-02'
        });
      }
      this.persistAll();
    }
  }

  // Monthly Calculations
  getMonthlyStats(monthString) {
    // monthString format: "YYYY-MM"
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    Object.keys(this.dailyLogs).forEach(date => {
      if (date.startsWith(monthString)) {
        const log = this.dailyLogs[date];
        if (log && log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.type === 'sale') {
              monthlyIncome += (txn.serviceChargeToCash || 0) + (txn.serviceChargeToAccount || 0);
            } else if (txn.type === 'expense' || txn.type === 'salary') {
              monthlyExpense += txn.amount;
            }
          });
        }
      }
    });

    return {
      monthlyIncome: parseFloat(monthlyIncome.toFixed(2)),
      monthlyExpense: parseFloat(monthlyExpense.toFixed(2)),
      netProfit: parseFloat((monthlyIncome - monthlyExpense).toFixed(2))
    };
  }

  getDailyStats(dateString) {
    let dailyIncome = 0;
    let dailyExpense = 0;
    const log = this.dailyLogs[dateString];

    if (log && log.transactions) {
      log.transactions.forEach(txn => {
        if (txn.type === 'sale') {
          dailyIncome += (txn.serviceChargeToCash || 0) + (txn.serviceChargeToAccount || 0);
        } else if (txn.type === 'expense' || txn.type === 'salary') {
          dailyExpense += txn.amount;
        }
      });
    }

    return {
      dailyIncome: parseFloat(dailyIncome.toFixed(2)),
      dailyExpense: parseFloat(dailyExpense.toFixed(2)),
      dailyProfit: parseFloat((dailyIncome - dailyExpense).toFixed(2))
    };
  }

  // Get Daily Turnover (Gross Traffic)
  getDailyTurnover(dateString) {
    const log = this.dailyLogs[dateString];
    if (!log || !log.transactions) return 0;
    
    return log.transactions
      .filter(t => t && t.type === 'sale')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }

  // Get Monthly Turnover (Gross Traffic)
  getMonthlyTurnover(monthString) {
    let monthlyTurnover = 0;
    Object.keys(this.dailyLogs).forEach(date => {
      if (date.startsWith(monthString)) {
        const log = this.dailyLogs[date];
        if (log && log.transactions) {
          log.transactions.forEach(txn => {
            if (txn.type === 'sale') {
              monthlyTurnover += parseFloat(txn.amount || 0);
            }
          });
        }
      }
    });
    return parseFloat(monthlyTurnover.toFixed(2));
  }

  isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }


  getLocalSnapshots() {
    const data = localStorage.getItem('cyberone_v2_local_snapshots');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  createLocalSnapshot(label = 'Manual Checkpoint') {
    try {
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

      const snapshots = this.getLocalSnapshots();
      const timestamp = new Date().toISOString();
      snapshots.unshift({
        timestamp,
        label,
        data: backup
      });

      if (snapshots.length > 10) {
        snapshots.pop();
      }

      localStorage.setItem('cyberone_v2_local_snapshots', JSON.stringify(snapshots));
      this.logActivity('Create Backup Snapshot', `Created local checkpoint: "${label}"`);
      return true;
    } catch (e) {
      console.error("Failed to create local snapshot", e);
      return false;
    }
  }

  restoreFromSnapshot(timestamp) {
    try {
      const snapshots = this.getLocalSnapshots();
      const snap = snapshots.find(s => s.timestamp === timestamp);
      if (!snap) return false;

      const keys = Object.keys(snap.data);
      // Remove existing keys to prevent leftover data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cyberone_v2_') && key !== 'cyberone_v2_local_snapshots' && key !== 'cyberone_v2_auto_backup_config') {
          localStorage.removeItem(key);
        }
      }

      // Restore snapshot keys
      keys.forEach(key => {
        localStorage.setItem(key, snap.data[key]);
      });
      
      this.logActivity('Restore Backup Snapshot', `Restored database to checkpoint from ${new Date(timestamp).toLocaleString()}`);
      return true;
    } catch (e) {
      console.error("Failed to restore from snapshot", e);
      return false;
    }
  }

  deleteSnapshot(timestamp) {
    try {
      let snapshots = this.getLocalSnapshots();
      snapshots = snapshots.filter(s => s.timestamp !== timestamp);
      localStorage.setItem('cyberone_v2_local_snapshots', JSON.stringify(snapshots));
      return true;
    } catch (e) {
      console.error("Failed to delete snapshot", e);
      return false;
    }
  }

  getAutoBackupConfig() {
    const defaultVal = {
      enabled: false,
      frequency: 'daily',
      type: 'local',
      lastBackup: 0
    };
    const data = localStorage.getItem('cyberone_v2_auto_backup_config');
    if (!data) return defaultVal;
    try {
      return { ...defaultVal, ...JSON.parse(data) };
    } catch (e) {
      return defaultVal;
    }
  }

  saveAutoBackupConfig(config) {
    localStorage.setItem('cyberone_v2_auto_backup_config', JSON.stringify(config));
  }

  // Websites Credentials Vault Methods
  addWebsite(data) {
    const id = 'WEB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newWeb = {
      id,
      name: data.name,
      url: data.url,
      userId: data.userId || '',
      password: data.password || '',
      notes: data.notes || '',
      visitCount: 0
    };
    if (!this.websites) this.websites = [];
    this.websites.push(newWeb);
    this.logActivity('Add Website', `Added website "${newWeb.name}" to credential vault`);
    this.persistAll();
    return newWeb;
  }

  updateWebsite(webId, data) {
    const idx = this.websites.findIndex(w => w.id === webId);
    if (idx === -1) return null;
    this.websites[idx] = {
      ...this.websites[idx],
      ...data
    };
    this.logActivity('Edit Website', `Updated details for website "${this.websites[idx].name}"`);
    this.persistAll();
    return this.websites[idx];
  }

  deleteWebsite(webId) {
    const idx = this.websites.findIndex(w => w.id === webId);
    if (idx === -1) return false;
    const name = this.websites[idx].name;
    this.websites.splice(idx, 1);
    this.logActivity('Delete Website', `Removed website "${name}" from credential vault`);
    this.persistAll();
    return true;
  }

  incrementWebsiteVisit(webId) {
    const web = this.websites.find(w => w.id === webId);
    if (web) {
      web.visitCount = (web.visitCount || 0) + 1;
      this.persistAll();
    }
  }

  syncDatabaseState() {
    this.setSyncStatus('syncing');
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
          'cyberone_v2_github_token',
          'cyberone_v2_github_repo',
          'cyberone_v2_github_branch'
        ].includes(key)) {
          continue;
        }
        let val = localStorage.getItem(key);
        payload[key] = val;
      }
    }
    const users = localStorage.getItem('cyberone_v2_users');
    if (users) {
      payload['cyberone_v2_users'] = users;
    }

    const isGithubPages = window.location.hostname.includes('github.io');
    if (isGithubPages) {
      console.log('Sync: Running on GitHub Pages. Skipping local server disk save.');
      if (!firebaseService.isInitialized()) {
        this.setSyncStatus('offline');
      }
      return;
    }

    // Try relative endpoint. Works on localhost and any local LAN IP of the server.
    fetch('./api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error('Not local server');
      }
    })
    .then(data => {
      console.log('Successfully saved to local server database:', data);
      this.setSyncStatus('synced');
    })
    .catch(err => {
      console.log('Relative server save failed/not supported:', err);
      this.setSyncStatus('offline');
    });
  }

  addAepsTransaction(txnData) {
    const id = 'AEPS-TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTxn = {
      id,
      ...txnData,
      timestamp: new Date().toISOString()
    };
    if (!this.aepsTransactions) {
      this.aepsTransactions = [];
    }
    this.aepsTransactions.push(newTxn);
    if (newTxn.customerName && newTxn.mobile) {
      this.registerCustomerFromAeps(newTxn.customerName, newTxn.mobile, newTxn.date, newTxn);
    }
    this.logActivity('Create AEPS ' + newTxn.type.toUpperCase(), `Created AEPS/DMT transaction ${newTxn.id} for ₹${newTxn.amount} in ${newTxn.walletId}`);
    this.recalculateAllBalances();
    return newTxn;
  }

  deleteAepsTransaction(txnId) {
    if (!this.aepsTransactions) return false;
    const idx = this.aepsTransactions.findIndex(t => t.id === txnId);
    if (idx === -1) return false;
    const txn = this.aepsTransactions[idx];
    this.aepsTransactions.splice(idx, 1);

    // Remove matching customer visit log
    this.customers.forEach(customer => {
      if (customer.visitLogs) {
        const logIdx = customer.visitLogs.findIndex(log => log.aepsTxnId === txnId);
        if (logIdx !== -1) {
          customer.visitLogs.splice(logIdx, 1);
          customer.visitCount = Math.max(0, customer.visitCount - 1);
        }
      }
    });

    this.logActivity('Delete AEPS ' + txn.type.toUpperCase(), `Deleted AEPS/DMT transaction ${txnId} for ₹${txn.amount}`);
    this.recalculateAllBalances();
    return true;
  }

  updateAepsTransaction(txnId, updatedData) {
    if (!this.aepsTransactions) return false;
    const idx = this.aepsTransactions.findIndex(t => t.id === txnId);
    if (idx === -1) return false;
    const oldTxn = this.aepsTransactions[idx];
    this.aepsTransactions[idx] = {
      ...oldTxn,
      ...updatedData
    };
    const updatedTxn = this.aepsTransactions[idx];
    if (updatedTxn.customerName && updatedTxn.mobile) {
      this.registerCustomerFromAeps(updatedTxn.customerName, updatedTxn.mobile, updatedTxn.date || oldTxn.date, updatedTxn);
    }
    this.logActivity('Edit AEPS ' + oldTxn.type.toUpperCase(), `Updated AEPS/DMT transaction ${txnId}`);
    this.recalculateAllBalances();
    return true;
  }
}

// Export a single global instance of the store
export const store = new StateStore();
export default store;
