/* ==========================================================================
   CYBERONE Center Management Platform - Staff & Payroll View (views/payroll.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderPayroll(mountPoint, appInstance) {
  const staff = store.staff;
  const activeDate = appInstance.getActiveDate();

  // Determine default month
  const activeDay = parseInt(activeDate.substring(8, 10));
  const activeYear = parseInt(activeDate.substring(0, 4));
  const activeMonthNum = parseInt(activeDate.substring(5, 7));

  let defaultMonth = activeDate.substring(0, 7);
  if (activeDay <= 10) {
    let prevMonth = activeMonthNum - 1;
    let prevYear = activeYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = activeYear - 1;
    }
    const prevMonthStr = prevMonth < 10 ? '0' + prevMonth : '' + prevMonth;
    defaultMonth = `${prevYear}-${prevMonthStr}`;
  }

  // Load selected month from localStorage or fallback to default
  let selectedMonth = localStorage.getItem('cyberone_payroll_selected_month') || defaultMonth;

  // Build last 6 months options dynamically
  const monthOptions = [];
  for (let i = 0; i < 6; i++) {
    let m = activeMonthNum - i;
    let y = activeYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const mStr = m < 10 ? '0' + m : '' + m;
    const value = `${y}-${mStr}`;
    const dateObj = new Date(y, m - 1, 2);
    const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  // Ensure selectedMonth is valid, otherwise use default
  if (!monthOptions.find(opt => opt.value === selectedMonth)) {
    selectedMonth = defaultMonth;
  }
  localStorage.setItem('cyberone_payroll_selected_month', selectedMonth);

  // Load attendance data from local storage for the selected month
  const attendanceKey = `attendance_${selectedMonth}`;
  let attendance = JSON.parse(localStorage.getItem(attendanceKey)) || {};

  // Mock initial attendance if empty
  if (Object.keys(attendance).length === 0) {
    staff.forEach(s => {
      attendance[s.id] = 26; // Default to 26 working days present
    });
    localStorage.setItem(attendanceKey, JSON.stringify(attendance));
  }

  mountPoint.innerHTML = `
    <!-- Top tabs for Staff List, Attendance, and Payout slips + Month Selector -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid var(--panel-border); flex-wrap: wrap; gap: 15px;">
      <div style="display: flex; gap: 10px;">
        <button id="btn-tab-staff" class="btn btn-sm btn-primary payroll-tab" data-target="staff-pane">Staff Members</button>
        <button id="btn-tab-attend" class="btn btn-sm btn-secondary payroll-tab" data-target="attendance-pane">Monthly Attendance</button>
        <button id="btn-tab-payouts" class="btn btn-sm btn-secondary payroll-tab" data-target="payouts-pane">Generate Salary Bills</button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label for="payroll-month-select" style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Salary Month:</label>
        <select id="payroll-month-select" style="background: var(--datepicker-bg); border: 1px solid var(--panel-border); color: var(--text-white-invert); font-size: 13px; padding: 6px 12px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; font-family: inherit;">
          ${monthOptions.map(opt => `<option value="${opt.value}" ${opt.value === selectedMonth ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- PANE 1: Staff Directory -->
    <div id="staff-pane" class="payroll-pane">
      <div class="glass-card" style="padding:0; overflow:hidden;">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Designation Role</th>
                <th>Phone Number</th>
                <th>Monthly Base Salary</th>
                <th>Status</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staff.map(s => `
                <tr>
                  <td><code>${s.id}</code></td>
                  <td><strong>${s.name}</strong></td>
                  <td style="text-transform: capitalize;">${s.role}</td>
                  <td>${s.phone}</td>
                  <td style="font-weight: 700;">₹${s.baseSalary.toLocaleString('en-IN')}</td>
                  <td>
                    <span class="badge ${s.isActive ? 'sale' : 'expense'}">${s.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-sm btn-secondary" onclick="alert('Phone: ${s.phone}\\nStatus: Active employee')" style="padding: 4px;">
                      <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PANE 2: Attendance Tracker -->
    <div id="attendance-pane" class="payroll-pane" style="display:none;">
      <div class="glass-card" style="padding: 24px; max-width: 500px;">
        <div class="section-header" style="margin-bottom: 15px;">
          <h3>Log Working Days Present</h3>
          <span style="font-size:12px; color:var(--text-muted);">${new Date(activeDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        </div>
        
        <form id="form-attendance">
          ${staff.map(s => `
            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--bg-card-medium); padding-bottom:10px; margin-bottom:10px;">
              <div>
                <strong style="font-size:14px; display:block;">${s.name}</strong>
                <span style="font-size:11px; color:var(--text-dimmed); text-transform:capitalize;">${s.role}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" class="form-control attendance-input" data-id="${s.id}" value="${attendance[s.id] || 26}" min="0" max="31" style="width: 80px; text-align:center;">
                <span style="font-size:12px; color:var(--text-muted);">days</span>
              </div>
            </div>
          `).join('')}

          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">
            <i data-lucide="save" style="width:16px; height:16px;"></i> Save Attendance Records
          </button>
        </form>
      </div>
    </div>

    <!-- PANE 3: Payout slips / bill generator -->
    <div id="payouts-pane" class="payroll-pane" style="display:none;">
      <div class="glass-card" style="padding:0; overflow:hidden;">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Present Days</th>
                <th>Calculated Base (30 days)</th>                 <th>Performance Incentive</th>
                <th>Deductions</th>
                <th>Net Salary Payable</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staff.map(s => {
                const days = attendance[s.id] || 26;
                const basePay = parseFloat(((s.baseSalary / 30) * days).toFixed(2));
                
                // Get month performance metrics & suggestion
                const metrics = store.getStaffPerformanceMetrics(s.id, selectedMonth);
                const bonus = metrics.totalSuggestedIncentive;

                const deductions = 0;
                const netPay = basePay + bonus - deductions;

                // Check if salary has already been issued for this employee for the selected month
                let isPaid = false;
                let paidTxn = null;
                Object.keys(store.dailyLogs).forEach(date => {
                  const log = store.dailyLogs[date];
                  const found = log.transactions.find(t => 
                    (t.type === 'expense' || t.type === 'salary') && 
                    t.description === `Salary payout: ${s.name}` &&
                    ((t.salaryDetails && t.salaryDetails.month === selectedMonth) || (!t.salaryDetails && date.startsWith(selectedMonth)))
                  );
                  if (found) {
                    isPaid = true;
                    paidTxn = found;
                  }
                });

                return `
                  <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${days} / 30</td>
                    <td>₹${basePay.toLocaleString('en-IN')}</td>
                    <td style="color: var(--color-success);">+₹${bonus.toLocaleString('en-IN')} <small style="color:var(--text-dimmed);">(${metrics.appCount} files)</small></td>
                    <td style="color: var(--color-danger);">-₹${deductions}</td>
                    <td style="font-weight: 700; color: var(--color-info);">₹${netPay.toLocaleString('en-IN')}</td>
                    <td style="text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                        <button class="btn btn-sm btn-primary btn-pay-salary" data-id="${s.id}" data-net="${netPay}" data-name="${s.name}">
                          <i data-lucide="dollar-sign" style="width: 12px; height: 12px; margin-right: 4px;"></i> Issue Pay
                        </button>
                        ${isPaid ? `
                          <button class="btn btn-sm btn-view-issued-slip" data-id="${s.id}" data-net="${paidTxn.amount}" data-date="${paidTxn.date || activeDate}" data-details='${JSON.stringify(paidTxn.salaryDetails || { days, proRata: basePay, bonus, deductions })}' style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.25); color: var(--color-success); display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;">
                            <i data-lucide="file-text" style="width: 12px; height: 12px;"></i> View Slip
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <!-- Pay Slip Print Modal -->
    <div id="payroll-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 600px; max-height: 95vh; display: flex; flex-direction: column; overflow: hidden; padding: 20px; box-sizing: border-box;">
        <div class="modal-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom:10px; flex-shrink: 0; margin-bottom: 15px;">
          <h4 style="font-family:var(--font-display);">Salary Payslip / Bill</h4>
          <button id="payroll-modal-close" class="modal-close">&times;</button>
        </div>
        
        <!-- Print Area (Scrollable) -->
        <div id="payroll-slip-print" class="preview-normal" style="overflow-y: auto; flex-grow: 1; padding-right: 5px; margin-bottom: 15px; border: 1px solid var(--panel-border); border-radius: var(--border-radius-sm); padding: 15px; background: var(--bg-card-transparent);">
          <!-- Slips will render here -->
        </div>

        <!-- Footer Actions (Fixed at bottom) -->
        <div class="no-print" style="flex-shrink: 0; border-top: 1px solid var(--panel-border); padding-top: 15px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Print Layout:</span>
            <div style="display:flex; gap:5px;">
              <button id="btn-slip-format-normal" class="btn btn-xs btn-primary" style="font-size:10px; padding: 4px 8px;">A4 Normal</button>
              <button id="btn-slip-format-thermal" class="btn btn-xs btn-secondary" style="font-size:10px; padding: 4px 8px;">80mm Thermal</button>
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap: wrap;">
            <button id="btn-print-slip" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="printer" style="width:16px; height:16px;"></i> Print
            </button>
            <button id="btn-download-slip" class="btn btn-secondary" style="flex-grow:1;">
              <i data-lucide="download" style="width:16px; height:16px;"></i> Download PDF
            </button>
            <button id="btn-whatsapp-slip" class="btn btn-secondary" style="flex-grow:1; background: #16a34a; border-color: #16a34a; color: var(--text-white-invert); display: inline-flex; align-items: center; gap: 6px;">
              <i data-lucide="message-square" style="width:16px; height:16px;"></i> WhatsApp
            </button>
            <button id="btn-close-slip" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Salary Bill Editor Modal -->
    <div id="payout-editor-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 600px; max-height: 95vh; display: flex; flex-direction: column; overflow: hidden; padding: 20px;">
        <div class="modal-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom:10px; flex-shrink: 0; margin-bottom: 15px;">
          <h4 style="font-family:var(--font-display);">Edit Salary Bill</h4>
          <button id="payout-editor-close" class="modal-close">&times;</button>
        </div>
        <form id="form-edit-salary" style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
          <div style="overflow-y: auto; flex-grow: 1; padding-right: 5px; margin-bottom: 15px;">
            <div class="form-group">
              <label class="form-label">Employee Name</label>
              <input type="text" id="edit-salary-name" class="form-control" readonly style="background: var(--bg-card-heavy); color: var(--text-white-invert);">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Working Days Present</label>
                <input type="number" id="edit-salary-days" class="form-control" min="0" max="31">
              </div>
              <div class="form-group">
                <label class="form-label">Base Salary (Full Month) (₹)</label>
                <input type="number" id="edit-salary-base" class="form-control" readonly style="background: var(--bg-card-heavy); color: var(--text-white-invert);">
              </div>
            </div>
            
            <div style="margin: 15px 0 10px 0; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px; font-weight: 700; font-size: 13px; color: var(--color-success);">EARNINGS ADDITIONS</div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Calculated Pro-rata Salary (₹)</label>
                <input type="number" id="edit-salary-prorata" class="form-control" step="0.01">
              </div>
              <div class="form-group">
                <label class="form-label">Performance Incentive (₹)</label>
                <input type="number" id="edit-salary-bonus" class="form-control" step="0.01">
                <div id="edit-salary-incentive-breakdown" style="font-size: 10px; color: var(--color-success); margin-top: 4px; line-height: 1.3;"></div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">HRA (House Rent) (₹)</label>
                <input type="number" id="edit-salary-hra" class="form-control" step="0.01" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Medical Allowance (₹)</label>
                <input type="number" id="edit-salary-medical" class="form-control" step="0.01" value="0.00">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Special Bonus / Other (₹)</label>
                <input type="number" id="edit-salary-special" class="form-control" step="0.01" value="0.00">
              </div>
              <div class="form-group" style="visibility: hidden;">
                <!-- placeholder grid -->
              </div>
            </div>

            <div style="margin: 15px 0 10px 0; border-bottom: 1px solid var(--panel-border); padding-bottom: 4px; font-weight: 700; font-size: 13px; color: var(--color-danger);">DEDUCTIONS SUBTRACTIONS</div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Provident Fund (PF) (₹)</label>
                <input type="number" id="edit-salary-pf" class="form-control" step="0.01" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">ESI Contribution (₹)</label>
                <input type="number" id="edit-salary-esi" class="form-control" step="0.01" value="0.00">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Professional Tax (₹)</label>
                <input type="number" id="edit-salary-proftax" class="form-control" step="0.01" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Salary Advance / Loan (₹)</label>
                <input type="number" id="edit-salary-advance" class="form-control" step="0.01" value="0.00">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Other Deductions (₹)</label>
                <input type="number" id="edit-salary-deductions" class="form-control" step="0.01" value="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Net Salary Payable (₹)</label>
                <input type="number" id="edit-salary-net" class="form-control" readonly style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-weight: 700;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 15px;">
              <label class="form-label">Payment Source</label>
              <select id="edit-salary-source" class="form-control" style="background: var(--bg-card-heavy); color: var(--text-white-invert); border: 1px solid var(--panel-border); outline: none;">
                <option value="cash">Cash In Hand (Physical Cash)</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="account">Bank Account (UPI / Transfer)</option>
              </select>
            </div>
          </div>
          
          <div style="display:flex; gap:10px; border-top: 1px solid var(--panel-border); padding-top: 15px; flex-shrink: 0;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Approve & Issue
            </button>
            <button type="button" class="btn btn-secondary btn-editor-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Employee Payroll & Attendance';
  const dateObj = new Date(selectedMonth + '-02');
  const formattedMonthLabel = isNaN(dateObj.getTime()) ? selectedMonth : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('page-heading-sub').innerText = `Staff roster management and salary bill calculations for ${formattedMonthLabel}`;

  // Month Select change handler
  const monthSelect = document.getElementById('payroll-month-select');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      localStorage.setItem('cyberone_payroll_selected_month', e.target.value);
      appInstance.handleRouting();
    });
  }

  lucide.createIcons();

  // Tabs navigation
  const tabBtns = document.querySelectorAll('.payroll-tab');
  const panes = document.querySelectorAll('.payroll-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => {
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

  // Attendance Save form submit
  document.getElementById('form-attendance').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = document.querySelectorAll('.attendance-input');
    
    inputs.forEach(input => {
      const staffId = input.getAttribute('data-id');
      attendance[staffId] = parseInt(input.value || 0);
    });

    localStorage.setItem(attendanceKey, JSON.stringify(attendance));
    appInstance.showToast('Attendance records saved successfully!', 'success');
    appInstance.handleRouting();
  });

  // Modals backdrop and selectors
  const slipBackdrop = document.getElementById('payroll-modal-backdrop');
  const editorBackdrop = document.getElementById('payout-editor-modal-backdrop');
  const printSlipDiv = document.getElementById('payroll-slip-print');
  const payButtons = document.querySelectorAll('.btn-pay-salary');

  // Close helper
  const closeAllModals = () => {
    slipBackdrop.classList.remove('show');
    editorBackdrop.classList.remove('show');
  };
  
  document.getElementById('payroll-modal-close').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-slip').addEventListener('click', closeAllModals);
  document.getElementById('payout-editor-close').addEventListener('click', closeAllModals);
  
  const btnEditorCancel = document.querySelector('#payout-editor-modal-backdrop .btn-editor-cancel');
  if (btnEditorCancel) {
    btnEditorCancel.addEventListener('click', closeAllModals);
  }

  // Active payout parameters
  let activeStaffId = null;

  payButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const staffId = e.currentTarget.getAttribute('data-id');
      const staffName = e.currentTarget.getAttribute('data-name');
      const employee = staff.find(s => s.id === staffId);
      if (!employee) return;

      activeStaffId = staffId;

      const days = attendance[staffId] || 26;
      const basePay = parseFloat(((employee.baseSalary / 30) * days).toFixed(2));
      const metrics = store.getStaffPerformanceMetrics(staffId, selectedMonth);
      const bonus = metrics.totalSuggestedIncentive;
      const deductions = 0;

      // Populate editor form inputs
      document.getElementById('edit-salary-name').value = staffName;
      document.getElementById('edit-salary-days').value = days;
      document.getElementById('edit-salary-base').value = employee.baseSalary;
      document.getElementById('edit-salary-prorata').value = basePay;
      document.getElementById('edit-salary-bonus').value = bonus;
      
      document.getElementById('edit-salary-incentive-breakdown').innerHTML = 
        `Suggested Breakdown:<br>` +
        `• G2C Tiered: ₹${metrics.g2cIncentive.toFixed(2)} (${metrics.appCount} files)<br>` +
        `• Sales Comm (5%): ₹${metrics.salesComm.toFixed(2)} (SC ₹${metrics.scVolume.toFixed(2)})<br>` +
        `• AEPS Sharing (10%): ₹${metrics.aepsCommShare.toFixed(2)}`;
      
      // Reset new Zoho fields to 0.00
      document.getElementById('edit-salary-hra').value = "0.00";
      document.getElementById('edit-salary-medical').value = "0.00";
      document.getElementById('edit-salary-special').value = "0.00";
      document.getElementById('edit-salary-pf').value = "0.00";
      document.getElementById('edit-salary-esi').value = "0.00";
      document.getElementById('edit-salary-proftax').value = "0.00";
      document.getElementById('edit-salary-advance').value = "0.00";

      document.getElementById('edit-salary-deductions').value = deductions.toFixed(2);
      document.getElementById('edit-salary-net').value = (basePay + bonus - deductions).toFixed(2);

      editorBackdrop.classList.add('show');
    });
  });

  // Editor form inputs listeners for live updates
  const updateNetPayable = () => {
    const proRata = parseFloat(document.getElementById('edit-salary-prorata').value || 0);
    const bonus = parseFloat(document.getElementById('edit-salary-bonus').value || 0);
    const hra = parseFloat(document.getElementById('edit-salary-hra').value || 0);
    const medical = parseFloat(document.getElementById('edit-salary-medical').value || 0);
    const special = parseFloat(document.getElementById('edit-salary-special').value || 0);

    const pf = parseFloat(document.getElementById('edit-salary-pf').value || 0);
    const esi = parseFloat(document.getElementById('edit-salary-esi').value || 0);
    const proftax = parseFloat(document.getElementById('edit-salary-proftax').value || 0);
    const advance = parseFloat(document.getElementById('edit-salary-advance').value || 0);
    const deductions = parseFloat(document.getElementById('edit-salary-deductions').value || 0);

    const gross = proRata + bonus + hra + medical + special;
    const totalDeductions = pf + esi + proftax + advance + deductions;
    const net = gross - totalDeductions;
    document.getElementById('edit-salary-net').value = net.toFixed(2);
  };

  document.getElementById('edit-salary-days').addEventListener('input', (e) => {
    const days = parseInt(e.target.value || 0);
    const base = parseFloat(document.getElementById('edit-salary-base').value || 0);
    const proRataVal = parseFloat(((base / 30) * days).toFixed(2));
    document.getElementById('edit-salary-prorata').value = proRataVal;
    updateNetPayable();
  });

  document.getElementById('edit-salary-prorata').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-bonus').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-hra').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-medical').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-special').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-pf').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-esi').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-proftax').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-advance').addEventListener('input', updateNetPayable);
  document.getElementById('edit-salary-deductions').addEventListener('input', updateNetPayable);

  // Bind click on view slip buttons
  document.querySelectorAll('.btn-view-issued-slip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const staffId = e.currentTarget.getAttribute('data-id');
      const employee = staff.find(s => s.id === staffId);
      if (!employee) return;

      const dateVal = e.currentTarget.getAttribute('data-date');
      const details = JSON.parse(e.currentTarget.getAttribute('data-details'));
      const netPay = parseFloat(e.currentTarget.getAttribute('data-net'));

      showPayslip(employee, dateVal, details.days, details.proRata, details.bonus, details.deductions, netPay, details.month, details);
    });
  });

  const showPayslip = (employee, dateString, daysVal, proRataVal, bonusVal, deductionsVal, netPayVal, targetMonth, extraDetails = {}) => {
    const staffName = employee.name;
    const staffId = employee.id;
    const printMonth = targetMonth || (dateString ? dateString.substring(0, 7) : selectedMonth);
    const dateObj = new Date(printMonth + '-02');
    const monthLabel = isNaN(dateObj.getTime()) ? printMonth : dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthStr = printMonth;

    const hraVal = parseFloat(extraDetails.hra || 0);
    const medicalVal = parseFloat(extraDetails.medical || 0);
    const specialVal = parseFloat(extraDetails.special || 0);
    const pfVal = parseFloat(extraDetails.pf || 0);
    const esiVal = parseFloat(extraDetails.esi || 0);
    const proftaxVal = parseFloat(extraDetails.profTax || 0);
    const advanceVal = parseFloat(extraDetails.advance || 0);
    const otherDeductionsVal = parseFloat(extraDetails.otherDeductions || deductionsVal || 0);

    const grossVal = proRataVal + hraVal + medicalVal + bonusVal + specialVal;
    const totalDeductionsVal = pfVal + esiVal + proftaxVal + advanceVal + otherDeductionsVal;

    // Render physical slip layout inside modal
    printSlipDiv.innerHTML = `
      <div class="receipt-header">
        <div class="header-left">
          <img class="receipt-logo" src="${localStorage.getItem('cyberone_v2_custom_logo') || './logo.png'}" alt="logo" onerror="this.style.display='none';">
          <div class="company-info">
            <h3>${store.centerProfile.name}</h3>
            <p>Center Code: ${store.centerProfile.code}</p>
            <p>${store.centerProfile.address}, ${store.centerProfile.city}, ${store.centerProfile.state} - ${store.centerProfile.pin}</p>
            <p>Mob: ${store.centerProfile.mobile}</p>
          </div>
        </div>
        <div class="header-right">
          <h2 class="doc-type-title">Payslip & Voucher</h2>
          <table class="meta-details-table">
            <tr>
              <td>Voucher No:</td>
              <td><code>SAL-${staffId}-${currentMonthStr.replace('-', '')}</code></td>
            </tr>
            <tr>
              <td>Employee:</td>
              <td>${staffName}</td>
            </tr>
            <tr>
              <td>Designation:</td>
              <td style="text-transform:capitalize;">${employee.role}</td>
            </tr>
            <tr>
              <td>Salary Month:</td>
              <td>${monthLabel}</td>
            </tr>
            <tr>
              <td>Attendance:</td>
              <td>${daysVal} / 30 days</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 12px 0; margin-bottom: 25px;">
        <div style="display: flex; gap: 20px; font-size: 11px;" class="receipt-split-columns">
          <!-- Left Column: Earnings -->
          <div style="flex: 1; border-right: 1px solid #ddd; padding-right: 15px;" class="receipt-col-earnings">
            <h4 style="margin: 0 0 8px 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-size: 12px; color: var(--color-success);">EARNINGS</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;">Basic Pro-rata (30d base)</td>
                <td style="padding: 4px 0; text-align:right;">₹${proRataVal.toFixed(2)}</td>
              </tr>
              ${hraVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">HRA (House Rent)</td>
                <td style="padding: 4px 0; text-align:right;">₹${hraVal.toFixed(2)}</td>
              </tr>` : ''}
              ${medicalVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Medical Allowance</td>
                <td style="padding: 4px 0; text-align:right;">₹${medicalVal.toFixed(2)}</td>
              </tr>` : ''}
              ${bonusVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">G2C Service Incentive</td>
                <td style="padding: 4px 0; text-align:right;">₹${bonusVal.toFixed(2)}</td>
              </tr>` : ''}
              ${specialVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Special Bonus / Other</td>
                <td style="padding: 4px 0; text-align:right;">₹${specialVal.toFixed(2)}</td>
              </tr>` : ''}
              <tr style="font-weight:700; border-top: 1px solid #eee;">
                <td style="padding: 6px 0; padding-top: 8px;">Gross Earnings</td>
                <td style="padding: 6px 0; padding-top: 8px; text-align:right;">₹${grossVal.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Right Column: Deductions -->
          <div style="flex: 1; padding-left: 5px;" class="receipt-col-deductions">
            <h4 style="margin: 0 0 8px 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-size: 12px; color: var(--color-danger);">DEDUCTIONS</h4>
            <table style="width: 100%; border-collapse: collapse;">
              ${pfVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Provident Fund (PF)</td>
                <td style="padding: 4px 0; text-align:right;">₹${pfVal.toFixed(2)}</td>
              </tr>` : ''}
              ${esiVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">ESI Health Contrib.</td>
                <td style="padding: 4px 0; text-align:right;">₹${esiVal.toFixed(2)}</td>
              </tr>` : ''}
              ${proftaxVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Professional Tax</td>
                <td style="padding: 4px 0; text-align:right;">₹${proftaxVal.toFixed(2)}</td>
              </tr>` : ''}
              ${advanceVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Salary Advance</td>
                <td style="padding: 4px 0; text-align:right;">₹${advanceVal.toFixed(2)}</td>
              </tr>` : ''}
              ${otherDeductionsVal > 0 ? `
              <tr>
                <td style="padding: 4px 0;">Other Deductions</td>
                <td style="padding: 4px 0; text-align:right;">₹${otherDeductionsVal.toFixed(2)}</td>
              </tr>` : ''}
              ${(pfVal + esiVal + proftaxVal + advanceVal + otherDeductionsVal === 0) ? `
              <tr>
                <td colspan="2" style="padding: 10px 0; text-align: center; color: var(--text-dimmed); font-style: italic;">No deductions this month</td>
              </tr>` : ''}
              <tr style="font-weight:700; border-top: 1px solid #eee;">
                <td style="padding: 6px 0; padding-top: 8px;">Total Deductions</td>
                <td style="padding: 6px 0; padding-top: 8px; text-align:right;">₹${totalDeductionsVal.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 13px;">Net Cash Payout:</span>
          <span style="font-weight: 700; font-size: 15px; color: #06b6d4;">₹${netPayVal.toFixed(2)}</span>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; font-size: 10px; margin-top:40px;">
        <div style="border-top:1px solid #666; width: 120px; text-align:center; padding-top:4px;">Receiver's Signature</div>
        <div style="border-top:1px solid #666; width: 120px; text-align:center; padding-top:4px;">Center Manager</div>
      </div>
    `;

    // Show slip preview
    slipBackdrop.classList.add('show');
    lucide.createIcons();

    // Bind layout togglers and printer triggers for slips
    let slipPrintFormat = 'normal';
    const btnSlipNormal = document.getElementById('btn-slip-format-normal');
    const btnSlipThermal = document.getElementById('btn-slip-format-thermal');
    const slipContainer = document.getElementById('payroll-slip-print');

    btnSlipNormal.onclick = () => {
      slipPrintFormat = 'normal';
      slipContainer.className = 'preview-normal';
      btnSlipNormal.classList.replace('btn-secondary', 'btn-primary');
      btnSlipThermal.classList.replace('btn-primary', 'btn-secondary');
    };

    btnSlipThermal.onclick = () => {
      slipPrintFormat = 'thermal';
      slipContainer.className = 'preview-thermal';
      btnSlipThermal.classList.replace('btn-secondary', 'btn-primary');
      btnSlipNormal.classList.replace('btn-primary', 'btn-secondary');
    };

    // Print Payslip
    document.getElementById('btn-print-slip').onclick = () => {
      appInstance.printElement(slipPrintFormat);
    };

    // Download Payslip
    document.getElementById('btn-download-slip').onclick = () => {
      appInstance.downloadElementAsPDF('payroll-slip-print', `Payslip_${staffName}_${currentMonthStr}.pdf`, slipPrintFormat === 'thermal');
    };

    // Send Payslip to WhatsApp
    document.getElementById('btn-whatsapp-slip').onclick = () => {
      const rawPhone = employee.phone || '';
      const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits;
      
      const slipMsg = `*CYBERONE CSC - SALARY PAYSLIP*\n` +
                      `*Month:* ${monthLabel}\n` +
                      `*Employee:* ${staffName} (${employee.role})\n` +
                      `*Attendance:* ${daysVal} / 30 days\n` +
                      `---------------------------------\n` +
                      `Basic Pro-rata Pay: ₹${proRataVal.toFixed(2)}\n` +
                      `Service Incentive Bonus: +₹${bonusVal.toFixed(2)}\n` +
                      `Tax / Deductions: -₹${deductionsVal.toFixed(2)}\n` +
                      `---------------------------------\n` +
                      `*Net Salary Paid: ₹${netPayVal.toFixed(2)}*\n` +
                      `---------------------------------\n` +
                      `Voucher No: SAL-${staffId}-${currentMonthStr.replace('-', '')}\n` +
                      `Thank you for your dedicated service!`;
                      
      window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(slipMsg)}`, '_blank');
    };
  };

  // Handle editor form submission
  document.getElementById('form-edit-salary').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeStaffId) return;

    const employee = staff.find(s => s.id === activeStaffId);
    if (!employee) return;

    const staffName = employee.name;
    const daysVal = parseInt(document.getElementById('edit-salary-days').value || 0);
    const proRataVal = parseFloat(document.getElementById('edit-salary-prorata').value || 0);
    const bonusVal = parseFloat(document.getElementById('edit-salary-bonus').value || 0);
    
    const hraVal = parseFloat(document.getElementById('edit-salary-hra').value || 0);
    const medicalVal = parseFloat(document.getElementById('edit-salary-medical').value || 0);
    const specialVal = parseFloat(document.getElementById('edit-salary-special').value || 0);
    const pfVal = parseFloat(document.getElementById('edit-salary-pf').value || 0);
    const esiVal = parseFloat(document.getElementById('edit-salary-esi').value || 0);
    const proftaxVal = parseFloat(document.getElementById('edit-salary-proftax').value || 0);
    const advanceVal = parseFloat(document.getElementById('edit-salary-advance').value || 0);
    const deductionsVal = parseFloat(document.getElementById('edit-salary-deductions').value || 0);
    
    const netPayVal = parseFloat(document.getElementById('edit-salary-net').value || 0);

    const extraDetailsObj = {
      month: selectedMonth,
      days: daysVal,
      proRata: proRataVal,
      bonus: bonusVal,
      hra: hraVal,
      medical: medicalVal,
      special: specialVal,
      pf: pfVal,
      esi: esiVal,
      profTax: proftaxVal,
      advance: advanceVal,
      otherDeductions: deductionsVal,
      deductions: deductionsVal
    };

    // Save transaction to store
    store.addTransaction(activeDate, {
      type: 'expense',
      description: `Salary payout: ${staffName}`,
      amount: netPayVal,
      category: 'Salary',
      source: document.getElementById('edit-salary-source').value || 'cash',
      salaryDetails: extraDetailsObj
    });

    appInstance.showToast(`Salary payment logged for ${staffName}`, 'success');

    // Close editor
    editorBackdrop.classList.remove('show');

    // Render physical slip layout inside modal
    showPayslip(employee, activeDate, daysVal, proRataVal, bonusVal, deductionsVal, netPayVal, selectedMonth, extraDetailsObj);
    
    // Refresh page details to draw the View Slip button immediately
    appInstance.handleRouting();
  });
}

export default renderPayroll;

