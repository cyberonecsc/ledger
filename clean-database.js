const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const backupPath = path.join(__dirname, 'db-backup.json');

// 1. Backup existing db.json first
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log("Created backup of your database as 'db-backup.json'");
} else {
  console.error("Error: db.json not found!");
  process.exit(1);
}

// 2. Load database
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 3. Clean personal records
db['cyberone_v2_center_profile'] = JSON.stringify({
  name: "DEMO CSC CENTER",
  code: "000000000000",
  address: "Center Address, Street, City",
  city: "CITY",
  state: "STATE",
  pin: "000000",
  landPhone: "0000-000000",
  mobile: "0000000000",
  email: "contact@democsc.com",
  gstin: "00XXXXX0000X0Z0"
});

db['cyberone_v2_firebase_config'] = JSON.stringify({
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
});

db['cyberone_v2_users'] = JSON.stringify([
  {
    username: "ADMIN",
    name: "System Administrator",
    role: "owner",
    password: "Admin@123456",
    staffId: "000000000000"
  }
]);

// Clear transactional logs
db['cyberone_v2_daily_logs'] = null;
db['cyberone_v2_activity_logs'] = JSON.stringify([]);
db['cyberone_v2_invoices'] = JSON.stringify([]);
db['cyberone_v2_opening_overrides'] = JSON.stringify({});
db['cyberone_v2_closing_overrides'] = JSON.stringify({});
db['cyberone_v2_local_snapshots'] = JSON.stringify([]);
db['cyberone_v2_customers'] = JSON.stringify([]);
db['cyberone_v2_applications'] = JSON.stringify([]);
db['cyberone_v2_custom_logo'] = "";
db['cyberone_v2_last_modified'] = new Date().toISOString();

// Reset initial balances to zero
db['cyberone_v2_initial_balances'] = JSON.stringify({
  cash: 0,
  petty_cash: 0,
  main_bob: 0,
  csc: 0,
  paynearby: 0,
  airtel_pb: 0,
  ibkart: 0,
  bsnl: 0,
  vi: 0,
  airtel: 0
});

// Save cleaned database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("db.json has been cleared and set to a clean distribution template!");
console.log("You can now build/push to compile the clean template installers.");
console.log("After that, run 'node restore-database.js' to restore your original database.");
