// Deklarasi Global agar TypeScript mengenali window.api yang diekspos oleh preload.ts
export {};


declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      showNotification: (title: string, body: string) => void;
      addWhatsAppAccount: (accountId: string) => void;
      getSavedAccounts: () => Promise<string[]>;
      getRules: (accountId: string) => Promise<{id: number, keyword: string, is_active: number}[]>;
      addRule: (accountId: string, keyword: string) => Promise<boolean>;
      deleteRule: (id: number) => Promise<boolean>;
      deleteAccount: (accountId: string) => Promise<boolean>;
      getMessages: (accountId: string, offset?: number) => Promise<any[]>;
      deleteMessage: (msgKeyId: string) => void;
      clearMessages: (accountId: string, isGroup?: boolean) => void;
      sendMessage: (accountId: string, jid: string, text: string, imageBuffer?: ArrayBuffer) => Promise<boolean>;
      getGroups: (accountId: string) => Promise<{ id: string; name: string }[]>;
      simulateTyping: (accountId: string, jid: string, durationMs: number) => Promise<boolean>;
      joinGroupByCode: (accountId: string, code: string) => Promise<{ success: boolean, reason?: string, groupId?: string, subject?: string }>;
      onWhatsAppMessage: (callback: (data: any) => void) => () => void;
      onWhatsAppQR: (callback: (data: { accountId: string, qr: string }) => void) => () => void;
      onWhatsAppConnected: (callback: (data: { accountId: string }) => void) => () => void;
      onWhatsAppLoggedOut: (callback: (data: { accountId: string }) => void) => () => void;
    }
  }
}
