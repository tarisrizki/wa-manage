import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { sendMessage, MediaOptions } from './whatsapp-manager';

export interface ApiGatewayState {
  isRunning: boolean;
  port: number;
  apiKey: string;
}

let server: Server | null = null;
let currentApiKey = '';
const PORT = 3000;

export function startApiGateway(apiKey: string, onLog: (log: any) => void): ApiGatewayState {
  if (server) {
    return { isRunning: true, port: PORT, apiKey: currentApiKey };
  }

  currentApiKey = apiKey;
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Middleware untuk API Key
  app.use((req, res, next) => {
    let key = req.headers['x-api-key'] || req.query.api_key;
    if (typeof key === 'string') {
      key = key.trim();
    }
    
    if (key !== currentApiKey) {
      onLog({ type: 'error', msg: `Akses ditolak: API Key tidak valid. (IP: ${req.ip})` });
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
    }
    next();
  });

  // Endpoint Status
  app.get('/api/status', (req, res) => {
    res.json({ success: true, message: 'Gateway is running', version: '1.0' });
  });

  // Endpoint Send Message
  app.post('/api/send-message', async (req, res) => {
    const { accountId, number, message, media } = req.body;

    if (!accountId || !number) {
      const errorMsg = 'Parameter tidak lengkap (butuh accountId dan number)';
      onLog({ type: 'error', msg: `Request gagal: ${errorMsg}` });
      return res.status(400).json({ success: false, error: errorMsg });
    }

    try {
      // Sanitasi nomor (hapus karakter non-digit)
      let cleanNumber = number.replace(/\D/g, '');
      if (cleanNumber.startsWith('0')) {
        cleanNumber = '62' + cleanNumber.substring(1);
      }

      onLog({ type: 'info', msg: `Memproses request ke ${cleanNumber} via akun ${accountId}...` });
      
      let mediaBuffer: Buffer | undefined = undefined;
      let mediaOpts: MediaOptions | undefined = undefined;

      // Proses Media jika ada
      if (media && typeof media === 'object') {
        const { url, base64, type = 'image', mimetype, fileName } = media;
        
        mediaOpts = { type, mimetype, fileName };

        if (base64) {
          onLog({ type: 'info', msg: `Mendekode media dari base64...` });
          mediaBuffer = Buffer.from(base64, 'base64');
        } else if (url) {
          onLog({ type: 'info', msg: `Mengunduh media dari URL: ${url}` });
          const response = await fetch(url);
          if (!response.ok) {
             throw new Error(`Gagal mengunduh URL media: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          mediaBuffer = Buffer.from(arrayBuffer);
        }
      }

      const success = await sendMessage(accountId, cleanNumber, message || '', mediaBuffer, mediaOpts);
      
      if (success) {
        onLog({ type: 'success', msg: `✅ Berhasil kirim pesan ke ${number}` });
        return res.json({ success: true, message: 'Message sent successfully' });
      } else {
        onLog({ type: 'error', msg: `❌ Gagal kirim pesan ke ${number} (Socket tidak aktif/Error)` });
        return res.status(500).json({ success: false, error: 'Failed to send message' });
      }
    } catch (err: any) {
      onLog({ type: 'error', msg: `❌ Exception: ${err.message}` });
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  server = app.listen(PORT, () => {
    console.log(`[API Gateway] Server running on port ${PORT}`);
    onLog({ type: 'success', msg: `🚀 Server Gateway aktif di port ${PORT}` });
  });

  return { isRunning: true, port: PORT, apiKey: currentApiKey };
}

export function stopApiGateway(onLog: (log: any) => void): ApiGatewayState {
  if (server) {
    server.close(() => {
      console.log('[API Gateway] Server stopped');
      onLog({ type: 'info', msg: `🛑 Server Gateway dihentikan.` });
    });
    server = null;
  }
  return { isRunning: false, port: PORT, apiKey: '' };
}

export function getGatewayStatus(): ApiGatewayState {
  return {
    isRunning: !!server,
    port: PORT,
    apiKey: currentApiKey
  };
}
