import { useState, useEffect } from 'react';
import { Server, Copy, CheckCircle2, Play, Square, Terminal, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function ApiGateway() {
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState(3000);
  const [apiKey, setApiKey] = useState('');
  const [logs, setLogs] = useState<{ time: string; type: string; msg: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'php' | 'node' | 'python' | 'curl'>('php');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    // Load config from local storage
    const savedApiKey = localStorage.getItem('apiGateway_apiKey');
    if (savedApiKey) setApiKey(savedApiKey);
    
    const savedWebhookEnabled = localStorage.getItem('apiGateway_webhookEnabled') === 'true';
    const savedWebhookUrl = localStorage.getItem('apiGateway_webhookUrl') || '';
    
    setWebhookEnabled(savedWebhookEnabled);
    setWebhookUrl(savedWebhookUrl);
    
    // Sync initial webhook config to main process
    // @ts-ignore
    window.api.updateWebhook(savedWebhookEnabled, savedWebhookUrl);
    // Cek status saat pertama kali render
    // @ts-ignore
    window.api.getApiGatewayStatus().then((status: any) => {
      setIsRunning(status.isRunning);
      setPort(status.port);
      if (status.apiKey) setApiKey(status.apiKey);
    });

    // Dengarkan log dari Main Process
    // @ts-ignore
    const cleanup = window.api.onApiGatewayLog((log: any) => {
      setLogs(prev => {
        const newLogs = [...prev, { time: new Date().toLocaleTimeString(), ...log }];
        if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50); // Maksimal 50 log
        return newLogs;
      });
    });

    return cleanup;
  }, []);

  const generateApiKey = () => {
    return 'wa_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  const handleWebhookToggle = () => {
    const newVal = !webhookEnabled;
    setWebhookEnabled(newVal);
    localStorage.setItem('apiGateway_webhookEnabled', String(newVal));
    // @ts-ignore
    window.api.updateWebhook(newVal, webhookUrl);
  };
  
  const handleWebhookUrlChange = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('apiGateway_webhookUrl', url);
    // @ts-ignore
    window.api.updateWebhook(webhookEnabled, url);
  };

  const handleToggle = async () => {
    if (isRunning) {
      // @ts-ignore
      const status = await window.api.stopApiGateway();
      setIsRunning(status.isRunning);
    } else {
      let key = apiKey;
      if (!key) {
        key = generateApiKey();
        setApiKey(key);
        localStorage.setItem('apiGateway_apiKey', key);
      }
      // @ts-ignore
      const status = await window.api.startApiGateway(key);
      setIsRunning(status.isRunning);
      setPort(status.port);
      setApiKey(status.apiKey);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSnippet = () => {
    const url = `http://localhost:${port}/api/send-message`;
    // Gunakan 'TugasPoint' atau nama sesi yang relevan agar user tidak bingung
    const payload = `{
  "accountId": "TugasPoint", 
  "number": "08123456789", 
  "message": "Halo, ini pesan percobaan",
  "media": {
    "url": "https://example.com/image.png",
    "type": "image"
  }
}`;

    if (activeTab === 'php') {
      return `<?php
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => '${url}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => '${payload.replace(/\n/g, ' ')}',
  CURLOPT_HTTPHEADER => array(
    'x-api-key: ${apiKey || 'YOUR_API_KEY'}',
    'Content-Type: application/json'
  ),
));
$response = curl_exec($curl);
curl_close($curl);
echo $response;`;
    }

    if (activeTab === 'node') {
      return `const axios = require('axios');

const data = ${payload};

axios.post('${url}', data, {
  headers: {
    'x-api-key': '${apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));`;
    }
    
    if (activeTab === 'python') {
      return `import requests

url = "${url}"
# Gunakan multiline string untuk raw JSON
payload = """${payload}"""
headers = {
  'x-api-key': '${apiKey || 'YOUR_API_KEY'}',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)
print(response.text)`;
    }

    // Windows CMD/PowerShell compatible curl
    const oneLinePayload = payload.replace(/\n/g, '').replace(/"/g, '\\"');
    return `curl -X POST ${url} -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d "${oneLinePayload}"`;
  };

  return (
    <div className="flex-1 bg-background/50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/50 bg-card/30 flex justify-between items-center z-10 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center tracking-tight">
            <Server className="mr-3 text-wa-primary" size={28} />
            API Gateway Lokal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ubah aplikasi desktop Anda menjadi server notifikasi WhatsApp.</p>
        </div>
        <div className="flex items-center space-x-4 bg-muted/50 p-2 rounded-xl border border-border/50">
          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${isRunning ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'}`}></div>
          <span className="font-semibold text-sm mr-2">{isRunning ? `Aktif di Port ${port}` : 'Nonaktif'}</span>
          <button
            onClick={handleToggle}
            className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              isRunning 
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20' 
                : 'bg-wa-primary hover:bg-wa-primary/90 text-white shadow-[0_4px_12px_rgba(0,168,132,0.3)]'
            }`}
          >
            {isRunning ? <><Square size={14} className="mr-2" /> Hentikan Server</> : <><Play size={14} className="mr-2" /> Aktifkan Gateway</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Kolom Kiri: Pengaturan & Code Snippets */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-border/50 scrollbar-thin">
          
          {/* Card API Key */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-wa-primary/10 rounded-full blur-2xl"></div>
            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Kredensial Keamanan</h3>
            <div className="mb-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">API Key Anda</label>
              <div className="flex">
                <input 
                  type="text" 
                  value={apiKey} 
                  readOnly 
                  placeholder={isRunning ? apiKey : "Klik tombol aktifkan untuk men-generate key"}
                  className="flex-1 bg-background border border-border rounded-l-xl px-4 py-3 font-mono text-sm text-foreground focus:outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(apiKey)}
                  disabled={!apiKey}
                  className="bg-muted hover:bg-muted/80 border border-l-0 border-border rounded-r-xl px-4 flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Salin API Key"
                >
                  {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} className="text-muted-foreground" />}
                </button>
                <button 
                  onClick={() => {
                    if (isRunning) {
                      alert("Matikan server terlebih dahulu untuk mengganti API Key.");
                      return;
                    }
                    const newKey = generateApiKey();
                    setApiKey(newKey);
                    localStorage.setItem('apiGateway_apiKey', newKey);
                  }}
                  className="ml-2 bg-muted hover:bg-muted/80 border border-border rounded-xl px-4 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                  title="Regenerate API Key"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-500 mt-2 font-medium flex items-center">
              * Sertakan key ini di HTTP Header `x-api-key` pada setiap request Anda.
            </p>
          </div>

          {/* Card Webhook */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center">
                Webhook <span className="ml-2 text-xs font-normal normal-case bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">2-Way API</span>
              </h3>
              <div className="flex items-center">
                <span className={`text-xs font-semibold mr-3 ${webhookEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {webhookEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={handleWebhookToggle}
                  className={`relative w-10 h-5 rounded-full transition-colors ${webhookEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
                >
                  <span className={`absolute left-1 top-1 w-3 h-3 rounded-full bg-white transition-transform ${webhookEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            
            <div className="mb-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Webhook URL Tujuan (POST)</label>
              <input 
                type="text" 
                value={webhookUrl} 
                onChange={(e) => handleWebhookUrlChange(e.target.value)}
                placeholder="https://sistem-anda.com/api/webhook"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-wa-primary transition-colors"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Jika aktif, setiap pesan yang masuk ke WhatsApp akan di-*forward* ke URL ini secara *real-time* dengan metode <strong className="text-foreground">POST JSON</strong>.
            </p>
          </div>

          {/* Card API Docs / Snippets */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Contoh Integrasi</h3>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-border bg-background">
              {['php', 'node', 'python', 'curl'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-3 text-xs font-bold uppercase transition-all ${activeTab === tab ? 'text-wa-primary border-b-2 border-wa-primary bg-wa-primary/5' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {tab === 'node' ? 'Node.js' : tab}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="relative group">
              <pre className="p-6 bg-[#0d1117] text-gray-300 font-mono text-[13px] overflow-x-auto">
                <code>{getSnippet()}</code>
              </pre>
              <button 
                onClick={() => copyToClipboard(getSnippet())}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>
            
            <div className="p-4 bg-muted/30 border-t border-border text-xs text-muted-foreground">
              Endpoint ini akan memicu akun yang Anda isi pada <code className="bg-background px-1 py-0.5 rounded border border-border">accountId</code> untuk mengirim pesan ke <code className="bg-background px-1 py-0.5 rounded border border-border">number</code>. Pastikan <code className="bg-background px-1 py-0.5 rounded border border-border">accountId</code> tersebut sudah di-scan di aplikasi ini.
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Log Viewer */}
        <div className="w-1/2 flex flex-col bg-[#0d1117] border-l border-border/50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <h3 className="font-semibold text-gray-200 flex items-center text-sm tracking-wide">
              <Terminal size={16} className="mr-2 text-wa-primary" />
              API Server Terminal
            </h3>
            {isRunning && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full animate-pulse border border-emerald-400/20">
                Listening...
              </span>
            )}
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-2 font-mono text-xs scrollbar-thin">
            {!isRunning && logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Server size={48} className="mb-4 opacity-20" />
                <p>Server sedang tidak berjalan.</p>
                <p className="mt-1">Klik "Aktifkan Gateway" untuk memulai.</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={idx} 
                  className={`flex items-start ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-emerald-400' : 
                    'text-blue-300'
                  }`}
                >
                  <span className="mr-3 opacity-50 shrink-0 select-none">[{log.time}]</span>
                  <span className="break-all">{log.msg}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
