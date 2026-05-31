/* ==========================================================================
   CYBERONE Center Management Platform - Invoices View (views/invoices.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderInvoices(mountPoint, appInstance) {
  const invoices = store.invoices;
  const customers = store.customers;

  // Calculate invoice metrics
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const outstandingInvoices = invoices.filter(i => i.status === 'sent');
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);

  mountPoint.innerHTML = `
    <!-- Invoice KPI Grid -->
    <div class="card-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 25px;">
      <div class="glass-card success">
        <span class="card-title" style="font-size:11px;">Paid Invoices</span>
        <div class="card-value" style="margin-top:5px; font-size:22px;">${paidInvoices.length} Bills</div>
        <div class="card-change up" style="font-size:11px;">Fully cleared payments</div>
      </div>
      
      <div class="glass-card warning">
        <span class="card-title" style="font-size:11px;">Unpaid Outstanding</span>
        <div class="card-value" style="margin-top:5px; font-size:22px;">₹${totalOutstanding.toFixed(2)}</div>
        <div class="card-change warning" style="font-size:11px; color:var(--color-warning);">${outstandingInvoices.length} bills pending collection</div>
      </div>

      <div class="glass-card info">
        <span class="card-title" style="font-size:11px;">Total Invoices Issued</span>
        <div class="card-value" style="margin-top:5px; font-size:22px;">${invoices.length} Bills</div>
        <div class="card-change neutral" style="font-size:11px;">Historical billing archive</div>
      </div>
    </div>

    <!-- Toolbar search and Create Invoice -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="inv-search" class="form-control" placeholder="Search by invoice number or client name...">
      </div>

      <div class="filter-actions" style="display: flex; gap: 10px; align-items: center;">
        <input type="date" id="inv-date-picker" value="${appInstance.getActiveDate()}" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--panel-border); color: #fff; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: var(--border-radius-sm); outline: none; cursor: pointer; color-scheme: dark; font-family: var(--font-primary); height: 38px; box-sizing: border-box;">
        <button id="btn-create-inv" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Create Invoice
        </button>
      </div>
    </div>

    <!-- Invoices List Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Citizen / Client</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="inv-tbody">
            ${invoices.map(inv => {
              const client = customers.find(c => c.id === inv.customerId);
              
              let statusBadgeClass = 'deposit';
              if (inv.status === 'paid') statusBadgeClass = 'sale';
              if (inv.status === 'cancelled') statusBadgeClass = 'expense';

              return `
                <tr>
                  <td><code>${inv.invoiceNumber}</code></td>
                  <td><strong>${client ? client.name : 'Walk-in'}</strong></td>
                  <td>${inv.createdAt}</td>
                  <td>${inv.dueDate || '—'}</td>
                  <td style="font-weight:700;">₹${inv.total.toFixed(2)}</td>
                  <td>
                    <select class="form-control table-inv-status" data-id="${inv.id}" style="padding:4px; font-size:12px; max-width:120px; background: rgba(0,0,0,0.2);">
                      <option value="sent" ${inv.status === 'sent' ? 'selected' : ''}>Sent / Unpaid</option>
                      <option value="paid" ${inv.status === 'paid' ? 'selected' : ''}>Paid / Settled</option>
                      <option value="cancelled" ${inv.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-sm btn-secondary btn-view-invoice" data-id="${inv.id}">
                      <i data-lucide="printer" style="width: 14px; height: 14px; margin-right:4px;"></i> View Receipt
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invoice Modal Backdrops -->
    <div id="inv-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" id="inv-modal-container" style="max-width: 650px;">
        <!-- Dynamic invoice content mounts here -->
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Official Invoices & Receipts';
  document.getElementById('page-heading-sub').innerText = 'Generate print-ready receipts for G2C applications and IT services';

  lucide.createIcons();

  // Search Filter
  const invSearch = document.getElementById('inv-search');
  invSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#inv-tbody tr');
    
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  const invDatePicker = document.getElementById('inv-date-picker');
  if (invDatePicker) {
    invDatePicker.addEventListener('change', (e) => {
      appInstance.setActiveDate(e.target.value);
    });
  }

  const backdrop = document.getElementById('inv-modal-backdrop');
  const container = document.getElementById('inv-modal-container');
  const closeModal = () => backdrop.classList.remove('show');

  // Change Invoice Status selector handler
  const statusSelectors = document.querySelectorAll('.table-inv-status');
  statusSelectors.forEach(select => {
    select.addEventListener('change', (e) => {
      const invId = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      store.updateInvoiceStatus(invId, newStatus);
      appInstance.showToast(`Invoice updated to ${newStatus}`, 'success');
      appInstance.handleRouting();
    });
  });

  // Create Invoice Modal Open
  document.getElementById('btn-create-inv').addEventListener('click', () => {
    const activeDate = appInstance.getActiveDate();
    const dailyLog = store.getOrCreateDailyLog(activeDate);
    const saleTransactions = dailyLog.transactions.filter(t => t.type === 'sale');
    const transactionOptions = saleTransactions.map(t => {
      const cust = customers.find(c => c.id === t.customerId);
      const custName = cust ? cust.name : 'Walk-in';
      return `<option value="${t.id}">${t.description} - ₹${t.amount} (${custName})</option>`;
    }).join('');

    container.innerHTML = `
      <div class="modal-header">
        <h4>Generate Invoice Receipt</h4>
        <button id="inv-modal-close" class="modal-close">&times;</button>
      </div>

      <form id="form-create-invoice">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Client / Citizen</label>
            <select id="inv-cust-id" class="form-control" required>
              ${customers.map(c => `<option value="${c.id}">${c.name} (${c.uniqueNumber})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Import from Transaction (Optional)</label>
            <select id="inv-import-txn" class="form-control">
              <option value="">-- Do Not Import --</option>
              ${transactionOptions}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="inv-due" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">GST Tax Rate (18% Standard)</label>
            <select id="inv-tax" class="form-control">
              <option value="0.18" selected>CGST+SGST (18%)</option>
              <option value="0.05">CGST+SGST (5%)</option>
              <option value="0.00">Zero Tax Exemption (0%)</option>
            </select>
          </div>
        </div>

        <!-- Dynamic Invoice items log -->
        <h5 style="font-family:var(--font-display); font-weight:700; margin-bottom:10px;">Line Items</h5>
        <div id="invoice-items-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
          <div class="item-row form-row-3" style="align-items:flex-end;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">Service Description</label>
              <input type="text" class="form-control item-desc" placeholder="e.g. Passport filling service" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">Qty</label>
              <input type="number" class="form-control item-qty" value="1" min="1" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;">Rate (₹)</label>
              <input type="number" class="form-control item-rate" placeholder="0.00" required>
            </div>
          </div>
        </div>

        <button type="button" id="btn-add-item-row" class="btn btn-secondary btn-sm" style="margin-bottom:20px;">
          <i data-lucide="plus" style="width:12px; height:12px;"></i> Add Line Item
        </button>

        <div style="border-top: 1px solid var(--panel-border); padding-top: 15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:600; color:var(--text-muted);">Calculated Grand Total</span>
          <span id="invoice-total-preview" style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--color-info);">₹0.00</span>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-primary" style="flex-grow:1;">
            <i data-lucide="file-check" style="width:16px; height:16px;"></i> Issue & Send Invoice
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();
    document.getElementById('inv-modal-close').addEventListener('click', closeModal);
    const cancelBtn = container.querySelector('.btn-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
    }
    
    // Set default due date to 10 days from today
    const dueField = document.getElementById('inv-due');
    const d = new Date();
    d.setDate(d.getDate() + 10);
    dueField.value = d.toISOString().substring(0, 10);

    backdrop.classList.add('show');

    // Add new line item row handler
    const listDiv = document.getElementById('invoice-items-list');
    const btnAddItemRow = document.getElementById('btn-add-item-row');
    const totalPreview = document.getElementById('invoice-total-preview');

    // Import from Transaction handler
    const importSelect = document.getElementById('inv-import-txn');
    importSelect.addEventListener('change', (e) => {
      const txnId = e.target.value;
      if (!txnId) return;
      
      const txn = saleTransactions.find(t => t.id === txnId);
      if (txn) {
        // Select customer
        if (txn.customerId) {
          document.getElementById('inv-cust-id').value = txn.customerId;
        }
        // Fill first item row
        const firstRow = listDiv.querySelector('.item-row');
        if (firstRow) {
          firstRow.querySelector('.item-desc').value = txn.description;
          firstRow.querySelector('.item-rate').value = txn.amount;
          firstRow.querySelector('.item-qty').value = 1;
        }
        recalculateInvoiceTotals();
      }
    });

    const recalculateInvoiceTotals = () => {
      let subtotal = 0;
      const rows = listDiv.querySelectorAll('.item-row');
      rows.forEach(r => {
        const qty = parseInt(r.querySelector('.item-qty').value || 0);
        const rate = parseFloat(r.querySelector('.item-rate').value || 0);
        subtotal += qty * rate;
      });

      const taxRate = parseFloat(document.getElementById('inv-tax').value);
      const grandTotal = subtotal * (1 + taxRate);
      totalPreview.innerText = `₹${grandTotal.toFixed(2)}`;
    };

    btnAddItemRow.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'item-row form-row-3';
      row.style.alignItems = 'flex-end';
      row.style.marginTop = '8px';
      row.innerHTML = `
        <div class="form-group" style="margin-bottom:0;">
          <input type="text" class="form-control item-desc" placeholder="Service description" required>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <input type="number" class="form-control item-qty" value="1" min="1" required>
        </div>
        <div class="form-group" style="margin-bottom:0; display:flex; gap:10px;">
          <input type="number" class="form-control item-rate" placeholder="0.00" required style="flex-grow:1;">
          <button type="button" class="btn btn-sm btn-secondary btn-remove-row" style="padding:6px; color:var(--color-danger); border-color:rgba(239,68,68,0.25); background:rgba(239,68,68,0.02)">&times;</button>
        </div>
      `;

      listDiv.appendChild(row);

      // Bind input events
      row.querySelector('.item-qty').addEventListener('input', recalculateInvoiceTotals);
      row.querySelector('.item-rate').addEventListener('input', recalculateInvoiceTotals);
      
      row.querySelector('.btn-remove-row').addEventListener('click', () => {
        row.remove();
        recalculateInvoiceTotals();
      });
    });

    // Bind original row elements
    listDiv.querySelector('.item-qty').addEventListener('input', recalculateInvoiceTotals);
    listDiv.querySelector('.item-rate').addEventListener('input', recalculateInvoiceTotals);
    document.getElementById('inv-tax').addEventListener('change', recalculateInvoiceTotals);

    // Form submit
    document.getElementById('form-create-invoice').addEventListener('submit', (ev) => {
      ev.preventDefault();

      const items = [];
      const rows = listDiv.querySelectorAll('.item-row');
      rows.forEach(r => {
        items.push({
          desc: r.querySelector('.item-desc').value,
          qty: parseInt(r.querySelector('.item-qty').value),
          rate: parseFloat(r.querySelector('.item-rate').value)
        });
      });

      const taxRate = parseFloat(document.getElementById('inv-tax').value);
      const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const grandTotal = subtotal * (1 + taxRate);

      store.addInvoice({
        customerId: document.getElementById('inv-cust-id').value,
        items,
        taxRate,
        discount: 0,
        total: grandTotal,
        dueDate: dueField.value,
        status: 'sent'
      });

      appInstance.showToast('Official Invoice generated successfully!', 'success');
      closeModal();
      appInstance.handleRouting();
    });
  });

  // View printable receipt modal binding
  const viewBtns = document.querySelectorAll('.btn-view-invoice');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const invId = e.currentTarget.getAttribute('data-id');
      const inv = invoices.find(i => i.id === invId);
      if (!inv) return;

      const client = customers.find(c => c.id === inv.customerId);
      const subtotal = inv.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const taxAmount = subtotal * inv.taxRate;

      container.innerHTML = `
        <div class="modal-header" style="border-bottom:1px solid var(--panel-border); padding-bottom:10px;">
          <h4 style="font-family:var(--font-display);">Invoice Receipt Details</h4>
          <button id="inv-modal-close" class="modal-close">&times;</button>
        </div>

        <!-- Receipt Print Section -->
        <div id="printable-invoice-receipt" class="preview-normal">
          <div class="receipt-header">
            <div class="header-left">
              <img class="receipt-logo" src="./logo.png" alt="logo" onerror="this.style.display='none';">
              <div class="company-info" style="display: flex; flex-direction: column; gap: 4px;">
                <h3 style="font-size: 18px; margin: 0; color: #1e1b4b; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">${store.centerProfile.name}</h3>
                <div style="font-size: 11px; font-weight: 700; color: #4338ca; display: flex; gap: 8px; align-items: center; margin-bottom: 2px;">
                  <span>CENTER CODE: ${store.centerProfile.code}</span>
                  ${store.centerProfile.gstin ? `<span>|</span><span>GSTIN: ${store.centerProfile.gstin}</span>` : ''}
                </div>
                <p style="margin: 0; font-size: 11px; color: #4b5563; line-height: 1.4;">
                  ${store.centerProfile.address}, ${store.centerProfile.city}, ${store.centerProfile.state} - ${store.centerProfile.pin}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #1f2937; font-weight: 500; margin-top: 2px;">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">📞 ${store.centerProfile.mobile} ${store.centerProfile.landPhone ? `/ ${store.centerProfile.landPhone}` : ''}</span>
                  <span>•</span>
                  <span style="display: inline-flex; align-items: center; gap: 4px;">✉️ ${store.centerProfile.email}</span>
                </div>
              </div>
            </div>
            <div class="header-right">
              <h2 class="doc-type-title">Receipt</h2>
              <table class="meta-details-table">
                <tr>
                  <td>Receipt No:</td>
                  <td><code>${inv.invoiceNumber}</code></td>
                </tr>
                <tr>
                  <td>Citizen Name:</td>
                  <td>${client ? client.name : 'Walk-in'}</td>
                </tr>
                <tr>
                  <td>Citizen ID:</td>
                  <td><code>${client ? client.uniqueNumber : '—'}</code></td>
                </tr>
                <tr>
                  <td>Issue Date:</td>
                  <td>${inv.createdAt}</td>
                </tr>
                <tr>
                  <td>Due Date:</td>
                  <td>${inv.dueDate || '—'}</td>
                </tr>
                <tr>
                  <td>Status:</td>
                  <td style="font-weight:700; text-transform:uppercase; color: ${inv.status === 'paid' ? 'green' : 'orange'}">${inv.status}</td>
                </tr>
              </table>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-top:1px solid #000; border-bottom:1px solid #000;">
            <thead>
              <tr style="border-bottom:1px solid #ddd;">
                <th style="text-align: left; padding: 6px 0;">Description</th>
                <th style="text-align: center; padding: 6px 0; width:50px;">Qty</th>
                <th style="text-align: right; padding: 6px 0; width:80px;">Rate</th>
                <th style="text-align: right; padding: 6px 0; width:90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `
                <tr>
                  <td style="padding: 6px 0;">${item.desc}</td>
                  <td style="text-align: center; padding: 6px 0;">${item.qty}</td>
                  <td style="text-align: right; padding: 6px 0;">₹${item.rate.toFixed(2)}</td>
                  <td style="text-align: right; padding: 6px 0;">₹${(item.qty * item.rate).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table style="width: 50%; border-collapse: collapse; margin-left: auto; font-size:12px; margin-bottom:20px;">
            <tr>
              <td style="padding:4px 0;">Subtotal:</td>
              <td style="text-align: right; padding:4px 0;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;">GST Tax ( ${(inv.taxRate * 100).toFixed(0)}%):</td>
              <td style="text-align: right; padding:4px 0;">₹${taxAmount.toFixed(2)}</td>
            </tr>
            <tr style="font-weight:700; font-size:14px; border-top:1px solid #000;">
              <td style="padding:6px 0;">Grand Total:</td>
              <td style="text-align: right; padding:6px 0; color:#06b6d4;">₹${inv.total.toFixed(2)}</td>
            </tr>
          </table>

          <div style="text-align:center; font-size: 10px; color:#555; border-top:1px dashed #ddd; padding-top:15px; margin-top:30px;">
            Thank you for choosing CYBERONE CSC. Keep this copy for certificate references.
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid var(--panel-border); padding-top:15px;" class="no-print">
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Print Layout:</span>
          <div style="display:flex; gap:5px;">
            <button id="btn-format-normal" class="btn btn-xs btn-primary" style="font-size:10px; padding: 4px 8px;">A4 Normal</button>
            <button id="btn-format-thermal" class="btn btn-xs btn-secondary" style="font-size:10px; padding: 4px 8px;">80mm Thermal</button>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;" class="no-print">
          <button id="btn-print-receipt" class="btn btn-primary" style="flex-grow:1;">
            <i data-lucide="printer" style="width:16px; height:16px;"></i> Print
          </button>
          <button id="btn-download-receipt" class="btn btn-secondary" style="flex-grow:1;">
            <i data-lucide="download" style="width:16px; height:16px;"></i> Download PDF
          </button>
          <button id="btn-close-receipt" class="btn btn-secondary">Close</button>
        </div>
      </div>
    `;

    lucide.createIcons();
    document.getElementById('inv-modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-close-receipt').addEventListener('click', closeModal);
    backdrop.classList.add('show');

    // Layout togglers and printer triggers
    let printFormat = 'normal';
    const btnFormatNormal = document.getElementById('btn-format-normal');
    const btnFormatThermal = document.getElementById('btn-format-thermal');
    const receiptContainer = document.getElementById('printable-invoice-receipt');

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

    // Print Receipt
    document.getElementById('btn-print-receipt').addEventListener('click', () => {
      appInstance.printElement(printFormat);
    });

    // Download Receipt
    document.getElementById('btn-download-receipt').addEventListener('click', () => {
      appInstance.downloadElementAsPDF('printable-invoice-receipt', `Invoice_${inv.invoiceNumber}.pdf`, printFormat === 'thermal');
    });
  });
});


}
export default renderInvoices;
