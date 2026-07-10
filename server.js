const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DB_FILE = path.join(__dirname, 'db.json');

// Store all active client SSE response streams
let sseClients = [];

// Prevent server from crashing due to uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] at:', promise, 'reason:', reason);
});

// Helper to parse JSON safely
function parseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch(e) { return null; }
}

// Deterministic JSON stringifier to compare database contents logically
function deterministicStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const properties = keys.map(key => {
    return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
  });
  return '{' + properties.join(',') + '}';
}

// Parse any embedded JSON strings to compare database contents logically
function canonicalizeDatabase(db) {
  const canonical = {};
  for (const key in db) {
    if (key === 'cyberone_v2_last_modified') continue;
    let val = db[key];
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try {
        val = JSON.parse(val);
      } catch (e) {}
    }
    canonical[key] = val;
  }
  return canonical;
}

// Database merging engine (preserves existing daybook records)
function mergeDatabases(existingDb, incomingDb) {
  const merged = { ...existingDb, ...incomingDb };

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

// Helper to write JSON database safely
function writeDatabase(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper to read JSON database safely
function readDatabase() {
  if (fs.existsSync(DB_FILE)) {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return parseJSON(content) || {};
  }
  return {};
}

// Broadcast database updates to all connected clients
function broadcastUpdate(payload) {
  console.log(`Sync: Broadcasting database update to ${sseClients.length} clients...`);
  const dataString = JSON.stringify(payload);
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${dataString}\n\n`);
    } catch(e) {
      console.error("Sync: Error writing update to client socket", e);
    }
  });
}

// Broadcast connected clients list to all open streams
function broadcastActiveClients() {
  const clientsList = sseClients.map(c => ({
    ip: c.ip,
    username: c.username,
    device: c.device
  }));
  
  console.log(`Sync: Broadcasting active clients list of size: ${clientsList.length}`);
  const msg = JSON.stringify({
    type: 'active_clients',
    count: clientsList.length,
    clients: clientsList
  });
  
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${msg}\n\n`);
    } catch(e) {
      console.error("Sync: Error writing connection list to client socket", e);
    }
  });
}

// Server implementation
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // SSE Stream Endpoint
  if (req.method === 'GET' && url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Handle stream errors gracefully to prevent node from crashing
    res.on('error', (err) => {
      console.error("Sync: SSE client response stream error:", err);
    });

    // Send initial database snapshot to client on connect
    const initialData = readDatabase();
    try {
      res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    } catch(e) {
      console.error("Sync: Initial data write failed:", e);
      res.end();
      return;
    }

    // Parse query parameters
    const username = url.searchParams.get('username') || 'Guest User';
    const device = url.searchParams.get('device') || 'Web Browser';
    
    // Get client IP address
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    let cleanIp = rawIp.replace(/^::ffff:/, '');
    if (cleanIp === '::1' || cleanIp === '127.0.0.1') {
      cleanIp = 'Localhost';
    }

    // Add client details to active clients list
    const clientRecord = {
      id: Math.random().toString(36).substring(2, 9),
      res: res,
      ip: cleanIp,
      username: username,
      device: device
    };
    
    sseClients.push(clientRecord);
    console.log(`Sync: Client [${username} on ${device}] connected from ${cleanIp}. Active clients: ${sseClients.length}`);
    
    // Broadcast the updated list to everyone
    broadcastActiveClients();

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== clientRecord);
      console.log(`Sync: Client [${username}] disconnected. Active clients: ${sseClients.length}`);
      broadcastActiveClients();
    });
    return;
  }

  // REST API Save Endpoint
  if (req.method === 'POST' && url.pathname === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incomingDb = JSON.parse(body);
        const existingDb = readDatabase();

        // Loop protection: skip if last modified timestamps are identical
        const incomingMod = incomingDb['cyberone_v2_last_modified'];
        const existingMod = existingDb['cyberone_v2_last_modified'];
        if (incomingMod && existingMod && incomingMod === existingMod) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'No changes detected' }));
          return;
        }

        const mergedDb = mergeDatabases(existingDb, incomingDb);

        // Content-level loop protection: skip write/broadcast if database content is logically identical
        const canonicalExisting = canonicalizeDatabase(existingDb);
        const canonicalMerged = canonicalizeDatabase(mergedDb);

        if (deterministicStringify(canonicalExisting) === deterministicStringify(canonicalMerged)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'No content changes detected' }));
          return;
        }

        writeDatabase(mergedDb);

        console.log(`[${new Date().toLocaleTimeString()}] Sync: Successfully saved and merged data.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));

        // Broadcast the update to all clients
        broadcastUpdate(mergedDb);
      } catch (err) {
        console.error('Sync: Save failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // Fallback: Static File Serving
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  
  // Prevent directory traversal attacks
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Send a keep-alive ping to SSE clients every 20 seconds to prevent connection timeouts
setInterval(() => {
  sseClients.forEach(client => {
    try {
      client.res.write(': keepalive\n\n');
    } catch(e) {
      console.error("Sync: Keepalive send failed", e);
    }
  });
}, 20000);

server.listen(PORT, () => {
  console.log('=============================================');
  console.log(`  CYBERONE CSC Self-Hosted Server Running`);
  console.log(`  Local URL: http://localhost:${PORT}/`);
  console.log(`  Press Ctrl+C to stop the server.`);
  console.log('=============================================');
});
