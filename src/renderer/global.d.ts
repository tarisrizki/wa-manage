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
      deleteMessage: (msgKeyId: string) => void;
      clearMessages: (accountId: string) => void;
      onWhatsAppMessage: (callback: (data: any) => void) => () => void;
      onWhatsAppQR: (callback: (data: { accountId: string, qr: string }) => void) => () => void;
      onWhatsAppConnected: (callback: (data: { accountId: string }) => void) => () => void;
      onWhatsAppLoggedOut: (callback: (data: { accountId: string }) => void) => () => void;
    }
  }
}
