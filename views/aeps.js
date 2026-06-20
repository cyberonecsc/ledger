/* ==========================================================================
   CYBERONE Center Management Platform - AEPS & DMT (views/aeps.js)
   ========================================================================== */

import { store } from '../store.js';
import { auth } from '../auth.js';

export function renderAEPS(mountPoint, appInstance) {
  const activeDate = appInstance.getActiveDate();
  const currentBalances = store.getCurrentBalances();

  const wallets = store.wallets.filter(w => w.isAEPS);

  // Load selected wallet from localStorage
  let selectedWalletId = localStorage.getItem('cyberone_v2_selected_aeps_wallet');
  if (!selectedWalletId || !wallets.some(w => w.id === selectedWalletId)) {
    selectedWalletId = wallets.length > 0 ? wallets[0].id : '';
  }

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  // Determine if selected wallet is dual sub-wallet system
  const isDualWallet = selectedWallet && (selectedWallet.id === 'aeps_kntny' || selectedWallet.name.toLowerCase().includes('digipay lite'));

  // Initialize and persist filter values in localStorage
  let filterPeriod = localStorage.getItem('cyberone_v2_aeps_filter_period') || 'daily';
  let filterDate = localStorage.getItem('cyberone_v2_aeps_filter_date') || activeDate;
  let filterMonth = localStorage.getItem('cyberone_v2_aeps_filter_month') || activeDate.substring(0, 7);
  let filterYear = localStorage.getItem('cyberone_v2_aeps_filter_year') || activeDate.substring(0, 4);
  let filterSearch = localStorage.getItem('cyberone_v2_aeps_filter_search') || '';

  // Get all AEPS transactions
  const allAepsTxns = store.aepsTransactions || [];

  // Calculate consolidated totals for today
  let consolidatedWithdrawalToday = 0;
  let consolidatedDmtToday = 0;
  let consolidatedDepositToday = 0;

  allAepsTxns.forEach(t => {
    if (t.status === 'Success' && t.date === activeDate) {
      const amt = parseFloat(t.amount || 0);
      if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
        consolidatedWithdrawalToday += amt;
      } else if (t.type === 'DMT') {
        consolidatedDmtToday += amt;
      } else if (t.type === 'Deposit' || t.type === 'Account Opening' || t.type === 'CSC Top-up') {
        consolidatedDepositToday += amt;
      }
    }
  });

  // Generate 7-day trend chart data (AEPS vs DMT successful transaction volume) - Consolidated for all wallets
  const chartData = (() => {
    const dateList = [];
    const activeTime = new Date(activeDate).getTime();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(activeTime - i * 24 * 60 * 60 * 1000);
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, '0');
      const dd = String(day.getDate()).padStart(2, '0');
      dateList.push(`${yyyy}-${mm}-${dd}`);
    }

    return dateList.map(dateStr => {
      let aepsVol = 0;
      let dmtVol = 0;
      const dayTxns = allAepsTxns.filter(t => t.date === dateStr && t.status === 'Success');
      dayTxns.forEach(t => {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
          aepsVol += amt;
        } else if (t.type === 'DMT') {
          dmtVol += amt;
        }
      });
      return {
        date: dateStr,
        label: new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        aeps: parseFloat(aepsVol.toFixed(2)),
        dmt: parseFloat(dmtVol.toFixed(2))
      };
    });
  })();

  // Render SVG trend chart
  const renderSVGChart = () => {
    const width = 550;
    const height = 180;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(
      ...chartData.map(d => Math.max(d.aeps, d.dmt)),
      1000 // default minimum height floor
    );

    const scaleY = (val) => graphHeight - (val / maxVal) * graphHeight + paddingTop;

    // Grid ticks
    const yTicks = 4;
    let ticksHtml = '';
    for (let i = 0; i <= yTicks; i++) {
      const value = Math.round((maxVal / yTicks) * i);
      const yPos = scaleY(value);
      ticksHtml += `
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" stroke-width="1" />
        <text x="${paddingLeft - 10}" y="${yPos + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${value}</text>
      `;
    }

    const barGap = 2;
    const groupWidth = graphWidth / chartData.length;
    const barWidth = (groupWidth - barGap * 4) / 2;

    let barsHtml = '';
    let labelsHtml = '';

    chartData.forEach((d, idx) => {
      const groupX = paddingLeft + idx * groupWidth + barGap * 2;

      // AEPS Bar (Green)
      const aepsHeight = (d.aeps / maxVal) * graphHeight;
      const aepsY = scaleY(d.aeps);
      barsHtml += `
        <rect x="${groupX}" y="${aepsY}" width="${barWidth}" height="${aepsHeight}" fill="var(--color-success)" opacity="0.85" rx="2">
          <title>AEPS Cashout: ₹${d.aeps.toFixed(2)} (${d.date})</title>
        </rect>
      `;

      // DMT Bar (Red)
      const dmtHeight = (d.dmt / maxVal) * graphHeight;
      const dmtY = scaleY(d.dmt);
      barsHtml += `
        <rect x="${groupX + barWidth + barGap}" y="${dmtY}" width="${barWidth}" height="${dmtHeight}" fill="var(--color-danger)" opacity="0.85" rx="2">
          <title>DMT Transfer: ₹${d.dmt.toFixed(2)} (${d.date})</title>
        </rect>
      `;

      // Date Labels
      const labelX = groupX + barWidth + barGap / 2;
      labelsHtml += `
        <text x="${labelX}" y="${height - 10}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${d.label}</text>
      `;
    });

    return `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        ${ticksHtml}
        ${barsHtml}
        <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
        ${labelsHtml}
      </svg>
    `;
  };

  // Generate rolling activity feed logs (most recent 15 transactions) - Vertical style
  const renderActivityFeed = () => {
    const recentTxns = [...allAepsTxns]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 15);

    if (recentTxns.length === 0) {
      return `
        <div style="padding:15px; text-align:center; color:var(--text-muted); font-size:12px; font-style:italic; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); border-radius:8px; width:100%;">
          No transactions registered yet. Feed will update dynamically.
        </div>
      `;
    }

    return recentTxns.map(t => {
      const isWithdrawal = t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay';
      const isDmt = t.type === 'DMT';
      const feedWallet = wallets.find(w => w.id === t.walletId);
      const feedWalletName = feedWallet ? feedWallet.name : 'Unknown';
      const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let badgeColor = 'var(--color-info)';
      let badgeIcon = 'arrow-right-left';
      if (isWithdrawal) {
        badgeColor = 'var(--color-success)';
        badgeIcon = 'arrow-down-left';
      } else if (isDmt) {
        badgeColor = 'var(--color-danger)';
        badgeIcon = 'arrow-up-right';
      }

      return `
        <div class="glass-card" style="padding: 8px 12px; display: flex; align-items: center; gap: 10px; width: 100%; background: var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); border-radius: 8px; margin: 0; flex-shrink: 0;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${badgeColor}15; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="${badgeIcon}" style="width: 14px; height: 14px; color: ${badgeColor};"></i>
          </div>
          <div style="flex-grow: 1; min-width: 0;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-white-invert); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${t.customerName || 'Internal / Cashout'}
            </div>
            <div style="font-size: 9px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span>${t.type}</span>
              <span>•</span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;">${feedWalletName}</span>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 11px; font-weight: 700; color: ${isWithdrawal ? 'var(--color-success)' : isDmt ? 'var(--color-danger)' : 'var(--color-info)'};">
              ₹${t.amount.toFixed(0)}
            </div>
            <div style="font-size: 8px; color: var(--text-muted); font-family: monospace;">
              ${timeStr}
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  // HTML main skeleton
  mountPoint.innerHTML = `
    <style>
      .aeps-top-grid {
        display: grid;
        grid-template-columns: 2fr 1.2fr;
        gap: 20px;
        margin-bottom: 25px;
        align-items: stretch;
      }
      .aeps-second-grid {
        display: grid;
        grid-template-columns: 1.2fr 2fr;
        gap: 20px;
        margin-bottom: 25px;
        align-items: stretch;
      }
      @media (max-width: 992px) {
        .aeps-top-grid {
          grid-template-columns: 1fr;
        }
        .aeps-second-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <!-- Header Block -->
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom: 25px;">
      <div>
        <h3>AEPS & DMT Transaction Register</h3>
        <span style="font-size:12px; color:var(--text-muted);">Dedicated digital cash-out registers, live transaction tickers, and trend chart analytics</span>
      </div>
    </div>

    <!-- Dash / Graphical trend comparison + Activity Feed side-by-side -->
    <div class="aeps-top-grid">
      <!-- Left: Trend Chart Analytics (DMT & AEPS) + Today Consolidated Volume Summary -->
      <div class="glass-card" style="padding: 20px; display:flex; flex-direction:column; gap:15px; min-height: 300px; border-left: 4px solid var(--color-info); margin:0; justify-content:space-between;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="font-size: 14px; color: var(--text-white-invert);">Consolidated AEPS & DMT Dashboard</strong>
            <span style="font-size:11px; color:var(--text-muted); display:block;">Combined metrics and 7-day trend across all wallets</span>
          </div>
          <!-- Legend -->
          <div style="display:flex; gap:12px; font-size:10px;">
            <span style="display:flex; align-items:center; gap:4px; font-weight:600; color:var(--color-success);">
              <span style="width:8px; height:8px; background:var(--color-success); border-radius:2px; display:inline-block;"></span> AEPS Cashout
            </span>
            <span style="display:flex; align-items:center; gap:4px; font-weight:600; color:var(--color-danger);">
              <span style="width:8px; height:8px; background:var(--color-danger); border-radius:2px; display:inline-block;"></span> DMT
            </span>
          </div>
        </div>

        <!-- Integrated Consolidated Today Volume Summary Row -->
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; border-top:1px solid var(--border-hairline); border-bottom:1px solid var(--border-hairline); padding:10px 0; text-align:center; background:rgba(255,255,255,0.01); border-radius:4px;">
          <div>
            <span style="font-size: 9px; color:var(--text-dimmed); display:block; text-transform:uppercase; font-weight:600;">Consolidated Withdrawal</span>
            <span style="font-family:var(--font-display); font-size: 13px; font-weight:800; color:var(--color-success);" id="stat-withdrawal-vol">₹${consolidatedWithdrawalToday.toFixed(2)}</span>
          </div>
          <div style="border-left: 1px solid var(--border-hairline); border-right: 1px solid var(--border-hairline);">
            <span style="font-size: 9px; color:var(--text-dimmed); display:block; text-transform:uppercase; font-weight:600;">Consolidated DMT</span>
            <span style="font-family:var(--font-display); font-size: 13px; font-weight:800; color:var(--color-danger);" id="stat-dmt-vol">₹${consolidatedDmtToday.toFixed(2)}</span>
          </div>
          <div>
            <span style="font-size: 9px; color:var(--text-dimmed); display:block; text-transform:uppercase; font-weight:600;">Consolidated Deposit</span>
            <span style="font-family:var(--font-display); font-size: 13px; font-weight:800; color:var(--color-info);" id="stat-deposit-vol">₹${consolidatedDepositToday.toFixed(2)}</span>
          </div>
        </div>
        
        <div id="aeps-dmt-chart-container" style="flex-grow:1; width:100%; display:flex; align-items:center; justify-content:center; min-height: 140px; margin-top:5px;">
          ${renderSVGChart()}
        </div>
      </div>

      <!-- Right: Real-Time Activity Feed -->
      <div class="glass-card" style="padding: 20px; display:flex; flex-direction:column; min-height: 300px; border-left: 4px solid var(--color-warning); margin:0;">
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 14px; color: var(--text-white-invert);">Real-Time Activity Feed</strong>
          <span style="font-size:11px; color:var(--text-muted); display:block;">Recent operations across all wallets</span>
        </div>
        <!-- Scrollable container -->
        <div id="real-time-activity-container" style="flex:1; overflow-y:auto; max-height: 200px; display:flex; flex-direction:column; gap:8px; padding-right:5px;">
          ${renderActivityFeed()}
        </div>
      </div>
    </div>

    <!-- Active Wallet and Balance Row (Row 2) -->
    <div class="aeps-second-grid">
      <!-- Left Card: Active Wallet Selector -->
      <div class="glass-card" style="padding: 20px; display:flex; flex-direction:column; gap:12px; border-left: 5px solid var(--color-primary); margin:0; justify-content:center; min-height:140px;">
        <div>
          <strong style="font-size: 14px; color: var(--text-white-invert);">Active Wallet Selection</strong>
          <span style="font-size:11px; color:var(--text-muted); display:block;">Select which portal register book to view and manage</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px; width:100%;">
          <select id="select-aeps-wallet" class="form-control" style="flex-grow:1; background:var(--bg-card-medium); color:var(--text-white-invert); border: 1px solid var(--border-hairline-solid); padding: 8px 12px; height: 38px; font-size:13px; font-weight:600;">
            ${wallets.map(w => `
              <option value="${w.id}" ${w.id === selectedWalletId ? 'selected' : ''}>
                ${w.name} (${w.loginId})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Right Card: Selected Wallet Balance Card -->
      ${isDualWallet ? `
        <!-- Digipay Lite Special Balance Card showing both wallets -->
        <div class="glass-card" style="padding: 20px; border-left: 5px solid var(--color-success); display:flex; flex-direction:column; gap:12px; margin:0; min-height:140px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size: 15px; color: var(--text-white-invert);">${selectedWallet.name}</strong>
              <span style="font-size:11px; color:var(--text-muted); display:block;">Terminal ID: <code>${selectedWallet.loginId}</code></span>
            </div>
            <span class="badge badge-success" style="font-size:9px;">ACTIVE DUAL</span>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border-top: 1px solid var(--border-hairline); padding-top:12px;">
            <div>
              <span style="font-size: 9px; color:var(--text-dimmed); text-transform:uppercase; display:block; font-weight:600;">Wallet 1 (DMT Only)</span>
              <span style="font-family:var(--font-display); font-size: 18px; font-weight:700; color:var(--color-info);">₹${(currentBalances[selectedWalletId + '_w1'] || 0).toFixed(2)}</span>
            </div>
            <div style="border-left: 1px solid var(--border-hairline); padding-left:12px;">
              <span style="font-size: 9px; color:var(--text-dimmed); text-transform:uppercase; display:block; font-weight:600;">Wallet 2 (AEPS Cashout)</span>
              <span style="font-family:var(--font-display); font-size: 18px; font-weight:700; color:var(--color-success);">₹${(currentBalances[selectedWalletId + '_w2'] || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div style="display:flex; gap:8px; margin-top:5px;">
            <button id="btn-inter-transfer" class="btn btn-sm btn-secondary" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:10px; padding:5px;">
              <i data-lucide="arrow-left-right" style="width: 12px; height: 12px;"></i> Inter-Transfer
            </button>
            <button id="btn-lite-cashout" class="btn btn-sm btn-primary" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:10px; padding:5px; background: #2563eb; border:none;">
              <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Bank Cashout (W2)
            </button>
          </div>
        </div>
      ` : `
        <!-- Single Wallet Balance Card -->
        <div class="glass-card" style="padding: 20px; border-left: 5px solid var(--color-success); display:flex; flex-direction:column; gap:12px; margin:0; justify-content:space-between; min-height:140px;">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div>
              <strong style="font-size: 15px; color: var(--text-white-invert);">${selectedWallet ? selectedWallet.name : 'Unknown Wallet'}</strong>
              <span style="font-size:11px; color:var(--text-muted); display:block;">Terminal ID: <code>${selectedWallet ? selectedWallet.loginId : '-'}</code></span>
            </div>
            <span class="badge badge-success" style="font-size:9px;">ACTIVE</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-hairline); padding-top:10px; width:100%; gap:20px;">
            <div>
              <span style="font-size: 9px; color:var(--text-dimmed); text-transform:uppercase; display:block; font-weight:600;">Current Wallet Balance</span>
              <span style="font-family:var(--font-display); font-size: 20px; font-weight:800; color:var(--color-success);">₹${(selectedWalletId ? (currentBalances[selectedWalletId] || 0) : 0).toFixed(2)}</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="btn-generic-cashout" class="btn btn-sm btn-primary" style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; padding:6px 12px; background:#2563eb; border:none; height:32px;">
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Bank Cashout
              </button>
              ${selectedWalletId === 'aeps_rr0re' || selectedWalletId === 'digipay' ? `
                <button id="btn-csc-topup" class="btn btn-sm btn-secondary" style="display:flex; align-items:center; justify-content:center; gap:6px; font-size:10px; padding:5px 12px; height:32px;">
                  <i data-lucide="arrow-up-circle" style="width: 12px; height: 12px;"></i> CSC Top-up
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `}
    </div>

    <!-- Filter toolbar and Export -->
    <div class="glass-card" style="padding: 20px; margin-bottom: 25px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:15px;">
        <h4 style="margin:0; font-family:var(--font-display); font-weight:700; color:var(--text-white-invert);">
          Register Statement & Filter Parameters
        </h4>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button id="btn-print-statement" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="printer" style="width:14px; height:14px;"></i> Print Statement
          </button>
          <button id="btn-pdf-statement" class="btn btn-primary btn-sm" style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="download" style="width:14px; height:14px;"></i> Download PDF Statement
          </button>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; align-items:flex-end;">
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:11px; margin-bottom:4px;">Period Mode</label>
          <select id="reg-filter-period" class="form-control" style="font-size:12px; height:36px; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); color:var(--text-white-invert);">
            <option value="daily" ${filterPeriod === 'daily' ? 'selected' : ''}>Daily (Single Day)</option>
            <option value="monthly" ${filterPeriod === 'monthly' ? 'selected' : ''}>Monthly Register</option>
            <option value="yearly" ${filterPeriod === 'yearly' ? 'selected' : ''}>Yearly Register</option>
          </select>
        </div>
        
        <div class="form-group" id="reg-date-wrapper" style="margin:0;">
          <label class="form-label" style="font-size:11px; margin-bottom:4px;">Select Day</label>
          <input type="date" id="reg-filter-date" class="form-control" style="font-size:12px; height:36px; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); color:var(--text-white-invert);" value="${filterDate}">
        </div>

        <div class="form-group" id="reg-month-wrapper" style="margin:0; display:none;">
          <label class="form-label" style="font-size:11px; margin-bottom:4px;">Select Month</label>
          <input type="month" id="reg-filter-month" class="form-control" style="font-size:12px; height:36px; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); color:var(--text-white-invert);" value="${filterMonth}">
        </div>

        <div class="form-group" id="reg-year-wrapper" style="margin:0; display:none;">
          <label class="form-label" style="font-size:11px; margin-bottom:4px;">Select Year</label>
          <select id="reg-filter-year" class="form-control" style="font-size:12px; height:36px; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); color:var(--text-white-invert);">
            <option value="2024" ${filterYear === '2024' ? 'selected' : ''}>2024</option>
            <option value="2025" ${filterYear === '2025' ? 'selected' : ''}>2025</option>
            <option value="2026" ${filterYear === '2026' ? 'selected' : ''}>2026</option>
            <option value="2027" ${filterYear === '2027' ? 'selected' : ''}>2027</option>
            <option value="2028" ${filterYear === '2028' ? 'selected' : ''}>2028</option>
          </select>
        </div>

        <div class="form-group" style="margin:0; grid-column: span 2;">
          <label class="form-label" style="font-size:11px; margin-bottom:4px;">Search Register Book</label>
          <div style="position:relative; display:flex; align-items:center;">
            <i data-lucide="search" style="width:14px; height:14px; position:absolute; left:12px; color:var(--text-muted);"></i>
            <input type="text" id="reg-filter-search" class="form-control" style="font-size:12px; height:36px; padding-left:36px; background:var(--bg-card-medium); border: 1px solid var(--border-hairline-solid); color:var(--text-white-invert);" value="${filterSearch}" placeholder="Search customer, bank, RRN/ID, mobile...">
          </div>
        </div>
      </div>
    </div>

    <!-- Register Table Container -->
    <div class="glass-card" style="padding: 24px; margin-bottom: 25px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; flex-wrap:wrap; gap:10px;">
        <h4 style="margin:0; font-family:var(--font-display); font-weight:700; color:var(--text-white-invert);" id="register-book-title">
          AEPS & DMT REGISTER BOOK
        </h4>
        <div style="display:flex; gap:10px;">
          ${selectedWalletId ? `
            <button id="btn-add-aeps-txn" class="btn btn-primary btn-sm" style="display:flex; align-items:center; gap:6px;">
              <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Add Register Entry
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Register Table -->
      <div class="table-responsive" style="overflow-x:auto;">
        <table class="custom-table" style="width:100%; border-collapse:collapse; min-width: 1200px;">
          <thead>
            <tr>
              <th style="padding: 12px 10px; font-size:11px;">Date & Time</th>
              <th style="padding: 12px 10px; font-size:11px;">Customer Name</th>
              <th style="padding: 12px 10px; font-size:11px;">Bank Name</th>
              <th style="padding: 12px 10px; font-size:11px;">Txn Type</th>
              <th style="padding: 12px 10px; font-size:11px;">RRN/ID</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:right;">Withdrawal Amt</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:right;">Deposit Amt</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:right;">DMT Amt</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:right;">Wallet Balance</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:center;">Aadhaar Last 4 Dig</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:center;">Mobile No</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:center;">Status</th>
              <th style="padding: 12px 10px; font-size:11px; text-align:center; width: 110px;">Actions</th>
            </tr>
          </thead>
          <tbody id="aeps-register-tbody">
            <!-- Redrawn Dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reconciliation Card -->
    <div class="glass-card" style="padding:15px; border-left: 5px solid var(--color-info); display:flex; flex-direction:column; gap:6px;">
      <h5 style="margin:0; font-weight:700; display:flex; align-items:center; gap:8px; color:var(--text-white-invert);">
        <i data-lucide="help-circle" style="width:15px; height:15px; color:var(--color-info);"></i> Ledger Balancing Details
      </h5>
      <p style="margin:0; font-size:11px; color:var(--text-muted); line-height:1.5;">
        Transactions recorded in this register are completely isolated from standard sales invoices. At day closing, all <strong>Success</strong> operations automatically reconcile with the cash drawer balance (Withdrawals decrease cash, DMTs and Deposits increase cash) and bank balances. DMT transactions automatically compute and reconcile service fees and commissions. Biometric Agent Authorisation charges deduct from Wallet 2 directly.
      </p>
    </div>

    <!-- Dynamic Modal Backdrops -->
    <div id="aeps-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header">
          <h4 id="aeps-modal-title">Register Operation</h4>
          <button id="aeps-modal-close" class="modal-close">&times;</button>
        </div>
        <div id="aeps-form-mount" style="padding: 20px;"></div>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'AEPS & DMT Registers';
  document.getElementById('page-heading-sub').innerText = `Dedicated register books for digital cash withdraws and transfers on ${activeDate}`;

  lucide.createIcons();

  const selectWallet = document.getElementById('select-aeps-wallet');
  const backdrop = document.getElementById('aeps-modal-backdrop');
  const formMount = document.getElementById('aeps-form-mount');
  const closeBtn = document.getElementById('aeps-modal-close');

  const closeModal = () => backdrop.classList.remove('show');
  closeBtn.addEventListener('click', closeModal);

  // Selector references for filters
  const periodSelect = document.getElementById('reg-filter-period');
  const dateWrapper = document.getElementById('reg-date-wrapper');
  const monthWrapper = document.getElementById('reg-month-wrapper');
  const yearWrapper = document.getElementById('reg-year-wrapper');

  const dateInput = document.getElementById('reg-filter-date');
  const monthInput = document.getElementById('reg-filter-month');
  const yearInput = document.getElementById('reg-filter-year');
  const searchInput = document.getElementById('reg-filter-search');

  // Show/hide wrappers based on filter period selection
  const updateFilterInputsVisibility = () => {
    const val = periodSelect.value;
    if (val === 'daily') {
      dateWrapper.style.display = 'block';
      monthWrapper.style.display = 'none';
      yearWrapper.style.display = 'none';
    } else if (val === 'monthly') {
      dateWrapper.style.display = 'none';
      monthWrapper.style.display = 'block';
      yearWrapper.style.display = 'none';
    } else if (val === 'yearly') {
      dateWrapper.style.display = 'none';
      monthWrapper.style.display = 'none';
      yearWrapper.style.display = 'block';
    }
  };

  // Dynamic Register Book Redraw function
  const redrawRegisterBook = () => {
    if (!selectedWalletId) {
      document.getElementById('aeps-register-tbody').innerHTML = `
        <tr>
          <td colspan="13" style="text-align:center; padding:30px; color:var(--text-muted); font-style:italic;">
            Please select or configure a wallet from the dropdown above.
          </td>
        </tr>
      `;
      return;
    }

    const period = periodSelect.value;
    const dateVal = dateInput.value;
    const monthVal = monthInput.value;
    const yearVal = yearInput.value;
    const query = searchInput.value.toLowerCase().trim();

    // Persist values in localStorage
    localStorage.setItem('cyberone_v2_aeps_filter_period', period);
    localStorage.setItem('cyberone_v2_aeps_filter_date', dateVal);
    localStorage.setItem('cyberone_v2_aeps_filter_month', monthVal);
    localStorage.setItem('cyberone_v2_aeps_filter_year', yearVal);
    localStorage.setItem('cyberone_v2_aeps_filter_search', query);

    // Dynamic title string
    let periodTitleStr = '';
    if (period === 'daily') periodTitleStr = `Daily Register - ${dateVal}`;
    else if (period === 'monthly') periodTitleStr = `Monthly Statement - ${monthVal}`;
    else if (period === 'yearly') periodTitleStr = `Yearly Statement - ${yearVal}`;

    document.getElementById('register-book-title').innerText = `${selectedWallet.name.toUpperCase()} - ${periodTitleStr.toUpperCase()}`;

    // Filter transactions by period
    let filteredTxns = allAepsTxns.filter(t => t.walletId === selectedWalletId);
    if (period === 'daily') {
      filteredTxns = filteredTxns.filter(t => t.date === dateVal);
    } else if (period === 'monthly') {
      filteredTxns = filteredTxns.filter(t => t.date.startsWith(monthVal));
    } else if (period === 'yearly') {
      filteredTxns = filteredTxns.filter(t => t.date.startsWith(yearVal));
    }

    // Sort chronologically across dates
    filteredTxns.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });

    // Group transactions by date to correctly compute running balances from day opening balances
    const txnsByDate = {};
    filteredTxns.forEach(t => {
      if (!txnsByDate[t.date]) txnsByDate[t.date] = [];
      txnsByDate[t.date].push(t);
    });

    const txnsWithRunning = [];
    Object.keys(txnsByDate).sort().forEach(dateStr => {
      const dayTxns = txnsByDate[dateStr];
      dayTxns.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

      const dayLog = store.getOrCreateDailyLog(dateStr);
      let w1Running = isDualWallet
        ? (dayLog.openingBalances[selectedWalletId + '_w1'] || 0)
        : (dayLog.openingBalances[selectedWalletId] || 0);
      let w2Running = isDualWallet
        ? (dayLog.openingBalances[selectedWalletId + '_w2'] || 0)
        : 0;

      dayTxns.forEach(t => {
        if (t.status === 'Success') {
          const amt = parseFloat(t.amount || 0);
          const svc = parseFloat(t.serviceCharge || 0);
          const comm = parseFloat(t.commission || 0);

          if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
            // primary AEPS cash withdrawals go to Wallet 2
            w2Running += amt;
          } else if (t.type === 'DMT') {
            // Wallet 1 is only for DMT. Service charge deducted, commission credited.
            w1Running -= (amt + svc - comm);
          } else if (t.type === 'Deposit' || t.type === 'Account Opening') {
            // Deposits and Account Openings go to Wallet 1
            w1Running -= amt;
          } else if (t.type === 'Agent Authorisation') {
            // Authorisation charge is debited from Wallet 2 for dual wallets
            w2Running -= amt;
          } else if (t.type === 'Bank Cashout') {
            // Payouts go out from Wallet 2
            w2Running -= amt;
          } else if (t.type === 'Wallet Transfer') {
            if (isDualWallet) {
              if (t.direction === 'w2_to_w1') {
                w2Running -= amt;
                w1Running += amt;
              } else {
                w1Running -= amt;
                w2Running += amt;
              }
            }
          } else if (t.type === 'CSC Top-up') {
            w2Running -= amt;
          }
        }
        txnsWithRunning.push({
          ...t,
          w1Balance: w1Running,
          w2Balance: w2Running
        });
      });
    });

    // Compute volume metrics for the filtered period
    let totalWithdrawal = 0;
    let totalDmt = 0;
    let totalDeposit = 0;

    txnsWithRunning.forEach(t => {
      if (t.status === 'Success') {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
          totalWithdrawal += amt;
        } else if (t.type === 'DMT') {
          totalDmt += amt;
        } else if (t.type === 'Deposit' || t.type === 'Account Opening') {
          totalDeposit += amt;
        }
      }
    });

    // Calculate consolidated totals for today/period
    let consolidatedWithdrawal = 0;
    let consolidatedDmt = 0;
    let consolidatedDeposit = 0;

    allAepsTxns.forEach(t => {
      if (t.status === 'Success') {
        const amt = parseFloat(t.amount || 0);
        let match = false;
        if (period === 'daily' && t.date === dateVal) match = true;
        else if (period === 'monthly' && t.date.startsWith(monthVal)) match = true;
        else if (period === 'yearly' && t.date.startsWith(yearVal)) match = true;

        if (match) {
          if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
            consolidatedWithdrawal += amt;
          } else if (t.type === 'DMT') {
            consolidatedDmt += amt;
          } else if (t.type === 'Deposit' || t.type === 'Account Opening' || t.type === 'CSC Top-up') {
            consolidatedDeposit += amt;
          }
        }
      }
    });

    const elW = document.getElementById('stat-withdrawal-vol');
    const elD = document.getElementById('stat-dmt-vol');
    const elDp = document.getElementById('stat-deposit-vol');
    if (elW) elW.innerText = `₹${consolidatedWithdrawal.toFixed(2)}`;
    if (elD) elD.innerText = `₹${consolidatedDmt.toFixed(2)}`;
    if (elDp) elDp.innerText = `₹${consolidatedDeposit.toFixed(2)}`;

    // Apply Search filter
    const displayTxns = query
      ? txnsWithRunning.filter(t => 
          (t.customerName || '').toLowerCase().includes(query) ||
          (t.bankName || '').toLowerCase().includes(query) ||
          (t.rrnNo || '').toLowerCase().includes(query) ||
          (t.mobile || '').toLowerCase().includes(query) ||
          (t.type || '').toLowerCase().includes(query) ||
          (t.status || '').toLowerCase().includes(query)
        )
      : txnsWithRunning;

    const tbody = document.getElementById('aeps-register-tbody');
    if (displayTxns.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align:center; padding:30px; color:var(--text-muted); font-style:italic;">
            No register entries match the selected filters or search terms.
          </td>
        </tr>
      `;
      return;
    }

    // Draw rows
    tbody.innerHTML = displayTxns.map(t => {
      const dateObj = new Date(t.timestamp);
      const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let withdrawText = '-';
      let depositText = '-';
      let dmtText = '-';
      
      const isWithdrawal = t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay';
      const isDmt = t.type === 'DMT';
      const isDeposit = t.type === 'Deposit' || t.type === 'Account Opening' || t.type === 'CSC Top-up';
      const isAuth = t.type === 'Agent Authorisation';
      
      if (isWithdrawal) withdrawText = `₹${t.amount.toFixed(2)}`;
      else if (isDmt) {
        const svc = parseFloat(t.serviceCharge || 0);
        const comm = parseFloat(t.commission || 0);
        dmtText = `₹${t.amount.toFixed(2)}
                   <span style="font-size:9px; color:var(--text-muted); display:block; font-weight:normal; margin-top:2px;">
                     Fee: ₹${svc.toFixed(1)} / Comm: +₹${comm.toFixed(1)}
                   </span>`;
      }
      else if (isDeposit) depositText = `₹${t.amount.toFixed(2)}`;
      else if (isAuth) {
        withdrawText = `<span style="color:var(--color-danger); font-size:11px;">Auth Fee: ₹${t.amount.toFixed(2)}</span>`;
      }
      else if (t.type === 'Wallet Transfer') {
        if (t.direction === 'w2_to_w1') {
          depositText = `<span style="color:var(--color-success); font-size:11px;">W2 ➔ W1: ₹${t.amount.toFixed(2)}</span>`;
        } else {
          depositText = `<span style="color:var(--color-danger); font-size:11px;">W1 ➔ W2: ₹${t.amount.toFixed(2)}</span>`;
        }
      } else if (t.type === 'Bank Cashout') {
        depositText = `<span style="color:var(--color-danger); font-size:11px;">Cashout: ₹${t.amount.toFixed(2)}</span>`;
      }

      // Balance display
      let balanceDisplay = '';
      if (isDualWallet) {
        if (t.type === 'Wallet Transfer') {
          balanceDisplay = `<span style="font-size:10px; display:block; color:var(--color-info);">W1: ₹${t.w1Balance.toFixed(0)}</span>
                            <span style="font-size:10px; display:block; color:var(--color-success);">W2: ₹${t.w2Balance.toFixed(0)}</span>`;
        } else if (t.type === 'Bank Cashout' || isWithdrawal || isAuth) {
          balanceDisplay = `<span style="color:var(--color-success); font-size:11px;">W2: ₹${t.w2Balance.toFixed(0)}</span>`;
        } else {
          balanceDisplay = `<span style="color:var(--color-info); font-size:11px;">W1: ₹${t.w1Balance.toFixed(0)}</span>`;
        }
      } else {
        balanceDisplay = `₹${t.w1Balance.toFixed(2)}`;
      }

      let statusBadge = '';
      if (t.status === 'Success') {
        statusBadge = '<span class="badge badge-success" style="padding: 2px 6px; font-size:10px;">SUCCESS</span>';
      } else if (t.status === 'Failed') {
        statusBadge = '<span class="badge badge-danger" style="padding: 2px 6px; font-size:10px;">FAILED</span>';
      } else {
        statusBadge = '<span class="badge badge-warning" style="padding: 2px 6px; font-size:10px;">PENDING</span>';
      }

      return `
        <tr style="border-bottom:1px solid var(--border-hairline);">
          <td style="padding:10px; font-size:12px; font-weight:600; color:var(--text-white-invert); white-space:nowrap;">
            ${t.date} <span style="font-weight:400; color:var(--text-muted); font-size:11px; display:block;">${formattedTime}</span>
          </td>
          <td style="padding:10px; font-size:12px; font-weight:600; color:var(--text-white-invert);">${t.customerName || '-'}</td>
          <td style="padding:10px; font-size:12px; color:var(--text-white-invert);">${t.bankName || '-'}</td>
          <td style="padding:10px; font-size:12px; font-weight:600;">
            <span style="color: ${isWithdrawal ? 'var(--color-success)' : isDmt ? 'var(--color-danger)' : isAuth ? '#fb923c' : 'var(--color-info)'}; font-size:11px;">
              ${t.type} ${isDualWallet ? (isWithdrawal || isAuth || t.type === 'Bank Cashout' ? '(W2)' : '(W1)') : ''}
            </span>
          </td>
          <td style="padding:10px; font-family:monospace; font-size:11px; color:var(--text-white-invert);">${t.rrnNo || '-'}</td>
          <td style="padding:10px; text-align:right; font-family:var(--font-display); font-size:12px; font-weight:700; color:var(--color-success);">${withdrawText}</td>
          <td style="padding:10px; text-align:right; font-family:var(--font-display); font-size:12px; font-weight:700; color:var(--color-info);">${depositText}</td>
          <td style="padding:10px; text-align:right; font-family:var(--font-display); font-size:12px; font-weight:700; color:var(--color-danger);">${dmtText}</td>
          <td style="padding:10px; text-align:right; font-family:var(--font-display); font-size:12px; font-weight:700; color:var(--color-success);">
            ${balanceDisplay}
          </td>
          <td style="padding:10px; text-align:center; font-family:monospace; font-size:12px; color:var(--text-white-invert);">${t.aadhaar || '-'}</td>
          <td style="padding:10px; text-align:center; font-size:12px; color:var(--text-white-invert);">${t.mobile || '-'}</td>
          <td style="padding:10px; text-align:center;">${statusBadge}</td>
          <td style="padding:10px; text-align:center;">
            <div style="display:flex; justify-content:center; gap:4px;">
              <button class="btn btn-sm btn-secondary btn-print-txn-receipt" data-id="${t.id}" style="padding:3px 6px;" title="Print Receipt">
                <i data-lucide="printer" style="width:12px; height:12px;"></i>
              </button>
              <button class="btn btn-sm btn-secondary btn-edit-register-txn" data-id="${t.id}" style="padding:3px 6px;">
                <i data-lucide="edit" style="width:12px; height:12px;"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-delete-register-txn" data-id="${t.id}" style="padding:3px 6px; background:#dc2626;">
                <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Rebind newly created table action buttons
    bindTableActions();
  };

  // Bind register row buttons
  const bindTableActions = () => {
    // Receipt Button
    const receiptBtns = document.querySelectorAll('.btn-print-txn-receipt');
    receiptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        const txn = allAepsTxns.find(t => t.id === txnId);
        if (txn) openReceiptPreview(txn);
      });
    });

    // Edit Button
    const editRowBtns = document.querySelectorAll('.btn-edit-register-txn');
    editRowBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        const txn = allAepsTxns.find(t => t.id === txnId);
        if (!txn) return;

        document.getElementById('aeps-modal-title').innerText = 'Edit Register Entry';

        const isDmt = txn.type === 'DMT';
        const isAuth = txn.type === 'Agent Authorisation';

        formMount.innerHTML = `
          <form id="form-edit-register-txn">
            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label class="form-label">Transaction Type</label>
                <input type="text" class="form-control" value="${txn.type}" readonly style="background:rgba(255,255,255,0.05); color:var(--text-white-invert);">
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">Amount (₹)</label>
                <input type="number" step="0.01" id="edit-txn-amount" class="form-control" value="${txn.amount}" required>
              </div>
            </div>

            ${isAuth ? '' : `
              <div class="form-group">
                <label class="form-label">Customer Name</label>
                <input type="text" id="edit-txn-cust-name" class="form-control" value="${txn.customerName || ''}">
              </div>

              <div class="form-row">
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Bank Name</label>
                  <input type="text" id="edit-txn-bank" class="form-control" value="${txn.bankName || ''}">
                </div>
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Aadhaar (Last 4)</label>
                  <input type="text" id="edit-txn-aadhaar" class="form-control" value="${txn.aadhaar || ''}" maxlength="4">
                </div>
              </div>
            `}

            <div class="form-group">
              <label class="form-label">RRN/ID</label>
              <input type="text" id="edit-txn-rrn" class="form-control" value="${txn.rrnNo || ''}">
            </div>

            ${txn.type !== 'Wallet Transfer' ? `
              <div class="form-row" style="margin-bottom:12px;">
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Portal Service Charge (₹)</label>
                  <input type="number" step="0.01" id="edit-txn-svc" class="form-control" value="${txn.serviceCharge || '0.00'}" required>
                </div>
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Portal Commission (₹)</label>
                  <input type="number" step="0.01" id="edit-txn-comm" class="form-control" value="${txn.commission || '0.00'}" required>
                </div>
              </div>
            ` : ''}

            ${(txn.type === 'DMT' || txn.type === 'Deposit' || txn.type === 'Account Opening') ? `
              <div class="form-row" id="edit-field-paymethod-wrapper" style="margin-bottom:12px;">
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Customer Payment Method</label>
                  <select id="edit-txn-paymethod" class="form-control">
                    <option value="Cash" ${txn.paymentMethod !== 'UPI' ? 'selected' : ''}>Cash</option>
                    <option value="UPI" ${txn.paymentMethod === 'UPI' ? 'selected' : ''}>UPI</option>
                  </select>
                </div>
                <div class="form-group" style="flex:1; display: ${txn.paymentMethod === 'UPI' ? 'block' : 'none'};" id="edit-field-paybank-wrapper">
                  <label class="form-label">Deposit Bank Account</label>
                  <select id="edit-txn-paybank" class="form-control">
                    ${store.bankAccounts.map(b => `<option value="${b.id}" ${txn.bankId === b.id ? 'selected' : ''}>${b.name} (${b.bankName})</option>`).join('')}
                  </select>
                </div>
              </div>
            ` : ''}

            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label class="form-label">Mobile Number</label>
                <input type="text" id="edit-txn-mobile" class="form-control" value="${txn.mobile || ''}">
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">Status</label>
                <select id="edit-txn-status" class="form-control">
                  <option value="Success" ${txn.status === 'Success' ? 'selected' : ''}>Success</option>
                  <option value="Pending" ${txn.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="Failed" ${txn.status === 'Failed' ? 'selected' : ''}>Failed</option>
                </select>
              </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:20px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">Save Details</button>
              <button type="button" class="btn btn-secondary btn-cancel-modal">Cancel</button>
            </div>
          </form>
        `;

        const editPaymethodSelect = document.getElementById('edit-txn-paymethod');
        if (editPaymethodSelect) {
          editPaymethodSelect.addEventListener('change', () => {
            const editPaybankWrapper = document.getElementById('edit-field-paybank-wrapper');
            if (editPaymethodSelect.value === 'UPI') {
              editPaybankWrapper.style.display = 'block';
            } else {
              editPaybankWrapper.style.display = 'none';
            }
          });
        }

        formMount.querySelector('.btn-cancel-modal').addEventListener('click', closeModal);

        document.getElementById('form-edit-register-txn').addEventListener('submit', (ev) => {
          ev.preventDefault();
          
          const patch = {
            amount: parseFloat(document.getElementById('edit-txn-amount').value || 0),
            rrnNo: document.getElementById('edit-txn-rrn').value,
            mobile: document.getElementById('edit-txn-mobile').value,
            status: document.getElementById('edit-txn-status').value
          };

          if (!isAuth) {
            patch.customerName = document.getElementById('edit-txn-cust-name').value;
            patch.bankName = document.getElementById('edit-txn-bank').value;
            patch.aadhaar = document.getElementById('edit-txn-aadhaar').value;
          }

          if (txn.type !== 'Wallet Transfer') {
            patch.serviceCharge = parseFloat(document.getElementById('edit-txn-svc').value || 0);
            patch.commission = parseFloat(document.getElementById('edit-txn-comm').value || 0);
          }

          const showPayMethod = (txn.type === 'DMT' || txn.type === 'Deposit' || txn.type === 'Account Opening');
          if (showPayMethod) {
            patch.paymentMethod = document.getElementById('edit-txn-paymethod').value;
            if (patch.paymentMethod === 'UPI') {
              patch.bankId = document.getElementById('edit-txn-paybank').value;
            } else {
              patch.bankId = '';
            }
          }

          store.updateAepsTransaction(txnId, patch);
          appInstance.showToast('Register entry updated!', 'success');
          closeModal();
          appInstance.handleRouting();
        });

        backdrop.classList.add('show');
      });
    });

    // Delete Button
    const deleteRowBtns = document.querySelectorAll('.btn-delete-register-txn');
    deleteRowBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const txnId = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this register row? This will revert any ledger balance effects.')) {
          store.deleteAepsTransaction(txnId);
          appInstance.showToast('Register entry deleted!', 'success');
          appInstance.handleRouting();
        }
      });
    });

    lucide.createIcons();
  };

  // Setup Event Listeners for Filters
  periodSelect.addEventListener('change', () => {
    updateFilterInputsVisibility();
    redrawRegisterBook();
  });
  dateInput.addEventListener('change', redrawRegisterBook);
  monthInput.addEventListener('change', redrawRegisterBook);
  yearInput.addEventListener('change', redrawRegisterBook);
  searchInput.addEventListener('input', redrawRegisterBook);

  // Initialize filter UI visibility and draw table initial state
  updateFilterInputsVisibility();
  redrawRegisterBook();

  // Export full register statement modal preview
  const openStatementPreviewModal = (format = 'print') => {
    const period = periodSelect.value;
    const dateVal = dateInput.value;
    const monthVal = monthInput.value;
    const yearVal = yearInput.value;

    let periodValue = '';
    if (period === 'daily') periodValue = dateVal;
    else if (period === 'monthly') periodValue = monthVal;
    else if (period === 'yearly') periodValue = yearVal;

    // Retrieve sorted register entries
    let statementTxns = allAepsTxns.filter(t => t.walletId === selectedWalletId);
    if (period === 'daily') {
      statementTxns = statementTxns.filter(t => t.date === dateVal);
    } else if (period === 'monthly') {
      statementTxns = statementTxns.filter(t => t.date.startsWith(monthVal));
    } else if (period === 'yearly') {
      statementTxns = statementTxns.filter(t => t.date.startsWith(yearVal));
    }

    statementTxns.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });

    // Compute running balances chronologically for statement list
    const txnsByDate = {};
    statementTxns.forEach(t => {
      if (!txnsByDate[t.date]) txnsByDate[t.date] = [];
      txnsByDate[t.date].push(t);
    });

    const txnsWithRunning = [];
    Object.keys(txnsByDate).sort().forEach(dateStr => {
      const dayTxns = txnsByDate[dateStr];
      dayTxns.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

      const dayLog = store.getOrCreateDailyLog(dateStr);
      let w1Running = isDualWallet
        ? (dayLog.openingBalances[selectedWalletId + '_w1'] || 0)
        : (dayLog.openingBalances[selectedWalletId] || 0);
      let w2Running = isDualWallet
        ? (dayLog.openingBalances[selectedWalletId + '_w2'] || 0)
        : 0;

      dayTxns.forEach(t => {
        if (t.status === 'Success') {
          const amt = parseFloat(t.amount || 0);
          const svc = parseFloat(t.serviceCharge || 0);
          const comm = parseFloat(t.commission || 0);

          if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
            w2Running += (amt - svc + comm);
          } else if (t.type === 'DMT') {
            w1Running -= (amt + svc - comm);
          } else if (t.type === 'Deposit' || t.type === 'Account Opening') {
            w1Running -= (amt + svc - comm);
          } else if (t.type === 'Agent Authorisation') {
            w2Running -= (amt + svc - comm);
          } else if (t.type === 'Bank Cashout') {
            w2Running -= (amt + svc - comm);
          } else if (t.type === 'Wallet Transfer') {
            if (isDualWallet) {
              if (t.direction === 'w2_to_w1') {
                w2Running -= amt;
                w1Running += amt;
              } else {
                w1Running -= amt;
                w2Running += amt;
              }
            }
          } else if (t.type === 'CSC Top-up') {
            w2Running -= (amt + svc - comm);
          }
        }
        txnsWithRunning.push({
          ...t,
          w1Balance: w1Running,
          w2Balance: w2Running
        });
      });
    });

    // Opening and closing calculation for period
    let startPeriodLog = null;
    let endPeriodLog = null;
    const sortedLogDates = Object.keys(store.dailyLogs).sort();

    let filterDatesMatching = [];
    if (period === 'daily') {
      filterDatesMatching = [dateVal];
    } else if (period === 'monthly') {
      filterDatesMatching = sortedLogDates.filter(d => d.startsWith(monthVal));
    } else if (period === 'yearly') {
      filterDatesMatching = sortedLogDates.filter(d => d.startsWith(yearVal));
    }

    if (filterDatesMatching.length > 0) {
      filterDatesMatching.sort();
      startPeriodLog = store.dailyLogs[filterDatesMatching[0]];
      endPeriodLog = store.dailyLogs[filterDatesMatching[filterDatesMatching.length - 1]];
    }

    let opBal = 0;
    let clBal = 0;
    if (startPeriodLog && endPeriodLog) {
      if (isDualWallet) {
        opBal = (startPeriodLog.openingBalances[selectedWalletId + '_w1'] || 0) + (startPeriodLog.openingBalances[selectedWalletId + '_w2'] || 0);
        clBal = (endPeriodLog.closingBalances[selectedWalletId + '_w1'] || 0) + (endPeriodLog.closingBalances[selectedWalletId + '_w2'] || 0);
      } else {
        opBal = startPeriodLog.openingBalances[selectedWalletId] || 0;
        clBal = endPeriodLog.closingBalances[selectedWalletId] || 0;
      }
    } else {
      // Fallback
      if (isDualWallet) {
        opBal = (currentBalances[selectedWalletId + '_w1'] || 0) + (currentBalances[selectedWalletId + '_w2'] || 0);
        clBal = opBal;
      } else {
        opBal = currentBalances[selectedWalletId] || 0;
        clBal = opBal;
      }
    }

    let withdrawals = 0;
    let dmts = 0;
    let deposits = 0;

    txnsWithRunning.forEach(t => {
      if (t.status === 'Success') {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay') {
          withdrawals += amt;
        } else if (t.type === 'DMT') {
          dmts += amt;
        } else if (t.type === 'Deposit' || t.type === 'Account Opening') {
          deposits += amt;
        }
      }
    });

    const summary = {
      openingBalance: opBal,
      closingBalance: clBal,
      totalWithdrawals: withdrawals,
      totalDmts: dmts,
      totalDeposits: deposits
    };

    const statementHTML = generateRegisterStatementHTML(selectedWallet, period, periodValue, txnsWithRunning, summary);

    document.getElementById('aeps-modal-title').innerText = `${selectedWallet.name} Statement Preview`;
    formMount.innerHTML = `
      <style>
        #printable-register-statement-container table {
          width: 100%;
          border-collapse: collapse;
        }
        #printable-register-statement-container th,
        #printable-register-statement-container td {
          padding: 6px;
          border: 1px solid var(--border-hairline);
        }
      </style>
      <div id="printable-register-statement-container" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-hairline-heavy); border-radius: 6px; padding: 10px; margin-bottom: 20px; background: #ffffff;">
        ${statementHTML}
      </div>
      <div style="display:flex; gap:10px;" class="no-print">
        <button id="btn-print-statement-action" class="btn btn-primary" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Register Statement
        </button>
        <button id="btn-pdf-statement-action" class="btn btn-secondary" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i data-lucide="download" style="width:16px; height:16px;"></i> Save as PDF
        </button>
        <button id="btn-close-statement-modal" class="btn btn-secondary">Close</button>
      </div>
    `;

    lucide.createIcons();

    document.getElementById('btn-close-statement-modal').addEventListener('click', closeModal);

    document.getElementById('btn-print-statement-action').addEventListener('click', () => {
      const printArea = document.createElement('div');
      printArea.id = 'temp-print-area';
      printArea.innerHTML = statementHTML;
      document.body.appendChild(printArea);

      document.body.classList.add('printing-active', 'print-normal', 'print-statement-active');
      window.print();
      
      setTimeout(() => {
        document.body.classList.remove('printing-active', 'print-normal', 'print-statement-active');
        printArea.remove();
      }, 1000);
    });

    document.getElementById('btn-pdf-statement-action').addEventListener('click', () => {
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-pdf-statement-download';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '1040px';
      tempDiv.style.background = '#ffffff';
      tempDiv.innerHTML = statementHTML;
      document.body.appendChild(tempDiv);

      appInstance.downloadElementAsPDF('temp-pdf-statement-download', `Register_Statement_${selectedWallet.name.replace(/\s+/g, '_')}_${periodValue}.pdf`, false, 'landscape');
      
      setTimeout(() => tempDiv.remove(), 2000);
    });

    backdrop.classList.add('show');
  };

  const generateRegisterStatementHTML = (wallet, period, periodValue, txns, summary) => {
    return `
      <style>
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body.print-statement-active #app-container {
            display: none !important;
          }
          body.print-statement-active #temp-print-area {
            display: block !important;
            width: 100% !important;
          }
          #printable-register-statement {
            padding: 0 !important;
            color: #000 !important;
            background: #fff !important;
            width: 100% !important;
          }
          #printable-register-statement * {
            color: #000 !important;
          }
          #printable-register-statement table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #printable-register-statement th,
          #printable-register-statement td {
            padding: 6px 4px !important;
            border: 1px solid #e5e7eb !important;
            font-size: 10px !important;
          }
        }
      </style>
      <div id="printable-register-statement" style="padding: 20px; background: #ffffff; color: #000000; font-family: sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #1f2937; padding-bottom:15px; margin-bottom:20px;">
          <div>
            <h2 style="margin:0; font-size:22px; color:#1e1b4b; font-weight:800; text-transform:uppercase;">${store.centerProfile.name}</h2>
            <div style="font-size:11px; font-weight:700; color:#4338ca; margin-top:2px;">
              CENTER CODE: ${store.centerProfile.code} ${store.centerProfile.gstin ? `| GSTIN: ${store.centerProfile.gstin}` : ''}
            </div>
            <div style="font-size:10px; color:#4b5563; margin-top:2px; max-width:350px;">
              ${store.centerProfile.address}, ${store.centerProfile.city}, ${store.centerProfile.state} - ${store.centerProfile.pin}
            </div>
            <div style="font-size:10px; color:#1f2937; margin-top:2px; font-weight:500;">
              📞 ${store.centerProfile.mobile} | ✉️ ${store.centerProfile.email}
            </div>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0; font-size:16px; color:#4b5563; font-weight:700; text-transform:uppercase;">Register Statement</h3>
            <div style="font-size:11px; color:#1f2937; font-weight:600; margin-top:5px; background:#f3f4f6; padding:4px 8px; border-radius:4px; display:inline-block;">
              Period: ${period.toUpperCase()} (${periodValue})
            </div>
            <div style="font-size:9px; color:#6b7280; margin-top:5px;">
              Run Date: ${new Date().toLocaleString()}
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:15px; margin-bottom:20px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#1e1b4b; border-bottom:1px solid #d1d5db; padding-bottom:4px; margin-bottom:8px;">Account Details</div>
            <table style="width:100%; font-size:11px; line-height:1.6;">
              <tr>
                <td style="color:#4b5563; font-weight:600;">Wallet / Portal:</td>
                <td style="text-align:right; font-weight:700;">${wallet.name}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Terminal ID:</td>
                <td style="text-align:right; font-family:monospace; font-weight:700;">${wallet.loginId}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Opening Balance:</td>
                <td style="text-align:right; font-weight:700;">₹${summary.openingBalance.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Closing Balance:</td>
                <td style="text-align:right; font-weight:700; color:#059669;">₹${summary.closingBalance.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <div>
            <div style="font-size:12px; font-weight:700; color:#1e1b4b; border-bottom:1px solid #d1d5db; padding-bottom:4px; margin-bottom:8px;">Transaction Summary</div>
            <table style="width:100%; font-size:11px; line-height:1.6;">
              <tr>
                <td style="color:#4b5563; font-weight:600;">Total AEPS Cashout:</td>
                <td style="text-align:right; font-weight:700; color:#059669;">₹${summary.totalWithdrawals.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Total DMT Outflows:</td>
                <td style="text-align:right; font-weight:700; color:#dc2626;">₹${summary.totalDmts.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Total Other Deposits:</td>
                <td style="text-align:right; font-weight:700; color:#2563eb;">₹${summary.totalDeposits.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color:#4b5563; font-weight:600;">Total Transactions Count:</td>
                <td style="text-align:right; font-weight:700;">${txns.length} entries</td>
              </tr>
            </table>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-top:15px;">
          <thead>
            <tr style="background:#f3f4f6; border-top:1px solid #000; border-bottom:2px solid #000;">
              <th style="padding:6px; text-align:left;">Date & Time</th>
              <th style="padding:6px; text-align:left;">Customer</th>
              <th style="padding:6px; text-align:left;">Bank</th>
              <th style="padding:6px; text-align:left;">Txn Type</th>
              <th style="padding:6px; text-align:left;">RRN/ID</th>
              <th style="padding:6px; text-align:right;">Withdrawal</th>
              <th style="padding:6px; text-align:right;">Deposit</th>
              <th style="padding:6px; text-align:right;">DMT</th>
              <th style="padding:6px; text-align:right;">Wallet Balance</th>
              <th style="padding:6px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${txns.length === 0 ? `
              <tr>
                <td colspan="10" style="text-align:center; padding:20px; color:#4b5563; font-style:italic;">No records found for this period.</td>
              </tr>
            ` : txns.map(t => {
              const isW = t.type === 'AEPS Withdrawal' || t.type === 'MicroATM Withdrawal' || t.type === 'Aadhaar Pay';
              const isD = t.type === 'DMT';
              const isDep = t.type === 'Deposit' || t.type === 'Account Opening' || t.type === 'CSC Top-up';
              const isAuth = t.type === 'Agent Authorisation';

              let withdrawText = '-';
              let depositText = '-';
              let dmtText = '-';

              if (isW) withdrawText = `₹${t.amount.toFixed(2)}`;
              else if (isD) {
                const svc = parseFloat(t.serviceCharge || 0);
                const comm = parseFloat(t.commission || 0);
                dmtText = `₹${t.amount.toFixed(2)} (Fee:₹${svc}/Comm:₹${comm})`;
              }
              else if (isDep) depositText = `₹${t.amount.toFixed(2)}`;
              else if (isAuth) {
                withdrawText = `Auth Fee: ₹${t.amount.toFixed(2)}`;
              }
              else if (t.type === 'Wallet Transfer') {
                depositText = t.direction === 'w2_to_w1' ? `W2➔W1:₹${t.amount}` : `W1➔W2:₹${t.amount}`;
              } else if (t.type === 'Bank Cashout') {
                depositText = `Cashout:₹${t.amount}`;
              }

              let balanceText = '';
              const isDualWallet = wallet.id === 'aeps_kntny' || wallet.name.toLowerCase().includes('digipay lite');
              if (isDualWallet) {
                if (t.type === 'Wallet Transfer') {
                  balanceText = `W1:₹${t.w1Balance.toFixed(0)}, W2:₹${t.w2Balance.toFixed(0)}`;
                } else if (t.type === 'Bank Cashout' || isW || isAuth) {
                  balanceText = `W2:₹${t.w2Balance.toFixed(0)}`;
                } else {
                  balanceText = `W1:₹${t.w1Balance.toFixed(0)}`;
                }
              } else {
                balanceText = `₹${t.w1Balance.toFixed(2)}`;
              }

              return `
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:6px; white-space:nowrap;">${t.date} ${new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                  <td style="padding:6px; font-weight:600;">${t.customerName || '-'}</td>
                  <td style="padding:6px;">${t.bankName || '-'}</td>
                  <td style="padding:6px; font-weight:600;">${t.type}</td>
                  <td style="padding:6px; font-family:monospace;">${t.rrnNo || '-'}</td>
                  <td style="padding:6px; text-align:right; font-weight:700; color:#059669;">${withdrawText}</td>
                  <td style="padding:6px; text-align:right; font-weight:700; color:#2563eb;">${depositText}</td>
                  <td style="padding:6px; text-align:right; font-weight:700; color:#dc2626;">${dmtText}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; font-weight:700;">${balanceText}</td>
                  <td style="padding:6px; text-align:center; font-weight:700; text-transform:uppercase; color:${t.status === 'Success' ? '#059669' : t.status === 'Failed' ? '#dc2626' : '#f59e0b'};">${t.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top:40px; border-top:1px solid #000; padding-top:15px; display:flex; justify-content:space-between; font-size:10px; color:#4b5563;">
          <div>* Generated by CYBERONE Center Management Platform. Keep this statement secure.</div>
          <div style="font-weight:700; text-transform:uppercase;">Authorized Signature: _______________________</div>
        </div>
      </div>
    `;
  };

  // Export single receipt
  const openReceiptPreview = (txn) => {
    const isWithdrawal = txn.type === 'AEPS Withdrawal' || txn.type === 'MicroATM Withdrawal' || txn.type === 'Aadhaar Pay';
    const isDmt = txn.type === 'DMT';
    const isAuth = txn.type === 'Agent Authorisation';
    const modalBackdrop = document.getElementById('aeps-modal-backdrop');
    const modalTitle = document.getElementById('aeps-modal-title');
    const modalFormMount = document.getElementById('aeps-form-mount');

    const svc = parseFloat(txn.serviceCharge || 0);
    const comm = parseFloat(txn.commission || 0);

    modalTitle.innerText = 'Transaction Receipt';
    modalFormMount.innerHTML = `
      <div id="printable-txn-receipt" class="preview-normal" style="padding: 15px; background: #ffffff; color: #000000; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px solid #4338ca; padding-bottom: 12px; margin-bottom: 15px;">
          <img style="max-height: 40px; margin-bottom: 6px; display: block; margin-left: auto; margin-right: auto;" src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" onerror="this.style.display='none';">
          <h3 style="margin: 0; color: #1e1b4b; font-size: 18px; font-weight: 800; text-transform: uppercase;">${store.centerProfile.name}</h3>
          <div style="font-size: 10px; font-weight: 700; color: #4338ca; margin-top: 2px;">
            CENTER CODE: ${store.centerProfile.code} ${store.centerProfile.gstin ? `| GSTIN: ${store.centerProfile.gstin}` : ''}
          </div>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #4b5563; line-height: 1.3;">
            ${store.centerProfile.address}, ${store.centerProfile.city}, ${store.centerProfile.state} - ${store.centerProfile.pin}
          </p>
          <div style="font-size: 10px; color: #1f2937; margin-top: 2px; font-weight: 500;">
            📞 ${store.centerProfile.mobile} | ✉️ ${store.centerProfile.email}
          </div>
        </div>

        <h4 style="text-align: center; margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; font-weight: 700; color: #1f2937; letter-spacing: 0.5px;">
          ${txn.type} TRANSACTION RECEIPT
        </h4>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Receipt No:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700;">TXN-${txn.id.substring(0, 8).toUpperCase()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Date & Time:</td>
            <td style="padding: 6px 0; text-align: right;">${txn.date} ${new Date(txn.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
          </tr>
          ${isAuth ? '' : `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Customer Name:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${txn.customerName || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Mobile Number:</td>
              <td style="padding: 6px 0; text-align: right;">${txn.mobile || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Bank Name:</td>
              <td style="padding: 6px 0; text-align: right;">${txn.bankName || '-'}</td>
            </tr>
          `}
          ${txn.aadhaar ? `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Aadhaar (Last 4):</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace;">XXXX-XXXX-${txn.aadhaar}</td>
            </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Reference / RRN/ID:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${txn.rrnNo || '-'}</td>
          </tr>
          ${(txn.type === 'DMT' || txn.type === 'Deposit' || txn.type === 'Account Opening') ? `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Payment Method:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${txn.paymentMethod || 'Cash'}</td>
            </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Portal/Wallet:</td>
            <td style="padding: 6px 0; text-align: right;">${selectedWallet ? selectedWallet.name : '-'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Amount:</td>
            <td style="padding: 6px 0; text-align: right; font-weight:700;">₹${txn.amount.toFixed(2)}</td>
          </tr>
          ${isDmt ? `
            <tr style="border-bottom: 1px solid #e5e7eb; color: #b91c1c;">
              <td style="padding: 6px 0; font-weight: 600;">Portal Fee (Deducted):</td>
              <td style="padding: 6px 0; text-align: right; font-weight:600;">+₹${svc.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb; color: #15803d;">
              <td style="padding: 6px 0; font-weight: 600;">Portal Commission (Credited):</td>
              <td style="padding: 6px 0; text-align: right; font-weight:600;">-₹${comm.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 2px solid #1f2937; font-size: 14px; font-weight: 700;">
              <td style="padding: 8px 0; color: #1e1b4b;">Net Wallet Debit:</td>
              <td style="padding: 8px 0; text-align: right; color: #dc2626;">₹${(txn.amount + svc - comm).toFixed(2)}</td>
            </tr>
          ` : `
            <tr style="border-bottom: 2px solid #1f2937; font-size: 14px; font-weight: 700;">
              <td style="padding: 8px 0; color: #1e1b4b;">Transaction Value:</td>
              <td style="padding: 8px 0; text-align: right; color: ${isWithdrawal ? '#10b981' : '#dc2626'};">₹${txn.amount.toFixed(2)}</td>
            </tr>
          `}
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563;">Status:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; text-transform: uppercase; color: ${txn.status === 'Success' ? '#10b981' : txn.status === 'Failed' ? '#ef4444' : '#f59e0b'};">${txn.status}</td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 9px; color: #6b7280; border-top: 1px dashed #d1d5db; padding-top: 10px; margin-top: 20px;">
          Thank you for banking with us. Keep this copy for reference.
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid var(--panel-border); padding-top:15px;" class="no-print">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Print Layout:</span>
        <div style="display:flex; gap:5px;">
          <button id="btn-receipt-normal" class="btn btn-xs btn-primary" style="font-size:10px; padding: 4px 8px;">A4 Normal</button>
          <button id="btn-receipt-thermal" class="btn btn-xs btn-secondary" style="font-size:10px; padding: 4px 8px;">80mm Thermal</button>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:15px;" class="no-print">
        <button id="btn-print-txn-receipt" class="btn btn-primary" style="flex-grow:1; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i data-lucide="printer" style="width:16px; height:16px;"></i> Print Receipt
        </button>
        <button id="btn-pdf-txn-receipt" class="btn btn-secondary" style="flex-grow:1; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i data-lucide="download" style="width:16px; height:16px;"></i> Download PDF
        </button>
        <button id="btn-close-receipt" class="btn btn-secondary">Close</button>
      </div>
    `;

    lucide.createIcons();

    let printFormat = 'normal';
    const btnFormatNormal = document.getElementById('btn-receipt-normal');
    const btnFormatThermal = document.getElementById('btn-receipt-thermal');
    const receiptContainer = document.getElementById('printable-txn-receipt');

    btnFormatNormal.addEventListener('click', () => {
      printFormat = 'normal';
      receiptContainer.className = 'preview-normal';
      btnFormatNormal.classList.replace('btn-secondary', 'btn-primary');
      btnFormatThermal.classList.replace('btn-primary', 'btn-secondary');
    });

    btnFormatThermal.addEventListener('click', () => {
      printFormat = 'thermal';
      receiptContainer.className = 'preview-thermal';
      btnFormatThermal.classList.replace('btn-secondary', 'btn-primary');
      btnFormatNormal.classList.replace('btn-primary', 'btn-secondary');
    });

    document.getElementById('btn-print-txn-receipt').addEventListener('click', () => {
      appInstance.printElement(printFormat);
    });

    document.getElementById('btn-pdf-txn-receipt').addEventListener('click', () => {
      appInstance.downloadElementAsPDF('printable-txn-receipt', `Receipt_${txn.rrnNo || txn.id}.pdf`, printFormat === 'thermal');
    });

    document.getElementById('btn-close-receipt').addEventListener('click', () => {
      modalBackdrop.classList.remove('show');
    });

    modalBackdrop.classList.add('show');
  };

  const printStatementBtn = document.getElementById('btn-print-statement');
  const pdfStatementBtn = document.getElementById('btn-pdf-statement');
  
  if (printStatementBtn) printStatementBtn.addEventListener('click', () => openStatementPreviewModal('print'));
  if (pdfStatementBtn) pdfStatementBtn.addEventListener('click', () => openStatementPreviewModal('pdf'));

  // Switch wallet on selection change
  if (selectWallet) {
    selectWallet.addEventListener('change', (e) => {
      localStorage.setItem('cyberone_v2_selected_aeps_wallet', e.target.value);
      renderAEPS(mountPoint, appInstance);
    });
  }

  // Manage Wallets Modal (Edit loginIds and Add new wallets)
  const manageWalletsBtn = document.getElementById('btn-manage-wallets');
  if (manageWalletsBtn) {
    manageWalletsBtn.addEventListener('click', () => {
      document.getElementById('aeps-modal-title').innerText = 'Manage AEPS & DMT Wallets';
      
      const renderManageForm = (walletToEdit = null) => {
        formMount.innerHTML = `
          <!-- Upper Form: Add/Edit Wallet -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-hairline-heavy); padding:15px; border-radius:8px; margin-bottom: 20px;">
            <h5 style="margin-top:0; color:var(--text-white-invert); font-weight:700;">
              ${walletToEdit ? `Edit Wallet: ${walletToEdit.name}` : 'Add New Wallet'}
            </h5>
            <form id="form-manage-wallet-submit">
              <div class="form-group">
                <label class="form-label">Wallet Name</label>
                <input type="text" id="mw-name" class="form-control" value="${walletToEdit ? walletToEdit.name : ''}" placeholder="e.g. Digipay Lite" required>
              </div>
              <div class="form-group">
                <label class="form-label">Terminal / Login ID</label>
                <input type="text" id="mw-login" class="form-control" value="${walletToEdit ? walletToEdit.loginId : ''}" placeholder="e.g. CSC-8899" required>
              </div>
              <div class="form-row">
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Commission (%)</label>
                  <input type="number" step="0.001" id="mw-comm" class="form-control" value="${walletToEdit ? (walletToEdit.commissionRate * 100).toFixed(3) : '0.15'}" required>
                </div>
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Initial Balance (₹)</label>
                  <input type="number" step="0.01" id="mw-bal" class="form-control" value="0.00" ${walletToEdit ? 'disabled style="opacity:0.5;"' : ''} required>
                </div>
              </div>
              <div style="display:flex; gap:10px; margin-top:12px;">
                <button type="submit" class="btn btn-primary btn-sm" style="flex:1;">
                  ${walletToEdit ? 'Update Wallet' : 'Register Wallet'}
                </button>
                ${walletToEdit ? `
                  <button type="button" id="btn-cancel-mw-edit" class="btn btn-secondary btn-sm">Cancel Edit</button>
                ` : ''}
              </div>
            </form>
          </div>

          <!-- Lower List: Existing Wallets -->
          <h5 style="margin-bottom:10px; color:var(--text-white-invert); font-weight:700;">Registered Wallets</h5>
          <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border-hairline); border-radius:6px;">
            <table class="custom-table" style="width:100%; font-size:11px;">
              <thead>
                <tr>
                  <th style="padding:6px;">Name</th>
                  <th style="padding:6px;">Login ID</th>
                  <th style="padding:6px; text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${wallets.map(w => `
                  <tr style="border-bottom:1px solid var(--border-hairline);">
                    <td style="padding:6px; font-weight:600; color:var(--text-white-invert);">${w.name}</td>
                    <td style="padding:6px; font-family:monospace; color:var(--text-white-invert);">${w.loginId}</td>
                    <td style="padding:6px; text-align:center;">
                      <div style="display:flex; justify-content:center; gap:5px;">
                        <button class="btn btn-sm btn-secondary btn-mw-edit" data-id="${w.id}" style="padding:2px 5px; font-size:10px;">Edit</button>
                        <button class="btn btn-sm btn-danger btn-mw-delete" data-id="${w.id}" style="padding:2px 5px; font-size:10px; background:#dc2626;">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:15px; text-align:right;">
            <button type="button" class="btn btn-secondary btn-sm btn-close-mw-modal">Done</button>
          </div>
        `;

        // Bind Done button
        formMount.querySelector('.btn-close-mw-modal').addEventListener('click', closeModal);

        // Bind Cancel Edit button
        const cancelEditBtn = document.getElementById('btn-cancel-mw-edit');
        if (cancelEditBtn) {
          cancelEditBtn.addEventListener('click', () => renderManageForm(null));
        }

        // Add/Edit Submit Handler
        document.getElementById('form-manage-wallet-submit').addEventListener('submit', (event) => {
          event.preventDefault();
          const name = document.getElementById('mw-name').value;
          const loginId = document.getElementById('mw-login').value;
          const commissionRate = parseFloat(document.getElementById('mw-comm').value || 0) / 100;
          
          if (walletToEdit) {
            // Update
            store.updateWalletDetails(walletToEdit.id, { name, loginId, commissionRate });
            appInstance.showToast('Wallet details updated!', 'success');
            renderAEPS(mountPoint, appInstance);
            renderManageForm(null); // Return to Add mode
          } else {
            // Register new
            const walletId = 'aeps_' + Math.random().toString(36).substr(2, 5);
            const balance = parseFloat(document.getElementById('mw-bal').value || 0);

            store.wallets.push({
              id: walletId,
              name,
              loginId,
              commissionRate,
              isActive: true,
              isAEPS: true
            });
            store.persistAll();

            if (balance > 0) {
              const isDual = name.toLowerCase().includes('digipay lite');
              if (isDual) {
                store.adjustBalance(activeDate, walletId + '_w2', balance, auth.currentUser ? auth.currentUser.name : 'System');
              } else {
                store.adjustBalance(activeDate, walletId, balance, auth.currentUser ? auth.currentUser.name : 'System');
              }
            }

            appInstance.showToast('AEPS Wallet registered successfully!', 'success');
            renderAEPS(mountPoint, appInstance);
            renderManageForm(null); // Refresh form and list
          }
        });

        // Edit row binders
        const editMwBtns = formMount.querySelectorAll('.btn-mw-edit');
        editMwBtns.forEach(btn => {
          btn.addEventListener('click', (event) => {
            const wId = event.currentTarget.getAttribute('data-id');
            const targetWallet = wallets.find(w => w.id === wId);
            if (targetWallet) {
              renderManageForm(targetWallet);
            }
          });
        });

        // Delete row binders
        const deleteMwBtns = formMount.querySelectorAll('.btn-mw-delete');
        deleteMwBtns.forEach(btn => {
          btn.addEventListener('click', (event) => {
            const wId = event.currentTarget.getAttribute('data-id');
            const targetWallet = wallets.find(w => w.id === wId);
            if (targetWallet && confirm(`Are you sure you want to delete ${targetWallet.name}? All its history balances will remain but the wallet will be unregistered.`)) {
              store.wallets = store.wallets.filter(w => w.id !== wId);
              store.persistAll();
              appInstance.showToast('Wallet deleted!', 'success');
              renderAEPS(mountPoint, appInstance);
              renderManageForm(null);
            }
          });
        });
      };

      renderManageForm(null);
      backdrop.classList.add('show');
    });
  }

  // Action Binders: Add Transaction
  const addTxnBtn = document.getElementById('btn-add-aeps-txn');
  if (addTxnBtn) {
    addTxnBtn.addEventListener('click', () => {
      document.getElementById('aeps-modal-title').innerText = 'Add Register Entry';
      
      let typeOptions = [];
      if (isDualWallet) {
        typeOptions = ['AEPS Withdrawal', 'MicroATM Withdrawal', 'Aadhaar Pay', 'DMT', 'Bank Cashout', 'Agent Authorisation', 'Wallet Transfer'];
      } else if (selectedWalletId === 'aeps_rr0re' || selectedWalletId === 'digipay') {
        typeOptions = ['AEPS Withdrawal', 'MicroATM Withdrawal', 'DMT', 'Bank Cashout', 'Agent Authorisation', 'CSC Top-up'];
      } else if (selectedWalletId === 'airtel_pb') {
        typeOptions = ['AEPS Withdrawal', 'MicroATM Withdrawal', 'DMT', 'Deposit', 'Account Opening', 'Bank Cashout', 'Agent Authorisation'];
      } else {
        typeOptions = ['AEPS Withdrawal', 'MicroATM Withdrawal', 'DMT', 'Deposit', 'Bank Cashout', 'Agent Authorisation'];
      }

      formMount.innerHTML = `
        <form id="form-add-register-txn">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Transaction Type</label>
              <select id="txn-type" class="form-control" required>
                ${typeOptions.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Amount (₹)</label>
              <input type="number" step="0.01" id="txn-amount" class="form-control" placeholder="0.00" required>
            </div>
          </div>

          <!-- Dynamic fields container -->
          <div id="dynamic-fields-container"></div>

          <div class="form-row">
            <div class="form-group" style="flex:1;" id="field-mobile-wrapper">
              <label class="form-label">Mobile Number</label>
              <input type="text" id="txn-mobile" class="form-control" placeholder="Customer mobile">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Status</label>
              <select id="txn-status" class="form-control">
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div class="form-row" id="field-paymethod-wrapper" style="display:none; margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Customer Payment Method</label>
              <select id="txn-paymethod" class="form-control">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div class="form-group" style="flex:1; display:none;" id="field-paybank-wrapper">
              <label class="form-label">Deposit Bank Account</label>
              <select id="txn-paybank" class="form-control">
                ${store.bankAccounts.map(b => `<option value="${b.id}">${b.name} (${b.bankName})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row" id="field-charges-wrapper">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Portal Service Charge (₹)</label>
              <input type="number" step="0.01" id="txn-svc" class="form-control" value="0.00" required>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Portal Commission (₹)</label>
              <input type="number" step="0.01" id="txn-comm" class="form-control" value="0.00" required>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">Add to Register</button>
            <button type="button" class="btn btn-secondary btn-cancel-modal">Cancel</button>
          </div>
        </form>
      `;

      const typeSelect = document.getElementById('txn-type');
      const dynamicFields = document.getElementById('dynamic-fields-container');
      const mobileWrapper = document.getElementById('field-mobile-wrapper');
      const chargesWrapper = document.getElementById('field-charges-wrapper');
      const paymethodWrapper = document.getElementById('field-paymethod-wrapper');
      const paybankWrapper = document.getElementById('field-paybank-wrapper');
      const paymethodSelect = document.getElementById('txn-paymethod');

      const updateFields = () => {
        const val = typeSelect.value;
        mobileWrapper.style.display = (val === 'Agent Authorisation' || val === 'Wallet Transfer') ? 'none' : 'block';
        chargesWrapper.style.display = (val === 'Wallet Transfer') ? 'none' : 'flex';
        
        const showPayMethod = (val === 'DMT' || val === 'Deposit' || val === 'Account Opening');
        paymethodWrapper.style.display = showPayMethod ? 'flex' : 'none';
        
        if (showPayMethod && paymethodSelect.value === 'UPI') {
          paybankWrapper.style.display = 'block';
        } else {
          paybankWrapper.style.display = 'none';
        }

        if (val === 'AEPS Withdrawal' || val === 'MicroATM Withdrawal' || val === 'Aadhaar Pay') {
          dynamicFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Customer Name</label>
              <input type="text" id="txn-cust-name" class="form-control" placeholder="Enter customer name" required>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:1;">
                <label class="form-label">Bank Name</label>
                <input type="text" id="txn-bank" list="banking-list" class="form-control" placeholder="e.g. SBI" required>
                <datalist id="banking-list">
                  <option value="State Bank of India">
                  <option value="Federal Bank">
                  <option value="Canara Bank">
                  <option value="Kerala Bank">
                  <option value="South Indian Bank">
                  <option value="Bank of Baroda">
                  <option value="HDFC Bank">
                  <option value="ICICI Bank">
                </datalist>
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">Aadhaar Last 4</label>
                <input type="text" id="txn-aadhaar" class="form-control" placeholder="e.g. 1234" maxlength="4">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">RRN/ID</label>
              <input type="text" id="txn-rrn" class="form-control" placeholder="Enter RRN reference ID" required>
            </div>
          `;
        } else if (val === 'DMT') {
          dynamicFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Receiver Name</label>
              <input type="text" id="txn-cust-name" class="form-control" placeholder="Recipient customer name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Recipient Bank Name</label>
              <input type="text" id="txn-bank" list="banking-list" class="form-control" placeholder="Recipient bank" required>
            </div>
            <div class="form-group">
              <label class="form-label">Transaction ID / RRN/ID</label>
              <input type="text" id="txn-rrn" class="form-control" placeholder="DMT reference ID">
            </div>
          `;
        } else if (val === 'Deposit' || val === 'Account Opening') {
          dynamicFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Customer Name</label>
              <input type="text" id="txn-cust-name" class="form-control" placeholder="Customer name" required>
            </div>
            ${val === 'Account Opening' ? `
              <div class="form-group">
                <label class="form-label">Aadhaar Last 4</label>
                <input type="text" id="txn-aadhaar" class="form-control" placeholder="e.g. 1234" maxlength="4">
              </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label">RRN/ID</label>
              <input type="text" id="txn-rrn" class="form-control" placeholder="Reference ID">
            </div>
          `;
        } else if (val === 'Wallet Transfer') {
          dynamicFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Transfer Direction</label>
              <select id="txn-direction" class="form-control" required>
                <option value="w2_to_w1">Wallet 2 (AEPS Payout) to Wallet 1 (DMT Only)</option>
                <option value="w1_to_w2">Wallet 1 (DMT Only) to Wallet 2 (AEPS Payout)</option>
              </select>
            </div>
          `;
        } else if (val === 'Bank Cashout') {
          dynamicFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Cashout Bank Account</label>
              <select id="txn-bank-id" class="form-control">
                ${store.bankAccounts.map(b => `<option value="${b.id}">${b.name} (${b.bankName})</option>`).join('')}
              </select>
            </div>
          `;
        } else if (val === 'Agent Authorisation') {
          dynamicFields.innerHTML = `
            <div style="font-size:11px; background:rgba(251,146,60,0.1); border:1px solid rgba(251,146,60,0.2); border-radius:6px; padding:10px; color:#fb923c; margin-bottom:12px;">
              Logs the daily biometric fingerprint authorization charge. This debit adjusts the wallet balance directly.
            </div>
          `;
        } else {
          dynamicFields.innerHTML = '';
        }
      };

      typeSelect.addEventListener('change', updateFields);
      paymethodSelect.addEventListener('change', () => {
        const val = typeSelect.value;
        const showPayMethod = (val === 'DMT' || val === 'Deposit' || val === 'Account Opening');
        if (showPayMethod && paymethodSelect.value === 'UPI') {
          paybankWrapper.style.display = 'block';
        } else {
          paybankWrapper.style.display = 'none';
        }
      });
      updateFields();

      formMount.querySelector('.btn-cancel-modal').addEventListener('click', closeModal);

      document.getElementById('form-add-register-txn').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = typeSelect.value;
        const amount = parseFloat(document.getElementById('txn-amount').value || 0);
        const mobile = document.getElementById('txn-mobile') ? document.getElementById('txn-mobile').value : '';
        const status = document.getElementById('txn-status').value;

        let direction = '';
        let bankId = '';
        let customerName = '';
        let bankName = '';
        let rrnNo = '';
        let aadhaar = '';
        let serviceCharge = 0;
        let commission = 0;
        let paymentMethod = 'Cash';

        if (type === 'Wallet Transfer') {
          direction = document.getElementById('txn-direction').value;
          customerName = 'Internal Transfer';
          bankName = 'Digipay Lite';
          rrnNo = 'IT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        } else if (type === 'Bank Cashout') {
          bankId = document.getElementById('txn-bank-id') ? document.getElementById('txn-bank-id').value : 'main_bob';
          const selectedBank = store.bankAccounts.find(b => b.id === bankId);
          customerName = 'Bank Cashout';
          bankName = selectedBank ? selectedBank.name : 'BOB A/C';
          rrnNo = 'CO-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        } else if (type === 'CSC Top-up') {
          customerName = 'CSC Wallet Top-up';
          bankName = 'CSC';
          rrnNo = 'CSC-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        } else if (type === 'Agent Authorisation') {
          customerName = 'Agent Auth';
          bankName = 'Biometric Fingerprint';
          rrnNo = 'AUTH-' + new Date().getTime().toString().slice(-6);
        } else {
          customerName = document.getElementById('txn-cust-name') ? document.getElementById('txn-cust-name').value : '';
          bankName = document.getElementById('txn-bank') ? document.getElementById('txn-bank').value : '';
          rrnNo = document.getElementById('txn-rrn') ? document.getElementById('txn-rrn').value : '';
          aadhaar = document.getElementById('txn-aadhaar') ? document.getElementById('txn-aadhaar').value : '';
        }

        if (type !== 'Wallet Transfer') {
          serviceCharge = parseFloat(document.getElementById('txn-svc').value || 0);
          commission = parseFloat(document.getElementById('txn-comm').value || 0);
        }

        const showPayMethod = (type === 'DMT' || type === 'Deposit' || type === 'Account Opening');
        if (showPayMethod) {
          paymentMethod = document.getElementById('txn-paymethod').value;
          if (paymentMethod === 'UPI') {
            bankId = document.getElementById('txn-paybank').value;
          }
        }

        store.addAepsTransaction({
          date: activeDate,
          walletId: selectedWalletId,
          direction,
          bankId,
          type,
          amount,
          mobile,
          status,
          customerName,
          bankName,
          rrnNo,
          aadhaar,
          serviceCharge,
          commission,
          paymentMethod
        });

        appInstance.showToast('Register row added successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });

      backdrop.classList.add('show');
    });
  }

  // Inter-transfer action (Digipay Lite special shortcut button)
  const interTransferBtn = document.getElementById('btn-inter-transfer');
  if (interTransferBtn) {
    interTransferBtn.addEventListener('click', () => {
      document.getElementById('aeps-modal-title').innerText = 'Inter-Wallet Transfer';
      formMount.innerHTML = `
        <form id="form-inter-transfer">
          <div class="form-group">
            <label class="form-label">Transfer Direction</label>
            <select id="it-direction" class="form-control" required>
              <option value="w2_to_w1">Wallet 2 (AEPS Payout) to Wallet 1 (DMT Only)</option>
              <option value="w1_to_w2">Wallet 1 (DMT Only) to Wallet 2 (AEPS Payout)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Transfer Amount (₹)</label>
            <input type="number" step="0.01" id="it-amount" class="form-control" placeholder="0.00" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">Confirm Transfer</button>
            <button type="button" class="btn btn-secondary btn-cancel-modal">Cancel</button>
          </div>
        </form>
      `;

      formMount.querySelector('.btn-cancel-modal').addEventListener('click', closeModal);

      document.getElementById('form-inter-transfer').addEventListener('submit', (e) => {
        e.preventDefault();
        const direction = document.getElementById('it-direction').value;
        const amount = parseFloat(document.getElementById('it-amount').value || 0);

        store.addAepsTransaction({
          date: activeDate,
          walletId: selectedWalletId,
          type: 'Wallet Transfer',
          direction,
          amount,
          status: 'Success',
          customerName: 'Internal Transfer',
          bankName: 'Digipay Lite',
          rrnNo: 'IT-' + Math.random().toString(36).substr(2, 5).toUpperCase()
        });

        appInstance.showToast('Inter-wallet transfer recorded!', 'success');
        closeModal();
        appInstance.handleRouting();
      });

      backdrop.classList.add('show');
    });
  }

  // Bank Cashout shortcut button binder
  const bindCashout = (btnEl) => {
    if (btnEl) {
      btnEl.addEventListener('click', () => {
        document.getElementById('aeps-modal-title').innerText = 'Bank Cashout';
        formMount.innerHTML = `
          <form id="form-bank-cashout">
            <div class="form-group">
              <label class="form-label">Cashout Amount (₹)</label>
              <input type="number" step="0.01" id="co-amount" class="form-control" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">Destination Bank Account</label>
              <select id="co-bank-id" class="form-control">
                ${store.bankAccounts.map(b => `<option value="${b.id}">${b.name} (${b.bankName})</option>`).join('')}
              </select>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
              <button type="submit" class="btn btn-primary" style="flex:1;">Confirm Cashout</button>
              <button type="button" class="btn btn-secondary btn-cancel-modal">Cancel</button>
            </div>
          </form>
        `;

        formMount.querySelector('.btn-cancel-modal').addEventListener('click', closeModal);

        document.getElementById('form-bank-cashout').addEventListener('submit', (e) => {
          e.preventDefault();
          const amount = parseFloat(document.getElementById('co-amount').value || 0);
          const bankId = document.getElementById('co-bank-id').value;
          const selectedBank = store.bankAccounts.find(b => b.id === bankId);

          store.addAepsTransaction({
            date: activeDate,
            walletId: selectedWalletId,
            bankId,
            type: 'Bank Cashout',
            amount,
            status: 'Success',
            customerName: 'Bank Cashout',
            bankName: selectedBank ? selectedBank.name : 'BOB A/C',
            rrnNo: 'CO-' + Math.random().toString(36).substr(2, 5).toUpperCase()
          });

          appInstance.showToast('Bank cashout recorded!', 'success');
          closeModal();
          appInstance.handleRouting();
        });

        backdrop.classList.add('show');
      });
    }
  };

  bindCashout(document.getElementById('btn-lite-cashout'));
  bindCashout(document.getElementById('btn-generic-cashout'));

  // CSC Top-up action (Digipay exclusive)
  const cscTopupBtn = document.getElementById('btn-csc-topup');
  if (cscTopupBtn) {
    cscTopupBtn.addEventListener('click', () => {
      document.getElementById('aeps-modal-title').innerText = 'CSC Wallet Top-up';
      formMount.innerHTML = `
        <form id="form-csc-topup">
          <div class="form-group">
            <label class="form-label">Top-up Amount (₹)</label>
            <input type="number" step="0.01" id="topup-amount" class="form-control" placeholder="0.00" required>
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">Confirm Top-up</button>
            <button type="button" class="btn btn-secondary btn-cancel-modal">Cancel</button>
          </div>
        </form>
      `;

      formMount.querySelector('.btn-cancel-modal').addEventListener('click', closeModal);

      document.getElementById('form-csc-topup').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('topup-amount').value || 0);

        store.addAepsTransaction({
          date: activeDate,
          walletId: selectedWalletId,
          type: 'CSC Top-up',
          amount,
          status: 'Success',
          customerName: 'CSC Wallet Top-up',
          bankName: 'CSC',
          rrnNo: 'CSC-' + Math.random().toString(36).substr(2, 5).toUpperCase()
        });

        appInstance.showToast('CSC wallet top-up recorded successfully!', 'success');
        closeModal();
        appInstance.handleRouting();
      });

      backdrop.classList.add('show');
    });
  }
}

export default renderAEPS;
