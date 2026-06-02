/* ==========================================================================
   CYBERONE Center Management Platform - Inventory View (views/inventory.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderInventory(mountPoint, appInstance) {
  // State variables for inventory view
  let activeTab = 'product'; // 'product' or 'service'
  let searchQuery = '';
  let categoryFilter = '';
  let sortOrder = 'name-asc';
  let currentPage = 1;
  const itemsPerPage = 10;
  const selectedIds = new Set();

  const redrawLayout = () => {
    const products = store.products;
    const lowStockCount = products.filter(p => p.type !== 'service' && p.stock <= p.minStock).length;

    // Get unique categories for active tab filter
    const activeProducts = products.filter(p => p.type === activeTab);
    const categories = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean))).sort();

    mountPoint.innerHTML = `
      <!-- Low Stock Banner Alert -->
      ${lowStockCount > 0 ? `
        <div class="no-print" style="padding: 16px 20px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--border-radius-md); display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
          <i data-lucide="alert-triangle" style="width: 24px; height: 24px; color: var(--color-warning); filter: drop-shadow(0 0 5px var(--color-warning-glow));"></i>
          <div>
            <h5 style="font-family: var(--font-display); font-weight: 700; color: var(--color-warning);">Low Stock Alerts</h5>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              There are <strong>${lowStockCount}</strong> product items running low. Restock soon to avoid service disruption.
            </p>
          </div>
        </div>
      ` : ''}

      <!-- Scan to Restock Barcode Panel (No-print, only for products tab) -->
      ${activeTab === 'product' ? `
        <div class="no-print glass-card" style="padding: 15px; margin-bottom: 15px; border-color: rgba(99, 102, 241, 0.25); background: rgba(99, 102, 241, 0.03); display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="scan-barcode" style="width: 22px; height: 22px; color: var(--color-primary);"></i>
            <span style="font-weight: 700; font-size: 13px; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Restock</span>
          </div>
          <div style="flex: 1; min-width: 250px;">
            <input type="text" id="barcode-scan-input" class="form-control" placeholder="Point scanner here and scan barcode (or enter manual barcode & press Enter)..." style="font-size: 12px; height: 36px; padding: 6px 12px; background: rgba(0,0,0,0.25);">
          </div>
        </div>
      ` : ''}

      <!-- Tab Buttons for Product vs Service -->
      <div class="tab-row no-print" style="margin-bottom: 20px; display: flex; gap: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 8px;">
        <button id="tab-inventory-products" class="btn ${activeTab === 'product' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; outline: none; cursor: pointer;">
          <i data-lucide="package" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Physical Products
        </button>
        <button id="tab-inventory-services" class="btn ${activeTab === 'service' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; outline: none; cursor: pointer;">
          <i data-lucide="wrench" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> Service Items
        </button>
      </div>

      <!-- Search/Filters & Action Buttons -->
      <div class="search-filter-row no-print" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
        <div class="search-input-wrapper" style="flex: 1.5; min-width: 220px; margin-bottom: 0;">
          <i data-lucide="search" style="width: 16px; height: 16px;"></i>
          <input type="text" id="prod-search" class="form-control" placeholder="Search by name or ${activeTab === 'service' ? 'SAC' : 'HSN'} code..." value="${searchQuery}">
        </div>

        <div style="flex: 1; min-width: 150px;">
          <select id="filter-category" class="form-control" style="font-size: 12px;">
            <option value="">-- All Categories --</option>
            ${categories.map(cat => `<option value="${cat}" ${categoryFilter === cat ? 'selected' : ''}>${cat}</option>`).join('')}
          </select>
        </div>

        <div style="flex: 1; min-width: 150px;">
          <select id="sort-inventory" class="form-control" style="font-size: 12px;">
            <option value="name-asc" ${sortOrder === 'name-asc' ? 'selected' : ''}>Sort: Name A-Z</option>
            <option value="name-desc" ${sortOrder === 'name-desc' ? 'selected' : ''}>Sort: Name Z-A</option>
            <option value="price-asc" ${sortOrder === 'price-asc' ? 'selected' : ''}>Sort: Price Low-High</option>
            <option value="price-desc" ${sortOrder === 'price-desc' ? 'selected' : ''}>Sort: Price High-Low</option>
            ${activeTab === 'product' ? `
              <option value="stock-asc" ${sortOrder === 'stock-asc' ? 'selected' : ''}>Sort: Stock Low-High</option>
              <option value="stock-desc" ${sortOrder === 'stock-desc' ? 'selected' : ''}>Sort: Stock High-Low</option>
            ` : ''}
          </select>
        </div>

        <div class="filter-actions" style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
          <button id="btn-bulk-delete" class="btn btn-danger" style="display: none; height: 38px; align-items: center; gap: 6px;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Delete (<span id="bulk-delete-count">0</span>)
          </button>
          <button id="btn-add-prod" class="btn btn-primary" style="height: 38px; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Add ${activeTab === 'product' ? 'Product' : 'Service'}
          </button>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: 25px;">
        <div class="table-responsive">
          <table class="custom-table" id="inventory-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-products" style="cursor: pointer;"></th>
                <th style="width: 140px;">${activeTab === 'service' ? 'SAC Code' : 'HSN Code'}</th>
                <th>Name</th>
                <th>Category</th>
                <th style="text-align: right; width: 120px;">Purchase Cost</th>
                <th style="text-align: right; width: 120px;">Selling Price</th>
                ${activeTab === 'product' ? `
                  <th style="text-align: center; width: 120px;">Stock Level</th>
                  <th style="width: 120px;">Alert Level</th>
                ` : ''}
                <th style="width: 120px;">Status</th>
                <th style="text-align: center; width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody id="prod-tbody">
              <!-- Content rendered in renderTableData() -->
            </tbody>
          </table>
        </div>
        
        <!-- Pagination Controls -->
        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid var(--panel-border); font-size: 13px;">
          <div style="color: var(--text-muted);">
            Showing <span id="pag-start">0</span> to <span id="pag-end">0</span> of <span id="pag-total">0</span> entries
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="btn-pag-prev" class="btn btn-sm btn-secondary" style="display: flex; align-items: center; gap: 4px; cursor: pointer; outline: none; border: 1px solid var(--panel-border);">
              <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i> Previous
            </button>
            <span style="font-weight: 600; color: #fff; padding: 0 8px;">Page <span id="pag-current">1</span> of <span id="pag-max">1</span></span>
            <button id="btn-pag-next" class="btn btn-sm btn-secondary" style="display: flex; align-items: center; gap: 4px; cursor: pointer; outline: none; border: 1px solid var(--panel-border);">
              Next <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Modals Backdrop -->
      <div id="prod-modal-backdrop" class="modal-backdrop">
        <div class="modal-container" id="prod-modal-container" style="max-width: 550px;">
          <!-- Dynamic forms will render here -->
        </div>
      </div>
    `;

    // Set page header metadata
    document.getElementById('page-heading-title').innerText = 'Store Supplies & Product Inventory';
    document.getElementById('page-heading-sub').innerText = `Manage physical utility supplies, lamination pockets, services and HSN/SAC codes`;

    bindTabHandlers();
    bindFilterHandlers();
    bindActionHandlers();
    renderTableData();
    lucide.createIcons();
  };

  const bindTabHandlers = () => {
    document.getElementById('tab-inventory-products').onclick = () => {
      activeTab = 'product';
      categoryFilter = '';
      sortOrder = 'name-asc';
      currentPage = 1;
      selectedIds.clear();
      redrawLayout();
    };

    document.getElementById('tab-inventory-services').onclick = () => {
      activeTab = 'service';
      categoryFilter = '';
      sortOrder = 'name-asc';
      currentPage = 1;
      selectedIds.clear();
      redrawLayout();
    };
  };

  const bindFilterHandlers = () => {
    document.getElementById('prod-search').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderTableData();
    });

    document.getElementById('filter-category').addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      currentPage = 1;
      renderTableData();
    });

    document.getElementById('sort-inventory').addEventListener('change', (e) => {
      sortOrder = e.target.value;
      currentPage = 1;
      renderTableData();
    });

    // Barcode scan keydown listener
    const barcodeInput = document.getElementById('barcode-scan-input');
    if (barcodeInput) {
      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const barcodeVal = e.target.value.trim();
          if (!barcodeVal) return;
          
          const product = store.findProductByBarcode(barcodeVal);
          if (product) {
            openRestockModal(product);
            e.target.value = '';
          } else {
            appInstance.showToast(`Product with barcode "${barcodeVal}" not found!`, 'danger');
            e.target.value = '';
            e.target.focus();
          }
        }
      });
    }

    document.getElementById('btn-pag-prev').onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTableData();
      }
    };

    document.getElementById('btn-pag-next').onclick = () => {
      currentPage++;
      renderTableData();
    };
  };

  const updateBulkDeleteButton = () => {
    const btnBulk = document.getElementById('btn-bulk-delete');
    const bulkCount = document.getElementById('bulk-delete-count');
    if (btnBulk && bulkCount) {
      const count = selectedIds.size;
      bulkCount.innerText = count;
      btnBulk.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  };

  const renderTableData = () => {
    let items = store.products.filter(p => p.type === activeTab);

    // Filter by category
    if (categoryFilter) {
      items = items.filter(p => p.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.sku || '').toLowerCase().includes(q)
      );
    }

    // Sort items
    items.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'price-asc') return a.sellPrice - b.sellPrice;
      if (sortOrder === 'price-desc') return b.sellPrice - a.sellPrice;
      if (sortOrder === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortOrder === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      return 0;
    });

    // Pagination bounds
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedItems = items.slice(startIdx, endIdx);

    const tbody = document.getElementById('prod-tbody');
    if (tbody) {
      if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${activeTab === 'product' ? 10 : 8}" style="text-align:center; color:var(--text-dimmed); padding:30px;">No items match filters.</td></tr>`;
      } else {
        tbody.innerHTML = paginatedItems.map(p => {
          const isLow = activeTab === 'product' && p.stock <= p.minStock;
          const statusBadge = activeTab === 'service' 
            ? `<span class="badge sale">Active</span>` 
            : `<span class="badge ${isLow ? 'expense' : 'sale'}">${isLow ? 'Low Stock' : 'In Stock'}</span>`;
            
          const checkboxChecked = selectedIds.has(p.id) ? 'checked' : '';

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
              <td style="text-align: center;"><input type="checkbox" class="select-prod-checkbox" data-id="${p.id}" ${checkboxChecked} style="cursor: pointer;"></td>
              <td><code>${p.sku}</code></td>
              <td><strong>${p.name}</strong></td>
              <td>${p.category}</td>
              <td style="text-align: right;">₹${p.buyPrice.toFixed(2)}</td>
              <td style="text-align: right; font-weight:700;">₹${p.sellPrice.toFixed(2)}</td>
              ${activeTab === 'product' ? `
                <td style="text-align: center; font-weight:700; color: ${isLow ? 'var(--color-danger)' : 'var(--text-main)'};">${p.stock}</td>
                <td>${p.minStock} units</td>
              ` : ''}
              <td>${statusBadge}</td>
              <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                  ${activeTab === 'product' ? `
                    <button class="btn btn-xs btn-primary btn-restock-prod" data-id="${p.id}" style="padding: 2px 8px; font-size:11px;">
                      Restock
                    </button>
                  ` : ''}
                  <button class="btn btn-xs btn-secondary btn-edit-prod" data-id="${p.id}" style="padding: 2px 8px; font-size:11px; color: var(--color-info); border-color: rgba(14,165,233,0.15); background: rgba(14,165,233,0.02);">
                    Edit
                  </button>
                  <button class="btn btn-xs btn-danger btn-delete-prod" data-id="${p.id}" style="padding: 2px 8px; font-size:11px; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.25); color: #fca5a5;">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Set page text indicators
    document.getElementById('pag-start').innerText = totalItems > 0 ? startIdx + 1 : 0;
    document.getElementById('pag-end').innerText = endIdx;
    document.getElementById('pag-total').innerText = totalItems;
    document.getElementById('pag-current').innerText = currentPage;
    document.getElementById('pag-max').innerText = totalPages;

    document.getElementById('btn-pag-prev').disabled = (currentPage === 1);
    document.getElementById('btn-pag-next').disabled = (currentPage === totalPages);

    // Bind item checkboxes
    const selectAllCheckbox = document.getElementById('select-all-products');
    if (selectAllCheckbox) {
      const pageIds = paginatedItems.map(p => p.id);
      selectAllCheckbox.checked = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
      
      selectAllCheckbox.onchange = (e) => {
        const checked = e.target.checked;
        pageIds.forEach(id => {
          if (checked) selectedIds.add(id);
          else selectedIds.delete(id);
        });
        document.querySelectorAll('.select-prod-checkbox').forEach(cb => {
          cb.checked = selectedIds.has(cb.getAttribute('data-id'));
        });
        updateBulkDeleteButton();
      };
    }

    document.querySelectorAll('.select-prod-checkbox').forEach(cb => {
      const id = cb.getAttribute('data-id');
      cb.onchange = (e) => {
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        
        const pageIds = paginatedItems.map(p => p.id);
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = pageIds.length > 0 && pageIds.every(pid => selectedIds.has(pid));
        }
        updateBulkDeleteButton();
      };
    });

    updateBulkDeleteButton();
    bindRowActions();
    lucide.createIcons();
  };

  const bindRowActions = () => {
    // Single Delete button click
    document.querySelectorAll('.btn-delete-prod').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const product = store.products.find(p => p.id === id);
        if (!product) return;
        
        if (confirm(`Are you sure you want to delete "${product.name}" from inventory?`)) {
          store.deleteProduct(id);
          selectedIds.delete(id);
          appInstance.showToast('Item deleted successfully', 'success');
          renderTableData();
        }
      };
    });

    // Edit button click
    document.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const product = store.products.find(p => p.id === id);
        if (!product) return;
        openEditProductModal(product);
      };
    });

    // Restock button click
    document.querySelectorAll('.btn-restock-prod').forEach(btn => {
      btn.onclick = (e) => {
        const prodId = e.currentTarget.getAttribute('data-id');
        const product = store.products.find(p => p.id === prodId);
        if (!product) return;
        openRestockModal(product);
      };
    });
  };

  const bindActionHandlers = () => {
    const backdrop = document.getElementById('prod-modal-backdrop');
    const container = document.getElementById('prod-modal-container');
    const closeModal = () => backdrop.classList.remove('show');

    // Add product button click
    document.getElementById('btn-add-prod').onclick = () => {
      container.innerHTML = `
        <div class="modal-header">
          <h4>Register New ${activeTab === 'product' ? 'Product' : 'Service'}</h4>
          <button id="prod-modal-close" class="modal-close">&times;</button>
        </div>

        <form id="form-add-prod">
          <input type="hidden" id="prod-type" value="${activeTab}">

          <div class="form-group">
            <label class="form-label">Item / Service Name</label>
            <input type="text" id="prod-name" class="form-control" placeholder="e.g. A4 Paper, Passport filing" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" id="lbl-prod-sku">${activeTab === 'service' ? 'SAC Code' : 'HSN Code'}</label>
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
              <label class="form-label">${activeTab === 'service' ? 'Base Cost (₹)' : 'Purchase Price (₹)'}</label>
              <input type="number" step="0.01" id="prod-buy" class="form-control" placeholder="Cost price" required>
            </div>
            <div class="form-group">
              <label class="form-label">${activeTab === 'service' ? 'Service Charge / Price (₹)' : 'Retail Selling Price (₹)'}</label>
              <input type="number" step="0.01" id="prod-sell" class="form-control" placeholder="Bill price" required>
            </div>
          </div>

          ${activeTab === 'product' ? `
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
            <div class="form-group">
              <label class="form-label">Barcode / UPC (Optional)</label>
              <input type="text" id="prod-barcode" class="form-control" placeholder="Scan or enter item barcode">
            </div>
          ` : ''}

          <div style="display:flex; gap:10px; margin-top:15px;">
            <button type="submit" class="btn btn-primary" style="flex-grow:1;">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> Register Item
            </button>
            <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
          </div>
        </form>
      `;

      lucide.createIcons();
      document.getElementById('prod-modal-close').onclick = closeModal;
      container.querySelector('.btn-modal-cancel').onclick = closeModal;
      backdrop.classList.add('show');

      // Category handler
      const catSelect = document.getElementById('prod-category');
      const newCatGroup = document.getElementById('new-category-group');
      catSelect.onchange = (e) => {
        newCatGroup.style.display = e.target.value === '[NEW_CAT]' ? 'block' : 'none';
      };

      document.getElementById('form-add-prod').onsubmit = (e) => {
        e.preventDefault();
        const catVal = catSelect.value;
        let category = catVal;
        if (catVal === '[NEW_CAT]') {
          category = document.getElementById('prod-new-category').value.trim() || 'General';
        }

        store.addProduct({
          name: document.getElementById('prod-name').value,
          sku: document.getElementById('prod-sku').value,
          barcode: activeTab === 'product' ? (document.getElementById('prod-barcode')?.value || '') : '',
          category: category,
          buyPrice: parseFloat(document.getElementById('prod-buy').value),
          sellPrice: parseFloat(document.getElementById('prod-sell').value),
          stock: activeTab === 'service' ? 0 : parseInt(document.getElementById('prod-stock').value || 0),
          minStock: activeTab === 'service' ? 0 : parseInt(document.getElementById('prod-min').value || 0),
          type: activeTab
        });

        appInstance.showToast('Item registered successfully', 'success');
        closeModal();
        redrawLayout();
      };
    };

    // Bulk Delete Click Handler
    document.getElementById('btn-bulk-delete').onclick = () => {
      const count = selectedIds.size;
      if (count === 0) return;
      if (confirm(`Are you sure you want to delete the ${count} selected items from inventory?`)) {
        let deleted = 0;
        selectedIds.forEach(id => {
          const success = store.deleteProduct(id);
          if (success) deleted++;
        });
        selectedIds.clear();
        appInstance.showToast(`Deleted ${deleted} items successfully`, 'success');
        redrawLayout();
      }
    };
  };

  const openEditProductModal = (product) => {
    const backdrop = document.getElementById('prod-modal-backdrop');
    const container = document.getElementById('prod-modal-container');
    const closeModal = () => backdrop.classList.remove('show');

    container.innerHTML = `
      <div class="modal-header">
        <h4>Edit ${product.type === 'product' ? 'Product' : 'Service'}: ${product.name}</h4>
        <button id="prod-modal-close" class="modal-close">&times;</button>
      </div>

      <form id="form-edit-prod">
        <div class="form-group">
          <label class="form-label">Item / Service Name</label>
          <input type="text" id="edit-prod-name" class="form-control" value="${product.name}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${product.type === 'service' ? 'SAC Code' : 'HSN Code'}</label>
            <input type="text" id="edit-prod-sku" class="form-control" value="${product.sku || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="edit-prod-category" class="form-control">
              ${buildCategoryOptions()}
            </select>
          </div>
        </div>

        <div id="new-category-group-edit" class="form-group" style="display: none;">
          <label class="form-label">Specify New Category Name</label>
          <input type="text" id="edit-prod-new-category" class="form-control" placeholder="Enter custom category name">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${product.type === 'service' ? 'Base Cost (₹)' : 'Purchase Price (₹)'}</label>
            <input type="number" step="0.01" id="edit-prod-buy" class="form-control" value="${product.buyPrice}" required>
          </div>
          <div class="form-group">
            <label class="form-label">${product.type === 'service' ? 'Service Charge / Price (₹)' : 'Retail Selling Price (₹)'}</label>
            <input type="number" step="0.01" id="edit-prod-sell" class="form-control" value="${product.sellPrice}" required>
          </div>
        </div>

        ${product.type === 'product' ? `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Stock Level</label>
              <input type="number" id="edit-prod-stock" class="form-control" value="${product.stock}">
            </div>
            <div class="form-group">
              <label class="form-label">Minimum Alert Stock Level</label>
              <input type="number" id="edit-prod-min" class="form-control" value="${product.minStock}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Barcode / UPC (Optional)</label>
            <input type="text" id="edit-prod-barcode" class="form-control" value="${product.barcode || ''}" placeholder="Scan or enter item barcode">
          </div>
        ` : ''}

        <div style="display:flex; gap:10px; margin-top:15px;">
          <button type="submit" class="btn btn-success" style="flex-grow:1;">
            <i data-lucide="check-circle" style="width:16px; height:16px;"></i> Update Item Details
          </button>
          <button type="button" class="btn btn-secondary btn-modal-cancel">Cancel</button>
        </div>
      </form>
    `;

    lucide.createIcons();
    document.getElementById('prod-modal-close').onclick = closeModal;
    container.querySelector('.btn-modal-cancel').onclick = closeModal;
    document.getElementById('edit-prod-category').value = product.category || '';
    
    // Category handler
    const catSelect = document.getElementById('edit-prod-category');
    const newCatGroup = document.getElementById('new-category-group-edit');
    catSelect.onchange = (e) => {
      newCatGroup.style.display = e.target.value === '[NEW_CAT]' ? 'block' : 'none';
    };

    document.getElementById('form-edit-prod').onsubmit = (e) => {
      e.preventDefault();
      const catVal = catSelect.value;
      let category = catVal;
      if (catVal === '[NEW_CAT]') {
        category = document.getElementById('edit-prod-new-category').value.trim() || 'General';
      }

      store.updateProduct(product.id, {
        name: document.getElementById('edit-prod-name').value,
        sku: document.getElementById('edit-prod-sku').value,
        barcode: product.type === 'product' ? (document.getElementById('edit-prod-barcode')?.value || '') : '',
        category: category,
        buyPrice: parseFloat(document.getElementById('edit-prod-buy').value),
        sellPrice: parseFloat(document.getElementById('edit-prod-sell').value),
        stock: product.type === 'service' ? 0 : parseInt(document.getElementById('edit-prod-stock').value || 0),
        minStock: product.type === 'service' ? 0 : parseInt(document.getElementById('edit-prod-min').value || 0),
        type: product.type
      });

      appInstance.showToast('Item updated successfully', 'success');
      closeModal();
      renderTableData();
    };

    backdrop.classList.add('show');
  };

  const openRestockModal = (product) => {
    const backdrop = document.getElementById('prod-modal-backdrop');
    const container = document.getElementById('prod-modal-container');
    const closeModal = () => backdrop.classList.remove('show');

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
    container.querySelector('.btn-modal-cancel').onclick = closeModal;
    backdrop.classList.add('show');

    const inputQty = document.getElementById('restock-qty');
    const inputCost = document.getElementById('restock-unit-cost');
    const totalDiv = document.getElementById('restock-total-preview');

    const updateCostPreview = () => {
      const q = parseInt(inputQty.value || 0);
      const c = parseFloat(inputCost.value || 0);
      totalDiv.innerText = `₹${(q * c).toFixed(2)}`;
    };

    inputQty.oninput = updateCostPreview;
    inputCost.oninput = updateCostPreview;

    document.getElementById('form-restock-prod').onsubmit = (ev) => {
      ev.preventDefault();
      const qty = parseInt(inputQty.value);
      const unitCost = parseFloat(inputCost.value);
      const totalCost = qty * unitCost;
      const source = document.getElementById('restock-source').value;

      store.adjustStock(product.id, qty);
      
      store.addTransaction(appInstance.getActiveDate(), {
        type: 'expense',
        description: `Restocked ${qty}x ${product.name}`,
        amount: totalCost,
        category: 'Supplies',
        source: source
      });

      appInstance.showToast(`Restocked ${qty} units and logged expense: ₹${totalCost}`, 'success');
      closeModal();
      redrawLayout();
    };
  };

  const buildCategoryOptions = () => {
    const categories = Array.from(new Set(store.products.map(p => p.category).filter(Boolean)));
    if (!categories.includes('Stationery')) categories.push('Stationery');
    if (!categories.includes('Materials')) categories.push('Materials');
    if (!categories.includes('Accessories')) categories.push('Accessories');
    if (!categories.includes('Govt G2C Services')) categories.push('Govt G2C Services');
    
    return categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') + 
           `<option value="[NEW_CAT]">[Add New Category...]</option>`;
  };

  // Initial draw
  redrawLayout();
}

export default renderInventory;
