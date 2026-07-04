import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BroadcastModalProps {
  activeAccount: string;
  onClose: () => void;
}

interface GroupInfo {
  id: string;
  name: string;
}

export function BroadcastModal({ activeAccount, onClose }: BroadcastModalProps) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Anti-Ban States
  const [delaySec, setDelaySec] = useState(2);
  const [batchSize, setBatchSize] = useState(10);
  const [batchDelaySec, setBatchDelaySec] = useState(20);
  const [useSpintax, setUseSpintax] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Progress tracking
  const [progress, setProgress] = useState({ total: 0, current: 0 });
  const [logs, setLogs] = useState<{msg: string, isError?: boolean}[]>([]);

  // [ANTI-BAN] Helper: Inject invisible zero-width characters randomly
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

  useEffect(() => {
    if (activeAccount && activeAccount !== 'ALL') {
      setIsLoading(true);
      window.api.getGroups(activeAccount)
        .then(res => {
          setGroups(res || []);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setGroups([]);
          setIsLoading(false);
        });
    }
  }, [activeAccount]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === groups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groups.map(g => g.id)));
    }
  };

  const addLog = (msg: string, isError = false) => {
    setLogs(prev => [...prev, { msg, isError }]);
  };

  const handleSend = async () => {
    // Memastikan ada teks pesan atau ada gambar yang dikirim (tidak boleh dua-duanya kosong)
    if (selectedIds.size === 0 || (!message.trim() && !imageFile)) return;
    
    setIsSending(true);
    setProgress({ total: selectedIds.size, current: 0 });
    setLogs([]);
    
    const targets = Array.from(selectedIds);
    let successCount = 0;
    let batchCounter = 0;
    
    for (let i = 0; i < targets.length; i++) {
      const jid = targets[i];
      const groupName = groups.find(g => g.id === jid)?.name || jid;
      
      addLog(`Mempersiapkan pengiriman ke ${groupName}...`);
      
      try {
        // [ANTI-BAN] 1. Simulasi mengetik dengan durasi acak
        const typeDuration = Math.min(message.length * 50, 5000);
        addLog(`[Anti-Ban] Sedang ${imageFile ? 'mengirim gambar' : 'mengetik'}... (${(typeDuration/1000).toFixed(1)}s)`);
        await window.api.simulateTyping(activeAccount, jid, typeDuration);

        // [ANTI-BAN] 2. Hash Randomization (Spintax Tak Kasat Mata)
        const finalMessage = useSpintax ? injectInvisibleChars(message) : message;

        // Baca file gambar sebagai ArrayBuffer jika ada
        let imageBuffer: ArrayBuffer | undefined = undefined;
        if (imageFile) {
          imageBuffer = await imageFile.arrayBuffer();
        }

        // Kirim pesan sebenarnya
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
      
      // Stop and don't delay if we reached the end
      if (i === targets.length - 1) break;
      
      // [ANTI-BAN] 3. Batching (Istirahat Otomatis)
      if (batchSize > 0 && batchCounter >= batchSize) {
        addLog(`[Anti-Ban] Mencapai batas ${batchSize} pesan. Istirahat ${batchDelaySec} detik... ☕`);
        await new Promise(resolve => setTimeout(resolve, batchDelaySec * 1000));
        batchCounter = 0; // Reset counter setelah istirahat
      } else {
        // [ANTI-BAN] 4. Jeda acak antar pesan (Base Slider Delay ± 30%) + Ekstra 2 detik jika gambar
        const baseMs = delaySec * 1000;
        const extraImageDelay = imageFile ? 2000 : 0; 
        const randomModifier = (Math.random() * 0.6) - 0.3; // -0.3 to +0.3
        const finalDelayMs = Math.max(1000, Math.round(baseMs * (1 + randomModifier))) + extraImageDelay;
        
        addLog(`[Anti-Ban] Jeda aman ${ (finalDelayMs/1000).toFixed(1) } detik...`);
        await new Promise(resolve => setTimeout(resolve, finalDelayMs));
      }
    }
    
    addLog(`🎉 Selesai! Berhasil terkirim ke ${successCount}/${targets.length} grup.`);
    setIsSending(false);
  };

  if (activeAccount === 'ALL') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-wa-panel border border-[#313d45] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
          <div className="flex flex-col items-center text-center mt-4 mb-2">
            <AlertCircle size={50} className="text-yellow-500 mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Pilih Akun Spesifik</h2>
            <p className="text-sm text-gray-400">
              Fitur Broadcast membutuhkan Anda untuk memilih satu akun spesifik (bukan tab ALL) di sidebar kiri.
            </p>
            <button 
              onClick={onClose}
              className="mt-6 w-full py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg font-medium transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-wa-panel border border-[#313d45] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden relative flex-row"
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <button 
          onClick={onClose} 
          disabled={isSending}
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 disabled:opacity-50"
        >
          <X size={24} />
        </button>

        {/* KOLOM KIRI: Daftar Grup */}
        <div className="w-1/2 border-r border-[#313d45] flex flex-col bg-[#111b21]">
          <div className="p-5 border-b border-[#313d45]">
            <h2 className="text-xl font-medium text-[#e9edef] flex items-center">
              <Users className="mr-2 text-[#00a884]" />
              Pilih Target Grup
            </h2>
            <p className="text-xs text-gray-400 mt-1">Akun: {activeAccount}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00a884] border-t-transparent"></div>
                <p className="text-sm">Memuat daftar grup...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-6">
                <Users size={48} className="mb-4 opacity-50" />
                <p>Tidak ada grup yang terdeteksi.</p>
                <p className="text-xs mt-2">Pastikan akun ini sudah bergabung dengan beberapa grup WhatsApp.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div 
                  onClick={toggleAll}
                  className="flex items-center p-3 rounded-lg hover:bg-wa-hover cursor-pointer transition-colors mb-2 sticky top-0 bg-[#111b21] z-10 border-b border-[#313d45]"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${selectedIds.size === groups.length ? 'bg-[#00a884] border-[#00a884]' : 'border-gray-500'}`}>
                    {selectedIds.size === groups.length && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className="text-[#e9edef] font-medium flex-1">Pilih Semua ({groups.length})</span>
                </div>
                
                {groups.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => !isSending && toggleSelection(g.id)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-wa-hover'
                    } ${selectedIds.has(g.id) ? 'bg-[#2a3942]' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 shrink-0 ${selectedIds.has(g.id) ? 'bg-[#00a884] border-[#00a884]' : 'border-gray-500'}`}>
                      {selectedIds.has(g.id) && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#e9edef] text-sm font-medium truncate">{g.name}</p>
                      <p className="text-gray-500 text-xs truncate">{g.id.split('@')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Pesan & Log */}
        <div className="w-1/2 flex flex-col bg-wa-panel relative">
          <div className="flex-1 p-6 flex flex-col overflow-y-auto scrollbar-thin">
            
            {!isSending && progress.total === 0 ? (
              <>
                <h3 className="text-lg font-medium text-[#e9edef] mb-4">Pesan Broadcast</h3>
                
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={imageFile ? "Ketik caption untuk gambar ini..." : "Ketik pesan yang akan dikirim ke banyak grup sekaligus..."}
                  className="w-full bg-[#2a3942] text-[#e9edef] border border-transparent focus:border-[#00a884] rounded-xl p-4 min-h-[160px] resize-none focus:outline-none transition-colors scrollbar-thin"
                />
                
                {/* Image Attachment Area */}
                <div className="mt-4 flex items-center justify-between bg-[#111b21] p-3 rounded-xl border border-[#313d45]">
                  {imageFile ? (
                    <div className="flex items-center flex-1 min-w-0 mr-4">
                      <div className="w-10 h-10 rounded bg-[#2a3942] flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                        {/* We use a tiny preview by creating a local object URL */}
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e9edef] truncate">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">{(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={() => setImageFile(null)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                        title="Hapus Gambar"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-400">
                      <ImageIcon size={20} className="mr-3" />
                      <span className="text-sm">Lampirkan gambar (Opsional)</span>
                    </div>
                  )}
                  
                  {!imageFile && (
                    <>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#2a3942] hover:bg-[#313d45] text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        Pilih Gambar
                      </button>
                    </>
                  )}
                </div>
                
                <div className="mt-6 bg-[#111b21] p-4 rounded-xl border border-[#313d45]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Clock size={16} className="text-yellow-500 mr-2" />
                      <h4 className="text-sm font-medium text-gray-300">Pengaturan Anti-Ban Pro</h4>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Basic Delay */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Jeda dasar antar pesan (diacak ±30%):</p>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="1" max="10" step="1"
                          value={delaySec}
                          onChange={e => setDelaySec(parseInt(e.target.value))}
                          className="flex-1 accent-[#00a884]"
                        />
                        <span className="text-[#00a884] font-bold text-sm bg-[#00a884]/10 px-3 py-1 rounded-md min-w-[75px] text-center">
                          {delaySec} Detik
                        </span>
                      </div>
                    </div>
                    
                    {/* Batching */}
                    <div className="pt-3 border-t border-[#313d45]">
                      <p className="text-xs text-gray-400 mb-2">Istirahat Otomatis (Batching):</p>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span>Setiap</span>
                        <input 
                          type="number" 
                          min="0"
                          value={batchSize}
                          onChange={e => setBatchSize(parseInt(e.target.value) || 0)}
                          className="w-16 bg-[#2a3942] border border-[#313d45] rounded-md px-2 py-1 text-center focus:outline-none focus:border-[#00a884]"
                        />
                        <span>pesan, istirahat selama</span>
                        <input 
                          type="number" 
                          min="0"
                          value={batchDelaySec}
                          onChange={e => setBatchDelaySec(parseInt(e.target.value) || 0)}
                          className="w-16 bg-[#2a3942] border border-[#313d45] rounded-md px-2 py-1 text-center focus:outline-none focus:border-[#00a884]"
                        />
                        <span>detik.</span>
                      </div>
                    </div>

                    {/* Spintax Toggle */}
                    <div className="pt-3 border-t border-[#313d45] flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-300">Hash Randomization (Invisible Spintax)</p>
                        <p className="text-xs text-gray-500 mt-1">Menyisipkan spasi kosong tak terlihat agar teks selalu 100% unik di server.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useSpintax}
                          onChange={e => setUseSpintax(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00a884]"></div>
                      </label>
                    </div>

                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#e9edef]">Status Pengiriman</h3>
                  <span className="text-sm font-bold text-[#00a884] bg-[#00a884]/10 px-3 py-1 rounded-full">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-[#2a3942] rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    className="h-full bg-[#00a884]"
                  />
                </div>
                
                {/* Log View */}
                <div className="flex-1 bg-[#111b21] rounded-xl border border-[#313d45] p-3 overflow-y-auto font-mono text-xs flex flex-col gap-1.5 scrollbar-thin">
                  {logs.map((log, i) => (
                    <div key={i} className={log.isError ? 'text-red-400' : 'text-gray-300'}>
                      {log.msg}
                    </div>
                  ))}
                  {isSending && (
                    <div className="text-yellow-500 animate-pulse mt-2 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-500 border-t-transparent mr-2"></div>
                      Memproses... ({delaySec}s jeda)
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>

          {/* Footer / Action */}
          <div className="p-4 border-t border-[#313d45] bg-[#202c33] shrink-0">
            {(!isSending && progress.total > 0 && progress.current === progress.total) ? (
              <button
                onClick={() => {
                  setProgress({ total: 0, current: 0 });
                  setMessage('');
                }}
                className="w-full py-3 bg-[#313d45] hover:bg-[#2a3942] text-white rounded-xl font-medium transition-colors"
              >
                Kirim Broadcast Lain
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={isSending || selectedIds.size === 0 || !message.trim()}
                className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:bg-[#313d45] disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center transition-colors shadow-lg"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Kirim ke {selectedIds.size} Grup
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
