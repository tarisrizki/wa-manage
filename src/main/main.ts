import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import * as path from 'path';
import { initWhatsAppManager, cleanupWhatsAppManager, connectToWhatsApp, deleteWhatsAppAccount } from './whatsapp-manager';
import { reloadRulesCache } from './wa-rule-engine';
import { initDatabase, getDatabase, deleteMessage, clearAllMessages, getMessages } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../assets/icon.png'),
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

app.whenReady().then(() => {
  // [BUG FIX] Wajib di Windows 10/11 agar Native Notification bisa muncul
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName() || 'com.wamanage.desktop');
  }

  // 1. Inisialisasi Database bawaan Node.js
  initDatabase();
  
  // 2. Buat UI (Wajib dipanggil sebelum initWhatsAppManager agar mainWindow tidak null)
  createWindow();

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

// Endpoint IPC
ipcMain.handle('ping', () => 'pong');

ipcMain.on('show-notification', (event, title, body) => {
  // Memanfaatkan API Native OS bawaan Electron untuk notifikasi
  new Notification({ title, body }).show();
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
