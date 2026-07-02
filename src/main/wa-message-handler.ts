import { BrowserWindow } from 'electron';
import { getDatabase } from './database';
import { processMessageRules } from './wa-rule-engine';

export async function handleIncomingMessage(
  sock: any,
  m: any,
  accountId: string,
  mainWindow: BrowserWindow | null,
  groupMetadataCache: Record<string, { subject: string, timestamp: number }>
) {
  const msg = m.messages[0];
  if (!msg || !msg.key || !msg.key.remoteJid) return; // Pengaman untuk sistem broadcast/status

  // [BUG FIX] Abaikan pesan status WhatsApp agar tidak masuk ke inbox personal
  if (msg.key.remoteJid === 'status@broadcast') return;

  if (!msg.key.fromMe && m.type === 'notify') {
    const remoteJid = msg.key.remoteJid;
    // Identifikasi grup (terverifikasi: akhiran @g.us)
    const isGroup = remoteJid.endsWith('@g.us');
    
    // Resolusi Nama Personal & Grup
    const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid)?.split('@')[0] || 'Unknown';
    let groupName = null;
    
    if (isGroup) {
      try {
        const now = Date.now();
        if (!groupMetadataCache[remoteJid] || now - groupMetadataCache[remoteJid].timestamp > 3600000) {
          const metadata = await sock.groupMetadata(remoteJid);
          groupMetadataCache[remoteJid] = { subject: metadata.subject, timestamp: now };
        }
        groupName = groupMetadataCache[remoteJid].subject;
      } catch (err) {
        console.error(`Gagal ambil nama grup ${remoteJid}:`, err);
      }
    }

    // Unwrap pesan (ephemeral / viewOnce)
    let innerMessage = msg.message;
    if (innerMessage?.ephemeralMessage?.message) {
      innerMessage = innerMessage.ephemeralMessage.message;
    } else if (innerMessage?.viewOnceMessage?.message) {
      innerMessage = innerMessage.viewOnceMessage.message;
    } else if (innerMessage?.viewOnceMessageV2?.message) {
      innerMessage = innerMessage.viewOnceMessageV2.message;
    }
    
    // Mengambil teks biasa atau caption gambar/video
    let textContent = innerMessage?.conversation || 
                        innerMessage?.extendedTextMessage?.text || 
                        innerMessage?.imageMessage?.caption || 
                        innerMessage?.videoMessage?.caption || '';
                        
    // Jika pesan adalah media (gambar/stiker/dsb) namun tidak ada caption
    if (!textContent) {
      if (innerMessage?.imageMessage || innerMessage?.videoMessage || innerMessage?.stickerMessage || innerMessage?.audioMessage || innerMessage?.documentMessage) {
        textContent = '[Media/Pesan Non-Teks]';
      } else if (innerMessage?.reactionMessage || innerMessage?.protocolMessage || innerMessage?.pollCreationMessage) {
        // Abaikan reaksi, tarikan pesan, atau polling (atau bisa di-handle khusus)
        return;
      } else {
        // [DEBUG] Log struktur pesan yang tidak dikenal
        console.log(`[DEBUG - Tipe Tak Tertangani]`, JSON.stringify(msg.message, null, 2));
        textContent = '[Tipe Pesan Tak Tertangani]';
      }
    }
    
    console.log(`[${accountId}] Pesan baru dari ${senderName}${isGroup ? ` di grup ${groupName}` : ''}: "${textContent}"`);
    
    // Simpan ke SQLite
    try {
      const db = getDatabase();
      if (textContent.trim() && textContent !== '[Tipe Pesan Tak Tertangani]') {
         db.prepare(`
           INSERT INTO messages (account_id, remote_jid, content, is_group, sender_name, group_name, msg_key_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
         `).run(accountId, remoteJid, textContent, isGroup ? 1 : 0, senderName, groupName, msg.key?.id || null);
      }
    } catch (err) {
      console.error(`[${accountId}] Gagal menyimpan pesan ke DB`, err);
    }
    
    // Kirim event ke React Frontend
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wa-message', { accountId, isGroup, msg, textContent, senderName, groupName });
    }

    // Panggil Rule Engine
    processMessageRules(accountId, textContent, isGroup, groupName);
  }
}
