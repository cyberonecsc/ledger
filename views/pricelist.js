/* ==========================================================================
   CYBERONE Center Management Platform - Price List Page (views/pricelist.js)
   ========================================================================== */

import { store } from '../store.js';

export function renderPriceList(mountPoint, appInstance) {
  const titleEl = document.getElementById('page-heading-title');
  const subEl = document.getElementById('page-heading-sub');
  if (titleEl) titleEl.innerText = 'Services & Product Price List';
  if (subEl) subEl.innerText = 'Browse rates, filter by category, or print official customer price sheets';

  let activeTab = 'service'; // 'service' or 'product'
  let categoryFilter = '';
  let searchQuery = '';

  const redrawLayout = () => {
    const allItems = store.products || [];
    
    // Filter items based on tab
    let items = allItems.filter(item => item.type === activeTab);

    // Get categories dynamic list for filter buttons
    const categories = Array.from(new Set(allItems.filter(item => item.type === activeTab).map(item => item.category).filter(Boolean)));

    // Apply category filter
    if (categoryFilter) {
      items = items.filter(item => item.category === categoryFilter);
    }

    // Apply search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }

    // Sort alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    mountPoint.innerHTML = `
      <!-- Stylesheet specifically for Price List and Printing -->
      <style>
        .pricelist-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .filter-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--panel-border);
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .filter-badge:hover, .filter-badge.active {
          background: var(--color-primary-glow);
          color: var(--color-primary);
          border-color: rgba(99, 102, 241, 0.3);
        }

        /* Printable Area Custom styles (only visible during print) */
        #printable-pricelist-header {
          display: none;
        }

        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .sidebar, .navbar, .controls-pane, .no-print, button {
            display: none !important;
          }

          .main-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          #printable-pricelist-header {
            display: block !important;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }

          #printable-pricelist-header h1 {
            font-size: 28px;
            font-weight: 800;
            color: #000;
            margin-bottom: 5px;
            text-transform: uppercase;
          }

          #printable-pricelist-header p {
            font-size: 14px;
            color: #555;
          }

          .printable-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }

          .printable-table th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            border: 1.5px solid #cbd5e1 !important;
            padding: 10px !important;
            font-size: 12px !important;
            text-transform: uppercase !important;
            font-weight: 700 !important;
          }

          .printable-table td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            font-size: 12px !important;
            color: #334155 !important;
          }

          .printable-table tr:nth-child(even) {
            background-color: #f8fafc !important;
          }

          .printable-category-header {
            background-color: #e2e8f0 !important;
            font-weight: bold !important;
            font-size: 13px !important;
          }
        }
      </style>

      <!-- PRINT HEADER (Hidden on Screen) -->
      <div id="printable-pricelist-header">
        <h1>CYBERONE CSC DIGITAL CENTER</h1>
        <p>Ground Floor, Attingal Jn, Kerala • Ph: +91 70125 38476</p>
        <h2 style="font-size: 18px; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px;">
          Official Price List - ${activeTab === 'service' ? 'Services' : 'Products & Sales'}
        </h2>
      </div>

      <div class="pricelist-container">
        
        <!-- Controls Pane (Screen Only) -->
        <div class="glass-card controls-pane" style="padding: 20px; display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; border: 1px solid var(--panel-border);">
          
          <!-- Search & Tab Selection -->
          <div style="display: flex; gap: 12px; align-items: center; flex-grow: 1; max-width: 500px;">
            <div style="position: relative; width: 100%;">
              <input type="text" id="price-search" placeholder="Search service/product name..." value="${searchQuery}" style="width:100%; background:var(--bg-card-dark); border:1px solid var(--panel-border); border-radius:var(--border-radius-sm); color:var(--text-white-invert); padding:10px 12px 10px 38px; outline:none; font-size:13px; font-family:inherit;">
              <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-muted);"></i>
            </div>

            <!-- Tab Buttons -->
            <div style="display: flex; background: var(--bg-card-dark); border: 1px solid var(--panel-border); padding: 3px; border-radius: var(--border-radius-sm);">
              <button id="price-tab-service" class="btn ${activeTab === 'service' ? 'btn-primary' : 'btn-secondary'}" style="padding: 8px 16px; font-size: 12px; border:none; outline:none; cursor:pointer;">Services</button>
              <button id="price-tab-product" class="btn ${activeTab === 'product' ? 'btn-primary' : 'btn-secondary'}" style="padding: 8px 16px; font-size: 12px; border:none; outline:none; cursor:pointer;">Products</button>
            </div>
          </div>

          <!-- Print Action -->
          <div>
            <button id="btn-print-prices" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="printer" style="width: 16px; height: 16px;"></i>
              <span>Print Price List</span>
            </button>
          </div>
        </div>

        <!-- Category Filters (Screen Only) -->
        <div class="no-print" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
          <span style="font-size: 12px; color: var(--text-muted); font-weight: 600; margin-right: 5px;">Filter Category:</span>
          <div class="filter-badge ${categoryFilter === '' ? 'active' : ''}" data-cat="">All</div>
          ${categories.map(cat => `
            <div class="filter-badge ${categoryFilter === cat ? 'active' : ''}" data-cat="${cat}">${cat}</div>
          `).join('')}
        </div>

        <!-- Main Price List Table (Visible on Screen & formatted for Print) -->
        <div class="glass-card" style="padding: 0; border: 1px solid var(--panel-border); overflow: hidden;">
          <table class="table printable-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2.5px solid var(--bg-card-medium); background: rgba(99, 102, 241, 0.02);">
                <th style="padding: 14px 16px; text-align: left; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Code (SKU)</th>
                <th style="padding: 14px 16px; text-align: left; font-size: 13px; font-weight: 700; color: var(--text-white-invert); width: 35%;">Name</th>
                <th style="padding: 14px 16px; text-align: left; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Category</th>
                ${activeTab === 'service' ? `
                  <th style="padding: 14px 16px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Govt Fees / Cost</th>
                  <th style="padding: 14px 16px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Service Charge</th>
                  <th style="padding: 14px 16px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Total Rate</th>
                ` : `
                  <th style="padding: 14px 16px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-white-invert);">Selling Price</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${items.length === 0 ? `
                <tr>
                  <td colspan="${activeTab === 'service' ? 6 : 4}" style="text-align: center; color: var(--text-muted); padding: 40px;">No items match the filters.</td>
                </tr>
              ` : items.map(item => `
                <tr style="border-bottom: 1px solid var(--bg-card-medium); transition: var(--transition-smooth);">
                  <td style="padding: 12px 16px; font-family: monospace; font-size: 12px; color: var(--text-muted);"><code>${item.sku}</code></td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: var(--text-white-invert);">${item.name}</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: var(--text-muted);"><span class="badge" style="background: rgba(99,102,241,0.03); color: var(--text-muted); border: 1px solid var(--panel-border); font-size:11px; padding:3px 8px;">${item.category || 'General'}</span></td>
                  ${activeTab === 'service' ? `
                    <td style="padding: 12px 16px; font-size: 14px; color: var(--text-muted); text-align: right;">₹${item.buyPrice.toFixed(2)}</td>
                    <td style="padding: 12px 16px; font-size: 14px; color: var(--text-muted); text-align: right;">₹${item.sellPrice.toFixed(2)}</td>
                    <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: var(--color-primary); text-align: right;">₹${(item.buyPrice + item.sellPrice).toFixed(2)}</td>
                  ` : `
                    <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: var(--color-primary); text-align: right;">₹${item.sellPrice.toFixed(2)}</td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

      </div>
    `;

    // Bind event handlers
    document.getElementById('price-search').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      redrawLayout();
    });

    document.getElementById('price-tab-service').onclick = () => {
      activeTab = 'service';
      categoryFilter = '';
      redrawLayout();
    };

    document.getElementById('price-tab-product').onclick = () => {
      activeTab = 'product';
      categoryFilter = '';
      redrawLayout();
    };

    // Category filter click bindings
    mountPoint.querySelectorAll('.filter-badge').forEach(badge => {
      badge.onclick = (e) => {
        categoryFilter = e.currentTarget.getAttribute('data-cat');
        redrawLayout();
      };
    });

    // Print button handler
    document.getElementById('btn-print-prices').onclick = () => {
      window.print();
    };

    lucide.createIcons();
  };

  redrawLayout();
}
