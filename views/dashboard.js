/* ==========================================================================
   CYBERONE Center Management Platform - Dashboard View (views/dashboard.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderDashboard(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const currentMonth = activeDate.substring(0, 7); // Format: "YYYY-MM"
  // Calculate statistics
  const monthStats = store.getMonthlyStats(currentMonth);
  const monthlyTurnover = store.getMonthlyTurnover(currentMonth);
  const dailyStats = store.getDailyStats(activeDate);
  const dailyTurnover = store.getDailyTurnover(activeDate);
  const currentBalances = store.getCurrentBalances();
  const dailyLog = store.getOrCreateDailyLog(activeDate);
  const opening = dailyLog.openingBalances;
  const closing = dailyLog.closingBalances;
  
  // Define account list metadata dynamically from store
  const accountMeta = [
    { key: 'cash', name: 'Cash In Hand', type: 'cash', icon: 'wallet', color: 'var(--color-success)' }
  ];

  // Dynamically append all bank accounts individually
  store.bankAccounts.forEach(b => {
    accountMeta.push({
      key: b.id,
      name: b.name,
      type: 'bank',
      icon: 'landmark',
      color: b.id === 'main_bob' ? 'var(--color-info)' : '#0ea5e9'
    });
  });

  // Dynamically append all active wallets from the database (or those with non-zero balances)
  store.wallets.filter(w => w.isActive || (opening[w.id] || 0) !== 0 || (closing[w.id] || 0) !== 0).forEach(w => {
    let icon = 'globe';
    let color = 'var(--color-primary)';
    
    if (w.isAEPS) {
      icon = 'smartphone';
      color = '#06b6d4';
      if (w.id === 'paynearby') color = '#10b981';
      if (w.id === 'airtel_pb') color = '#ef4444';
    } else {
      if (w.id === 'ibkart') { icon = 'shopping-bag'; color = '#8b5cf6'; }
      else if (w.id === 'bsnl') { icon = 'rss'; color = '#3b82f6'; }
      else if (w.id === 'vi') { icon = 'zap'; color = '#e11d48'; }
      else if (w.id === 'airtel') { icon = 'phone-call'; color = '#f43f5e'; }
    }

    accountMeta.push({
      key: w.id,
      name: w.name,
      type: 'wallet',
      icon: icon,
      color: color
    });
  });
  
  // Guard balance visibility
  const canViewBalances = auth.hasPermission('view_balances');

  // Find low stock items
  const lowStockProducts = store.products.filter(p => p.stock <= p.minStock);

  // Find active government applications (not delivered)
  const activeApps = store.applications.filter(a => a.status !== 'delivered');

  // Calculate today's transaction types breakdown for Donut Chart
  const txnGroups = {
    photocopy: { label: 'Photocopy', count: 0, amount: 0, color: '#10b981' },
    dtp: { label: 'DTP & Typing', count: 0, amount: 0, color: '#8b5cf6' },
    print: { label: 'Print & Lamination', count: 0, amount: 0, color: '#f59e0b' },
    apps: { label: 'Online Applications', count: 0, amount: 0, color: '#0ea5e9' },
    transfer: { label: 'AEPS & Transfer', count: 0, amount: 0, color: '#06b6d4' },
    recharges: { label: 'Recharges', count: 0, amount: 0, color: '#ec4899' },
    bills: { label: 'Bills Payment', count: 0, amount: 0, color: '#f43f5e' },
    salaries: { label: 'Salaries & Payroll', count: 0, amount: 0, color: '#6366f1' },
    sales_misc: { label: 'Other Sales', count: 0, amount: 0, color: '#14b8a6' },
    expense_misc: { label: 'Other Expenses', count: 0, amount: 0, color: '#ef4444' },
    deposits: { label: 'Deposits', count: 0, amount: 0, color: '#3b82f6' }
  };

  if (dailyLog && dailyLog.transactions) {
    dailyLog.transactions.forEach(t => {
      if (t.type === 'adjustment') return; // Skip adjustments entirely

      let groupKey = 'sales_misc';
      
      if (t.type === 'salary') {
        groupKey = 'salaries';
      } else if (t.type === 'expense') {
        const desc = (t.description || '').toLowerCase();
        if (desc.includes('bill') || desc.includes('kseb') || desc.includes('electricity') || desc.includes('water') || desc.includes('rent') || desc.includes('internet')) {
          groupKey = 'bills';
        } else {
          groupKey = 'expense_misc';
        }
      } else if (t.type === 'deposit') {
        groupKey = 'deposits';
      } else if (t.type === 'sale') {
        const desc = (t.description || '').toLowerCase();
        if (desc.includes('photocopy') || desc.includes('xerox')) {
          groupKey = 'photocopy';
        } else if (desc.includes('dtp') || desc.includes('typing') || desc.includes('design')) {
          groupKey = 'dtp';
        } else if (desc.includes('print') || desc.includes('laminat')) {
          groupKey = 'print';
        } else if (desc.includes('application') || desc.includes('pan') || desc.includes('passport') || desc.includes('e-district') || desc.includes('enrolment') || desc.includes('admission') || desc.includes('epfo')) {
          groupKey = 'apps';
        } else if (desc.includes('transfer') || desc.includes('aeps') || desc.includes('withdr') || desc.includes('payout')) {
          groupKey = 'transfer';
        } else if (desc.includes('recharge') || desc.includes('top-up') || desc.includes('topup') || desc.includes('bsnl') || desc.includes('vi') || desc.includes('airtel')) {
          groupKey = 'recharges';
        } else if (desc.includes('bill') || desc.includes('kseb') || desc.includes('electricity')) {
          groupKey = 'bills';
        }
      }

      if (txnGroups[groupKey]) {
        txnGroups[groupKey].count++;
        txnGroups[groupKey].amount += parseFloat(t.amount || 0);
      }
    });
  }

  // Filter out 0 value groups
  const activeTxnGroups = Object.keys(txnGroups)
    .filter(key => txnGroups[key].amount > 0 || txnGroups[key].count > 0)
    .reduce((obj, key) => {
      obj[key] = txnGroups[key];
      return obj;
    }, {});

  const totalTxnVolume = Object.values(activeTxnGroups).reduce((sum, g) => sum + g.amount, 0);
  const totalTxnCount = dailyLog && dailyLog.transactions ? dailyLog.transactions.filter(t => t.type !== 'adjustment').length : 0;

  // Format currency helper
  const fmt = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  mountPoint.innerHTML = `
    <!-- Live Digital Clock Display -->
    <div class="dashboard-clock-card glass-card" style="padding: 15px 24px; display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.02); margin-bottom: 25px; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
      <div>
        <h3 style="font-size: 13px; font-weight: 500; color: var(--text-muted); margin: 0; text-transform: uppercase; letter-spacing: 1px;">Live Center Clock</h3>
        <p id="dashboard-clock-date" style="font-size: 15px; font-weight: 600; color: #fff; margin: 4px 0 0 0;"></p>
      </div>
      <div id="dashboard-clock-time" style="font-family: 'Outfit', 'Inter', monospace; font-size: 26px; font-weight: 800; color: var(--color-primary); text-shadow: 0 0 10px var(--color-primary-glow); letter-spacing: 1px;"></div>
    </div>

    <!-- Quick Action Shortcut Buttons -->
    <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 25px;">
      <a href="#transactions?action=new-sale" class="glass-card" style="display: flex; align-items: center; gap: 15px; padding: 20px; text-decoration: none; border-color: rgba(99, 102, 241, 0.35); background: rgba(99, 102, 241, 0.08); transition: var(--transition-smooth);">
        <i data-lucide="plus-circle" style="width: 24px; height: 24px; color: var(--color-primary); filter: drop-shadow(0 0 5px var(--color-primary-glow));"></i>
        <div>
          <h4 style="font-family: var(--font-display); font-weight: 700; color: #fff; font-size: 15px;">New Transaction</h4>
          <span style="font-size: 11px; color: var(--text-muted);">Record new sale or expense</span>
        </div>
      </a>
      <a href="#inventory" class="glass-card" style="display: flex; align-items: center; gap: 15px; padding: 20px; text-decoration: none; border-color: rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.08); transition: var(--transition-smooth);">
        <i data-lucide="package-plus" style="width: 24px; height: 24px; color: var(--color-success); filter: drop-shadow(0 0 5px var(--color-success-glow));"></i>
        <div>
          <h4 style="font-family: var(--font-display); font-weight: 700; color: #fff; font-size: 15px;">Add Product</h4>
          <span style="font-size: 11px; color: var(--text-muted);">Register stock or service</span>
        </div>
      </a>
      <a href="#customers" class="glass-card" style="display: flex; align-items: center; gap: 15px; padding: 20px; text-decoration: none; border-color: rgba(6, 182, 212, 0.35); background: rgba(6, 182, 212, 0.08); transition: var(--transition-smooth);">
        <i data-lucide="user-plus" style="width: 24px; height: 24px; color: var(--color-info); filter: drop-shadow(0 0 5px var(--color-info-glow));"></i>
        <div>
          <h4 style="font-family: var(--font-display); font-weight: 700; color: #fff; font-size: 15px;">Add Customer</h4>
          <span style="font-size: 11px; color: var(--text-muted);">Register citizen profile</span>
        </div>
      </a>
    </div>

    <!-- Alerts & File Status Grid (Moved above Balance Sheet) -->
    <div class="dashboard-bottom-grid" style="margin-bottom: 25px;">
      <!-- G2C Applications Status Summary -->
      <div class="glass-card" style="padding: 24px;">
        <div class="section-header">
          <h3>Pending Applications (${activeApps.length})</h3>
          <a href="#applications" style="font-size: 12px; color: var(--color-primary); text-decoration: none; font-weight: 600;">View Tracker</a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 200px; overflow-y: auto;">
          ${activeApps.length === 0 ? `
            <div style="text-align: center; color: var(--text-dimmed); font-size: 13px; padding: 20px;">
              All certificate applications delivered!
            </div>
          ` : activeApps.map(app => {
            const customer = store.customers.find(c => c.id === app.customerId);
            let statusColor = 'var(--text-muted)';
            if (app.status === 'submitted') statusColor = 'var(--color-info)';
            if (app.status === 'pending_docs') statusColor = 'var(--color-warning)';
            if (app.status === 'approved') statusColor = 'var(--color-success)';
            if (app.status === 'ready_to_print') statusColor = '#a855f7';
            if (app.status === 'delivered') statusColor = 'var(--color-success)';

            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--panel-border); border-radius: var(--border-radius-sm);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">${customer ? customer.name : 'Unknown'}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${app.serviceType}</div>
                </div>
                <span class="badge" style="background: none; border: 1px solid ${statusColor}; color: ${statusColor};">${app.status.replace('_', ' ')}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Low Stock Inventory Alerts -->
      <div class="glass-card" style="padding: 24px;">
        <div class="section-header">
          <h3>Low Stock Alerts (${lowStockProducts.length})</h3>
          <a href="#inventory" style="font-size: 12px; color: var(--color-primary); text-decoration: none; font-weight: 600;">Manage Inventory</a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 200px; overflow-y: auto;">
          ${lowStockProducts.length === 0 ? `
            <div style="text-align: center; color: var(--text-dimmed); font-size: 13px; padding: 30px 10px;">
              <i data-lucide="check" style="width: 24px; height: 24px; color: var(--color-success); margin-bottom: 5px; display: inline-block;"></i>
              <div style="margin-top: 5px;">All items fully stocked!</div>
            </div>
          ` : lowStockProducts.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(239, 68, 68, 0.02); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: var(--border-radius-sm);">
              <div>
                <div style="font-size: 13px; font-weight: 600;">${p.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">SKU: ${p.sku}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 13px; font-weight: 700; color: var(--color-danger);">${p.stock} left</span>
                <div style="font-size: 10px; color: var(--text-dimmed);">Min: ${p.minStock}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Daily Balance Sheet (Full Width & Centralized Block) -->
    <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 25px;">
      <div class="section-header" style="width: 100%; max-width: 900px; margin-bottom: 0px;">
        <div>
          <h3 style="font-size: 16px; margin-bottom: 4px;">Daily Balance Sheet</h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; color: var(--text-muted);">Reconciliation Date:</span>
            <input type="date" id="dashboard-date-picker" value="${activeDate}" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--panel-border); color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; color-scheme: dark; font-family: var(--font-primary);">
          </div>
        </div>
        <i data-lucide="scale" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
      </div>

      <div style="width: 100%; max-width: 900px;">
        ${(() => {
          if (!canViewBalances) {
            return `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%;">
                <div style="padding: 16px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: var(--border-radius-md);">
                  <span style="font-size: 11px; font-weight: 700; color: var(--color-warning); text-transform: uppercase;">Low Stock Warning</span>
                  <div style="font-size: 14px; margin-top: 4px; font-weight: 600;">${lowStockProducts.length} items need restock.</div>
                </div>
                <div style="padding: 16px; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: var(--border-radius-md);">
                  <span style="font-size: 11px; font-weight: 700; color: var(--color-primary); text-transform: uppercase;">G2C Applications</span>
                  <div style="font-size: 14px; margin-top: 4px; font-weight: 600;">${activeApps.length} active files are pending delivery.</div>
                </div>
              </div>
            `;
          }

          let totalOpening = 0;
          let totalClosing = 0;
          let totalDiff = 0;

          const rowsHtml = accountMeta.map(acc => {
            const opVal = opening[acc.key] || 0;
            const clVal = closing[acc.key] || 0;
            const diff = clVal - opVal;

            totalOpening += opVal;
            totalClosing += clVal;
            totalDiff += diff;

            let diffColor = 'var(--text-muted)';
            let diffPrefix = '';
            if (diff > 0) {
              diffColor = 'var(--color-success)';
              diffPrefix = '+';
            } else if (diff < 0) {
              diffColor = 'var(--color-danger)';
            }

            let closingColor = '#fff';
            if (diff > 0) closingColor = 'var(--color-success)';
            else if (diff < 0) closingColor = 'var(--color-danger)';

            return `
              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.02); height: 38px;">
                <td style="padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
                  <i data-lucide="${acc.icon}" style="width: 14px; height: 14px; color: ${acc.color};"></i>
                  <span style="font-weight: 500; font-size: 13px; color: #fff;">${acc.name}</span>
                </td>
                <td style="padding: 8px 12px; text-align: right; font-family: var(--font-display); color: var(--text-muted);">
                  ${fmt(opVal)}
                </td>
                <td style="padding: 8px 12px; text-align: right; font-family: var(--font-display); font-weight: 600; color: ${closingColor};">
                  ${fmt(clVal)}
                </td>
                <td style="padding: 8px 12px; text-align: right; font-family: var(--font-display); font-weight: 600; color: ${diffColor};">
                  ${diffPrefix}${fmt(diff)}
                </td>
              </tr>
            `;
          }).join('');

          let totalDiffColor = 'var(--text-muted)';
          let totalDiffPrefix = '';
          if (totalDiff > 0) {
            totalDiffColor = 'var(--color-success)';
            totalDiffPrefix = '+';
          } else if (totalDiff < 0) {
            totalDiffColor = 'var(--color-danger)';
          }

          let totalClosingColor = '#fff';
          if (totalDiff > 0) totalClosingColor = 'var(--color-success)';
          else if (totalDiff < 0) totalClosingColor = 'var(--color-danger)';

          return `
            <div class="table-responsive" style="border: none; margin: 0; width: 100%;">
              <table class="custom-table" style="font-size: 13px; border-collapse: collapse; width: 100%;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--panel-border);">
                    <th style="padding: 10px 12px; font-weight: 600; text-align: left; font-size: 12px;">Account / Portal</th>
                    <th style="padding: 10px 12px; font-weight: 600; text-align: right; font-size: 12px;">Opening Balance</th>
                    <th style="padding: 10px 12px; font-weight: 600; text-align: right; font-size: 12px;">Closing Balance</th>
                    <th style="padding: 10px 12px; font-weight: 600; text-align: right; font-size: 12px;">Variance (V)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
                <tfoot>
                   <tr style="border-top: 2px solid var(--panel-border); background: rgba(255, 255, 255, 0.02); height: 42px; font-weight: 700;">
                    <td style="padding: 10px 12px; display: flex; align-items: center; gap: 8px;">
                      <i data-lucide="calculator" style="width: 14px; height: 14px; color: var(--color-primary);"></i>
                      <span style="font-weight: 700; font-size: 13px; color: #fff;">Total of All Accounts</span>
                    </td>
                    <td style="padding: 10px 12px; text-align: right; font-family: var(--font-display); color: #fff; font-size: 13px; font-weight: 700;">
                      ${fmt(totalOpening)}
                    </td>
                    <td style="padding: 10px 12px; text-align: right; font-family: var(--font-display); color: ${totalClosingColor}; font-size: 13px; font-weight: 700;">
                      ${fmt(totalClosing)}
                    </td>
                    <td style="padding: 10px 12px; text-align: right; font-family: var(--font-display); color: ${totalDiffColor}; font-size: 13px; font-weight: 700;">
                      ${totalDiffPrefix}${fmt(totalDiff)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        })()}
      </div>
    </div>

    <!-- Graphical Analytics Row (Breakdown Chart + Bar Chart side-by-side) -->
    <div class="dashboard-bottom-grid" style="grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 25px;">
      <!-- Daily Transactions Breakdown (Pie/Donut Chart) -->
      <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; gap: 15px;">
        <div class="section-header">
          <div>
            <h3 style="font-size: 15px; margin-bottom: 4px;">Today's Transactions breakdown</h3>
            <span style="font-size: 12px; color: var(--text-muted);">Total volume: <strong style="color:#fff; font-family:var(--font-display); font-weight:600;">${fmt(totalTxnVolume)}</strong></span>
          </div>
          <i data-lucide="pie-chart" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-around; gap: 15px; flex-wrap: wrap; height: 100%;">
          <!-- Donut SVG -->
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 130px; height: 130px;">
            <svg viewBox="0 0 100 100" style="width: 130px; height: 130px; transform: rotate(-90deg);">
              ${(() => {
                let cumulativePercent = 0;
                return totalTxnVolume > 0 ? Object.values(activeTxnGroups).map(g => {
                  if (g.amount === 0 || totalTxnVolume === 0) return '';
                  const percentage = g.amount / totalTxnVolume;
                  const segmentLength = percentage * 251.3;
                  const offset = 251.3 - (cumulativePercent * 251.3);
                  cumulativePercent += percentage;
                  return `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${g.color}" stroke-width="12" stroke-dasharray="${segmentLength} 251.3" stroke-dashoffset="${offset}" style="transition: stroke-dashoffset 0.5s ease;"></circle>`;
                }).join('') : `<circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="12"></circle>`;
              })()}
            </svg>
            <div style="position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <span style="font-family: var(--font-display); font-size: 20px; font-weight: 700; color: #fff; line-height: 1;">${totalTxnCount}</span>
              <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Txns</span>
            </div>
          </div>
          
          <!-- Legend -->
          <div style="flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 5px;">
            ${Object.values(activeTxnGroups).map(g => {
              const pct = totalTxnVolume > 0 ? ((g.amount / totalTxnVolume) * 100).toFixed(0) : 0;
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${g.color};"></span>
                    <span style="font-weight: 500; color: var(--text-dimmed);">${g.label}</span>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-weight: 600; color: #fff; font-family: var(--font-display);">${fmt(g.amount)}</span>
                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 4px;">(${g.count})</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Weekly Analytics Bar Chart -->
      <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; gap: 15px;">
        <div class="section-header">
          <div>
            <h3 style="font-size: 15px; margin-bottom: 4px;">Daily Earnings vs Expenses</h3>
            <span style="font-size: 12px; color: var(--text-muted);">Reconciliation Timeline (Last 7 Days)</span>
          </div>
          <i data-lucide="bar-chart-2" style="width: 18px; height: 18px; color: var(--color-primary);"></i>
        </div>
        
        <div class="chart-container" id="dashboard-bar-chart" style="height: 140px; margin-top: 5px;">
          <!-- SVG chart will render dynamically -->
        </div>
        
        <div style="display: flex; align-items: center; gap: 15px; font-size: 11px; margin-top: 5px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; background: var(--color-success); border-radius: 2px;"></span>
            <span style="color: var(--text-dimmed);">Earnings</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; background: var(--color-danger); border-radius: 2px;"></span>
            <span style="color: var(--text-dimmed);">Expenses</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Daily Summary KPI Grid Row (Moved from Top to Bottom) -->
    <div class="section-header">
      <h3>Daily Center Operations</h3>
      <span style="font-size: 12px; color: var(--text-muted);">Real-time metrics for ${new Date(activeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    </div>
    <div class="compact-card-grid" style="margin-bottom: 25px;">
      <!-- Daily Income -->
      <div class="glass-card success">
        <div class="card-header">
          <span class="card-title">Daily Income</span>
          <i data-lucide="trending-up" class="card-icon" style="color: var(--color-success);"></i>
        </div>
        <div class="card-value">
          ${canViewBalances ? fmt(dailyStats.dailyIncome) : '••••••'}
        </div>
        <div class="card-change up">
          <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
          <span>Commissions & charges</span>
        </div>
      </div>

      <!-- Daily Expenses -->
      <div class="glass-card danger">
        <div class="card-header">
          <span class="card-title">Daily Expenses</span>
          <i data-lucide="trending-down" class="card-icon" style="color: var(--color-danger);"></i>
        </div>
        <div class="card-value">
          ${canViewBalances ? fmt(dailyStats.dailyExpense) : '••••••'}
        </div>
        <div class="card-change down">
          <i data-lucide="activity" style="width: 12px; height: 12px;"></i>
          <span>Today's store outflows</span>
        </div>
      </div>

      <!-- Daily Profit -->
      <div class="glass-card ${dailyStats.dailyProfit >= 0 ? 'primary' : 'danger'}">
        <div class="card-header">
          <span class="card-title">Daily Profit</span>
          <i data-lucide="dollar-sign" class="card-icon" style="color: ${dailyStats.dailyProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'};"></i>
        </div>
        <div class="card-value" style="color: ${dailyStats.dailyProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
          ${canViewBalances ? fmt(dailyStats.dailyProfit) : '••••••'}
        </div>
        <div class="card-change ${dailyStats.dailyProfit >= 0 ? 'up' : 'down'}">
          <i data-lucide="${dailyStats.dailyProfit >= 0 ? 'check' : 'alert-circle'}" style="width: 12px; height: 12px;"></i>
          <span>${dailyStats.dailyProfit >= 0 ? 'In profit' : 'Operating loss'}</span>
        </div>
      </div>

      <!-- Daily Turnover -->
      <div class="glass-card info">
        <div class="card-header">
          <span class="card-title">Daily Turnover</span>
          <i data-lucide="coins" class="card-icon" style="color: var(--color-info);"></i>
        </div>
        <div class="card-value">
          ${fmt(dailyTurnover)}
        </div>
        <div class="card-change neutral">
          <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
          <span>Today's gross traffic</span>
        </div>
      </div>
    </div>

    <!-- Monthly Summary KPI Grid Row -->
    <div class="section-header">
      <h3>Store Financial Performance</h3>
      <span style="font-size: 12px; color: var(--text-muted);">Cumulative monthly stats & turnover</span>
    </div>
    <div class="compact-card-grid" style="margin-bottom: 0;">
      <!-- Monthly Income -->
      <div class="glass-card success">
        <div class="card-header">
          <span class="card-title">Monthly Income</span>
          <i data-lucide="trending-up" class="card-icon" style="color: var(--color-success);"></i>
        </div>
        <div class="card-value">
          ${canViewBalances ? fmt(monthStats.monthlyIncome) : '••••••'}
        </div>
        <div class="card-change up">
          <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
          <span>For ${new Date(activeDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <!-- Monthly Expenses -->
      <div class="glass-card danger">
        <div class="card-header">
          <span class="card-title">Monthly Expenses</span>
          <i data-lucide="trending-down" class="card-icon" style="color: var(--color-danger);"></i>
        </div>
        <div class="card-value">
          ${canViewBalances ? fmt(monthStats.monthlyExpense) : '••••••'}
        </div>
        <div class="card-change down">
          <i data-lucide="activity" style="width: 12px; height: 12px;"></i>
          <span>Salaries, rent, bills</span>
        </div>
      </div>

      <!-- Monthly Profit -->
      <div class="glass-card ${monthStats.netProfit >= 0 ? 'primary' : 'danger'}">
        <div class="card-header">
          <span class="card-title">Monthly Profit</span>
          <i data-lucide="dollar-sign" class="card-icon" style="color: ${monthStats.netProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'};"></i>
        </div>
        <div class="card-value" style="color: ${monthStats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
          ${canViewBalances ? fmt(monthStats.netProfit) : '••••••'}
        </div>
        <div class="card-change ${monthStats.netProfit >= 0 ? 'up' : 'down'}">
          <i data-lucide="${monthStats.netProfit >= 0 ? 'check' : 'alert-circle'}" style="width: 12px; height: 12px;"></i>
          <span>${monthStats.netProfit >= 0 ? 'In profit' : 'Operating loss'}</span>
        </div>
      </div>

      <!-- Monthly Turnover (Gross) -->
      <div class="glass-card info">
        <div class="card-header">
          <span class="card-title">Monthly Turnover</span>
          <i data-lucide="coins" class="card-icon" style="color: var(--color-info);"></i>
        </div>
        <div class="card-value">
          ${fmt(monthlyTurnover)}
        </div>
        <div class="card-change neutral">
          <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
          <span>This month's gross traffic</span>
        </div>
      </div>
    </div>
  `;

  // Draw dynamically generated responsive SVG chart
  drawDashboardChart(activeDate);

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Dashboard Overview';
  document.getElementById('page-heading-sub').innerText = `CYBER ONE Operations for ${new Date(activeDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

  // Set date picker change handler
  const dashboardDatePicker = document.getElementById('dashboard-date-picker');
  if (dashboardDatePicker) {
    dashboardDatePicker.addEventListener('change', (e) => {
      appInstance.setActiveDate(e.target.value);
    });
  }

  // Initialize Live Clock Interval
  const updateClock = () => {
    const timeEl = document.getElementById('dashboard-clock-time');
    const dateEl = document.getElementById('dashboard-clock-date');
    if (!timeEl || !dateEl) {
      clearInterval(clockInterval);
      return;
    }
    const now = new Date();
    timeEl.innerText = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    dateEl.innerText = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  updateClock();
  const clockInterval = setInterval(updateClock, 1000);

  lucide.createIcons();
}

// Generate interactive custom SVG bar chart directly in DOM
function drawDashboardChart(activeDate) {
  const container = document.getElementById('dashboard-bar-chart');
  if (!container) return;

  // Generate date list for the last 7 days ending with activeDate
  const dateList = [];
  const activeTime = new Date(activeDate).getTime();
  
  for (let i = 6; i >= 0; i--) {
    const day = new Date(activeTime - i * 24 * 60 * 60 * 1000);
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    dateList.push(`${yyyy}-${mm}-${dd}`);
  }

  // Gather values for those days
  const chartData = dateList.map(dateStr => {
    let income = 0;
    let expense = 0;
    const log = store.dailyLogs[dateStr];

    if (log) {
      log.transactions.forEach(t => {
        if (t.type === 'sale') {
          income += (t.serviceChargeToCash || 0) + (t.serviceChargeToAccount || 0);
        } else if (t.type === 'expense' || t.type === 'salary') {
          expense += t.amount;
        }
      });
    }

    return {
      date: dateStr,
      label: new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      income: parseFloat(income.toFixed(2)),
      expense: parseFloat(expense.toFixed(2))
    };
  });

  // SVG parameters
  const width = container.clientWidth || 550;
  const height = container.clientHeight || 150;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // Find max value in data to scale coordinates
  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.income, d.expense)),
    100 // fallback floor so empty graph has grids
  );
  
  const scaleY = (val) => graphHeight - (val / maxVal) * graphHeight + paddingTop;

  // Grid tick levels
  const yTicks = 4;
  let ticksHtml = '';
  for (let i = 0; i <= yTicks; i++) {
    const value = Math.round((maxVal / yTicks) * i);
    const yPos = scaleY(value);
    ticksHtml += `
      <line class="chart-grid-line" x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" />
      <text class="chart-text" x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end">₹${value}</text>
    `;
  }

  // Draw columns and axis ticks
  const barGap = 4;
  const groupWidth = graphWidth / chartData.length;
  const barWidth = (groupWidth - barGap * 4) / 2;

  let barsHtml = '';
  let labelsHtml = '';

  chartData.forEach((d, idx) => {
    const groupX = paddingLeft + idx * groupWidth + barGap * 2;
    
    // Income Bar
    const incomeHeight = (d.income / maxVal) * graphHeight;
    const incomeY = scaleY(d.income);
    barsHtml += `
      <rect class="chart-bar-income" x="${groupX}" y="${incomeY}" width="${barWidth}" height="${incomeHeight}" />
    `;

    // Expense Bar
    const expenseHeight = (d.expense / maxVal) * graphHeight;
    const expenseY = scaleY(d.expense);
    barsHtml += `
      <rect class="chart-bar-expense" x="${groupX + barWidth + barGap}" y="${expenseY}" width="${barWidth}" height="${expenseHeight}" />
    `;

    // Date Labels
    const labelX = groupX + barWidth + barGap / 2;
    labelsHtml += `
      <text class="chart-text" x="${labelX}" y="${height - 10}" text-anchor="middle">${d.label}</text>
    `;
  });

  container.innerHTML = `
    <svg class="chart-svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <!-- Grid Lines -->
      ${ticksHtml}
      
      <!-- Bars -->
      ${barsHtml}
      
      <!-- Axis Lines -->
      <line class="chart-axis-line" x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" />
      
      <!-- Labels -->
      ${labelsHtml}
    </svg>
  `;
}

export default renderDashboard;
