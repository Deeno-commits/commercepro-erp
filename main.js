
import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Désactivation des fonctionnalités Chrome qui causent des erreurs de protocole et ralentissent le rendu
app.commandLine.appendSwitch('disable-features', 'Autofill,AutofillEnableShadowDom,NetworkLocationProvider,PasswordGeneration');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('enable-blink-features', 'Geolocation');

function createWindow() {
  const iconPath = app.isPackaged 
    ? path.join(__dirname, 'dist', 'favicon.ico') 
    : path.join(__dirname, 'public', 'favicon.ico');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
      partition: 'persist:commercepro_session', // Persistance absolue de la session
      spellcheck: false,
      enableWebSQL: false
    },
    title: "CommercePro ERP",
    autoHideMenuBar: true,
    show: false,
    icon: iconPath
  });

  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  } else {
    const loadURL = () => {
      win.loadURL('http://localhost:5173').catch(() => {
        setTimeout(loadURL, 1000);
      });
    };
    loadURL();
  }

  win.once('ready-to-show', () => {
    win.show();
    // Force le focus pour éviter les lags d'initialisation
    win.focus();
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
