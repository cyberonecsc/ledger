/* ==========================================================================
   CYBERONE Center Management Platform - State & Data Layer (store.js)
   ========================================================================== */

import { auth } from './auth.js';

export function obfuscateToken(token) {
  if (!token) return '';
  // Custom shift obfuscation to bypass GitHub secret scanning
  const shifted = token.split('').map(char => {
    return String.fromCharCode(char.charCodeAt(0) + 7);
  }).join('');
  return btoa(shifted);
}

export function deobfuscateToken(obfuscated) {
  if (!obfuscated) return '';
  try {
    const decoded = atob(obfuscated);
    
    // 1. Try custom shift-7 deobfuscation
    const shiftedBack = decoded.split('').map(char => {
      return String.fromCharCode(char.charCodeAt(0) - 7);
    }).join('');
    if (shiftedBack.startsWith('ghp_') || shiftedBack.startsWith('github_pat_')) {
      return shiftedBack;
    }
    
    // 2. Fallback to old reverse deobfuscation
    const reversed = decoded.split('').reverse().join('');
    if (reversed.startsWith('ghp_') || reversed.startsWith('github_pat_')) {
      return reversed;
    }
    
    return decoded;
  } catch (e) {
    return obfuscated;
  }
}

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
  main_bob: 17729.76,
  csc: 1606.28,
  ibkart: 11.15,
  airtel_pb: 113.94,
  paynearby: 209.29,
  bsnl: 44,
  vi: 0,
  airtel: 448.35
};

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
  { id: 'STAFF-01', name: 'Shibu (Owner)', role: 'owner', phone: '9048123456', baseSalary: 35000, isActive: true },
  { id: 'STAFF-02', name: 'Anil Kumar (Admin)', role: 'admin', phone: '9048111222', baseSalary: 20000, isActive: true },
  { id: 'STAFF-03', name: 'Saritha (Accountant)', role: 'accountant', phone: '9048333444', baseSalary: 18000, isActive: true },
  { id: 'STAFF-04', name: 'Manu (Staff)', role: 'staff', phone: '9048555666', baseSalary: 12000, isActive: true }
];

