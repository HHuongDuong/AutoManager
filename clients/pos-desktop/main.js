const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow = win;
}

app.whenReady().then(createWindow);

ipcMain.handle('printers:list', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('printers:print', async (event, payload) => {
  const { html, deviceName } = payload || {};
  if (!html) throw new Error('missing_html');
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true }
  });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return new Promise((resolve, reject) => {
    printWindow.webContents.print({ silent: true, deviceName }, (success, errorType) => {
      printWindow.close();
      if (!success) return reject(new Error(errorType || 'print_failed'));
      return resolve(true);
    });
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
