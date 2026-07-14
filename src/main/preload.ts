import { contextBridge, ipcRenderer } from 'electron';

// Mengekspos fungsi yang aman dari Main Process agar bisa dipakai di Renderer (React)
// Komunikasi sepenuhnya menggunakan IPC, tidak ada nodeIntegration.
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', title, body),
  addWhatsAppAccount: (accountId: string) => ipcRenderer.send('add-wa-account', accountId),
  getSavedAccounts: () => ipcRenderer.invoke('get-saved-accounts'),
  
  // Rule Engine APIs
  getRules: (accountId: string) => ipcRenderer.invoke('get-rules', accountId),
  addRule: (accountId: string, keyword: string) => ipcRenderer.invoke('add-rule', accountId, keyword),
  deleteRule: (id: number) => ipcRenderer.invoke('delete-rule', id),
  deleteAccount: (accountId: string) => ipcRenderer.invoke('delete-account', accountId),
  
  // Fitur Pesan
  getMessages: (accountId: string, offset?: number) => ipcRenderer.invoke('get-messages', accountId, offset),
  deleteMessage: (msgKeyId: string) => ipcRenderer.send('delete-message', msgKeyId),
  clearMessages: (accountId: string, isGroup?: boolean) => ipcRenderer.send('clear-messages', accountId, isGroup),
  sendMessage: (accountId: string, jid: string, text: string, imageBuffer?: ArrayBuffer) => ipcRenderer.invoke('send-message', accountId, jid, text, imageBuffer),
  getGroups: (accountId: string) => ipcRenderer.invoke('get-groups', accountId),
  simulateTyping: (accountId: string, jid: string, durationMs: number) => ipcRenderer.invoke('simulate-typing', accountId, jid, durationMs),
  joinGroupByCode: (accountId: string, code: string) => ipcRenderer.invoke('join-group-by-code', accountId, code),
  getGroupInviteInfo: (accountId: string, code: string) => ipcRenderer.invoke('get-group-invite-info', accountId, code),
  scrapeGroup: (accountId: string, groupJid: string) => ipcRenderer.invoke('scrape-group', accountId, groupJid),
  
  // Analytics
  getAnalytics: () => ipcRenderer.invoke('get-analytics'),
  
  // Gmaps Scraper
  startGmapsScraper: (accountId: string, query: string, locationFilter: string = '') => ipcRenderer.send('start-gmaps-scraper', accountId, query, locationFilter),
  stopGmapsScraper: () => ipcRenderer.send('stop-gmaps-scraper'),
  
  onGmapsScraperResult: (callback: (data: { name: string, phone: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('gmaps-scraper-result', handler);
    return () => ipcRenderer.removeListener('gmaps-scraper-result', handler);
  },
  onGmapsScraperStatus: (callback: (status: string) => void) => {
    const handler = (_event: any, data: string) => callback(data);
    ipcRenderer.on('gmaps-scraper-status', handler);
    return () => ipcRenderer.removeListener('gmaps-scraper-status', handler);
  },
  onGmapsScraperEnd: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('gmaps-scraper-end', handler);
    return () => ipcRenderer.removeListener('gmaps-scraper-end', handler);
  },
  
  // Listener untuk pesan WhatsApp yang masuk
  onWhatsAppMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('wa-message', handler);
    return () => ipcRenderer.removeListener('wa-message', handler);
  },
  
  onWhatsAppMessageStatusUpdate: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('wa-message-status-update', handler);
    return () => ipcRenderer.removeListener('wa-message-status-update', handler);
  },
  
  // Listener untuk QR Code login
  onWhatsAppQR: (callback: (data: { accountId: string, qr: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('wa-qr', handler);
    return () => ipcRenderer.removeListener('wa-qr', handler);
  },

  // Listener untuk status koneksi WhatsApp
  onWhatsAppConnected: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('wa-connected', handler);
    return () => ipcRenderer.removeListener('wa-connected', handler);
  },
  onWhatsAppLoggedOut: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('wa-logged-out', handler);
    return () => ipcRenderer.removeListener('wa-logged-out', handler);
  }
});
