/* ==========================================================================
   CYBERONE Center Management Platform - Staff & Payroll View (views/payroll.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderPayroll(mountPoint, appInstance) {
  const staff = store.staff;
  const activeDate = appInstance.getActiveDate();
  const currentMonth = activeDate.substring(0, 7); // Format: "YYYY-MM"

  // Load attendance data from local storage (or mock it)
  const attendanceKey = `attendance_${currentMonth}`;
  let attendance = JSON.parse(localStorage.getItem(attendanceKey)) || {};

  // Mock initial attendance if empty
  if (Object.keys(attendance).length === 0) {
    staff.forEach(s => {
      attendance[s.id] = 26; // Default to 26 working days present
    });
    localStorage.setItem(attendanceKey, JSON.stringify(attendance));
  }

  mountPoint.innerHTML = `
    <!-- Top tabs for Staff List, Attendance, and Payout slips -->
    <div style="display: flex; gap: 10px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid var(--panel-border);">
      <button id="btn-tab-staff" class="btn btn-sm btn-primary payroll-tab" data-target="staff-pane">Staff Members</button>
      <button id="btn-tab-attend" class="btn btn-sm btn-secondary payroll-tab" data-target="attendance-pane">Monthly Attendance</button>
      <button id="btn-tab-payouts" class="btn btn-sm btn-secondary payroll-tab" data-target="payouts-pane">Generate Salary Bills</button>
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
                <th>Calculated Base (30 days)</th>
                <th>CYBER ONE Service Bonus</th>
                <th>Deductions</th>
                <th>Net Salary Payable</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staff.map(s => {
                const days = attendance[s.id] || 26;
                const basePay = parseFloat(((s.baseSalary / 30) * days).toFixed(2));
                
                // e-District applications processed bonus
                const processedApps = store.applications.filter(a => a.assignedStaffId === s.id).length;
                const bonus = processedApps * 10; // ₹10 incentive per G2C file

                const deductions = 0;
                const netPay = basePay + bonus - deductions;

                // Check if salary has already been issued for this employee in the current month
                let isPaid = false;
                let paidTxn = null;
                Object.keys(store.dailyLogs).forEach(date => {
                  if (date.startsWith(currentMonth)) {
                    const log = store.dailyLogs[date];
                    const found = log.transactions.find(t => 
                      (t.type === 'expense' || t.type === 'salary') && 
                      t.description === `Salary payout: ${s.name}`
                    );
                    if (found) {
                      isPaid = true;
                      paidTxn = found;
                    }
                  }
                });

                return `
                  <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${days} / 30</td>
                    <td>₹${basePay.toLocaleString('en-IN')}</td>
                    <td style="color: var(--color-success);">+₹${bonus} <small style="color:var(--text-dimmed);">(${processedApps} apps)</small></td>
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
    </div>

    <!-- Pay Slip Print Modal -->
    <div id="payroll-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom:10px;">
          <h4 style="font-family:var(--font-display);">Salary Payslip / Bill</h4>
          <button id="payroll-modal-close" class="modal-close">&times;</button>
        </div>
        
        <!-- Print Area -->
        <div id="payroll-slip-print" class="preview-normal">
          <!-- Slips will render here -->
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid #ddd; padding-top:15px;" class="no-print">
          <span style="font-size:12px; color:#555; font-weight:600;">Print Layout:</span>
          <div style="display:flex; gap:5px;">
            <button id="btn-slip-format-normal" class="btn btn-xs btn-primary" style="font-size:10px; padding: 4px 8px;">A4 Normal</button>
            <button id="btn-slip-format-thermal" class="btn btn-xs btn-secondary" style="font-size:10px; padding: 4px 8px;">80mm Thermal</button>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px; flex-wrap: wrap;" class="no-print">
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

    <!-- Salary Bill Editor Modal -->
    <div id="payout-editor-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" style="max-width: 500px;">
        <div class="modal-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom:10px;">
          <h4 style="font-family:var(--font-display);">Edit Salary Bill</h4>
          <button id="payout-editor-close" class="modal-close">&times;</button>
        </div>
        <form id="form-edit-salary">
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
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Calculated Pro-rata Salary (₹)</label>
              <input type="number" id="edit-salary-prorata" class="form-control" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Service Incentive Bonus (₹)</label>
              <input type="number" id="edit-salary-bonus" class="form-control" step="0.01">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tax / Deductions (₹)</label>
              <input type="number" id="edit-salary-deductions" class="form-control" step="0.01" value="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">Net Salary Payable (₹)</label>
              <input type="number" id="edit-salary-net" class="form-control" readonly style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-weight: 700;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Source</label>
            <select id="edit-salary-source" class="form-control" style="background: var(--bg-card-heavy); color: var(--text-white-invert); border: 1px solid var(--panel-border); outline: none;">
              <option value="cash">Cash In Hand (Physical Cash)</option>
              <option value="petty_cash">Petty Cash</option>
              <option value="account">Bank Account (UPI / Transfer)</option>
            </select>
          </div>
          
          <div style="display:flex; gap:10px; margin-top: 20px;">
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
  document.getElementById('page-heading-sub').innerText = `Staff roster management and salary bill calculations for ${new Date(activeDate).toLocaleString('default', { month: 'long', year: 'numeric' })}`;

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
      const processedApps = store.applications.filter(a => a.assignedStaffId === staffId).length;
      const bonus = processedApps * 10;
      const deductions = 0;

      // Populate editor form inputs
      document.getElementById('edit-salary-name').value = staffName;
      document.getElementById('edit-salary-days').value = days;
      document.getElementById('edit-salary-base').value = employee.baseSalary;
      document.getElementById('edit-salary-prorata').value = basePay;
      document.getElementById('edit-salary-bonus').value = bonus;
      document.getElementById('edit-salary-deductions').value = deductions.toFixed(2);
      document.getElementById('edit-salary-net').value = (basePay + bonus - deductions).toFixed(2);

      editorBackdrop.classList.add('show');
    });
  });

  // Editor form inputs listeners for live updates
  const updateNetPayable = () => {
    const proRata = parseFloat(document.getElementById('edit-salary-prorata').value || 0);
    const bonus = parseFloat(document.getElementById('edit-salary-bonus').value || 0);
    const deductions = parseFloat(document.getElementById('edit-salary-deductions').value || 0);
    const net = proRata + bonus - deductions;
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

      showPayslip(employee, dateVal, details.days, details.proRata, details.bonus, details.deductions, netPay);
    });
  });

  const showPayslip = (employee, dateString, daysVal, proRataVal, bonusVal, deductionsVal, netPayVal) => {
    const staffName = employee.name;
    const staffId = employee.id;
    const monthLabel = new Date(dateString).toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthStr = dateString.substring(0, 7);

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

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 5px 0;">Basic Pro-rata Salary (30d base)</td>
            <td style="padding: 5px 0; text-align:right;">₹${proRataVal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color:green;">Service Incentive Bonus</td>
            <td style="padding: 5px 0; text-align:right; color:green;">+₹${bonusVal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color:red;">Tax/Deductions</td>
            <td style="padding: 5px 0; text-align:right; color:red;">-₹${deductionsVal.toFixed(2)}</td>
          </tr>
          <tr style="font-weight:700; font-size: 14px; border-top: 1px solid #ddd;">
            <td style="padding: 8px 0; padding-top:10px;">Net Cash Payout</td>
            <td style="padding: 8px 0; padding-top:10px; text-align:right; color:#06b6d4;">₹${netPayVal.toFixed(2)}</td>
          </tr>
        </table>
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
    const deductionsVal = parseFloat(document.getElementById('edit-salary-deductions').value || 0);
    const netPayVal = parseFloat(document.getElementById('edit-salary-net').value || 0);

    // Save transaction to store
    store.addTransaction(activeDate, {
      type: 'expense',
      description: `Salary payout: ${staffName}`,
      amount: netPayVal,
      category: 'Salary',
      source: document.getElementById('edit-salary-source').value || 'cash',
      salaryDetails: {
        days: daysVal,
        proRata: proRataVal,
        bonus: bonusVal,
        deductions: deductionsVal
      }
    });

    appInstance.showToast(`Salary payment logged for ${staffName}`, 'success');

    // Close editor
    editorBackdrop.classList.remove('show');

    // Render physical slip layout inside modal
    showPayslip(employee, activeDate, daysVal, proRataVal, bonusVal, deductionsVal, netPayVal);
    
    // Refresh page details to draw the View Slip button immediately
    appInstance.handleRouting();
  });
}

export default renderPayroll;

