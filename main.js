const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow;

// Register custom protocol scheme
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'CYBERONE CSC Ledger',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false
    }
  });

  mainWindow.loadURL('app://./index.html');

  // Remove default window menu bar for a premium app feel
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set up protocol handler mapping app:// to the local www/ folder
  protocol.handle('app', (request) => {
    try {
      const urlObj = new URL(request.url);
      let filePath = urlObj.pathname;
      
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      if (filePath.startsWith('./')) {
        filePath = filePath.substring(2);
      }
      if (filePath === '' || filePath === '/') {
        filePath = 'index.html';
      }
      
      const resolvedPath = path.join(__dirname, 'www', filePath);
      return net.fetch(pathToFileURL(resolvedPath).toString());
    } catch (e) {
      console.error('Failed to handle app protocol request:', e);
    }
  });

  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
