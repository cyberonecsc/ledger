/* ==========================================================================
   Akshaya Center Management Platform - Reports View (views/reports.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderReports(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const currentMonth = activeDate.substring(0, 7);

  mountPoint.innerHTML = `
    <!-- Tabs header -->
    <div class="tab-row no-print">
      <button class="btn btn-sm btn-primary reports-tab" data-target="daybook-pane">Daily Daybook</button>
      <button class="btn btn-sm btn-secondary reports-tab" data-target="pl-pane">Profit & Loss Statement</button>
      <button class="btn btn-sm btn-secondary reports-tab" data-target="wallet-pane">Wallet Reconciliation</button>
      <button class="btn btn-sm btn-secondary reports-tab" data-target="staff-perf-pane">Staff Performance</button>
      <button class="btn btn-sm btn-secondary reports-tab" data-target="custom-range-pane">Custom Range & Summary</button>
    </div>

    <!-- PANE 1: Daily Daybook -->
    <div id="daybook-pane" class="reports-pane">
      <div class="glass-card" style="padding: 30px; max-width: 650px; margin: 0 auto;" id="print-daybook">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid var(--panel-border); padding-bottom:15px;">
          <h3 style="font-family: var(--font-display); font-weight:700;">DAILY RECONCILIATION DAYBOOK</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">CYBERONE CSC CLT-14 | Date: ${activeDate}</p>
        </div>

        <div id="daybook-math-mount">
          <!-- Calculations mount here -->
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:30px;" class="no-print">
          <button id="btn-print-daybook" class="btn btn-primary">
            <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Daybook
          </button>
        </div>
      </div>
    </div>

    <!-- PANE 2: Profit & Loss Statement -->
    <div id="pl-pane" class="reports-pane" style="display:none;">
      <div class="glass-card" style="padding: 30px; max-width: 650px; margin: 0 auto;" id="print-pl">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid var(--panel-border); padding-bottom:15px;">
          <h3 style="font-family: var(--font-display); font-weight:700;">PROFIT & LOSS STATEMENT</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">CYBERONE CSC CLT-14 | Month: ${new Date(activeDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div id="pl-math-mount">
          <!-- Profit & Loss calculations mount here -->
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:30px;" class="no-print">
          <button id="btn-print-pl" class="btn btn-primary">
            <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Statement
          </button>
        </div>
      </div>
    </div>

    <!-- PANE 3: Wallet Reconcile -->
    <div id="wallet-pane" class="reports-pane" style="display:none;">
      <div class="glass-card" style="padding:24px;">
        <div class="section-header" style="margin-bottom:15px;">
          <h3>Wallet Statement Summary</h3>
          <span style="font-size:12px; color:var(--text-muted);">Current reserves across digital wallets</span>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Wallet Portal</th>
                <th>Login Credentials</th>
                <th>Standard Commission</th>
                <th style="text-align: right;">Current balance</th>
              </tr>
            </thead>
            <tbody>
              ${store.wallets.map(w => {
                const bal = store.getCurrentBalances()[w.id] || 0;
                return `
                  <tr>
                    <td><strong>${w.name}</strong></td>
                    <td><code>${w.loginId}</code></td>
                    <td>${(w.commissionRate * 100).toFixed(2)}%</td>
                    <td style="text-align: right; font-weight:700;">₹${bal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PANE 4: Staff Performance -->
    <div id="staff-perf-pane" class="reports-pane" style="display:none;">
      <div class="glass-card" style="padding:24px;">
        <div class="section-header" style="margin-bottom:15px;">
          <h3>Staff G2C Filing Performance</h3>
          <span style="font-size:12px; color:var(--text-muted);">Monthly processed government files & sales contributions</span>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Designation Role</th>
                <th style="text-align: center;">Applications Processed</th>
                <th>Generated Fees</th>
                <th>Generated Service Charge</th>
                <th>Total Sales Generated</th>
              </tr>
            </thead>
            <tbody>
              ${store.staff.map(s => {
                // Filter G2C files processed by this staff
                const staffApps = store.applications.filter(a => a.assignedStaffId === s.id);
                const appCount = staffApps.length;
                
                // Get sales transactions entered by this staff
                let salesVolume = 0;
                let feesVolume = 0;
                let scVolume = 0;

                Object.keys(store.dailyLogs).forEach(d => {
                  store.dailyLogs[d].transactions.forEach(t => {
                    if (t.type === 'sale' && t.staffId === s.id) {
                      salesVolume += t.amount;
                      feesVolume += t.deductedAmount;
                      scVolume += (t.serviceChargeToCash || 0) + (t.serviceChargeToAccount || 0);
                    }
                  });
                });

                return `
                  <tr>
                    <td><strong>${s.name}</strong></td>
                    <td style="text-transform: capitalize;">${s.role}</td>
                    <td style="text-align: center;"><span class="badge sale">${appCount} files</span></td>
                    <td>₹${feesVolume.toFixed(2)}</td>
                    <td style="color:var(--color-success); font-weight:500;">₹${scVolume.toFixed(2)}</td>
                    <td style="font-weight:700;">₹${salesVolume.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PANE 5: Custom Date Range Report -->
    <div id="custom-range-pane" class="reports-pane" style="display:none;">
      <div class="glass-card no-print" style="padding: 20px; margin-bottom: 25px;">
        <h4 style="font-family: var(--font-display); font-weight:700; margin-bottom:15px;">Select Date Range</h4>
        <div class="form-row-3" style="align-items: flex-end;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Start Date</label>
            <input type="date" id="custom-start-date" class="form-control" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">End Date</label>
            <input type="date" id="custom-end-date" class="form-control" required>
          </div>
          <button id="btn-update-custom-report" class="btn btn-primary" style="height: 38px;">
            <i data-lucide="refresh-cw" style="width:16px; height:16px;"></i> Update Report
          </button>
        </div>
      </div>

      <div class="glass-card" style="padding: 30px; margin: 0 auto;" id="print-custom-range">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid var(--panel-border); padding-bottom:15px;">
          <h3 style="font-family: var(--font-display); font-weight:700;">CYBER ONE CSC - CUSTOM DATE RANGE REPORT</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            Center: ${store.centerProfile.name} (${store.centerProfile.code})
          </p>
          <p id="custom-report-range-text" style="font-size:13px; font-weight:600; color:var(--color-info); margin-top:4px;">
            Range: -- to --
          </p>
        </div>

        <div class="card-grid" style="grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
          <div class="glass-card" style="padding:15px; text-align:center; border: 1px solid var(--panel-border);">
            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Gross Turnover</span>
            <div id="custom-kpi-turnover" style="font-family:var(--font-display); font-size:20px; font-weight:700; color:#fff; margin-top:5px;">₹0.00</div>
          </div>
          <div class="glass-card" style="padding:15px; text-align:center; border: 1px solid var(--panel-border);">
            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Net Income (SC)</span>
            <div id="custom-kpi-income" style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-success); margin-top:5px;">₹0.00</div>
          </div>
          <div class="glass-card" style="padding:15px; text-align:center; border: 1px solid var(--panel-border);">
            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Operating Expenses</span>
            <div id="custom-kpi-expenses" style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-danger); margin-top:5px;">₹0.00</div>
          </div>
          <div class="glass-card" style="padding:15px; text-align:center; border: 1px solid var(--panel-border);">
            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Net Profit</span>
            <div id="custom-kpi-profit" style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-info); margin-top:5px;">₹0.00</div>
          </div>
        </div>

        <h4 style="font-family: var(--font-display); font-weight:700; margin-bottom:15px; border-bottom:1px solid var(--panel-border); padding-bottom:5px;">Monthly & Yearly Performance Breakdown</h4>
        <div class="table-responsive">
          <table class="custom-table" style="width: 100%;">
            <thead>
              <tr>
                <th>Month / Year</th>
                <th style="text-align: right;">Gross Turnover</th>
                <th style="text-align: right;">Net Income (SC)</th>
                <th style="text-align: right;">Operating Expenses</th>
                <th style="text-align: right;">Net Profit</th>
              </tr>
            </thead>
            <tbody id="custom-range-tbody">
              <!-- Summary rows mount here -->
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;" class="no-print">
        <button id="btn-print-custom-range" class="btn btn-primary">
          <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Custom Report
        </button>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Financial Statements & Reports';
  document.getElementById('page-heading-sub').innerText = `Reconciliation summaries for ${activeDate}`;

  lucide.createIcons();

  // Tab switching inside reports page
  const tabButtons = document.querySelectorAll('.reports-tab');
  const panes = document.querySelectorAll('.reports-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      e.target.classList.add('btn-primary');
      e.target.classList.remove('btn-secondary');

      const targetId = e.target.getAttribute('data-target');
      panes.forEach(p => {
        p.style.display = p.id === targetId ? 'block' : 'none';
      });
    });
  });

  // Render Daybook details
  renderDaybookData(activeDate);

  // Render Profit & Loss details
  renderPLData(currentMonth);

  // Print buttons binders
  document.getElementById('btn-print-daybook').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-print-pl').addEventListener('click', () => {
    window.print();
  });

  // Default values for Custom Report Inputs
  const startDateInput = document.getElementById('custom-start-date');
  const endDateInput = document.getElementById('custom-end-date');
  
  if (startDateInput && endDateInput) {
    // Default to first day of current month
    const defaultStart = activeDate.substring(0, 8) + '01';
    startDateInput.value = defaultStart;
    endDateInput.value = activeDate;

    const updateCustomReport = () => {
      const startVal = startDateInput.value;
      const endVal = endDateInput.value;
      if (!startVal || !endVal) return;

      document.getElementById('custom-report-range-text').innerText = `Range: ${startVal} to ${endVal}`;

      let grossTurnover = 0;
      let netIncome = 0;
      let operatingExpenses = 0;
      const monthlySummary = {};

      Object.keys(store.dailyLogs).forEach(date => {
        if (date >= startVal && date <= endVal) {
          const log = store.dailyLogs[date];
          log.transactions.forEach(t => {
            const monthKey = date.substring(0, 7); // YYYY-MM
            if (!monthlySummary[monthKey]) {
              monthlySummary[monthKey] = { turnover: 0, income: 0, expenses: 0 };
            }

            if (t.type === 'sale') {
              const saleAmt = parseFloat(t.amount || 0);
              const sc = (t.serviceChargeToCash || 0) + (t.serviceChargeToAccount || 0);
              grossTurnover += saleAmt;
              netIncome += sc;
              monthlySummary[monthKey].turnover += saleAmt;
              monthlySummary[monthKey].income += sc;
            } else if (t.type === 'expense' || t.type === 'salary') {
              const expAmt = parseFloat(t.amount || 0);
              operatingExpenses += expAmt;
              monthlySummary[monthKey].expenses += expAmt;
            }
          });
        }
      });

      const netProfit = netIncome - operatingExpenses;

      document.getElementById('custom-kpi-turnover').innerText = `₹${grossTurnover.toFixed(2)}`;
      document.getElementById('custom-kpi-income').innerText = `₹${netIncome.toFixed(2)}`;
      document.getElementById('custom-kpi-expenses').innerText = `₹${operatingExpenses.toFixed(2)}`;
      document.getElementById('custom-kpi-profit').innerText = `₹${netProfit.toFixed(2)}`;

      const tbody = document.getElementById('custom-range-tbody');
      const sortedMonths = Object.keys(monthlySummary).sort();

      if (sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dimmed); padding:20px;">No transactions logged in this range.</td></tr>`;
      } else {
        tbody.innerHTML = sortedMonths.map(m => {
          const mData = monthlySummary[m];
          const mProfit = mData.income - mData.expenses;
          const monthDisplay = new Date(m + "-02").toLocaleString('default', { month: 'long', year: 'numeric' });
          return `
            <tr>
              <td><strong>${monthDisplay}</strong></td>
              <td style="text-align: right;">₹${mData.turnover.toFixed(2)}</td>
              <td style="text-align: right; color:var(--color-success);">₹${mData.income.toFixed(2)}</td>
              <td style="text-align: right; color:var(--color-danger);">₹${mData.expenses.toFixed(2)}</td>
              <td style="text-align: right; font-weight:700; color:${mProfit >= 0 ? 'var(--color-info)' : 'var(--color-danger)'};">₹${mProfit.toFixed(2)}</td>
            </tr>
          `;
        }).join('');
      }
    };

    // Trigger update on click or change
    document.getElementById('btn-update-custom-report').addEventListener('click', updateCustomReport);
    startDateInput.addEventListener('change', updateCustomReport);
    endDateInput.addEventListener('change', updateCustomReport);

    // Initial render
    updateCustomReport();
  }

  // Print button for Custom Range report
  const btnPrintCustom = document.getElementById('btn-print-custom-range');
  if (btnPrintCustom) {
    btnPrintCustom.addEventListener('click', () => {
      window.print();
    });
  }
}

function renderDaybookData(dateString) {
  const mount = document.getElementById('daybook-math-mount');
  if (!mount) return;

  const log = store.getOrCreateDailyLog(dateString);

  // Math totals
  let cashIn = 0;
  let upiIn = 0;
  let expenses = 0;

  log.transactions.forEach(t => {
    if (t.type === 'sale') {
      cashIn += t.paidByCash || 0;
      upiIn += t.paidByUPI || 0;
    } else if (t.type === 'expense' || t.type === 'salary') {
      expenses += t.amount;
    }
  });

  // Dynamically calculate total bank balances by summing up all bank accounts
  let openingBankTotal = 0;
  let closingBankTotal = 0;
  store.bankAccounts.forEach(b => {
    openingBankTotal += log.openingBalances[b.id] || 0;
    closingBankTotal += log.closingBalances[b.id] || 0;
  });

  mount.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      <tr style="border-bottom: 1px solid var(--panel-border);">
        <td style="padding: 12px 0; font-weight: 600;">Opening Cash Balance (Physical)</td>
        <td style="padding: 12px 0; text-align: right;">₹${log.openingBalances.cash.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-success);">
        <td style="padding: 12px 0;">+ Today's Cash Received (Sales)</td>
        <td style="padding: 12px 0; text-align: right;">+₹${cashIn.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 12px 0;">- Today's Cash Deducted (Expenses)</td>
        <td style="padding: 12px 0; text-align: right;">-₹${expenses.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: 700; font-size: 16px; border-bottom: 2px double var(--panel-border);">
        <td style="padding: 15px 0;">Expected Closing Cash Balance</td>
        <td style="padding: 15px 0; text-align: right; color: var(--color-success);">₹${log.closingBalances.cash.toFixed(2)}</td>
      </tr>
      <tr style="font-size: 12px; color: var(--text-dimmed);">
        <td style="padding: 10px 0;">*Tally this figure against physical cash in the drawer at store closing.</td>
        <td></td>
      </tr>
    </table>

    <h4 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px;">Bank/UPI Daily Volume</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="border-bottom: 1px solid var(--panel-border);">
        <td style="padding: 8px 0;">Opening Bank Balance</td>
        <td style="padding: 8px 0; text-align: right;">₹${openingBankTotal.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-info);">
        <td style="padding: 8px 0;">+ Received via UPI Payments</td>
        <td style="padding: 8px 0; text-align: right;">+₹${upiIn.toFixed(2)}</td>
      </tr>
      <tr style="font-weight:700; border-bottom: 1px solid var(--panel-border);">
        <td style="padding: 10px 0;">Closing Bank Balance</td>
        <td style="padding: 10px 0; text-align: right; color:var(--color-info);">₹${closingBankTotal.toFixed(2)}</td>
      </tr>
    </table>
  `;
}

function renderPLData(monthString) {
  const mount = document.getElementById('pl-math-mount');
  if (!mount) return;

  const stats = store.getMonthlyStats(monthString);

  // Group expenses by category
  const expensesByCategory = {};
  let totalExpenses = 0;

  Object.keys(store.dailyLogs).forEach(date => {
    if (date.startsWith(monthString)) {
      store.dailyLogs[date].transactions.forEach(t => {
        if (t.type === 'expense' || t.type === 'salary') {
          const cat = t.category || 'Salary';
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
          totalExpenses += t.amount;
        }
      });
    }
  });

  // Group service revenues by category
  let dtpRev = 0;
  let govtRev = 0;
  let utilitiesRev = 0;
  let rechargesRev = 0;

  Object.keys(store.dailyLogs).forEach(date => {
    if (date.startsWith(monthString)) {
      store.dailyLogs[date].transactions.forEach(t => {
        if (t.type === 'sale') {
          const sc = (t.serviceChargeToCash || 0) + (t.serviceChargeToAccount || 0);
          const desc = t.description.toLowerCase();
          
          if (desc.includes('dtp') || desc.includes('print') || desc.includes('copy')) {
            dtpRev += sc;
          } else if (desc.includes('recharge') || desc.includes('top')) {
            rechargesRev += sc;
          } else if (desc.includes('electricity') || desc.includes('kseb') || desc.includes('bill')) {
            utilitiesRev += sc;
          } else {
            govtRev += sc;
          }
        }
      });
    }
  });

  const totalRevenues = dtpRev + govtRev + utilitiesRev + rechargesRev;

  mount.innerHTML = `
    <!-- Revenue Section -->
    <h4 style="font-family: var(--font-display); font-weight:700; color:var(--color-success); margin-bottom:12px; border-bottom:1px solid var(--panel-border); padding-bottom:4px;">REVENUES (Service Charges & Commissions)</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 8px 0;">Government Applications (e-District, PAN, Aadhaar)</td>
        <td style="padding: 8px 0; text-align: right;">₹${govtRev.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">DTP & Printing Services</td>
        <td style="padding: 8px 0; text-align: right;">₹${dtpRev.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">Utilities Bill Payments (KSEB / KWA)</td>
        <td style="padding: 8px 0; text-align: right;">₹${utilitiesRev.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">Mobile & DTH Recharges</td>
        <td style="padding: 8px 0; text-align: right;">₹${rechargesRev.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: 700; font-size: 15px; border-top: 1px dashed var(--panel-border);">
        <td style="padding: 10px 0;">Total Revenue</td>
        <td style="padding: 10px 0; text-align: right; color:var(--color-success);">₹${totalRevenues.toFixed(2)}</td>
      </tr>
    </table>

    <!-- Expense Section -->
    <h4 style="font-family: var(--font-display); font-weight:700; color:var(--color-danger); margin-bottom:12px; border-bottom:1px solid var(--panel-border); padding-bottom:4px;">OPERATING EXPENSES</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      ${Object.keys(expensesByCategory).length === 0 ? `
        <tr><td colspan="2" style="padding: 8px 0; color:var(--text-dimmed);">No expenses logged for this month.</td></tr>
      ` : Object.keys(expensesByCategory).map(cat => `
        <tr>
          <td style="padding: 8px 0; text-transform:capitalize;">${cat} Expense</td>
          <td style="padding: 8px 0; text-align: right;">₹${expensesByCategory[cat].toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr style="font-weight: 700; font-size: 15px; border-top: 1px dashed var(--panel-border);">
        <td style="padding: 10px 0;">Total Expenses</td>
        <td style="padding: 10px 0; text-align: right; color:var(--color-danger);">₹${totalExpenses.toFixed(2)}</td>
      </tr>
    </table>

    <!-- Summary Row -->
    <div style="background: var(--color-primary-glow); padding: 15px; border: 1px solid rgba(99, 102, 241, 0.25); border-radius: var(--border-radius-md); display:flex; justify-content:space-between; align-items:center;">
      <strong style="font-family: var(--font-display); font-size: 16px;">NET OPERATING PROFIT</strong>
      <strong style="font-family: var(--font-display); font-size: 20px; color: ${stats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
        ₹${stats.netProfit.toFixed(2)}
      </strong>
    </div>
  `;
}

export default renderReports;
