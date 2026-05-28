/* ==========================================================================
   Akshaya Center Management Platform - Inventory View (views/inventory.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderInventory(mountPoint, appInstance) {
  const products = store.products;
  const lowStockCount = products.filter(p => p.type !== 'service' && p.stock <= p.minStock).length;

  mountPoint.innerHTML = `
    <!-- Low Stock Banner Alert -->
    ${lowStockCount > 0 ? `
      <div style="padding: 16px 20px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--border-radius-md); display: flex; align-items: center; gap: 12px; margin-bottom: 25px;">
        <i data-lucide="alert-triangle" style="width: 24px; height: 24px; color: var(--color-warning); filter: drop-shadow(0 0 5px var(--color-warning-glow));"></i>
        <div>
          <h5 style="font-family: var(--font-display); font-weight: 700; color: var(--color-warning);">Low Stock Alerts</h5>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            There are <strong>${lowStockCount}</strong> product items running low. Restock soon to avoid service disruption.
          </p>
        </div>
      </div>
    ` : ''}

    <!-- Search/Filters & Action Buttons -->
    <div class="search-filter-row">
      <div class="search-input-wrapper">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
        <input type="text" id="prod-search" class="form-control" placeholder="Search by product name, HSN or category...">
      </div>

      <div class="filter-actions">
        <button id="btn-add-prod" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add Product / Service
        </button>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>HSN / ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Purchase Price</th>
              <th>Selling Price</th>
              <th style="text-align: center;">Stock Level</th>
              <th>Alert Level</th>
              <th>Status</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="prod-tbody">
            ${renderProductTableRows(products)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals Backdrop -->
    <div id="prod-modal-backdrop" class="modal-backdrop">
      <div class="modal-container" id="prod-modal-container" style="max-width: 550px;">
        <!-- Dynamic modal forms will render here -->
      </div>
    </div>
  `;

  // Set titles in header
  document.getElementById('page-heading-title').innerText = 'Store Supplies & Product Inventory';
  document.getElementById('page-heading-sub').innerText = 'Manage physical utility supplies, lamination pockets, accessories and HSN codes';

  lucide.createIcons();

  // Search Filter functionality
  const prodSearch = document.getElementById('prod-search');
  prodSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#prod-tbody tr');
    
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  const backdrop = document.getElementById('prod-modal-backdrop');
  const container = document.getElementById('prod-modal-container');
  const closeModal = () => backdrop.classList.remove('show');

  // Dynamic category options builder
  const buildCategoryOptions = () => {
    const categories = Array.from(new Set(store.products.map(p => p.category).filter(Boolean)));
    if (!categories.includes('Stationery')) categories.push('Stationery');
    if (!categories.includes('Materials')) categories.push('Materials');
    if (!categories.includes('Accessories')) categories.push('Accessories');
    
    return categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') + 
           `<option value="[NEW_CAT]">[Add New Category...]</option>`;
  };

  // Add Product modal
  document.getElementById('btn-add-prod').addEventListener('click', () => {
    container.innerHTML = `
      <div class="modal-header">
        <h4>Register New Product or Service</h4>
        <button id="prod-modal-close" class="modal-close" style="display:none;">&times;</button>
      </div>

      <form id="form-add-prod">
        <div class="form-group">
          <label class="form-label">Registration Type</label>
          <select id="prod-type" class="form-control">
            <option value="product" selected>Physical Product (Track Stock)</option>
            <option value="service">Service Item (No Stock Tracking)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Item / Service Name</label>
          <input type="text" id="prod-name" class="form-control" placeholder="e.g. A4 Paper, PVC Lamination, PAN Card filling" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">HSN Code</label>
            <input type="text" id="prod-sku" class="form-control" placeholder="e.g. 4901 / PVC-CARD" required>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="prod-category" class="form-control">
              ${buildCategoryOptions()}
            </select>
          </div>
        </div>

        <!-- Custom Category Input (Hidden initially) -->
        <div id="new-category-group" class="form-group" style="display: none;">
          <label class="form-label">Specify New Category Name</label>
          <input type="text" id="prod-new-category" class="form-control" placeholder="Enter custom category name">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Purchase Price / Base Cost (₹)</label>
            <input type="number" step="0.01" id="prod-buy" class="form-control" placeholder="Cost price" required>
          </div>
          <div class="form-group">
            <label class="form-label">Retail Selling Price (₹)</label>
            <input type="number" step="0.01" id="prod-sell" class="form-control" placeholder="Bill price" required>
          </div>
        </div>

        <div class="form-row" id="stock-fields-row">
          <div class="form-group">
            <label class="form-label">Initial Stock Level</label>
            <input type="number" id="prod-stock" class="form-control" value="10">
          </div>
          <div class="form-group">
            <label class="form-label">Minimum Alert Stock Level</label>
            <input type="number" id="prod-min" class="form-control" value="3">
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-primary" style="flex-grow:1;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> Register Item
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();
    container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
    backdrop.classList.add('show');

    // Dynamic show/hide stock inputs depending on Type
    const typeSelect = document.getElementById('prod-type');
    const stockRow = document.getElementById('stock-fields-row');
    typeSelect.addEventListener('change', (e) => {
      stockRow.style.display = e.target.value === 'service' ? 'none' : 'flex';
    });

    // Dynamic category specification toggling
    const catSelect = document.getElementById('prod-category');
    const newCatGroup = document.getElementById('new-category-group');
    catSelect.addEventListener('change', (e) => {
      newCatGroup.style.display = e.target.value === '[NEW_CAT]' ? 'block' : 'none';
    });

    document.getElementById('form-add-prod').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const type = typeSelect.value;
      const catSelectVal = catSelect.value;
      let category = catSelectVal;
      if (catSelectVal === '[NEW_CAT]') {
        category = document.getElementById('prod-new-category').value.trim() || 'General';
      }

      store.addProduct({
        name: document.getElementById('prod-name').value,
        sku: document.getElementById('prod-sku').value,
        category: category,
        buyPrice: parseFloat(document.getElementById('prod-buy').value),
        sellPrice: parseFloat(document.getElementById('prod-sell').value),
        stock: type === 'service' ? 0 : parseInt(document.getElementById('prod-stock').value || 0),
        minStock: type === 'service' ? 0 : parseInt(document.getElementById('prod-min').value || 0),
        type: type
      });

      appInstance.showToast('New item registered successfully', 'success');
      closeModal();
      appInstance.handleRouting();
    });
  });

  // Restock item modal binding
  const restockButtons = document.querySelectorAll('.btn-restock-prod');
  restockButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = e.currentTarget.getAttribute('data-id');
      const product = products.find(p => p.id === prodId);
      if (!product) return;

      container.innerHTML = `
        <div class="modal-header">
          <h4>Restock: ${product.name}</h4>
          <button id="prod-modal-close" class="modal-close" style="display:none;">&times;</button>
        </div>

        <form id="form-restock-prod">
          <div class="form-group">
            <label class="form-label">Current Stock level</label>
            <div style="font-size: 14px; font-weight:700; color: ${product.stock <= product.minStock ? 'var(--color-danger)' : 'var(--text-main)'};">
              ${product.stock} units (Min Alert: ${product.minStock})
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Quantity to Add</label>
              <input type="number" id="restock-qty" class="form-control" value="10" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label">Restock Cost per Unit (₹)</label>
              <input type="number" step="0.01" id="restock-unit-cost" class="form-control" value="${product.buyPrice}" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Total Expense (₹)</label>
            <div id="restock-total-preview" style="font-size:16px; font-weight:700; color:var(--color-danger);">
              ₹${(10 * product.buyPrice).toFixed(2)}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Expense Payment Source</label>
            <select id="restock-source" class="form-control">
              <option value="account">Bank Account (UPI/Transfer)</option>
              <option value="cash">Cash In Hand (Cash)</option>
            </select>
          </div>

          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="package-plus" style="width:16px; height:16px;"></i> Restock & Log Expense
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      container.querySelector('.btn-modal-cancel').addEventListener('click', closeModal);
      backdrop.classList.add('show');

      const inputQty = document.getElementById('restock-qty');
      const inputCost = document.getElementById('restock-unit-cost');
      const totalDiv = document.getElementById('restock-total-preview');

      const updateCostPreview = () => {
        const q = parseInt(inputQty.value || 0);
        const c = parseFloat(inputCost.value || 0);
        totalDiv.innerText = `₹${(q * c).toFixed(2)}`;
      };

      inputQty.addEventListener('input', updateCostPreview);
      inputCost.addEventListener('input', updateCostPreview);

      // Handle Restock Submit
      document.getElementById('form-restock-prod').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const qty = parseInt(inputQty.value);
        const unitCost = parseFloat(inputCost.value);
        const totalCost = qty * unitCost;
        const source = document.getElementById('restock-source').value;

        // Adjust Stock levels
        store.adjustStock(prodId, qty);
        
        // Log store expense
        store.addTransaction(appInstance.getActiveDate(), {
          type: 'expense',
          description: `Restocked ${qty}x ${product.name}`,
          amount: totalCost,
          category: 'Supplies',
          source: source
        });

        appInstance.showToast(`Restocked ${qty} units and logged expense: ₹${totalCost}`, 'success');
        closeModal();
        appInstance.handleRouting();
      });
    });
  });
}

function renderProductTableRows(products) {
  if (products.length === 0) {
    return `<tr><td colspan="9" style="text-align:center; color:var(--text-dimmed); padding:20px;">No product inventory tracked.</td></tr>`;
  }

  return products.map(p => {
    const isService = p.type === 'service';
    const isLow = !isService && p.stock <= p.minStock;

    let stockDisplay = p.stock;
    let minStockDisplay = `${p.minStock} units`;
    let statusBadge = '';

    if (isService) {
      stockDisplay = `<span style="color: var(--text-dimmed);">Service</span>`;
      minStockDisplay = '—';
      statusBadge = `<span class="badge sale">Service</span>`;
    } else {
      statusBadge = `<span class="badge ${isLow ? 'expense' : 'sale'}">${isLow ? 'Low Stock' : 'In Stock'}</span>`;
    }

    return `
      <tr>
        <td><code>${p.sku}</code></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>₹${p.buyPrice.toFixed(2)}</td>
        <td>₹${p.sellPrice.toFixed(2)}</td>
        <td style="text-align: center; font-weight:700; color: ${isLow ? 'var(--color-danger)' : 'var(--text-main)'};">
          ${stockDisplay}
        </td>
        <td>${minStockDisplay}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          ${isService ? `
            <button class="btn btn-sm btn-secondary" style="opacity:0.4; cursor:not-allowed;" disabled>
              <i data-lucide="slash" style="width: 14px; height: 14px; margin-right: 4px;"></i> No Stock
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary btn-restock-prod" data-id="${p.id}">
              <i data-lucide="package-plus" style="width: 14px; height: 14px; margin-right: 4px;"></i> Restock
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}
export default renderInventory;
