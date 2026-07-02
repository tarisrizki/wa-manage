import { Notification } from 'electron';
import { getDatabase } from './database';

// Cache rule engine untuk mempercepat pencarian (mencegah lag UI akibat hit DB tiap pesan masuk)
export const rulesCache: Record<string, {keyword: string}[]> = {};

// Cache for cross-device notification deduplication
const recentNotifiedMessages = new Set<string>();

export function reloadRulesCache(accountId: string) {
  try {
    const db = getDatabase();
    rulesCache[accountId] = db.prepare('SELECT keyword FROM notification_rules WHERE account_id = ? AND is_active = 1').all(accountId) as {keyword: string}[];
  } catch (err) {
    console.error(`Gagal memuat rule cache untuk ${accountId}`, err);
  }
}

export function clearRulesCache(accountId: string) {
  delete rulesCache[accountId];
}

export function processMessageRules(
  accountId: string, 
  textContent: string, 
  isGroup: boolean, 
  groupName: string | null,
  remoteJid: string,
  senderName: string
) {
  try {
    // Fallback jika cache belum siap
    if (!rulesCache[accountId]) reloadRulesCache(accountId);
    if (!rulesCache['ALL']) reloadRulesCache('ALL'); // Load global rules
    
    // Merge rules: gabungkan rule khusus akun dengan rule global (ALL)
    const accountRules = rulesCache[accountId] || [];
    const globalRules = rulesCache['ALL'] || [];
    const rules = [...accountRules, ...globalRules];
    
    const messageLower = textContent.toLowerCase();
    
    for (const rule of rules) {
      const kw = rule.keyword?.trim();
      if (kw && kw !== '' && messageLower.includes(kw.toLowerCase())) {
        console.log(`[RULE ENGINE] Pesan masuk cocok dengan keyword: "${rule.keyword}"`);
        
        // Buat signature unik untuk mencegah notifikasi tabrakan antar akun
        const signature = `${groupName || 'Private'}-${textContent}`;
        
        if (!recentNotifiedMessages.has(signature)) {
          // Panggil Native OS Notification
          new Notification({
            title: `Pesan WA Penting`,
            body: isGroup ? `[Grup: ${groupName}] ${textContent}` : textContent
          }).show();
          
          // Masukkan ke cache untuk deduplikasi
          recentNotifiedMessages.add(signature);
          
          // Hapus dari cache setelah 2 menit agar tidak memory leak
          setTimeout(() => {
            recentNotifiedMessages.delete(signature);
          }, 120000);
        } else {
          console.log(`[RULE ENGINE] Notifikasi di-skip karena duplikat lintas-akun (Deduplikasi Aktif)`);
        }
        
        break; // Stop agar tidak muncul notifikasi dobel jika banyak rule cocok
      }
    }
  } catch (err) {
    console.error('Error saat menjalankan Rule Engine:', err);
  }
}