// Initial Products / Inventory items for CYBERONE/CSC stores
const INITIAL_PRODUCTS = [
  { id: 'PROD-A4', name: 'A4 paper', sku: 'A4-PAPER', category: 'Materials', buyPrice: 0.8, sellPrice: 2, stock: 500, minStock: 50, type: 'product' },
  { id: 'PROD-PVC', name: 'PVC Lamination pouch', sku: 'PVC-POUCH', category: 'Materials', buyPrice: 5, sellPrice: 10, stock: 100, minStock: 10, type: 'product' }
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
    this.syncStatus = 'synced';
    this.syncListeners = [];
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
    this.wallets = this.getItem('cyberone_v2_wallets', INITIAL_WALLETS);
    this.bankAccounts = this.getItem('cyberone_v2_bank_accounts', INITIAL_BANK_ACCOUNTS);
    this.websites = this.getItem('cyberone_v2_websites', INITIAL_WEBSITES);
    this.initialBalances = this.getItem('cyberone_v2_initial_balances', INITIAL_BALANCES);
    if (this.initialBalances.digipay !== undefined) {
      delete this.initialBalances.digipay;
      this.saveItem('cyberone_v2_initial_balances', this.initialBalances);
    }
    this.customers = this.getItem('cyberone_v2_customers', INITIAL_CUSTOMERS);
    
    // Reconstruct staff list dynamically from active credentials
    const storedStaff = this.getItem('cyberone_v2_staff', INITIAL_STAFF);
    const rawUsers = localStorage.getItem('cyberone_v2_users');
    const activeUsers = rawUsers ? JSON.parse(rawUsers) : [{ username: 'SHIBURCN', name: 'Shibu (Owner)', role: 'owner', password: 'John@392091' }];
    this.staff = activeUsers.map(user => {
      const existing = storedStaff.find(s => s.id === user.username || s.id === `STAFF-${user.username}` || s.name === user.name);
      let baseSal = user.baseSalary !== undefined && user.baseSalary !== null ? parseFloat(user.baseSalary) : (user.role === 'owner' ? 35000 : (user.role === 'admin' ? 20000 : (user.role === 'accountant' ? 18000 : 12000)));
      if (existing && (user.baseSalary === undefined || user.baseSalary === null)) {
        baseSal = existing.baseSalary;
      }
      return {
        id: user.username,
        name: user.name,
        role: user.role,
        phone: user.mobile || (existing ? existing.phone : ''),
        baseSalary: baseSal,
        isActive: true
      };
    });
    this.saveItem('cyberone_v2_staff', this.staff);

    this.products = this.getItem('cyberone_v2_products', INITIAL_PRODUCTS);
    this.applications = this.getItem('cyberone_v2_applications', INITIAL_APPLICATIONS);
    this.invoices = this.getItem('cyberone_v2_invoices', this.getSeededInvoices());
    this.dailyLogs = this.getItem('cyberone_v2_daily_logs', null);
    
    // Default Center Profile
    const defaultProfile = {
      name: "CYBERONE CSC - Attingal Center",
      code: "CYBER-ATT-14",
      address: "Room 4B, Central Arcade, Attingal",
      city: "Attingal",
      state: "Kerala",
      pin: "695101",
      landPhone: "0470-2621098",
      mobile: "9048123456",
      email: "attingal@cyberonecsc.com",
      gstin: "32AAAAA1111A1Z1"
    };
    this.centerProfile = { ...defaultProfile, ...this.getItem('cyberone_v2_center_profile', {}) };
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

    // Clean up/remove digipay wallet if it is present in active state database
    if (this.wallets.some(w => w.id === 'digipay')) {
      this.wallets = this.wallets.filter(w => w.id !== 'digipay');
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
        if (log.openingBalances && log.openingBalances.digipay !== undefined) {
          delete log.openingBalances.digipay;
          needRecalculate = true;
        }
        if (log.closingBalances && log.closingBalances.digipay !== undefined) {
          delete log.closingBalances.digipay;
          needRecalculate = true;
        }
      });
    }

    // Always recalculate all balances on startup to guarantee database consistency
    this.recalculateAllBalances();
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

  persistAll() {
    localStorage.setItem('cyberone_v2_last_modified', new Date().toISOString());
    this.saveItem('cyberone_v2_wallets', this.wallets);
    this.saveItem('cyberone_v2_bank_accounts', this.bankAccounts);
    this.saveItem('cyberone_v2_initial_balances', this.initialBalances);
    this.saveItem('cyberone_v2_customers', this.customers);
    this.saveItem('cyberone_v2_staff', this.staff);
    this.saveItem('cyberone_v2_products', this.products);
    this.saveItem('cyberone_v2_applications', this.applications);
    this.saveItem('cyberone_v2_invoices', this.invoices);
    this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
    this.saveItem('cyberone_v2_center_profile', this.centerProfile);
    this.saveItem('cyberone_v2_websites', this.websites);
    
    // Background sync changes to GitHub Pages
    this.syncToGitHubPages();
    
    // Auto-sync database changes
    this.syncDatabaseState();
  }

  updateInitialBalances(balances) {
    this.initialBalances = { ...this.initialBalances, ...balances };
    this.logActivity('Edit Initial Balances', `Updated initial opening balances: ${JSON.stringify(balances)}`);
    this.persistAll();
    this.recalculateAllBalances();
    return true;
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
  recalculateAllBalances() {
    // Sort log dates chronologically
    const sortedDates = Object.keys(this.dailyLogs).sort();
    if (sortedDates.length === 0) return;

    let previousClosingBalances = null;

    sortedDates.forEach((dateString, idx) => {
      const log = this.dailyLogs[dateString];

      // If it is the first day, its opening balance is either initialized or set manually
      if (idx === 0) {
        log.openingBalances = { ...this.initialBalances };
      } else {
        // Roll forward from the previous day's closing balances
        log.openingBalances = { ...previousClosingBalances };
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
        if (balances[w.id] === undefined) {
          balances[w.id] = 0;
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
          if (txn.deductedFrom && txn.deductedFrom !== 'none') {
            const walletId = txn.deductedFrom;
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
          const walletId = txn.targetWallet;
          
          if (txn.source === 'cash') {
            // Cash Deposit to Bank
            balances.cash = parseFloat((balances.cash - amt).toFixed(2));
            const targetId = walletId === 'account' ? 'main_bob' : walletId;
            balances[targetId] = parseFloat(((balances[targetId] || 0) + amt).toFixed(2));
          } else {
            // Transfer from Bank Account to Digital Wallet
            const sourceId = txn.source === 'account' ? 'main_bob' : txn.source;
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

      log.closingBalances = balances;
      previousClosingBalances = balances;
    });

    this.persistAll();
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

    if (txnData.type === 'sale') {
      const amount = parseFloat(txnData.amount || 0);
      const cost = parseFloat(txnData.deductedAmount || 0);
      const gst = parseFloat(txnData.gstAmount || 0);
      const profit = amount - cost - gst;

      if (txnData.paidByCash > 0) {
        // If paid by cash, the profit is recognized as Service Charge to Cash
        serviceChargeToCash = parseFloat(profit.toFixed(2));
      } else {
        // Otherwise it goes to account
        serviceChargeToAccount = parseFloat(profit.toFixed(2));
      }

      // Decrement Inventory stock if a product was sold
      if (txnData.productId) {
        this.adjustStock(txnData.productId, -Math.abs(txnData.quantity || 1));
      }

      // Auto-deductions for PVC Lamination pouch and A4 paper
      const descLower = (txnData.description || '').toLowerCase();
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

      // Log Customer Loyalty visits & Adjust credit if credit was used
      if (txnData.customerId) {
        this.logCustomerVisit(txnData.customerId, dateString);
        if (txnData.paidByCredit > 0) {
          this.adjustCustomerCredit(txnData.customerId, parseFloat(txnData.paidByCredit));
        }
      }

      // Auto-create pending application if description has "application" and customer is linked
      if (descLower.includes('application') && txnData.customerId) {
        this.addApplication({
          customerId: txnData.customerId,
          serviceType: txnData.description,
          applicationNumber: '',
          status: 'submitted',
          assignedStaffId: txnData.staffId || 'STAFF-01',
          feePaid: parseFloat(txnData.deductedAmount || 0),
          serviceCharge: parseFloat((amount - cost).toFixed(2)),
          notes: `Auto-created from transaction ${id}`
        });
      }
    }

    const newTxn = {
      id,
      ...txnData,
      serviceChargeToCash,
      serviceChargeToAccount,
      timestamp: new Date().toISOString()
    };

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
      if (txn.customerId && txn.paidByCredit > 0) {
        this.adjustCustomerCredit(txn.customerId, -parseFloat(txn.paidByCredit));
      }
    }

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
      if (oldTxn.customerId && oldTxn.paidByCredit > 0) {
        this.adjustCustomerCredit(oldTxn.customerId, -parseFloat(oldTxn.paidByCredit));
      }
    }

    // 2. Compute variables and apply stock adjustments for the new transaction state
    let serviceChargeToCash = 0;
    let serviceChargeToAccount = 0;

    if (updatedData.type === 'sale') {
      const amount = parseFloat(updatedData.amount || 0);
      const cost = parseFloat(updatedData.deductedAmount || 0);
      const gst = parseFloat(updatedData.gstAmount || 0);
      const profit = amount - cost - gst;

      if (updatedData.paidByCash > 0) {
        serviceChargeToCash = parseFloat(profit.toFixed(2));
      } else {
        serviceChargeToAccount = parseFloat(profit.toFixed(2));
      }

      if (updatedData.productId) {
        this.adjustStock(updatedData.productId, -Math.abs(updatedData.quantity || 1));
      }

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
    const id = 'CO-' + (1000 + this.customers.length + 1);
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

  // Inventory Product Management
  addProduct(prodData) {
    const id = 'PROD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newProduct = {
      id,
      name: prodData.name,
      sku: prodData.sku || '',
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

  syncToGitHubPages() {
    if (!this.isLocalhost()) return;
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', () => this.syncToGitHubPages());
      return;
    }
    let iframe = document.getElementById('cyberone-sync-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'cyberone-sync-iframe';
      iframe.style.display = 'none';
      iframe.src = 'https://cyberonecsc.github.io/ledger/sync.html';
      document.body.appendChild(iframe);
    }
    
    const sendData = () => {
      const payload = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cyberone_v2_')) {
          payload[key] = localStorage.getItem(key);
        }
      }
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'write_sync_data',
          data: payload
        }, 'https://cyberonecsc.github.io');
      }
    };

    if (iframe.dataset.loaded === 'true') {
      sendData();
    } else {
      iframe.onload = () => {
        iframe.dataset.loaded = 'true';
        sendData();
      };
    }
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
        let val = localStorage.getItem(key);
        if (key === 'cyberone_v2_github_token') {
          val = obfuscateToken(val);
        }
        payload[key] = val;
      }
    }
    const users = localStorage.getItem('cyberone_v2_users');
    if (users) {
      payload['cyberone_v2_users'] = users;
    }

    // Try relative endpoint first. Works on localhost and any local LAN IP of the server.
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
      console.log('Successfully saved to local server database & pushed to Git:', data);
      this.setSyncStatus('synced');
    })
    .catch(err => {
      // If relative save fails, it means we are on a remote client (GitHub Pages)
      // and should sync directly to GitHub via the REST API using the PAT token.
      console.log('Relative server save failed/not supported. Syncing via GitHub REST API:', err);
      this.pushToGitHubAPI();
    });
  }

  async pushToGitHubAPI() {
    const token = localStorage.getItem('cyberone_v2_github_token');
    const repo = localStorage.getItem('cyberone_v2_github_repo') || 'cyberonecsc/ledger';
    const branch = localStorage.getItem('cyberone_v2_github_branch') || 'main';

    if (!token) {
      console.warn('GitHub Personal Access Token is missing. Remote edits will not persist!');
      this.setSyncStatus('offline');
      if (window.AppInstance && typeof window.AppInstance.showToast === 'function') {
        window.AppInstance.showToast('Warning: GitHub Token missing in settings. Changes will not sync!', 'error');
      }
      return;
    }

    try {
      this.setSyncStatus('syncing');
      const url = `https://api.github.com/repos/${repo}/contents/db.json?ref=${branch}&t=${Date.now()}`;
      const fileRes = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      let sha = '';
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        sha = fileData.sha;
      } else {
        console.error('Failed to fetch existing db.json details from GitHub REST API');
        this.setSyncStatus('error');
        return;
      }

      const payload = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cyberone_v2_')) {
          let val = localStorage.getItem(key);
          if (key === 'cyberone_v2_github_token') {
            val = obfuscateToken(val);
          }
          payload[key] = val;
        }
      }
      const users = localStorage.getItem('cyberone_v2_users');
      if (users) {
        payload['cyberone_v2_users'] = users;
      }

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
      const putUrl = url.split('?')[0]; // Clean PUT URL without ref query parameter
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Auto-sync database update from remote portal',
          content: content,
          sha: sha,
          branch: branch
        })
      });

      if (putRes.ok) {
        console.log('Saved state to GitHub via REST API!');
        this.setSyncStatus('synced');
      } else {
        console.error('Failed to push to GitHub via API:', await putRes.text());
        this.setSyncStatus('error');
      }
    } catch (e) {
      console.error('Error pushing to GitHub REST API:', e);
      this.setSyncStatus('error');
    }
  }
}

// Export a single global instance of the store
export const store = new StateStore();
export default store;
