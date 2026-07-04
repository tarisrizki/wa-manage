import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import * as path from 'path';

let db: DatabaseSync;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'wamanage.sqlite');
  
  // Memakai modul bawaan node:sqlite (bukan package eksternal) untuk meminimalisir
  // masalah ABI native module build pada Electron
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');

  // Buat tabel utama dengan kolom account_id sesuai instruksi (sumber: pnew.md)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL,
      content TEXT,
      is_group BOOLEAN,
      sender_name TEXT,
      group_name TEXT,
      msg_key_id TEXT,
      from_me BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrasi skema (tambahkan kolom jika database lama sudah telanjur terbentuk)
  try {
    db.exec("ALTER TABLE messages ADD COLUMN sender_name TEXT;");
  } catch (e) {
    // Abaikan jika kolom sudah ada
  }
  
  try {
    db.exec("ALTER TABLE messages ADD COLUMN group_name TEXT;");
  } catch (e) {
    // Abaikan jika kolom sudah ada
  }

  try {
    db.exec("ALTER TABLE messages ADD COLUMN msg_key_id TEXT;");
  } catch (e) {
    // Abaikan jika kolom sudah ada
  }

  try {
    db.exec("ALTER TABLE messages ADD COLUMN from_me BOOLEAN DEFAULT 0;");
  } catch (e) {
    // Abaikan jika kolom sudah ada
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL,
      name TEXT,
      unread_count INTEGER DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL,
      name TEXT
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      name TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Clean up any existing duplicate messages
  try {
    db.exec(`
      DELETE FROM messages 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM messages 
        WHERE msg_key_id IS NOT NULL 
        GROUP BY account_id, msg_key_id
      ) AND msg_key_id IS NOT NULL;
    `);
  } catch (e) {
    console.error("Gagal membersihkan duplikat:", e);
  }
  
  console.log('Local SQLite Database initialized at:', dbPath);
}

export function getDatabase() {
  return db;
}

export function deleteMessage(msgKeyId: string) {
  try {
    db.prepare(`DELETE FROM messages WHERE msg_key_id = ?`).run(msgKeyId);
  } catch (err) {
    console.error("Gagal menghapus pesan:", err);
  }
}

export function clearAllMessages(accountId: string, isGroup?: boolean) {
  try {
    if (accountId === 'ALL') {
      if (isGroup === undefined) {
        db.prepare(`DELETE FROM messages`).run();
      } else {
        db.prepare(`DELETE FROM messages WHERE is_group = ?`).run(isGroup ? 1 : 0);
      }
    } else {
      if (isGroup === undefined) {
        db.prepare(`DELETE FROM messages WHERE account_id = ?`).run(accountId);
      } else {
        db.prepare(`DELETE FROM messages WHERE account_id = ? AND is_group = ?`).run(accountId, isGroup ? 1 : 0);
      }
    }
  } catch (err) {
    console.error("Gagal membersihkan pesan:", err);
  }
}

export function getMessages(accountId: string, offset: number = 0) {
  try {
    let rows: any[];
    if (accountId === 'ALL') {
      rows = db.prepare(`
        SELECT * FROM messages 
        ORDER BY id DESC 
        LIMIT 200 OFFSET ?
      `).all(offset) as any[];
    } else {
      rows = db.prepare(`
        SELECT * FROM messages 
        WHERE account_id = ? 
        ORDER BY id DESC 
        LIMIT 200 OFFSET ?
      `).all(accountId, offset) as any[];
    }
    
    // SQLite mengembalikan dari terbaru ke terlama karena DESC, kita balik urutannya
    return rows.reverse().map(row => ({
      accountId: row.account_id,
      isGroup: row.is_group === 1,
      textContent: row.content,
      senderName: row.sender_name,
      groupName: row.group_name,
      msg: {
        key: {
          id: row.msg_key_id,
          remoteJid: row.remote_jid,
          fromMe: row.from_me === 1
        }
      }
    }));
  } catch (err) {
    console.error("Gagal memuat pesan riwayat:", err);
    return [];
  }
}
