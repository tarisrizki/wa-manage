import { useState, useCallback } from 'react';

export interface BroadcastTarget {
  jid: string;
  name?: string;
  phone?: string;
}

export interface BroadcastOptions {
  activeAccount: string;
  targets: BroadcastTarget[];
  message: string;
  imageFile: File | null;
  delaySec: number;
  batchSize: number;
  batchDelaySec: number;
  useSpintax: boolean;
}

export function useBroadcast() {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0 });
  const [logs, setLogs] = useState<{msg: string, isError?: boolean}[]>([]);

  const addLog = useCallback((msg: string, isError = false) => {
    setLogs(prev => [...prev, { msg, isError }]);
  }, []);

  const injectInvisibleChars = (text: string) => {
    if (!text) return text;
    const invisibleChars = ['\u200B', '\u200C', '\u200D'];
    const chars = text.split('');
    const injections = Math.floor(Math.random() * 5) + 1; // Inject 1 to 5 chars
    
    for (let i = 0; i < injections; i++) {
      const pos = Math.floor(Math.random() * chars.length);
      const char = invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
      chars.splice(pos, 0, char);
    }
    return chars.join('');
  };

  const startBroadcast = async (options: BroadcastOptions) => {
    const { activeAccount, targets, message, imageFile, delaySec, batchSize, batchDelaySec, useSpintax } = options;
    
    if (targets.length === 0 || (!message.trim() && !imageFile)) return;
    
    setIsSending(true);
    setProgress({ total: targets.length, current: 0 });
    setLogs([]);
    
    let successCount = 0;
    let batchCounter = 0;
    
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const jid = target.jid;
      const groupName = target.name || target.phone || jid;
      
      addLog(`Mempersiapkan pengiriman ke ${groupName}...`);
      
      try {
        // 1. Simulasi mengetik dengan durasi acak
        const typeDuration = Math.min(message.length * 50, 5000);
        addLog(`Sedang ${imageFile ? 'mengirim gambar' : 'mengetik'}... (${(typeDuration/1000).toFixed(1)}s)`);
        
        // @ts-ignore
        await window.api.simulateTyping(activeAccount, jid, typeDuration);

        // 2. Menyisipkan karakter kosong acak untuk keunikan pesan (Spintax)
        let finalMessage = message;
        if (target.name) {
          finalMessage = finalMessage.replace(/\{\{Nama\}\}/gi, target.name);
        }
        finalMessage = useSpintax ? injectInvisibleChars(finalMessage) : finalMessage;

        let imageBuffer: ArrayBuffer | undefined = undefined;
        if (imageFile) {
          imageBuffer = await imageFile.arrayBuffer();
        }

        // Kirim pesan sebenarnya
        // @ts-ignore
        const success = await window.api.sendMessage(activeAccount, jid, finalMessage, imageBuffer);
        
        if (success) {
          addLog(`✅ Berhasil: ${groupName}`);
          successCount++;
          batchCounter++;
        } else {
          addLog(`❌ Gagal: ${groupName}`, true);
        }
      } catch (err) {
        addLog(`❌ Error: ${groupName}`, true);
      }
      
      setProgress({ total: targets.length, current: i + 1 });
      
      if (i === targets.length - 1) break;
      
      // 3. Batching (Istirahat Otomatis setelah N pesan)
      if (batchSize > 0 && batchCounter >= batchSize) {
        addLog(`Mencapai batas ${batchSize} pesan. Istirahat ${batchDelaySec} detik... ☕`);
        await new Promise(resolve => setTimeout(resolve, batchDelaySec * 1000));
        batchCounter = 0; 
      } else {
        // 4. Jeda acak antar pesan
        const baseMs = delaySec * 1000;
        const extraImageDelay = imageFile ? 2000 : 0; 
        const randomModifier = (Math.random() * 0.6) - 0.3; // -0.3 to +0.3
        const finalDelayMs = Math.max(1000, Math.round(baseMs * (1 + randomModifier))) + extraImageDelay;
        
        addLog(`Jeda aman ${ (finalDelayMs/1000).toFixed(1) } detik...`);
        await new Promise(resolve => setTimeout(resolve, finalDelayMs));
      }
    }
    
    addLog(`🎉 Selesai! Berhasil terkirim ke ${successCount}/${targets.length} target.`);
    setIsSending(false);
  };

  return { isSending, progress, logs, addLog, setLogs, startBroadcast };
}
