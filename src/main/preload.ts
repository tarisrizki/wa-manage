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
  
  // Listener untuk pesan WhatsApp yang masuk
  onWhatsAppMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('wa-message', handler);
    return () => ipcRenderer.removeListener('wa-message', handler);
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
