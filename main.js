
import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITIQUE : Doit être appelé AVANT app.whenReady() pour désactiver le service Google Location
app.commandLine.appendSwitch('disable-features', 'NetworkLocationProvider');
app.commandLine.appendSwitch('enable-blink-features', 'Geolocation');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      partition: 'persist:commercepro'
    },
    title: "CommercePro ERP",
    autoHideMenuBar: true,
    show: false
  });

  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  const loadURL = () => {
    win.loadURL('http://localhost:5173').catch(() => {
      console.log('Attente du serveur Vite...');
      setTimeout(loadURL, 1500);
    });
  };

  loadURL();

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'geolocation') return true;
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') callback(true);
    else callback(false);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
