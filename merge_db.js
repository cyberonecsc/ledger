const fs = require('fs');
const path = require('path');

function mergeDatabases(existingDb, incomingDb) {
  const merged = { ...existingDb, ...incomingDb };

  // Parse helper
  const parseJSON = (str) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch(e) { return null; }
  };

  // 1. Merge Activity Logs
  const actKey = 'cyberone_v2_activity_logs';
  if (existingDb[actKey] || incomingDb[actKey]) {
    const existingAct = parseJSON(existingDb[actKey]) || [];
    const incomingAct = parseJSON(incomingDb[actKey]) || [];
    const actMap = new Map();
    existingAct.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
    incomingAct.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
    const mergedAct = Array.from(actMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    merged[actKey] = JSON.stringify(mergedAct);
  }

  // 2. Merge Daily Logs (Transactions)
  const logsKey = 'cyberone_v2_daily_logs';
  if (existingDb[logsKey] || incomingDb[logsKey]) {
    const existingLogs = parseJSON(existingDb[logsKey]) || {};
    const incomingLogs = parseJSON(incomingDb[logsKey]) || {};
    const mergedLogs = { ...existingLogs, ...incomingLogs };

    Object.keys(mergedLogs).forEach(date => {
      const existingTxns = (existingLogs[date] && existingLogs[date].transactions) || [];
      const incomingTxns = (incomingLogs[date] && incomingLogs[date].transactions) || [];
      const txnMap = new Map();
      existingTxns.forEach(t => { if (t && t.id) txnMap.set(t.id, t); });
      incomingTxns.forEach(t => { if (t && t.id) txnMap.set(t.id, t); });
      
      if (!mergedLogs[date]) {
        mergedLogs[date] = { date, transactions: [] };
      }
      mergedLogs[date].transactions = Array.from(txnMap.values());
    });
    merged[logsKey] = JSON.stringify(mergedLogs);
  }

  // 3. Merge Array Keys by ID / Username
  const arrayKeys = [
    'cyberone_v2_customers',
    'cyberone_v2_products',
    'cyberone_v2_applications',
    'cyberone_v2_aeps_transactions',
    'cyberone_v2_users',
    'cyberone_v2_wallets',
    'cyberone_v2_bank_accounts'
  ];

  arrayKeys.forEach(key => {
    if (existingDb[key] || incomingDb[key]) {
      const existingArr = parseJSON(existingDb[key]) || [];
      const incomingArr = parseJSON(incomingDb[key]) || [];
      const keyProp = (existingArr.length > 0 && existingArr[0] && existingArr[0].username) ? 'username' : 'id';
      const map = new Map();
      existingArr.forEach(item => { if (item) map.set(item[keyProp] || item.id, item); });
      incomingArr.forEach(item => {
        if (item) {
          const k = item[keyProp] || item.id;
          const existingItem = map.get(k);
          map.set(k, existingItem ? { ...existingItem, ...item } : item);
        }
      });
      merged[key] = JSON.stringify(Array.from(map.values()));
    }
  });

  // 4. Update last_modified
  const tExist = existingDb.cyberone_v2_last_modified || '';
  const tIn = incomingDb.cyberone_v2_last_modified || '';
  merged.cyberone_v2_last_modified = (tExist && tIn && new Date(tExist) > new Date(tIn)) ? tExist : new Date().toISOString();

  return merged;
}

// Read payload from temp file
const tempFilePath = process.argv[2];
const dbFilePath = process.argv[3];

if (!tempFilePath || !dbFilePath) {
  console.error("Usage: node merge_db.js <temp_payload_path> <db_path>");
  process.exit(1);
}

try {
  const incomingDb = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
  let existingDb = {};
  if (fs.existsSync(dbFilePath)) {
    existingDb = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  }
  const mergedDb = mergeDatabases(existingDb, incomingDb);
  fs.writeFileSync(dbFilePath, JSON.stringify(mergedDb, null, 2), 'utf8');
  console.log("Merge completed successfully!");
} catch (e) {
  console.error("Merge failed:", e);
  process.exit(1);
}
