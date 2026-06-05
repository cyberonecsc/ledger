/* ==========================================================================
   CYBERONE Center Management Platform - Reports View (views/reports.js)
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

        <div id="daybook-chart-mount" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--panel-border); display: flex; justify-content: center;" class="no-print">
          <!-- SVG chart will mount here -->
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

        <div id="pl-chart-mount" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--panel-border); display: flex; justify-content: center;" class="no-print">
          <!-- SVG chart will mount here -->
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
        <div id="wallet-chart-mount" style="margin-top: 25px; border-top: 1px solid var(--panel-border); padding-top: 20px; display: flex; justify-content: center;">
          <!-- SVG chart will mount here -->
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
        <div id="staff-chart-mount" style="margin-top: 25px; border-top: 1px solid var(--panel-border); padding-top: 20px; display: flex; justify-content: center;">
          <!-- SVG chart will mount here -->
        </div>
      </div>
    </div>

    <!-- PANE 5: Custom Date Range Report -->
    <div id="custom-range-pane" class="reports-pane" style="display:none;">
      <div class="glass-card no-print" style="padding: 20px; margin-bottom: 25px;">
        <h4 style="font-family: var(--font-display); font-weight:700; margin-bottom:15px;">Select Report Period</h4>
        <div style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">Period Type</label>
            <select id="report-period-type" class="form-control">
              <option value="custom" selected>Custom Range</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          
          <!-- Custom Range Inputs -->
          <div id="wrapper-custom-range" style="display: flex; gap: 10px; flex: 2; min-width: 280px; margin: 0;">
            <div class="form-group" style="margin-bottom:0; flex: 1;">
              <label class="form-label">Start Date</label>
              <input type="date" id="custom-start-date" class="form-control">
            </div>
            <div class="form-group" style="margin-bottom:0; flex: 1;">
              <label class="form-label">End Date</label>
              <input type="date" id="custom-end-date" class="form-control">
            </div>
          </div>
          
          <!-- Daily Input -->
          <div id="wrapper-daily" class="form-group" style="margin-bottom:0; display: none; flex: 1.5; min-width: 180px;">
            <label class="form-label">Select Date</label>
            <input type="date" id="report-date-input" class="form-control">
          </div>
          
          <!-- Monthly Input -->
          <div id="wrapper-monthly" class="form-group" style="margin-bottom:0; display: none; flex: 1.5; min-width: 180px;">
            <label class="form-label">Select Month</label>
            <input type="month" id="report-month-input" class="form-control">
          </div>
          
          <!-- Yearly Input -->
          <div id="wrapper-yearly" class="form-group" style="margin-bottom:0; display: none; flex: 1.5; min-width: 180px;">
            <label class="form-label">Select Year</label>
            <select id="report-year-input" class="form-control">
              <!-- Years dynamically populated -->
            </select>
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

        <div id="custom-chart-mount" style="margin-top: 25px; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.01); border: 1px solid var(--panel-border); border-radius: var(--border-radius-md); display: flex; justify-content: center;" class="no-print">
          <!-- SVG chart will mount here -->
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

  // Render Wallet Reconciliation details
  renderWalletChart();

  // Render Staff Performance details
  renderStaffChart();

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
    // Populate dynamic year selection dropdown
    const yearSelect = document.getElementById('report-year-input');
    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      let yearsHtml = '';
      for (let y = currentYear; y >= currentYear - 5; y--) {
        yearsHtml += `<option value="${y}" ${y === new Date(activeDate).getFullYear() ? 'selected' : ''}>${y}</option>`;
      }
      yearSelect.innerHTML = yearsHtml;
    }

    // Default to first day of current month
    const defaultStart = activeDate.substring(0, 8) + '01';
    startDateInput.value = defaultStart;
    endDateInput.value = activeDate;
    document.getElementById('report-date-input').value = activeDate;
    document.getElementById('report-month-input').value = activeDate.substring(0, 7);

    const updateCustomReport = () => {
      const periodType = document.getElementById('report-period-type').value;
      let filterFn = (date) => false;
      let labelText = '';

      if (periodType === 'custom') {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value;
        if (!startVal || !endVal) return;
        filterFn = (date) => (date >= startVal && date <= endVal);
        labelText = `Range: ${startVal} to ${endVal}`;
      } else if (periodType === 'daily') {
        const dateVal = document.getElementById('report-date-input').value;
        if (!dateVal) return;
        filterFn = (date) => (date === dateVal);
        labelText = `Daily Report: ${dateVal}`;
      } else if (periodType === 'monthly') {
        const monthVal = document.getElementById('report-month-input').value;
        if (!monthVal) return;
        filterFn = (date) => date.startsWith(monthVal);
        labelText = `Monthly Report: ${monthVal}`;
      } else if (periodType === 'yearly') {
        const yearVal = document.getElementById('report-year-input').value;
        if (!yearVal) return;
        filterFn = (date) => date.startsWith(yearVal);
        labelText = `Yearly Report: ${yearVal}`;
      }

      document.getElementById('custom-report-range-text').innerText = labelText;

      let grossTurnover = 0;
      let netIncome = 0;
      let operatingExpenses = 0;
      const monthlySummary = {};

      Object.keys(store.dailyLogs).forEach(date => {
        if (filterFn(date)) {
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
        const chartMount = document.getElementById('custom-chart-mount');
        if (chartMount) chartMount.innerHTML = '';
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

        const chartMount = document.getElementById('custom-chart-mount');
        if (chartMount) {
          chartMount.innerHTML = generateTimelineSVG(monthlySummary);
        }
      }
    };

    // Toggle input sections based on period selection
    const periodSelect = document.getElementById('report-period-type');
    const customWrapper = document.getElementById('wrapper-custom-range');
    const dailyWrapper = document.getElementById('wrapper-daily');
    const monthlyWrapper = document.getElementById('wrapper-monthly');
    const yearlyWrapper = document.getElementById('wrapper-yearly');

    periodSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      customWrapper.style.display = val === 'custom' ? 'flex' : 'none';
      dailyWrapper.style.display = val === 'daily' ? 'block' : 'none';
      monthlyWrapper.style.display = val === 'monthly' ? 'block' : 'none';
      yearlyWrapper.style.display = val === 'yearly' ? 'block' : 'none';
      updateCustomReport();
    });

    // Trigger update on click or change
    document.getElementById('btn-update-custom-report').addEventListener('click', updateCustomReport);
    startDateInput.addEventListener('change', updateCustomReport);
    endDateInput.addEventListener('change', updateCustomReport);
    document.getElementById('report-date-input').addEventListener('change', updateCustomReport);
    document.getElementById('report-month-input').addEventListener('change', updateCustomReport);
    document.getElementById('report-year-input').addEventListener('change', updateCustomReport);

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
  let cashSales = 0;
  let cashDepositsReceived = 0;
  let cashExpensesPaid = 0;
  let cashDepositsPaid = 0;
  let cashAdjustments = 0;

  let pettyCashDepositsReceived = 0;
  let pettyCashExpensesPaid = 0;
  let pettyCashDepositsPaid = 0;
  let pettyCashAdjustments = 0;

  let upiSales = 0;
  let bankDepositsReceived = 0;
  let bankExpensesPaid = 0;
  let bankDepositsPaid = 0;
  let bankAdjustments = 0;

  log.transactions.forEach(t => {
    if (t.type === 'sale') {
      cashSales += t.paidByCash || 0;
      upiSales += t.paidByUPI || 0;
    } else if (t.type === 'deposit') {
      const amt = parseFloat(t.amount || 0);
      const source = t.source === 'account' ? 'main_bob' : t.source;
      const target = t.targetWallet === 'account' ? 'main_bob' : t.targetWallet;

      const isBankSource = store.bankAccounts.some(b => b.id === source);
      const isBankTarget = store.bankAccounts.some(b => b.id === target);

      // Handle source subtraction
      if (source === 'cash') {
        cashDepositsPaid += amt;
      } else if (source === 'petty_cash') {
        pettyCashDepositsPaid += amt;
      } else if (isBankSource) {
        bankDepositsPaid += amt;
      }

      // Handle target addition
      if (target === 'cash') {
        cashDepositsReceived += amt;
      } else if (target === 'petty_cash') {
        pettyCashDepositsReceived += amt;
      } else if (isBankTarget) {
        bankDepositsReceived += amt;
      }
    } else if (t.type === 'expense' || t.type === 'salary') {
      const amt = parseFloat(t.amount || 0);
      const source = t.source === 'account' ? 'main_bob' : t.source;
      const isBankSource = store.bankAccounts.some(b => b.id === source);

      if (source === 'cash') {
        cashExpensesPaid += amt;
      } else if (source === 'petty_cash') {
        pettyCashExpensesPaid += amt;
      } else if (isBankSource) {
        bankExpensesPaid += amt;
      }
    } else if (t.type === 'adjustment') {
      const diff = parseFloat(t.diff || 0);
      const source = t.sourceId;
      const isBankSource = store.bankAccounts.some(b => b.id === source);

      if (source === 'cash') {
        cashAdjustments += diff;
      } else if (source === 'petty_cash') {
        pettyCashAdjustments += diff;
      } else if (isBankSource) {
        bankAdjustments += diff;
      }
    }
  });

  // Dynamically calculate total bank balances by summing up all bank accounts
  let openingBankTotal = 0;
  let closingBankTotal = 0;
  store.bankAccounts.forEach(b => {
    openingBankTotal += log.openingBalances[b.id] || 0;
    closingBankTotal += log.closingBalances[b.id] || 0;
  });

  const openingPettyCash = log.openingBalances.petty_cash || 0;
  const closingPettyCash = log.closingBalances.petty_cash || 0;

  let physicalRows = `
    <tr style="border-bottom: 1px solid var(--panel-border);">
      <td style="padding: 10px 0; font-weight: 600;">Opening Cash Balance (Physical)</td>
      <td style="padding: 10px 0; text-align: right;">₹${log.openingBalances.cash.toFixed(2)}</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-success);">
      <td style="padding: 10px 0;">+ Today's Cash Received (Sales)</td>
      <td style="padding: 10px 0; text-align: right;">+₹${cashSales.toFixed(2)}</td>
    </tr>
  `;
  if (cashDepositsReceived > 0) {
    physicalRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-success);">
        <td style="padding: 10px 0;">+ Today's Cash Received (Deposits/Transfers)</td>
        <td style="padding: 10px 0; text-align: right;">+₹${cashDepositsReceived.toFixed(2)}</td>
      </tr>
    `;
  }
  if (cashExpensesPaid > 0) {
    physicalRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 10px 0;">- Today's Cash Deducted (Expenses/Salaries)</td>
        <td style="padding: 10px 0; text-align: right;">-₹${cashExpensesPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (cashDepositsPaid > 0) {
    physicalRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 10px 0;">- Today's Cash Paid (Deposits/Transfers)</td>
        <td style="padding: 10px 0; text-align: right;">-₹${cashDepositsPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (cashAdjustments !== 0) {
    const isPositive = cashAdjustments > 0;
    physicalRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'};">
        <td style="padding: 10px 0;">${isPositive ? '+' : '-'} Today's Cash Adjustments</td>
        <td style="padding: 10px 0; text-align: right;">${isPositive ? '+' : ''}₹${cashAdjustments.toFixed(2)}</td>
      </tr>
    `;
  }
  physicalRows += `
    <tr style="font-weight: 700; font-size: 15px; border-bottom: 2px double var(--panel-border);">
      <td style="padding: 12px 0;">Expected Closing Cash Balance</td>
      <td style="padding: 12px 0; text-align: right; color: var(--color-success);">₹${log.closingBalances.cash.toFixed(2)}</td>
    </tr>
  `;

  let pettyRows = `
    <tr style="border-bottom: 1px solid var(--panel-border);">
      <td style="padding: 8px 0; font-weight: 600;">Opening Petty Cash Balance</td>
      <td style="padding: 8px 0; text-align: right;">₹${openingPettyCash.toFixed(2)}</td>
    </tr>
  `;
  if (pettyCashDepositsReceived > 0) {
    pettyRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-success);">
        <td style="padding: 8px 0;">+ Today's Petty Cash Received (Deposits/Transfers)</td>
        <td style="padding: 8px 0; text-align: right;">+₹${pettyCashDepositsReceived.toFixed(2)}</td>
      </tr>
    `;
  }
  if (pettyCashExpensesPaid > 0) {
    pettyRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 8px 0;">- Today's Petty Cash Deducted (Expenses/Salaries)</td>
        <td style="padding: 8px 0; text-align: right;">-₹${pettyCashExpensesPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (pettyCashDepositsPaid > 0) {
    pettyRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 8px 0;">- Today's Petty Cash Paid (Deposits/Transfers)</td>
        <td style="padding: 8px 0; text-align: right;">-₹${pettyCashDepositsPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (pettyCashAdjustments !== 0) {
    const isPositive = pettyCashAdjustments > 0;
    pettyRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'};">
        <td style="padding: 8px 0;">${isPositive ? '+' : '-'} Today's Petty Cash Adjustments</td>
        <td style="padding: 8px 0; text-align: right;">${isPositive ? '+' : ''}₹${pettyCashAdjustments.toFixed(2)}</td>
      </tr>
    `;
  }
  pettyRows += `
    <tr style="font-weight: 700; font-size: 15px; border-bottom: 2px double var(--panel-border);">
      <td style="padding: 12px 0;">Expected Closing Petty Cash Balance</td>
      <td style="padding: 12px 0; text-align: right; color: #fb923c;">₹${closingPettyCash.toFixed(2)}</td>
    </tr>
  `;

  let bankRows = `
    <tr style="border-bottom: 1px solid var(--panel-border);">
      <td style="padding: 8px 0; font-weight: 600;">Opening Bank Balance</td>
      <td style="padding: 8px 0; text-align: right;">₹${openingBankTotal.toFixed(2)}</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-info);">
      <td style="padding: 8px 0;">+ Today's UPI Received (Sales)</td>
      <td style="padding: 8px 0; text-align: right;">+₹${upiSales.toFixed(2)}</td>
    </tr>
  `;
  if (bankDepositsReceived > 0) {
    bankRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-success);">
        <td style="padding: 8px 0;">+ Today's Bank Deposits/Transfers Received</td>
        <td style="padding: 8px 0; text-align: right;">+₹${bankDepositsReceived.toFixed(2)}</td>
      </tr>
    `;
  }
  if (bankExpensesPaid > 0) {
    bankRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 8px 0;">- Today's Bank Deducted (Expenses/Salaries)</td>
        <td style="padding: 8px 0; text-align: right;">-₹${bankExpensesPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (bankDepositsPaid > 0) {
    bankRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: var(--color-danger);">
        <td style="padding: 8px 0;">- Today's Bank Deposits/Transfers Paid</td>
        <td style="padding: 8px 0; text-align: right;">-₹${bankDepositsPaid.toFixed(2)}</td>
      </tr>
    `;
  }
  if (bankAdjustments !== 0) {
    const isPositive = bankAdjustments > 0;
    bankRows += `
      <tr style="border-bottom: 1px solid var(--panel-border); color: ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'};">
        <td style="padding: 8px 0;">${isPositive ? '+' : '-'} Today's Bank Adjustments</td>
        <td style="padding: 8px 0; text-align: right;">${isPositive ? '+' : ''}₹${bankAdjustments.toFixed(2)}</td>
      </tr>
    `;
  }
  bankRows += `
    <tr style="font-weight: 700; font-size: 15px; border-bottom: 2px double var(--panel-border);">
      <td style="padding: 12px 0;">Expected Closing Bank Balance</td>
      <td style="padding: 12px 0; text-align: right; color: var(--color-info);">₹${closingBankTotal.toFixed(2)}</td>
    </tr>
  `;

  mount.innerHTML = `
    <h4 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; color: var(--color-success);">Physical Cash Volume</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      ${physicalRows}
    </table>

    <h4 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; color: #fb923c;">Petty Cash Volume</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      ${pettyRows}
    </table>

    <h4 style="font-family:var(--font-display); font-weight:700; margin-bottom:12px; color: var(--color-info);">Bank & UPI Volume</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 25px;">
      ${bankRows}
    </table>
  `;

  const daybookChart = document.getElementById('daybook-chart-mount');
  if (daybookChart) {
    daybookChart.innerHTML = generateDaybookSVG(
      log.openingBalances.cash,
      log.closingBalances.cash,
      openingPettyCash,
      closingPettyCash,
      openingBankTotal,
      closingBankTotal
    );
  }
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

  const plChart = document.getElementById('pl-chart-mount');
  if (plChart) {
    plChart.innerHTML = generatePLSVG(
      govtRev,
      dtpRev,
      utilitiesRev,
      rechargesRev,
      totalRevenues,
      totalExpenses
    );
  }
}

function renderWalletChart() {
  const mount = document.getElementById('wallet-chart-mount');
  if (!mount) return;
  const balances = store.getCurrentBalances();
  mount.innerHTML = generateWalletSVG(store.wallets, balances);
}

function renderStaffChart() {
  const mount = document.getElementById('staff-chart-mount');
  if (!mount) return;

  const staffData = store.staff.map(s => {
    const appCount = store.applications.filter(a => a.assignedStaffId === s.id).length;
    let salesVolume = 0;
    Object.keys(store.dailyLogs).forEach(date => {
      store.dailyLogs[date].transactions.forEach(t => {
        if (t.type === 'sale' && t.staffId === s.id) {
          salesVolume += t.amount;
        }
      });
    });
    return {
      name: s.name,
      role: s.role,
      apps: appCount,
      sales: salesVolume
    };
  });

  mount.innerHTML = generateStaffSVG(staffData);
}

function generateDaybookSVG(opCash, clCash, opPettyCash, clPettyCash, opBank, clBank) {
  const max = Math.max(opCash, clCash, opPettyCash, clPettyCash, opBank, clBank, 1000) * 1.15; // 15% padding at top
  const height = 180;
  const width = 500;
  const paddingLeft = 50;
  const paddingTop = 20;
  const chartHeight = height - paddingTop;
  const chartWidth = width - paddingLeft - 20;

  const getH = (val) => (val / max) * chartHeight;
  const getTop = (val) => chartHeight - getH(val) + paddingTop;

  const hOpCash = getH(opCash);
  const hClCash = getH(clCash);
  const hOpPetty = getH(opPettyCash);
  const hClPetty = getH(clPettyCash);
  const hOpBank = getH(opBank);
  const hClBank = getH(clBank);

  const tOpCash = getTop(opCash);
  const tClCash = getTop(clCash);
  const tOpPetty = getTop(opPettyCash);
  const tClPetty = getTop(clPettyCash);
  const tOpBank = getTop(opBank);
  const tClBank = getTop(clBank);

  return `
    <svg viewBox="0 0 500 240" style="width: 100%; max-width: 500px; height: auto; font-family: inherit;">
      <!-- Gridlines -->
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${width - 20}" y2="${paddingTop}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight * 0.33}" x2="${width - 20}" y2="${paddingTop + chartHeight * 0.33}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight * 0.66}" x2="${width - 20}" y2="${paddingTop + chartHeight * 0.66}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
      <line x1="${paddingLeft}" y1="${chartHeight + paddingTop}" x2="${width - 20}" y2="${chartHeight + paddingTop}" stroke="rgba(255,255,255,0.1)" />

      <!-- Y Axis Labels -->
      <text x="${paddingLeft - 8}" y="${paddingTop + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${Math.round(max).toLocaleString('en-IN')}</text>
      <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight * 0.33 + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${Math.round(max * 0.66).toLocaleString('en-IN')}</text>
      <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight * 0.66 + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${Math.round(max * 0.33).toLocaleString('en-IN')}</text>
      <text x="${paddingLeft - 8}" y="${chartHeight + paddingTop + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹0</text>

      <!-- Cash Bars -->
      <!-- Opening Cash -->
      <rect x="70" y="${tOpCash}" width="24" height="${hOpCash}" rx="4" fill="url(#grad-cash-op)" style="transition: all 0.5s ease-in-out;" />
      <text x="82" y="${tOpCash - 6}" fill="#f59e0b" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(opCash)}</text>
      <text x="82" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Opening</text>
      
      <!-- Closing Cash -->
      <rect x="100" y="${tClCash}" width="24" height="${hClCash}" rx="4" fill="url(#grad-cash-cl)" style="transition: all 0.5s ease-in-out;" />
      <text x="112" y="${tClCash - 6}" fill="#fb923c" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(clCash)}</text>
      <text x="112" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Closing</text>

      <!-- Label for Cash Group -->
      <text x="97" y="${chartHeight + paddingTop + 30}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">Physical Cash</text>

      <!-- Petty Cash Bars -->
      <!-- Opening Petty -->
      <rect x="190" y="${tOpPetty}" width="24" height="${hOpPetty}" rx="4" fill="url(#grad-petty-op)" style="transition: all 0.5s ease-in-out;" />
      <text x="202" y="${tOpPetty - 6}" fill="#a855f7" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(opPettyCash)}</text>
      <text x="202" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Opening</text>
      
      <!-- Closing Petty -->
      <rect x="220" y="${tClPetty}" width="24" height="${hClPetty}" rx="4" fill="url(#grad-petty-cl)" style="transition: all 0.5s ease-in-out;" />
      <text x="232" y="${tClPetty - 6}" fill="#d946ef" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(clPettyCash)}</text>
      <text x="232" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Closing</text>

      <!-- Label for Petty Cash Group -->
      <text x="217" y="${chartHeight + paddingTop + 30}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">Petty Cash</text>

      <!-- Bank Bars -->
      <!-- Opening Bank -->
      <rect x="310" y="${tOpBank}" width="24" height="${hOpBank}" rx="4" fill="url(#grad-bank-op)" style="transition: all 0.5s ease-in-out;" />
      <text x="322" y="${tOpBank - 6}" fill="#06b6d4" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(opBank)}</text>
      <text x="322" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Opening</text>
      
      <!-- Closing Bank -->
      <rect x="340" y="${tClBank}" width="24" height="${hClBank}" rx="4" fill="url(#grad-bank-cl)" style="transition: all 0.5s ease-in-out;" />
      <text x="352" y="${tClBank - 6}" fill="#38bdf8" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(clBank)}</text>
      <text x="352" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="8" text-anchor="middle">Closing</text>

      <!-- Label for Bank Group -->
      <text x="337" y="${chartHeight + paddingTop + 30}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">Bank/UPI</text>

      <!-- Gradients Definition -->
      <defs>
        <linearGradient id="grad-cash-op" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="grad-cash-cl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fb923c" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#fb923c" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="grad-petty-op" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="grad-petty-cl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d946ef" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#d946ef" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="grad-bank-op" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.2"/>
        </linearGradient>
        <linearGradient id="grad-bank-cl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

function generatePLSVG(govt, dtp, bills, recharges, totalRev, totalExp) {
  // Donut chart calculations for Revenue Breakdown
  const total = (govt + dtp + bills + recharges) || 1;
  const categories = [
    { label: 'Govt Applications', value: govt, color: '#a855f7' }, // Purple
    { label: 'DTP & Printing', value: dtp, color: '#3b82f6' }, // Blue
    { label: 'Utilities / Bills', value: bills, color: '#eab308' }, // Yellow
    { label: 'Recharges', value: recharges, color: '#06b6d4' } // Cyan
  ].filter(c => c.value > 0);

  const radius = 45;
  const circ = 2 * Math.PI * radius; // 282.74
  let accumulatedPercent = 0;
  
  let donutSlices = '';
  let legendHtml = '';
  
  categories.forEach((cat, index) => {
    const percent = cat.value / total;
    const strokeDash = percent * circ;
    const strokeOffset = circ - strokeDash + (accumulatedPercent * circ);
    accumulatedPercent -= percent; // rotate backwards to go clockwise starting at top

    donutSlices += `
      <circle r="${radius}" cx="80" cy="100" fill="transparent"
              stroke="${cat.color}" stroke-width="14"
              stroke-dasharray="${strokeDash} ${circ - strokeDash}"
              stroke-dashoffset="${strokeOffset}"
              transform="rotate(-90 80 100)">
      </circle>
    `;

    legendHtml += `
      <g transform="translate(150, ${40 + index * 24})">
        <rect width="10" height="10" rx="2" fill="${cat.color}" />
        <text x="18" y="9" fill="var(--text-muted)" font-size="10">${cat.label}</text>
        <text x="130" y="9" fill="#fff" font-weight="700" font-size="10">₹${Math.round(cat.value)}</text>
      </g>
    `;
  });

  if (categories.length === 0) {
    donutSlices = `<circle r="${radius}" cx="80" cy="100" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="14"></circle>`;
    legendHtml = `<text x="150" y="105" fill="var(--text-dimmed)" font-size="11">No revenue logged</text>`;
  }

  // Revenue vs Expenses comparison bars (on the right)
  const maxBar = Math.max(totalRev, totalExp, 1000) * 1.15;
  const barChartWidth = 180;
  const getBarW = (val) => (val / maxBar) * barChartWidth;

  const wRev = getBarW(totalRev);
  const wExp = getBarW(totalExp);

  return `
    <svg viewBox="0 0 600 200" style="width: 100%; max-width: 600px; height: auto; font-family: inherit;">
      <!-- Background Pane Splitter -->
      <line x1="320" y1="15" x2="320" y2="185" stroke="rgba(255,255,255,0.08)" />

      <!-- Left Side: Revenue Breakdown Donut -->
      <text x="15" y="25" fill="#fff" font-size="12" font-weight="700">Revenue Distribution</text>
      
      <!-- Donut Circle Group -->
      ${donutSlices}
      <circle r="36" cx="80" cy="100" fill="#18181b" />
      <text x="80" y="97" fill="var(--text-muted)" font-size="8" text-anchor="middle">TOTAL REV</text>
      <text x="80" y="110" fill="#10b981" font-size="12" font-weight="800" text-anchor="middle">₹${Math.round(totalRev)}</text>

      <!-- Donut Legends -->
      ${legendHtml}

      <!-- Right Side: Revenue vs Expenses -->
      <text x="340" y="25" fill="#fff" font-size="12" font-weight="700">Operating Summary</text>
      
      <!-- Revenue Bar -->
      <text x="340" y="55" fill="var(--text-muted)" font-size="10">Total Revenues (SC)</text>
      <rect x="340" y="65" width="${barChartWidth}" height="16" rx="4" fill="rgba(255,255,255,0.02)" />
      <rect x="340" y="65" width="${wRev}" height="16" rx="4" fill="url(#grad-pl-rev)" />
      <text x="${Math.max(345, 340 + wRev + 8)}" y="77" fill="#10b981" font-size="11" font-weight="700">₹${Math.round(totalRev)}</text>

      <!-- Expenses Bar -->
      <text x="340" y="110" fill="var(--text-muted)" font-size="10">Operating Expenses</text>
      <rect x="340" y="120" width="${barChartWidth}" height="16" rx="4" fill="rgba(255,255,255,0.02)" />
      <rect x="340" y="120" width="${wExp}" height="16" rx="4" fill="url(#grad-pl-exp)" />
      <text x="${Math.max(345, 340 + wExp + 8)}" y="132" fill="#ef4444" font-size="11" font-weight="700">₹${Math.round(totalExp)}</text>

      <!-- Net Profit Indicator -->
      <g transform="translate(340, 160)">
        <text x="0" y="12" fill="var(--text-muted)" font-size="11">Net Operating Profit:</text>
        <text x="135" y="14" fill="${totalRev - totalExp >= 0 ? '#10b981' : '#ef4444'}" font-size="15" font-weight="800">
          ₹${Math.round(totalRev - totalExp)}
        </text>
      </g>

      <!-- Defs for gradients -->
      <defs>
        <linearGradient id="grad-pl-rev" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#34d399" stop-opacity="0.8"/>
        </linearGradient>
        <linearGradient id="grad-pl-exp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#f87171" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

function generateWalletSVG(wallets, balances) {
  const data = wallets.map(w => ({
    name: w.name,
    bal: balances[w.id] || 0,
    login: w.loginId
  }));

  const maxBal = Math.max(...data.map(d => d.bal), 1000);
  const height = 40 + data.length * 45;
  const width = 600;
  const labelWidth = 140;
  const chartWidth = width - labelWidth - 90;

  let barsHtml = '';
  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  data.forEach((wData, index) => {
    const barW = (wData.bal / maxBal) * chartWidth;
    const y = 30 + index * 45;

    barsHtml += `
      <g transform="translate(0, ${y})">
        <!-- Label -->
        <text x="10" y="14" fill="#fff" font-size="11" font-weight="700">${wData.name}</text>
        <text x="10" y="26" fill="var(--text-dimmed)" font-size="9">${wData.login}</text>
        
        <!-- Bar background -->
        <rect x="${labelWidth}" y="6" width="${chartWidth}" height="16" rx="4" fill="rgba(255,255,255,0.02)" />
        
        <!-- Fill Bar -->
        <rect x="${labelWidth}" y="6" width="${barW}" height="16" rx="4" fill="url(#grad-wallet-${index})" />
        
        <!-- Balance value -->
        <text x="${labelWidth + barW + 8}" y="18" fill="#fff" font-size="11" font-weight="700">₹${wData.bal.toFixed(2)}</text>
      </g>
    `;
  });

  let gradientsHtml = '';
  data.forEach((wData, index) => {
    const color = colors[index % colors.length];
    gradientsHtml += `
      <linearGradient id="grad-wallet-${index}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.25"/>
      </linearGradient>
    `;
  });

  return `
    <svg viewBox="0 0 600 ${height}" style="width: 100%; max-width: 600px; height: auto; font-family: inherit;">
      <text x="10" y="15" fill="var(--text-muted)" font-size="10" font-weight="700" text-transform="uppercase">Wallet Balance Comparison</text>
      ${barsHtml}
      <defs>
        ${gradientsHtml}
      </defs>
    </svg>
  `;
}

function generateStaffSVG(staffData) {
  const max = Math.max(...staffData.map(d => d.sales), 1000) * 1.15;
  const height = 200;
  const width = 600;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const chartHeight = height - paddingTop;
  const chartWidth = width - paddingLeft - paddingRight;

  const barCount = staffData.length;
  const spacing = chartWidth / (barCount || 1);
  const barWidth = Math.min(45, spacing * 0.5);

  let barsHtml = '';
  
  staffData.forEach((s, index) => {
    const h = (s.sales / max) * chartHeight;
    const top = chartHeight - h + paddingTop;
    const x = paddingLeft + index * spacing + (spacing - barWidth) / 2;

    barsHtml += `
      <g>
        <!-- Sales Bar -->
        <rect x="${x}" y="${top}" width="${barWidth}" height="${h}" rx="4" fill="url(#grad-staff-${index})" style="transition: all 0.5s ease-in-out;" />
        
        <!-- Sales value text -->
        <text x="${x + barWidth/2}" y="${top - 6}" fill="#22d3ee" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(s.sales)}</text>
        
        <!-- Files counter bubble inside/above bar -->
        <circle cx="${x + barWidth/2}" cy="${top + 15}" r="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
        <text x="${x + barWidth/2}" y="${top + 18}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle">${s.apps}</text>

        <!-- X Label (Name) -->
        <text x="${x + barWidth/2}" y="${chartHeight + paddingTop + 15}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">${s.name}</text>
        <text x="${x + barWidth/2}" y="${chartHeight + paddingTop + 26}" fill="var(--text-dimmed)" font-size="8" text-anchor="middle" style="text-transform:capitalize;">${s.role}</text>
      </g>
    `;
  });

  const colors = ['#06b6d4', '#10b981', '#a855f7', '#f59e0b', '#3b82f6'];
  let gradientsHtml = '';
  staffData.forEach((s, index) => {
    const color = colors[index % colors.length];
    gradientsHtml += `
      <linearGradient id="grad-staff-${index}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.15"/>
      </linearGradient>
    `;
  });

  return `
    <svg viewBox="0 0 600 240" style="width: 100%; max-width: 600px; height: auto; font-family: inherit;">
      <text x="10" y="15" fill="var(--text-muted)" font-size="10" font-weight="700" text-transform="uppercase">Revenue & Application File Output</text>
      
      <!-- Gridlines -->
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${width - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight * 0.5}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight * 0.5}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
      <line x1="${paddingLeft}" y1="${chartHeight + paddingTop}" x2="${width - paddingRight}" y2="${chartHeight + paddingTop}" stroke="rgba(255,255,255,0.1)" />

      <!-- Y Axis Labels -->
      <text x="${paddingLeft - 8}" y="${paddingTop + 4}" fill="var(--text-muted)" font-size="8" text-anchor="end">₹${Math.round(max).toLocaleString('en-IN')}</text>
      <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight * 0.5 + 4}" fill="var(--text-muted)" font-size="8" text-anchor="end">₹${Math.round(max * 0.5).toLocaleString('en-IN')}</text>
      <text x="${paddingLeft - 8}" y="${chartHeight + paddingTop + 4}" fill="var(--text-muted)" font-size="8" text-anchor="end">₹0</text>

      ${barsHtml}

      <!-- Legend -->
      <g transform="translate(480, 10)">
        <circle cx="10" cy="5" r="5" fill="#06b6d4" />
        <text x="20" y="9" fill="var(--text-muted)" font-size="9">Sales Vol</text>
        <circle cx="70" cy="5" r="5" fill="rgba(255,255,255,0.15)" stroke="#fff" stroke-width="0.5" />
        <text x="80" y="9" fill="var(--text-muted)" font-size="9">Files Filed</text>
      </g>

      <defs>
        ${gradientsHtml}
      </defs>
    </svg>
  `;
}

function generateTimelineSVG(monthlySummary) {
  const sortedMonths = Object.keys(monthlySummary).sort();
  if (sortedMonths.length === 0) return '';

  const data = sortedMonths.map(m => {
    const stats = monthlySummary[m];
    const netProfit = stats.income - stats.expenses;
    return {
      month: m,
      profit: netProfit,
      income: stats.income,
      expenses: stats.expenses
    };
  });

  const profits = data.map(d => d.profit);
  const minVal = Math.min(...profits, 0); // include 0 to show deficit
  const maxVal = Math.max(...profits, 1000);
  const spread = maxVal - minVal;

  const height = 180;
  const width = 600;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const chartHeight = height - paddingTop;
  const chartWidth = width - paddingLeft - paddingRight;

  const getX = (index) => paddingLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
  const getY = (val) => chartHeight - ((val - minVal) / (spread || 1)) * chartHeight + paddingTop;

  let pathD = '';
  let areaD = '';
  let dotsHtml = '';

  data.forEach((d, index) => {
    const x = getX(index);
    const y = getY(d.profit);

    if (index === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${chartHeight + paddingTop} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }

    if (index === data.length - 1) {
      areaD += ` L ${x} ${y} L ${x} ${chartHeight + paddingTop} Z`;
    } else if (index > 0) {
      areaD += ` L ${x} ${y}`;
    }

    const dateObj = new Date(d.month + "-02");
    const label = dateObj.toLocaleString('default', { month: 'short' }) + " '" + dateObj.getFullYear().toString().substring(2);

    dotsHtml += `
      <g>
        <circle cx="${x}" cy="${y}" r="4" fill="#06b6d4" stroke="#fff" stroke-width="1.5" />
        <text x="${x}" y="${y - 8}" fill="${d.profit >= 0 ? '#10b981' : '#ef4444'}" font-size="9" font-weight="700" text-anchor="middle">₹${Math.round(d.profit)}</text>
        <text x="${x}" y="${chartHeight + paddingTop + 15}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${label}</text>
      </g>
    `;
  });

  if (data.length === 1) {
    const x = paddingLeft + chartWidth / 2;
    const y = getY(data[0].profit);
    const dateObj = new Date(data[0].month + "-02");
    const label = dateObj.toLocaleString('default', { month: 'short' }) + " '" + dateObj.getFullYear().toString().substring(2);
    
    return `
      <svg viewBox="0 0 600 220" style="width: 100%; max-width: 600px; height: auto; font-family: inherit;">
        <text x="10" y="15" fill="var(--text-muted)" font-size="10" font-weight="700" text-transform="uppercase">Net Profit Timeline</text>
        <rect x="${x - 30}" y="${y}" width="60" height="${chartHeight + paddingTop - y}" rx="4" fill="url(#grad-timeline-area)" />
        <circle cx="${x}" cy="${y}" r="5" fill="#06b6d4" stroke="#fff" stroke-width="1.5" />
        <text x="${x}" y="${y - 8}" fill="${data[0].profit >= 0 ? '#10b981' : '#ef4444'}" font-size="10" font-weight="700" text-anchor="middle">₹${Math.round(data[0].profit)}</text>
        <text x="${x}" y="${chartHeight + paddingTop + 16}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${label}</text>
        
        <defs>
          <linearGradient id="grad-timeline-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  const zeroY = getY(0);

  return `
    <svg viewBox="0 0 600 220" style="width: 100%; max-width: 600px; height: auto; font-family: inherit;">
      <text x="10" y="15" fill="var(--text-muted)" font-size="10" font-weight="700" text-transform="uppercase">Net Profit Timeline</text>
      
      <!-- Baseline 0 -->
      <line x1="${paddingLeft}" y1="${zeroY}" x2="${width - paddingRight}" y2="${zeroY}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="3" />
      <text x="${width - paddingRight + 4}" y="${zeroY + 3}" fill="var(--text-dimmed)" font-size="8">₹0</text>

      <!-- Fill Area -->
      <path d="${areaD}" fill="url(#grad-timeline-area)" />
      
      <!-- Line Path -->
      <path d="${pathD}" fill="none" stroke="#06b6d4" stroke-width="2.5" />

      <!-- Interactive Nodes -->
      ${dotsHtml}

      <defs>
        <linearGradient id="grad-timeline-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

export default renderReports;
