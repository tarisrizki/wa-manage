import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { initWhatsAppManager, cleanupWhatsAppManager, connectToWhatsApp, deleteWhatsAppAccount, sendMessage, getGroups, simulateTyping, joinGroupByCode, scrapeGroupParticipants, getGroupInviteInfo } from './whatsapp-manager';
import { reloadRulesCache } from './wa-rule-engine';
import { initDatabase, getDatabase, deleteMessage, clearAllMessages, getMessages, getAnalyticsData } from './database';
import { startGmapsScraper, stopGmapsScraper } from './gmaps-scraper';
import { startApiGateway, stopApiGateway, getGatewayStatus, updateWebhookConfig } from './api-gateway';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const appIcon = nativeImage.createFromPath(iconPath);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // WAJIB true demi keamanan sesuai aturan pnew.md
      nodeIntegration: false, // WAJIB false, cegah akses Node.js API langsung dari React
    },
  });

  // Deteksi mode development dari argument (agar memuat URL Vite server lokal)
  const isDev = !app.isPackaged && process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  // Resize icon for Windows tray
  if (process.platform === 'win32') {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Buka WhatsApp Manager', click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      } 
    },
    { type: 'separator' },
    { label: 'Keluar', click: () => {
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('WhatsApp Web Manager');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

app.whenReady().then(() => {
  // [BUG FIX] Wajib di Windows 10/11 agar Native Notification bisa muncul
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.wamanage.desktop');
  }

  // 1. Inisialisasi Database bawaan Node.js
  initDatabase();
  
  // 2. Buat UI (Wajib dipanggil sebelum initWhatsAppManager agar mainWindow tidak null)
  createWindow();
  
  // Buat icon di system tray (taskbar pojok kanan)
  createTray();

  // 3. Siapkan manajer sesi WhatsApp (Baileys)
  initWhatsAppManager(mainWindow);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// [ANTI-BAN] Matikan semua socket secara aman sebelum aplikasi benar-benar tertutup
app.on('before-quit', () => {
  cleanupWhatsAppManager();
});

// [BUG FIX] Tangkap sinyal terminasi paksa (seperti saat npm run dev di-restart/hot-reload)
// agar tidak ada proses zombie WhatsApp (Error 440 Conflict) yang tertinggal di memori.
const handleGracefulShutdown = () => {
  console.log('[SYSTEM] Menerima sinyal terminasi paksa. Melakukan pembersihan...');
  cleanupWhatsAppManager();
  process.exit(0);
};

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);
process.on('exit', () => {
  cleanupWhatsAppManager();
});

// Endpoint IPC
ipcMain.handle('ping', () => 'pong');

ipcMain.on('show-notification', (event, title, body) => {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  // Memanfaatkan API Native OS bawaan Electron untuk notifikasi
  new Notification({ title, body, icon: iconPath }).show();
});

ipcMain.on('add-wa-account', (event, accountId) => {
  // [SECURITY FIX] Mencegah Path Traversal (misal hacker/input nakal mengirim ../../)
  // Hanya izinkan huruf, angka, strip, dan underscore
  const safeAccountId = String(accountId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeAccountId) return;
  
  const db = getDatabase();
  try {
    db.prepare('INSERT OR IGNORE INTO accounts (account_id, name) VALUES (?, ?)').run(safeAccountId, safeAccountId);
  } catch (err) {
    console.error('Gagal simpan akun ke DB:', err);
  }
  
  connectToWhatsApp(safeAccountId, mainWindow, true);
});

ipcMain.handle('get-saved-accounts', () => {
  const db = getDatabase();
  const rows = db.prepare('SELECT account_id FROM accounts').all() as {account_id: string}[];
  return rows.map(r => r.account_id);
});

// [FITUR BARU] Menghapus akun dari Database dan File System
ipcMain.handle('delete-account', (event, accountId) => {
  // [SECURITY FIX] Sanitasi input untuk konsistensi dengan add-wa-account
  const safeAccountId = String(accountId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeAccountId) return false;
  
  // 1. Hapus memori dan folder auth
  deleteWhatsAppAccount(safeAccountId);
  
  // 2. Hapus dari database secara menyeluruh untuk mencegah orphan records / data hantu
  const db = getDatabase();
  db.prepare('DELETE FROM notification_rules WHERE account_id = ?').run(safeAccountId);
  db.prepare('DELETE FROM messages WHERE account_id = ?').run(safeAccountId);
  db.prepare('DELETE FROM chats WHERE account_id = ?').run(safeAccountId);
  db.prepare('DELETE FROM contacts WHERE account_id = ?').run(safeAccountId);
  db.prepare('DELETE FROM accounts WHERE account_id = ?').run(safeAccountId);
  
  return true;
});

// [BUG FIX] Menambahkan IPC untuk Rule Engine (Filter Keyword)
ipcMain.handle('get-rules', (event, accountId) => {
  const db = getDatabase();
  return db.prepare('SELECT id, keyword, is_active FROM notification_rules WHERE account_id = ?').all(accountId);
});

ipcMain.handle('add-rule', (event, accountId, keyword) => {
  const db = getDatabase();
  db.prepare('INSERT INTO notification_rules (account_id, keyword) VALUES (?, ?)').run(accountId, keyword);
  
  // Reload rules cache
  reloadRulesCache(accountId);
  
  return true;
});

ipcMain.handle('delete-rule', (event, id) => {
  const db = getDatabase();
  
  try {
    // Cari account_id terlebih dahulu sebelum dihapus agar bisa me-reload cache dengan benar
    const rule = db.prepare('SELECT account_id FROM notification_rules WHERE id = ?').get(id) as {account_id: string} | undefined;
    
    db.prepare('DELETE FROM notification_rules WHERE id = ?').run(id);
    
    // Reload rules cache jika rule ditemukan
    if (rule) {
      reloadRulesCache(rule.account_id);
    }
    
    return true;
  } catch (err) {
    console.error('Gagal menghapus rule:', err);
    return false;
  }
});

// Endpoint untuk Menghapus Pesan
ipcMain.on('delete-message', (event, msgKeyId: string) => {
  deleteMessage(msgKeyId);
});

ipcMain.on('clear-messages', (event, accountId: string, isGroup?: boolean) => {
  clearAllMessages(accountId, isGroup);
});

// [FITUR BARU] Endpoint untuk memuat riwayat obrolan
ipcMain.handle('get-messages', (event, accountId: string, offset?: number) => {
  return getMessages(accountId, offset || 0);
});

// [FITUR BARU] Endpoint untuk mengirim pesan balasan
ipcMain.handle('send-message', async (event, accountId: string, jid: string, text: string, imageBuffer?: ArrayBuffer) => {
  return await sendMessage(accountId, jid, text, imageBuffer);
});

// [FITUR BARU] Endpoint untuk mengambil daftar grup
ipcMain.handle('get-groups', async (event, accountId: string) => {
  return await getGroups(accountId);
});

// [ANTI-BAN] Endpoint untuk simulasi mengetik
ipcMain.handle('simulate-typing', async (event, accountId: string, jid: string, durationMs: number) => {
  return await simulateTyping(accountId, jid, durationMs);
});

// [FITUR BARU] Endpoint untuk join grup dari kode undangan
ipcMain.handle('join-group-by-code', async (event, accountId: string, code: string) => {
  return await joinGroupByCode(accountId, code);
});

// [FITUR BARU] Endpoint untuk cek metadata invite link grup
ipcMain.handle('get-group-invite-info', async (event, accountId: string, code: string) => {
  return await getGroupInviteInfo(accountId, code);
});

// [ANALYTICS] Endpoint untuk dashboard analitik
  ipcMain.handle('get-analytics', async () => {
    return getAnalyticsData();
  });
  
  // Gmaps Scraper Handlers
  ipcMain.on('start-gmaps-scraper', (event, accountId: string, query: string, locationFilter: string = '') => {
    startGmapsScraper(mainWindow!, accountId, query, locationFilter);
  });

  ipcMain.on('stop-gmaps-scraper', () => {
    stopGmapsScraper();
  });

// [FITUR BARU] Endpoint untuk Group Scraper
ipcMain.handle('scrape-group', async (event, accountId: string, groupJid: string) => {
  return await scrapeGroupParticipants(accountId, groupJid);
});

// [FITUR BARU] API Gateway Handlers
ipcMain.handle('api-gateway:start', (event, apiKey: string) => {
  return startApiGateway(apiKey, (log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('api-gateway:log', log);
    }
  });
});

ipcMain.handle('api-gateway:stop', () => {
  return stopApiGateway((log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('api-gateway:log', log);
    }
  });
});

  ipcMain.handle('api-gateway:status', () => {
    return getGatewayStatus();
  });
  
  ipcMain.handle('api-gateway:update-webhook', (_event, enabled: boolean, url: string) => {
    updateWebhookConfig(enabled, url);
    return { success: true };
  });
