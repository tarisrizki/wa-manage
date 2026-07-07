import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase } from './database';
import { reloadRulesCache, rulesCache, clearRulesCache } from './wa-rule-engine';
import { handleIncomingMessage } from './wa-message-handler';

// Menyimpan banyak socket WhatsApp dalam satu object, memungkinan multi-akun yang tak terbatas.
const activeSockets: Record<string, any> = {};

// Melacak akun yang baru saja dihapus agar tidak melakukan reconnect otomatis
const deletedAccounts: Set<string> = new Set();
// Melacak jumlah kegagalan koneksi untuk perhitungan exponential backoff
const reconnectAttemptsMap: Record<string, number> = {};

// Cache group metadata agar tidak terkena rate limit
const groupMetadataCache: Record<string, { subject: string, timestamp: number }> = {};

export { reloadRulesCache };

// Cache Promise versi WA agar jika ada multi-akun yang dimuat serentak, mereka menunggu 1 request yang sama (Anti Race-Condition)
let waVersionPromise: Promise<[number, number, number]> | null = null;

export async function connectToWhatsApp(accountId: string, mainWindow: BrowserWindow | null, isManualAdd: boolean = false) {
  // Jika akun ditambahkan ulang secara manual dari UI, pastikan flag hapus di-reset agar bisa digunakan kembali
  if (isManualAdd) {
    deletedAccounts.delete(accountId);
  }

  // [BUG FIX] Mencegah Race Condition: Jangan buat socket baru jika akun ini sudah aktif/sedang login
  if (activeSockets[accountId]) {
    console.log(`[${accountId}] Socket sudah aktif. Abaikan permintaan koneksi ganda.`);
    return;
  }

  // Sesuai aturan pnew.md: Auth state tiap akun disimpan di folder unik
  const authFolder = path.join(app.getPath('userData'), 'accounts', accountId, 'auth');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  // Mengambil versi WA terbaru agar tidak ditolak server (Fix Error 405/428)
  // [ANTI-CRASH & ANTI RACE-CONDITION] Memastikan hanya ada 1 HTTP request ke server meskipun 100 akun dipanggil serentak
  if (!waVersionPromise) {
    waVersionPromise = fetchLatestWaWebVersion()
      .then(res => res.version)
      .catch(e => {
        console.warn(`Gagal menarik versi WA terbaru, menggunakan versi fallback.`);
        waVersionPromise = null; // [BUG FIX] Hapus cache agar bisa dicoba fetch lagi di kesempatan berikutnya!
        return [2, 3000, 101591] as [number, number, number];
      });
  }
  const version = await waVersionPromise;

  // [CRITICAL BUG FIX] Jika saat proses 'await' di atas berjalan, pengguna ternyata menekan tombol Hapus Akun, kita harus membatalkan pembuatan soket agar tidak jadi soket hantu.
  if (deletedAccounts.has(accountId)) {
    console.log(`[${accountId}] Akun dihapus saat inisialisasi. Pembuatan soket dibatalkan.`);
    return;
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }) as any,
    markOnlineOnConnect: false, // [ANTI-BAN] Jangan siarkan status "Online" terus menerus saat aplikasi berjalan di background
    syncFullHistory: false, // [ANTI-BAN] Mencegah unduhan riwayat penuh yang bisa membebani server dan dicurigai spam
    browser: ['Mac OS', 'Safari', '10.15.7'], // [ANTI-BAN] Browser Fingerprint Spoofing (Menyamar sebagai pengguna Mac asli)
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wa-qr', { accountId, qr });
    }
    
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      
      // Jangan reconnect jika akun sengaja dihapus oleh pengguna
      if (deletedAccounts.has(accountId)) {
        console.log(`[${accountId}] Akun sengaja dihapus, membatalkan reconnect.`);
        deletedAccounts.delete(accountId); // bersihkan dari memori
        return;
      }
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`[${accountId}] Koneksi terputus (Status: ${statusCode}), reconnect: ${shouldReconnect}`);
      console.log(`[${accountId}] Detail Error:`, (lastDisconnect?.error as any)?.message || lastDisconnect?.error);
      
      if (shouldReconnect) {
        // [BUG FIX] Mencegah pemanggilan ganda jika event close terpanggil berkali-kali (Race Condition)
        if (activeSockets[accountId] && activeSockets[accountId].isReconnecting) return;
        
        if (activeSockets[accountId]) {
          activeSockets[accountId].isReconnecting = true;
        }

        // Hapus instance socket lama dari memori sebelum membuat yang baru
        delete activeSockets[accountId];
        
        // Exponential Backoff untuk mencegah Rate Limit / Banned (3s, 6s, 12s... maks 60s)
        const attempts = (reconnectAttemptsMap[accountId] || 0) + 1;
        reconnectAttemptsMap[accountId] = attempts;
        const delay = Math.min(3000 * Math.pow(2, attempts - 1), 60000);

        console.log(`[${accountId}] Mencoba menyambung ulang dalam ${delay/1000} detik (Percobaan ke-${attempts})...`);

        setTimeout(() => {
          // Jika dalam masa tunggu ternyata user menghapus akun, batalkan!
          if (deletedAccounts.has(accountId)) {
             console.log(`[${accountId}] Akun dihapus saat masa tunggu reconnect. Reconnect dibatalkan.`);
             deletedAccounts.delete(accountId); // bersihkan dari memori
             return;
          }
          connectToWhatsApp(accountId, mainWindow, false);
        }, delay);
      } else {
        // Jika loggedOut (dikeluarkan dari HP), hapus secara PERMANEN dari memori, disk, dan database agar tidak jadi zombie
        delete activeSockets[accountId];
        
        // 1. Hapus token kadaluarsa 
        const authPath = path.join(app.getPath('userData'), 'accounts', accountId, 'auth');
        fs.promises.rm(authPath, { recursive: true, force: true }).then(() => {
          console.log(`[${accountId}] Sesi kedaluwarsa dibersihkan secara otomatis.`);
        }).catch(err => {
          console.error(`[${accountId}] Gagal menghapus sesi kedaluwarsa:`, err);
        });

        // 2. [BUG FIX] Hapus dari Database SQLite secara menyeluruh agar tidak me-load hantu/zombie data saat restart
        try {
          const db = getDatabase();
          db.prepare('DELETE FROM notification_rules WHERE account_id = ?').run(accountId);
          db.prepare('DELETE FROM messages WHERE account_id = ?').run(accountId);
          db.prepare('DELETE FROM chats WHERE account_id = ?').run(accountId);
          db.prepare('DELETE FROM contacts WHERE account_id = ?').run(accountId);
          db.prepare('DELETE FROM accounts WHERE account_id = ?').run(accountId);
        } catch (e) {
          console.error(`Gagal menghapus zombie record dari DB untuk ${accountId}`, e);
        }

        // 3. Beritahu React UI untuk menghapus akun ini dari Sidebar
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('wa-logged-out', { accountId });
        }
      }
    } else if (connection === 'open') {
      console.log(`[${accountId}] Terhubung sukses!`);
      // Reset counter backoff saat berhasil terhubung
      reconnectAttemptsMap[accountId] = 0;
      
      // Muat ulang cache rules setiap kali soket terhubung
      reloadRulesCache(accountId);
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('wa-connected', { accountId });
      }
    }
  });

  // Penting untuk memastikan sesi bertahan lintas-restart (persisten)
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    handleIncomingMessage(sock, m, accountId, mainWindow, groupMetadataCache);
  });

  activeSockets[accountId] = sock;
}

