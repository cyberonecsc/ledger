/* ==========================================================================
   CYBERONE Center Management Platform - Mode Selection Screen (views/selection.js)
   ========================================================================== */

import { auth } from '../auth.js';
import { store } from '../store.js';

export function renderSelection(mountPoint, appInstance) {
  const currentUser = auth.currentUser || { name: 'Operator', username: 'user', role: 'Staff' };
  const customLogo = localStorage.getItem('cyberone_v2_custom_logo') || './logo.png';
  const centerName = store.centerProfile?.name || 'CYBERONE CSC CENTER';
  const centerCode = store.centerProfile?.code || '465314670016';
  const versionStr = appInstance ? appInstance.version : '3.9.6';

  mountPoint.innerHTML = `
    <div class="selection-screen-wrapper" style="min-height: 100vh; width: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 40px 20px; box-sizing: border-box; background: radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.95) 70%, #090d16 100%);">
      
      <!-- Top Brand Header -->
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
          <img src="${customLogo}" alt="Logo" style="width: 52px; height: 52px; object-fit: contain; background: #ffffff; border-radius: 12px; padding: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);" onerror="this.style.display='none';">
          <div style="text-align: left;">
            <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${centerName}</h1>
            <span style="font-size: 12px; color: var(--color-primary, #6366f1); font-weight: 600; letter-spacing: 0.5px;">CSC ID: ${centerCode}</span>
          </div>
        </div>
        <p style="font-size: 15px; color: var(--text-muted, #94a3b8); margin: 0; max-width: 480px;">Please select your workspace terminal mode to continue</p>
      </div>

      <!-- Mode Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 400px)); gap: 30px; width: 100%; max-width: 860px; margin: 40px 0; justify-content: center;">
        
          <!-- CARD 1: CYBERONE POS -->
          <div id="select-pos-card" style="background: rgba(18, 24, 38, 0.75); backdrop-filter: blur(20px); border: 2px solid rgba(245, 158, 11, 0.25); border-radius: 20px; padding: 36px 28px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.4);">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
            
            <div style="width: 76px; height: 76px; border-radius: 22px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 22px; color: #f59e0b; box-shadow: 0 0 30px rgba(245, 158, 11, 0.2);">
              <i data-lucide="zap" style="width: 40px; height: 40px;"></i>
            </div>

            <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Counter Kiosk</div>

            <h2 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 10px 0;">CYBERONE POS</h2>
            <p style="font-size: 13px; color: var(--text-muted, #94a3b8); line-height: 1.6; margin: 0 0 24px 0; min-height: 42px;">
              Optimized for fast walk-in billing. Large touch-friendly service tiles, instant customer checkout, thermal receipt printing, and automated ledger recording.
            </p>

            <div style="width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: auto;">
              <button class="btn-launch-pos" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35); transition: 0.2s;">
                <span>Launch CYBERONE POS</span>
                <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
              </button>
            </div>
          </div>

        <!-- CARD 2: Management & Ledger -->
        <div id="select-ledger-card" style="background: rgba(18, 24, 38, 0.75); backdrop-filter: blur(20px); border: 2px solid rgba(99, 102, 241, 0.25); border-radius: 20px; padding: 36px 28px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.4);">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
          
          <div style="width: 76px; height: 76px; border-radius: 22px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 22px; color: #818cf8; box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);">
            <i data-lucide="layout-dashboard" style="width: 40px; height: 40px;"></i>
          </div>

          <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Full Operations</div>

          <h2 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 10px 0;">Management Ledger</h2>
          <p style="font-size: 13px; color: var(--text-muted, #94a3b8); line-height: 1.6; margin: 0 0 24px 0; min-height: 42px;">
            Complete accounting suite. Daily daybook transactions, bank & CSC wallet balances, customer debt accounts, profit reports, payroll, and system settings.
          </p>

          <div style="width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: auto;">
            <button class="btn-launch-ledger" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35); transition: 0.2s;">
              <span>Open Full Ledger</span>
              <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>

      </div>

      <!-- Bottom User Bar & Logout -->
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 860px; padding: 16px 24px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary, #6366f1); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px;">
            ${(currentUser.name || currentUser.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #fff;">${currentUser.name || currentUser.username}</div>
            <div style="font-size: 11px; color: var(--text-muted, #94a3b8);">${currentUser.role || 'Staff Operator'} • v${versionStr}</div>
          </div>
        </div>

        <button id="selection-btn-logout" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s;">
          <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  `;

  // Render icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Hover animations for cards
  const posCard = mountPoint.querySelector('#select-pos-card');
  const ledgerCard = mountPoint.querySelector('#select-ledger-card');

  if (posCard) {
    posCard.addEventListener('mouseenter', () => {
      posCard.style.transform = 'translateY(-6px)';
      posCard.style.borderColor = '#f59e0b';
      posCard.style.boxShadow = '0 16px 40px rgba(245, 158, 11, 0.25)';
    });
    posCard.addEventListener('mouseleave', () => {
      posCard.style.transform = 'translateY(0)';
      posCard.style.borderColor = 'rgba(245, 158, 11, 0.25)';
      posCard.style.boxShadow = '0 12px 35px rgba(0,0,0,0.4)';
    });
    posCard.addEventListener('click', () => {
      window.location.hash = '#pos';
    });
  }

  if (ledgerCard) {
    ledgerCard.addEventListener('mouseenter', () => {
      ledgerCard.style.transform = 'translateY(-6px)';
      ledgerCard.style.borderColor = '#818cf8';
      ledgerCard.style.boxShadow = '0 16px 40px rgba(99, 102, 241, 0.25)';
    });
    ledgerCard.addEventListener('mouseleave', () => {
      ledgerCard.style.transform = 'translateY(0)';
      ledgerCard.style.borderColor = 'rgba(99, 102, 241, 0.25)';
      ledgerCard.style.boxShadow = '0 12px 35px rgba(0,0,0,0.4)';
    });
    ledgerCard.addEventListener('click', () => {
      window.location.hash = '#dashboard';
    });
  }

  // Logout button
  const logoutBtn = mountPoint.querySelector('#selection-btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.logout();
      window.location.hash = '#login';
    });
  }
}
