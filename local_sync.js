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
    this.activeConnectionsCount = 0;
    this.connectionsCountListeners = [];
  }

  initialize(url) {
    if (!url) return;
    
    // Normalize URL
    this.serverUrl = url.trim().replace(/\/$/, '');
    console.log(`Sync: Initializing Self-Hosted Sync Service at: ${this.serverUrl}`);
    
    this.connect();
  }

  isInitialized() {
    return !!this.serverUrl;
  }

  onConnectionsCountChange(listener) {
    this.connectionsCountListeners.push(listener);
    // Invoke immediately with current count
    try { listener(this.activeConnectionsCount); } catch(e) {}
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.isConnecting = true;
    console.log(`Sync: Connecting to stream at ${this.serverUrl}/api/stream`);

    try {
      this.eventSource = new EventSource(`${this.serverUrl}/api/stream`);

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
          if (parsed && parsed.type === 'connections_count') {
            this.activeConnectionsCount = parsed.count;
            this.connectionsCountListeners.forEach(listener => {
              try { listener(parsed.count); } catch (e) {
                console.error("Sync: Error triggering connection count listener:", e);
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