export function initWhatsAppManager(mainWindow: BrowserWindow | null) {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT account_id FROM accounts').all() as {account_id: string}[];
    
    if (rows.length > 0) {
      console.log(`[INIT] Ditemukan ${rows.length} akun tersimpan. Memulai koneksi...`);
      for (const row of rows) {
        connectToWhatsApp(row.account_id, mainWindow);
      }
    }
  } catch (err) {
    console.error('Gagal memuat akun dari database saat init:', err);
  }
}

export function deleteWhatsAppAccount(accountId: string) {
  try {
    deletedAccounts.add(accountId); // Tandai akun sebagai dihapus
    
    // Hapus dari memory cache agar tidak terjadi memory leak
    clearRulesCache(accountId);
    delete reconnectAttemptsMap[accountId];
    
    // 1. Putus koneksi soket jika masih aktif
    if (activeSockets[accountId]) {
      try {
        activeSockets[accountId].ev.removeAllListeners();
        // [BUG FIX] Penutupan yang benar untuk Baileys Socket
        activeSockets[accountId].end(undefined);
      } catch (e) {}
      delete activeSockets[accountId];
    }
    
    // 2. Hapus folder auth dari disk agar sesi benar-benar hilang (reset)
    const authFolder = path.join(app.getPath('userData'), 'accounts', accountId);
    fs.promises.rm(authFolder, { recursive: true, force: true }).then(() => {
      console.log(`[${accountId}] Folder auth berhasil dihapus.`);
    }).catch(err => {
      console.error(`[${accountId}] Gagal menghapus file sesi:`, err);
    });
  } catch (err) {
    console.error(`[${accountId}] Gagal menghapus memori akun:`, err);
  }
}

