
import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Désactivation des fonctionnalités inutiles pour la sécurité et activation du GPS
app.commandLine.appendSwitch('disable-features', 'NetworkLocationProvider');
app.commandLine.appendSwitch('enable-blink-features', 'Geolocation');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
      partition: 'persist:commercepro'
    },
    title: "CommercePro ERP",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'dist', 'favicon.ico') // Optionnel si vous ajoutez une icône
  });

  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  if (app.isPackaged) {
    // MODE PRODUCTION : On charge le fichier compilé par Vite
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  } else {
    // MODE DÉVELOPPEMENT : On charge le serveur de dev Vite
    const loadURL = () => {
      win.loadURL('http://localhost:5173').catch(() => {
        console.log('Attente du serveur Vite...');
        setTimeout(loadURL, 1500);
      });
    };
    loadURL();
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  // Gestion des permissions GPS
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
