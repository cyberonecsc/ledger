/* ==========================================================================
   Akshaya Center Management Platform - State & Data Layer (store.js)
   ========================================================================== */

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
  cash: 937,
  main_sbi: 17729.76,
  fed_retail: 0.00,
  csc: 1606.28,
  digipay: 0.00,
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
  { id: 'digipay', name: 'Digipay (AEPS)', loginId: 'DP-882011', commissionRate: 0.002, isActive: true, isAEPS: true },
  { id: 'paynearby', name: 'PayNearby (AEPS)', loginId: 'PNB-9844001', commissionRate: 0.002, isActive: true, isAEPS: true },
  { id: 'airtel_pb', name: 'Airtel Payments Bank', loginId: 'APB-773349', commissionRate: 0.0015, isActive: true, isAEPS: true },
  { id: 'ibkart', name: 'IBKART', loginId: 'IBK-6648', commissionRate: 0.01, isActive: true, isAEPS: false },
  { id: 'bsnl', name: 'BSNL Top-up', loginId: 'BSNL-8829', commissionRate: 0.03, isActive: true, isAEPS: false },
  { id: 'vi', name: 'VI Top-up', loginId: 'VI-99201', commissionRate: 0.032, isActive: true, isAEPS: false },
  { id: 'airtel', name: 'Airtel Retail', loginId: 'ARTL-4491', commissionRate: 0.028, isActive: true, isAEPS: false }
];

