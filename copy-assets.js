const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, 'www');

// Delete www folder if it exists
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
  console.log("Cleaned existing www folder.");
}

// Create www folder
fs.mkdirSync(dest);

// Files and folders to copy
const targets = [
  'index.html',
  'index.css',
  'logo.png',
  'app.js',
  'store.js',
  'auth.js',
  'firebase.js',
  'firebase-app.js',
  'firebase-database.js',
  'db.json',
  'views'
];

targets.forEach(target => {
  const srcPath = path.join(__dirname, target);
  const destPath = path.join(dest, target);
  
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`Copied ${target} to www/`);
  } else {
    console.warn(`Warning: ${target} not found!`);
  }
});

console.log("Web assets build completed successfully!");
