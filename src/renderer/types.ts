export interface BaileysKey {
  remoteJid?: string | null;
  fromMe?: boolean | null;
  id?: string | null;
  participant?: string | null;
}

export interface BaileysMessage {
  key?: BaileysKey | null;
  messageTimestamp?: number | null;
  pushName?: string | null;
  message?: any; 
}

export interface WhatsAppMessage {
  accountId: string;
  isGroup: boolean;
  msg: BaileysMessage;
  textContent: string;
  senderName?: string;
  groupName?: string | null;
}
