import { useState, useEffect, useRef } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle2, Clock, Image as ImageIcon, RefreshCw, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { useExcelImport } from '../hooks/useExcelImport';
import { useBroadcast, BroadcastTarget } from '../hooks/useBroadcast';
import { FileUploadArea } from './ui/FileUploadArea';

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
  const [broadcastMode, setBroadcastMode] = useState<'group' | 'import'>('group');
  const [importedContacts, setImportedContacts] = useState<BroadcastTarget[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  // Settings
  const [delaySec, setDelaySec] = useState(2);
  const [batchSize, setBatchSize] = useState(10);
  const [batchDelaySec, setBatchDelaySec] = useState(20);
  const [useSpintax, setUseSpintax] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Hooks
  const { importFile, isImporting } = useExcelImport<BroadcastTarget>((row) => {
    const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('nomor') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('hp'));
    const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
    
    if (phoneKey && row[phoneKey]) {
      let rawPhone = String(row[phoneKey]).replace(/\D/g, '');
      if (rawPhone.startsWith('0')) rawPhone = '62' + rawPhone.slice(1);
      if (rawPhone) {
        return { name: nameKey ? String(row[nameKey]) : '', phone: rawPhone, jid: `${rawPhone}@s.whatsapp.net` };
      }
    }
    return null;
  });

  const { isSending, progress, logs, startBroadcast, addLog, setLogs } = useBroadcast();

  useEffect(() => {
    if (activeAccount && activeAccount !== 'ALL') {
      setIsLoading(true);
      // @ts-ignore
      window.api.getGroups(activeAccount)
        .then((res: GroupInfo[]) => {
          setGroups(res || []);
          setIsLoading(false);
        })
        .catch((err: any) => {
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
    if (selectedIds.size === groups.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(groups.map(g => g.id)));
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await importFile(file);
    if (result.success && result.data.length > 0) {
      setImportedContacts(result.data);
      setLogs([{ msg: `Berhasil mengimpor ${result.data.length} kontak.`, isError: false }]);
    } else {
      setLogs([{ msg: result.error || 'Gagal mengimpor atau file kosong.', isError: true }]);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Nama': 'Budi Santoso', 'Nomor Telepon': '08123456789' },
      { 'Nama': 'Andi', 'Nomor Telepon': '628987654321' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Broadcast_Japri.xlsx");
  };

  const handleSend = () => {
    const isImportMode = broadcastMode === 'import';
    const targets = isImportMode ? importedContacts : Array.from(selectedIds).map(id => ({ jid: id, name: groups.find(g => g.id === id)?.name }));
    
    startBroadcast({
      activeAccount,
      targets,
      message,
      imageFile,
      delaySec,
      batchSize,
      batchDelaySec,
      useSpintax
    });
  };

  if (activeAccount === 'ALL') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-wa-panel border border-wa-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
          <div className="flex flex-col items-center text-center mt-4 mb-2">
            <AlertCircle size={50} className="text-yellow-500 mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Pilih Akun Spesifik</h2>
            <p className="text-sm text-gray-400">
              Fitur Broadcast membutuhkan Anda untuk memilih satu akun spesifik di sidebar kiri.
            </p>
            <button 
              onClick={onClose}
              className="mt-6 w-full py-2 bg-wa-primary hover:bg-wa-primary/90 text-white rounded-lg font-medium transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden relative flex-row"
        style={{ display: 'flex', flexDirection: 'row' }}
      >
        <button 
          onClick={onClose} 
          disabled={isSending}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground bg-muted/80 p-2 rounded-full z-10 disabled:opacity-50 transition-colors"
        >
          <X size={20} />
        </button>

        {/* KOLOM KIRI: Daftar Grup */}
        <div className="w-1/2 border-r border-border/50 flex flex-col bg-card/40">
          <div className="flex border-b border-border/50 bg-background/50">
            <button 
              onClick={() => setBroadcastMode('group')}
              className={`flex-1 py-4 font-semibold text-sm transition-colors ${broadcastMode === 'group' ? 'text-wa-primary border-b-2 border-wa-primary bg-wa-primary/5' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Kirim ke Grup
            </button>
            <button 
              onClick={() => setBroadcastMode('import')}
              className={`flex-1 py-4 font-semibold text-sm transition-colors ${broadcastMode === 'import' ? 'text-wa-primary border-b-2 border-wa-primary bg-wa-primary/5' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Import CSV/Excel
            </button>
          </div>
          
          {broadcastMode === 'group' ? (
          <>
          <div className="p-6 border-b border-border/50 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center tracking-tight">
                <Users className="mr-3 text-wa-primary" size={24} />
                Pilih Target Grup
              </h2>
              <p className="text-sm text-muted-foreground mt-2 flex items-center">
                <span className="w-2 h-2 rounded-full bg-wa-primary mr-2"></span>
                Akun: <span className="font-medium text-foreground ml-1">{activeAccount}</span>
              </p>
            </div>
            <button 
              onClick={() => {
                if (activeAccount && activeAccount !== 'ALL') {
                  setIsLoading(true);
                  // @ts-ignore
                  window.api.getGroups(activeAccount)
                    .then((res: GroupInfo[]) => { setGroups(res || []); setIsLoading(false); })
                    .catch((err: any) => { console.error(err); setGroups([]); setIsLoading(false); });
                }
              }}
              disabled={isLoading || isSending}
              className="text-wa-primary hover:text-white hover:bg-wa-primary/80 bg-wa-primary/10 border border-wa-primary/20 p-2 rounded-lg transition-colors disabled:opacity-50 group flex items-center gap-2"
              title="Muat Ulang Daftar Grup"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
              <span className="text-xs font-semibold">Muat Ulang</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-wa-primary border-t-transparent"></div>
                <p className="text-sm font-medium">Memuat daftar grup...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-8 bg-muted/30 rounded-xl m-2 border border-border/30">
                <Users size={56} className="mb-5 opacity-40 text-muted-foreground" />
                <p className="text-foreground font-medium mb-2">Tidak ada grup yang ditemukan.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div 
                  onClick={toggleAll}
                  className="flex items-center p-3.5 rounded-xl hover:bg-muted/80 cursor-pointer transition-all mb-3 sticky top-0 bg-background z-10 border border-border/50 shadow-sm"
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3.5 transition-all duration-300 ${selectedIds.size === groups.length ? 'bg-wa-primary border-wa-primary shadow-[0_0_10px_rgba(0,168,132,0.4)]' : 'border-muted-foreground'}`}>
                    {selectedIds.size === groups.length && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className="text-foreground font-semibold flex-1">Pilih Semua ({groups.length})</span>
                </div>
                
                {groups.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => !isSending && toggleSelection(g.id)}
                    className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-all duration-300 border ${
                      isSending ? 'opacity-50 cursor-not-allowed border-transparent' : 
                      selectedIds.has(g.id) ? 'bg-muted border-wa-primary/30 shadow-[0_2px_10px_rgba(0,0,0,0.1)]' : 'hover:bg-muted/50 border-transparent hover:border-border'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3.5 shrink-0 transition-all duration-300 ${selectedIds.has(g.id) ? 'bg-wa-primary border-wa-primary shadow-[0_0_10px_rgba(0,168,132,0.4)]' : 'border-muted-foreground'}`}>
                      {selectedIds.has(g.id) && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${selectedIds.has(g.id) ? 'text-foreground' : 'text-muted-foreground'}`}>{g.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          ) : (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <h2 className="text-xl font-semibold text-foreground flex items-center tracking-tight mb-2">
              <FileSpreadsheet className="mr-3 text-wa-primary" size={24} />
              Import Kontak Pribadi
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Upload file Excel (.xlsx) atau CSV yang berisi kolom <b>Nomor Telepon</b> dan <b>Nama</b>.
            </p>
            
            <FileUploadArea 
              onFileUpload={handleFileUpload} 
              onDownloadTemplate={handleDownloadTemplate} 
              fileInputRef={excelInputRef}
            />
            
            {importedContacts.length > 0 && (
              <div className="flex-1 flex flex-col mt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-foreground">Kontak Terbaca ({importedContacts.length})</span>
                </div>
                <div className="flex-1 border border-border/50 rounded-lg overflow-hidden bg-background">
                  <div className="overflow-y-auto max-h-[150px]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium text-muted-foreground">Nama</th>
                          <th className="px-4 py-2 font-medium text-muted-foreground">Nomor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {importedContacts.map((c, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-4 py-2 truncate max-w-[120px]">{c.name || '-'}</td>
                            <td className="px-4 py-2 text-muted-foreground">{c.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* KOLOM KANAN: Pesan & Log */}
        <div className="w-1/2 flex flex-col bg-background/80 relative backdrop-blur-sm">
          <div className="flex-1 p-7 flex flex-col overflow-y-auto scrollbar-thin">
            
            {!isSending && progress.total === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-4 tracking-tight">Pesan Broadcast</h3>
                
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={imageFile ? "Ketik caption untuk gambar ini..." : "Ketik pesan yang akan dikirim ke banyak grup sekaligus..."}
                  className="w-full bg-card text-foreground border border-border focus:border-wa-primary focus:ring-1 focus:ring-wa-primary/30 rounded-xl p-4 min-h-[160px] resize-none focus:outline-none transition-all shadow-inner scrollbar-thin"
                />
                     {/* Image Attachment Area */}
                <div className="mt-4 flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border/50 transition-all hover:border-border">
                  {imageFile ? (
                    <div className="flex items-center flex-1 min-w-0 mr-4">
                      <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center mr-3 shrink-0 overflow-hidden shadow-sm border border-border/50">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{imageFile.name}</p>
                      </div>
                      <button 
                        onClick={() => setImageFile(null)}
                        className="p-2 text-muted-foreground hover:bg-muted/80 hover:text-destructive rounded-lg transition-colors shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center text-muted-foreground">
                      <ImageIcon size={20} className="mr-3 text-muted-foreground" />
                      <span className="text-sm font-medium">Lampirkan gambar (Opsional)</span>
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
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-lg transition-colors font-medium shadow-sm"
                      >
                        Pilih Gambar
                      </button>
                    </>
                  )}
                </div>
                
                <div className="mt-6 bg-muted/30 p-5 rounded-2xl border border-border/40 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-amber-500/20 p-1.5 rounded-lg mr-3">
                        <Clock size={16} className="text-amber-500" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">Pengaturan Penundaan</h4>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {/* Basic Delay */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2.5">Jeda dasar antar pesan (diacak ±30%):</p>
                      <div className="flex items-center gap-4 bg-background/50 p-2 rounded-xl border border-border/30">
                        <input 
                          type="range" 
                          min="1" max="10" step="1"
                          value={delaySec}
                          onChange={e => setDelaySec(parseInt(e.target.value))}
                          className="flex-1 accent-wa-primary mx-2"
                        />
                        <span className="text-wa-primary font-bold text-sm bg-wa-primary/10 px-3 py-1.5 rounded-lg min-w-[80px] text-center border border-wa-primary/20">
                          {delaySec} Detik
                        </span>
                      </div>
                    </div>
                    
                    {/* Batching */}
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-2.5">Istirahat Otomatis (Batching):</p>
                      <div className="flex items-center gap-2 text-sm text-foreground bg-background/50 p-2.5 rounded-xl border border-border/30">
                        <span className="pl-1 text-muted-foreground">Setiap</span>
                        <input 
                          type="number" 
                          min="0"
                          value={batchSize}
                          onChange={e => setBatchSize(parseInt(e.target.value) || 0)}
                          className="w-16 bg-card border border-border rounded-lg px-2 py-1 text-center font-medium focus:outline-none focus:border-wa-primary focus:ring-1 focus:ring-wa-primary/30 transition-all text-foreground"
                        />
                        <span className="text-muted-foreground">pesan, istirahat</span>
                        <input 
                          type="number" 
                          min="0"
                          value={batchDelaySec}
                          onChange={e => setBatchDelaySec(parseInt(e.target.value) || 0)}
                          className="w-16 bg-card border border-border rounded-lg px-2 py-1 text-center font-medium focus:outline-none focus:border-wa-primary focus:ring-1 focus:ring-wa-primary/30 transition-all text-foreground"
                        />
                        <span className="pr-1 text-muted-foreground">detik.</span>
                      </div>
                    </div>

                    {/* Spintax Toggle */}
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Keunikan Pesan (Spintax Kosong)</p>
                        <p className="text-xs text-muted-foreground mt-1">Sisipkan spasi kosong tak terlihat agar teks unik.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useSpintax}
                          onChange={e => setUseSpintax(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-10 h-5.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background peer-checked:after:bg-white after:border-transparent after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-wa-primary shadow-inner border border-border"></div>
                      </label>
                    </div>

                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">Status Pengiriman</h3>
                  <span className="text-sm font-bold text-wa-primary bg-wa-primary/10 border border-wa-primary/20 px-4 py-1.5 rounded-full shadow-sm">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-5 border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    className="h-full bg-wa-primary relative"
                  />
                </div>
                
                <div className="flex-1 bg-card rounded-2xl border border-border p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2 scrollbar-thin shadow-sm">
                  {logs.map((log, i) => (
                    <div key={i} className={`px-2 py-1.5 rounded-md ${log.isError ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-foreground'}`}>
                      {log.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-5 border-t border-border/50 bg-background/90 z-20">
            <button 
              onClick={handleSend}
              disabled={isSending || (broadcastMode === 'group' ? selectedIds.size === 0 : importedContacts.length === 0) || (!message.trim() && !imageFile)}
              className="w-full bg-wa-primary hover:bg-wa-primary/90 text-white font-medium py-3.5 px-4 rounded-xl shadow-[0_5px_15px_rgba(0,168,132,0.3)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none hover:shadow-[0_5px_20px_rgba(0,168,132,0.5)] active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Mengirim Pesan...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Mulai Broadcast ({broadcastMode === 'group' ? selectedIds.size : importedContacts.length} Target)
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
