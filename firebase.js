import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue, off } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCL_0-TN5LGrNmdGorGDGxm9Qk9kbPdXoM",
  authDomain: "cyberone-ledger.firebaseapp.com",
  databaseURL: "https://cyberone-ledger-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cyberone-ledger",
  storageBucket: "cyberone-ledger.firebasestorage.app",
  messagingSenderId: "874267988577",
  appId: "1:874267988577:web:d90b7d359677c2146cd020",
  measurementId: "G-76Z4DJPKZN"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.activeListenerRef = null;
    this.activeListenerCallback = null;
  }

  isInitialized() {
    return this.app !== null && this.db !== null;
  }

  initialize(config) {
    let finalConfig = config;
    if (!finalConfig) {
      finalConfig = DEFAULT_FIREBASE_CONFIG;
      localStorage.setItem('cyberone_v2_firebase_config', JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
    }
    
    try {
      let parsedConfig = finalConfig;
      if (typeof finalConfig === 'string') {
        parsedConfig = JSON.parse(finalConfig);
      }
      
      // Basic validation
      if (!parsedConfig.databaseURL || !parsedConfig.projectId) {
        console.error("Firebase: Invalid configuration object");
        return false;
      }

      if (getApps().length > 0) {
        this.app = getApp();
      } else {
        this.app = initializeApp(parsedConfig);
      }
      this.db = getDatabase(this.app);
      console.log("Firebase: Initialized successfully");
      return true;
    } catch (e) {
      console.error("Firebase: Initialization failed:", e);
      return false;
    }
  }

  async saveData(centerCode, data) {
    if (!this.isInitialized()) return false;
    try {
      const dbRef = ref(this.db, `centers/${centerCode}`);
      await set(dbRef, data);
      return true;
    } catch (e) {
      console.error("Firebase: Save failed:", e);
      return false;
    }
  }

  async getData(centerCode) {
    if (!this.isInitialized()) return null;
    try {
      const dbRef = ref(this.db, `centers/${centerCode}`);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (e) {
      console.error("Firebase: Get failed:", e);
      return null;
    }
  }

  subscribe(centerCode, callback) {
    if (!this.isInitialized()) return;
    this.unsubscribe(); // Clear any existing listener

    try {
      const dbRef = ref(this.db, `centers/${centerCode}`);
      this.activeListenerRef = dbRef;
      
      // onValue returns an unsubscribe function
      const unsubscribeFunc = onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      });
      
      this.activeListenerCallback = unsubscribeFunc;
      console.log(`Firebase: Subscribed to changes under centers/${centerCode}`);
    } catch (e) {
      console.error("Firebase: Subscription failed:", e);
    }
  }

  unsubscribe() {
    if (this.activeListenerCallback) {
      try {
        this.activeListenerCallback(); // Call the unsubscribe function
      } catch (e) {
        console.warn("Firebase: Error calling unsubscribe function:", e);
      }
      this.activeListenerRef = null;
      this.activeListenerCallback = null;
      console.log("Firebase: Unsubscribed from changes");
    }
  }
}

export const firebaseService = new FirebaseService();
