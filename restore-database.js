const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const backupPath = path.join(__dirname, 'db-backup.json');

if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, dbPath);
  fs.unlinkSync(backupPath);
  console.log("Restored your original database from db-backup.json successfully!");
} else {
  console.error("Error: db-backup.json not found! Cannot restore.");
}