export function cleanupWhatsAppManager() {
  console.log('[CLEANUP] Memutuskan semua koneksi WhatsApp secara aman sebelum aplikasi ditutup...');
  for (const accountId in activeSockets) {
    if (activeSockets[accountId]) {
      try {
        activeSockets[accountId].ev.removeAllListeners();
        // [BUG FIX] Penutupan yang benar untuk Baileys Socket
        activeSockets[accountId].end(undefined);
      } catch (e) {}
    }
  }
}

// [FITUR BARU] Endpoint untuk mengirim pesan dari UI (Balasan atau Broadcast)
export async function sendMessage(accountId: string, jid: string, text: string, imageBuffer?: Buffer | Uint8Array | ArrayBuffer): Promise<boolean> {
  try {
    const sock = activeSockets[accountId];
    if (!sock) {
      console.error(`[${accountId}] Gagal kirim pesan: Socket tidak aktif.`);
      return false;
    }
    
    // Format JID dengan benar (tambahkan @s.whatsapp.net jika belum ada dan bukan grup)
    if (!jid.includes('@')) {
      jid = `${jid}@s.whatsapp.net`;
    }

    console.log(`[${accountId}] SendMessage called. JID: ${jid}, hasImage: ${!!imageBuffer}`);

    if (imageBuffer) {
      console.log(`[${accountId}] Image buffer received, sending media...`);
      // Convert ArrayBuffer to Node Buffer if necessary
      const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer as any);
      await sock.sendMessage(jid, { image: buffer, caption: text });
      console.log(`[${accountId}] Image sent successfully.`);
    } else {
      // Jika tidak ada gambar, kirim sebagai pesan teks biasa
      await sock.sendMessage(jid, { text });
    }
    
    return true;
  } catch (err) {
    console.error(`[${accountId}] Gagal mengirim pesan ke ${jid}:`, err);
    return false;
  }
}

export async function getGroups(accountId: string): Promise<{ id: string; name: string }[]> {
  try {
    const sock = activeSockets[accountId];
    if (!sock) {
      console.error(`[${accountId}] Gagal menarik grup: Socket tidak aktif.`);
      return [];
    }
    
    // Tarik semua grup yang diikuti oleh user saat ini
    const groups = await sock.groupFetchAllParticipating();
    
    // Format menjadi array yang mudah dirender di React
    return Object.values(groups).map((group: any) => ({
      id: group.id,
      name: group.subject
    }));
  } catch (err) {
    console.error(`[${accountId}] Gagal mengambil daftar grup:`, err);
    return [];
  }
}

// [ANTI-BAN] Simulasi mengetik agar akun terlihat seperti manusia asli
export async function simulateTyping(accountId: string, jid: string, durationMs: number): Promise<boolean> {
  try {
    const sock = activeSockets[accountId];
    if (!sock) return false;
    
    // Kirim status "Sedang mengetik..."
    await sock.sendPresenceUpdate('composing', jid);
    
    // Tunggu sesuai durasi
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    // Hentikan status mengetik
    await sock.sendPresenceUpdate('paused', jid);
    return true;
  } catch (err) {
    console.error(`[${accountId}] Gagal simulasi mengetik ke ${jid}:`, err);
    return false;
  }
}

// [FITUR BARU] Endpoint untuk bergabung dengan grup melalui invite code
export async function joinGroupByCode(accountId: string, inviteCode: string): Promise<{ success: boolean, reason?: string, groupId?: string, subject?: string }> {
  try {
    const sock = activeSockets[accountId];
    if (!sock) {
      console.error(`[${accountId}] Gagal join grup: Socket tidak aktif.`);
      return { success: false, reason: 'socket_not_active' };
    }

    console.log(`[${accountId}] Mencoba mendapatkan info grup untuk kode: ${inviteCode}`);
    const groupInfo = await sock.groupGetInviteInfo(inviteCode);
    
    if (!groupInfo) {
      return { success: false, reason: 'invalid_link' };
    }

    console.log(`[${accountId}] Info grup: ${groupInfo.subject}, requireApproval: ${groupInfo.joinApprovalMode}`);
    
    // Jika grup membutuhkan persetujuan admin, skip.
    if (groupInfo.joinApprovalMode) {
      return { success: false, reason: 'require_approval', subject: groupInfo.subject };
    }

    // Join grup
    const response = await sock.groupAcceptInvite(inviteCode);
    console.log(`[${accountId}] Berhasil join grup ${groupInfo.subject}, ID: ${response}`);
    
    return { success: true, groupId: response, subject: groupInfo.subject };
  } catch (err: any) {
    console.error(`[${accountId}] Gagal join grup via kode ${inviteCode}:`, err);
    return { success: false, reason: err?.message || 'unknown_error' };
  }
}