// Initial Bank accounts
const INITIAL_BANK_ACCOUNTS = [
  { id: 'main_sbi', name: 'SBI Main A/C', bankName: 'State Bank of India', accountNumber: '34488299101', ifsc: 'SBIN0007820', upiId: 'cyberone@sbi' },
  { id: 'fed_retail', name: 'Federal Bank', bankName: 'Federal Bank', accountNumber: '122901009843', ifsc: 'FDRL0001402', upiId: 'cyberone@federal' }
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

// Initial Products / Inventory items for Akshaya/CSC stores
const INITIAL_PRODUCTS = [
  { id: 'PROD-A4', name: 'A4 paper', sku: 'A4-PAPER', category: 'Materials', buyPrice: 0.8, sellPrice: 2, stock: 500, minStock: 50, type: 'product' },
  { id: 'PROD-PVC', name: 'PVC Lamination pouch', sku: 'PVC-POUCH', category: 'Materials', buyPrice: 5, sellPrice: 10, stock: 100, minStock: 10, type: 'product' }
];

// Initial seeded Government G2C applications
const INITIAL_APPLICATIONS = [];

// Master data structure loading from LocalStorage or initializing
class StateStore {
  constructor() {
    this.loadState();
  }

  loadState() {
    this.wallets = this.getItem('cyberone_v2_wallets', INITIAL_WALLETS);
    this.bankAccounts = this.getItem('cyberone_v2_bank_accounts', INITIAL_BANK_ACCOUNTS);
    this.customers = this.getItem('cyberone_v2_customers', INITIAL_CUSTOMERS);
    this.staff = this.getItem('cyberone_v2_staff', INITIAL_STAFF);
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
    
    // If dailyLogs doesn't exist, we seed an empty ledger sheet for today's date
    if (!this.dailyLogs) {
      this.dailyLogs = {};
      const seedDate = getTodayDateString();
      this.dailyLogs[seedDate] = {
        date: seedDate,
        openingBalances: { ...INITIAL_BALANCES },
        transactions: [],
        closingBalances: { ...INITIAL_BALANCES }
      };
      
      this.recalculateAllBalances();
    }
  }

  getSeededInvoices() {
    return [];
  }

  getItem(key, fallback) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  }

  saveItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  persistAll() {
    this.saveItem('cyberone_v2_wallets', this.wallets);
    this.saveItem('cyberone_v2_bank_accounts', this.bankAccounts);
    this.saveItem('cyberone_v2_customers', this.customers);
    this.saveItem('cyberone_v2_staff', this.staff);
    this.saveItem('cyberone_v2_products', this.products);
    this.saveItem('cyberone_v2_applications', this.applications);
    this.saveItem('cyberone_v2_invoices', this.invoices);
    this.saveItem('cyberone_v2_daily_logs', this.dailyLogs);
    this.saveItem('cyberone_v2_center_profile', this.centerProfile);
  }

  updateCenterProfile(profileData) {
    this.centerProfile = {
      ...this.centerProfile,
      ...profileData
    };
    this.persistAll();
    return true;
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
        // Keeps its current openingBalances
        if (!log.openingBalances) {
          log.openingBalances = { ...INITIAL_BALANCES };
        }
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

      log.transactions.forEach(txn => {
        if (txn.type === 'sale') {
          // Cash income
          if (txn.paidByCash) {
            balances.cash = parseFloat((balances.cash + parseFloat(txn.paidByCash)).toFixed(2));
          }
          // UPI/Bank income
          if (txn.paidByUPI) {
            const bankId = txn.bankId || 'main_sbi';
            balances[bankId] = parseFloat(((balances[bankId] || 0) + parseFloat(txn.paidByUPI)).toFixed(2));
          }
          // Wallet/Account cost deduction
          if (txn.deductedFrom && txn.deductedFrom !== 'none') {
            const walletId = txn.deductedFrom;
            const cost = parseFloat(txn.deductedAmount || 0);

            const targetId = walletId === 'account' ? 'main_sbi' : walletId;
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
            const targetId = walletId === 'account' ? 'main_sbi' : walletId;
            balances[targetId] = parseFloat(((balances[targetId] || 0) + amt).toFixed(2));
          } else {
            // Transfer from Bank Account to Digital Wallet
            const sourceId = txn.source === 'account' ? 'main_sbi' : txn.source;
            if (balances[sourceId] !== undefined) {
              balances[sourceId] = parseFloat((sourceId === 'cash' ? balances.cash : balances[sourceId] - amt).toFixed(2));
            }
            
            const targetId = walletId === 'account' ? 'main_sbi' : walletId;
            if (balances[targetId] !== undefined) {
              balances[targetId] = parseFloat((balances[targetId] + amt).toFixed(2));
            } else {
              balances[targetId] = amt;
            }
          }
        } else if (txn.type === 'expense' || txn.type === 'salary') {
          // Outflow expense
          const amt = parseFloat(txn.amount);
          const source = txn.source === 'account' ? 'main_sbi' : txn.source; // 'cash' or bank account ID
          
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

      log.closingBalances = balances;
      previousClosingBalances = balances;
    });

    this.persistAll();
  }

  // Retrieve current active balances (corresponds to the latest date's closing balances)
  getCurrentBalances() {
    const sortedDates = Object.keys(this.dailyLogs).sort();
    if (sortedDates.length === 0) return INITIAL_BALANCES;
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
    let prevBalances = { ...INITIAL_BALANCES };

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
      const profit = amount - cost;

      if (txnData.paidByCash > 0) {
        // If paid by cash, the profit is recognized as Service Charge to Cash
        serviceChargeToCash = parseFloat(profit.toFixed(2));
      } else {
        // Otherwise it goes to account
        serviceChargeToAccount = parseFloat(profit.toFixed(2));
      }

      // Decrement Inventory stock if a product was sold
      if (txnData.productId) {
        this.adjustStock(txnData.productId, -1);
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
    this.recalculateAllBalances();
    return newTxn;
  }

  adjustBalance(dateString, sourceId, targetBalance) {
    const log = this.getOrCreateDailyLog(dateString);
    const currentVal = log.closingBalances[sourceId] || 0;
    const diff = parseFloat((targetBalance - currentVal).toFixed(2));
    if (Math.abs(diff) < 0.01) return;

    this.addTransaction(dateString, {
      type: 'adjustment',
      description: `Manual Balance Adjustment`,
      amount: Math.abs(diff),
      sourceId: sourceId,
      diff: diff,
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
    
    // Rollback stock decrement if product sale is deleted
    if (txn.type === 'sale' && txn.productId) {
      this.adjustStock(txn.productId, 1);
    }

    log.transactions.splice(idx, 1);
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
    
    this.customers[idx] = {
      ...this.customers[idx],
      ...updatedData,
      creditBalance: parseFloat(updatedData.creditBalance || 0)
    };
    this.persistAll();
    return this.customers[idx];
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
      app.status = status;
      app.lastUpdated = getTodayDateString();
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
    
    this.products[idx] = {
      ...this.products[idx],
      ...updatedData,
      buyPrice: parseFloat(updatedData.buyPrice || 0),
      sellPrice: parseFloat(updatedData.sellPrice || 0),
      stock: updatedData.type === 'service' ? 0 : parseInt(updatedData.stock || 0),
      minStock: updatedData.type === 'service' ? 0 : parseInt(updatedData.minStock || 0),
      type: updatedData.type || 'product'
    };
    this.persistAll();
    return this.products[idx];
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
      createdAt: getTodayDateString()
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
        log.transactions.forEach(txn => {
          if (txn.type === 'sale') {
            monthlyIncome += (txn.serviceChargeToCash || 0) + (txn.serviceChargeToAccount || 0);
          } else if (txn.type === 'expense' || txn.type === 'salary') {
            monthlyExpense += txn.amount;
          }
        });
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

    if (log) {
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
    if (!log) return 0;
    
    return log.transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }

  // Get Monthly Turnover (Gross Traffic)
  getMonthlyTurnover(monthString) {
    let monthlyTurnover = 0;
    Object.keys(this.dailyLogs).forEach(date => {
      if (date.startsWith(monthString)) {
        const log = this.dailyLogs[date];
        log.transactions.forEach(txn => {
          if (txn.type === 'sale') {
            monthlyTurnover += parseFloat(txn.amount || 0);
          }
        });
      }
    });
    return parseFloat(monthlyTurnover.toFixed(2));
  }
}

// Export a single global instance of the store
export const store = new StateStore();
export default store;
