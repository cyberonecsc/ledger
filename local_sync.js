/* ==========================================================================
   CYBERONE Center Management Platform - Self-Hosted Realtime Sync (local_sync.js)
   ========================================================================== */

class LocalSyncService {
  constructor() {
    this.serverUrl = '';
    this.eventSource = null;
    this.isConnecting = false;
    this.reconnectTimeout = null;
    this.subscribers = [];
    this.activeClients = [];
    this.activeConnectionsCount = 0;
    this.activeClientsListeners = [];
  }

  initialize(url) {
    if (!url) return;
    
    // Normalize URL
    let normalizedUrl = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'http://' + normalizedUrl;
    }
    this.serverUrl = normalizedUrl;
    console.log(`Sync: Initializing Self-Hosted Sync Service at: ${this.serverUrl}`);
    
    this.connect();

    // Reconnect automatically when the window gains focus (crucial for mobile apps coming from background)
    window.addEventListener('focus', () => {
      if (this.isInitialized() && (!this.eventSource || this.eventSource.readyState !== 1)) {
        console.log("Sync: Window/App focused. Reconnecting stream...");
        this.connect();
      }
    });

    // Reconnect automatically when system internet comes back online
    window.addEventListener('online', () => {
      if (this.isInitialized()) {
        console.log("Sync: System online. Reconnecting stream...");
        this.connect();
      }
    });
  }

  isInitialized() {
    return !!this.serverUrl;
  }

  onActiveClientsChange(listener) {
    this.activeClientsListeners.push(listener);
    // Invoke immediately with current active clients list
    try { listener(this.activeClients); } catch(e) {}
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.isConnecting = true;

    // Retrieve username details
    let username = 'Guest';
    try {
      const userStr = localStorage.getItem('cyberone_v2_current_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u && u.username) username = u.username;
      }
    } catch(e) {}

    // Determine device descriptor
    let device = 'Web Browser';
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
      device = 'Android App';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      device = 'iOS Device';
    } else if (ua.includes('Electron')) {
      device = 'Desktop App';
    } else if (/Mobi/i.test(ua)) {
      device = 'Mobile Web';
    } else {
      device = 'Desktop Browser';
    }

    const queryParams = `?username=${encodeURIComponent(username)}&device=${encodeURIComponent(device)}`;
    console.log(`Sync: Connecting to stream at ${this.serverUrl}/api/stream${queryParams}`);

    try {
      this.eventSource = new EventSource(`${this.serverUrl}/api/stream${queryParams}`);

      this.eventSource.onopen = () => {
        console.log("Sync: Stream connection opened successfully");
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          // Ignore keepalives
          if (event.data === ': keepalive') return;
          
          const parsed = JSON.parse(event.data);
          
          // Parse connection count updates
          if (parsed && parsed.type === 'active_clients') {
            this.activeClients = parsed.clients || [];
            this.activeConnectionsCount = parsed.count || 0;
            this.activeClientsListeners.forEach(listener => {
              try { listener(this.activeClients); } catch (e) {
                console.error("Sync: Error triggering connection list listener:", e);
              }
            });
            return;
          }
          
          this.subscribers.forEach(callback => {
            try {
              callback(parsed);
            } catch (e) {
              console.error("Sync: Error triggering callback:", e);
            }
          });
        } catch (err) {
          console.error("Sync: Failed to parse stream event data:", err);
        }
      };

      this.eventSource.onerror = (err) => {
        console.error("Sync: Stream error occurred, reconnecting in 5s...", err);
        if (this.isConnecting) {
          alert(`[DIAGNOSTIC] STREAM CONNECTION FAILED!\nTarget URL: ${this.serverUrl}/api/stream\nReady State: ${this.eventSource.readyState}`);
        }
        this.isConnecting = false;
        this.eventSource.close();
        
        // Reconnect after 5 seconds
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      };
    } catch (e) {
      console.error("Sync: Failed to initialize EventSource:", e);
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  async saveData(payload) {
    if (!this.isInitialized()) return false;

    try {
      const response = await fetch(`${this.serverUrl}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        return result.status === 'success';
      }
      return false;
    } catch (err) {
      console.error("Sync: Save request failed:", err);
      alert(`[DIAGNOSTIC] SAVE FETCH FAILED!\nTarget URL: ${this.serverUrl}/api/save\nError: ${err.message}`);
      return false;
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.serverUrl = '';
    console.log("Sync: Self-Hosted Sync Service disconnected.");
  }
}

// Export single instance globally
export const localSyncService = new LocalSyncService();
window.localSyncService = localSyncService;
