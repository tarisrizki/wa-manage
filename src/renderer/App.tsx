import { useEffect, useState, useRef } from 'react';
import { Plus, MoreVertical, Search, Filter, Send, Trash2, Smartphone, Monitor, MonitorSmartphone } from 'lucide-react';
import bgDoodle from './assets/doodle.png';
import { QRCodeSVG } from 'qrcode.react';

// Komponen Shadcn untuk kemudahan popup
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface WhatsAppMessage {
  accountId: string;
  isGroup: boolean;
  msg: any;
  textContent: string;
}

export default function App() {
  const [messages, setMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountId, setNewAccountId] = useState('');
  
  // Rule Engine
  const [rules, setRules] = useState<{id: number, keyword: string}[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.api.getSavedAccounts().then(accounts => setSavedAccounts(accounts));

    const cleanupQR = window.api.onWhatsAppQR((data) => {
      setQrs(prev => ({ ...prev, [data.accountId]: data.qr }));
    });
    
    const cleanupMsg = window.api.onWhatsAppMessage((data: WhatsAppMessage) => {
      setMessages(prev => {
        const accMsgs = prev[data.accountId] || [];
        const newAccMsgs = [...accMsgs, data];
        // Hanya simpan 200 pesan terakhir per akun
        if (newAccMsgs.length > 200) {
          return { ...prev, [data.accountId]: newAccMsgs.slice(newAccMsgs.length - 200) };
        }
        return { ...prev, [data.accountId]: newAccMsgs };
      });
    });

    const cleanupConn = window.api.onWhatsAppConnected((data) => {
      setConnectedAccounts(prev => Array.from(new Set([...prev, data.accountId])));
      setQrs(prev => {
        const newQrs = {...prev};
        delete newQrs[data.accountId];
        return newQrs;
      });
      setSavedAccounts(prev => Array.from(new Set([...prev, data.accountId])));
    });

    // [UI BUG FIX] Dengarkan event jika akun di-logout dari HP, langsung hapus dari daftar agar tidak jadi zombie di layar
    const unlistenLoggedOut = window.api.onWhatsAppLoggedOut((data: { accountId: string }) => {
      setSavedAccounts(prev => prev.filter(a => a !== data.accountId));
      setQrs(prev => {
        const next = { ...prev };
        delete next[data.accountId];
        return next;
      });
      setConnectedAccounts(prev => prev.filter(acc => acc !== data.accountId));
      setActiveAccount(prev => prev === data.accountId ? null : prev);
    });

    return () => {
      cleanupQR();
      cleanupMsg();
      cleanupConn();
      unlistenLoggedOut();
    };
  }, []);

  // Otomatis scroll ke bawah saat ada pesan baru di akun yang aktif
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeAccount]);

  // Load Rules saat akun berganti
  useEffect(() => {
    if (activeAccount) {
      window.api.getRules(activeAccount).then(data => setRules(data));
    }
  }, [activeAccount]);

  const handleAddAccount = () => {
    if (newAccountId && newAccountId.trim()) {
      const cleanId = newAccountId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanId) return;
      
      setSavedAccounts(prev => Array.from(new Set([...prev, cleanId])));
      window.api.addWhatsAppAccount(cleanId);
      setNewAccountId('');
      setIsAddAccountOpen(false);
      setActiveAccount(cleanId);
    }
  };

  const handleDeleteAccount = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Hapus confirm dialog bawaan browser karena sering bermasalah (terblokir) di Electron
    try {
      await window.api.deleteAccount(id);
      setSavedAccounts(prev => prev.filter(acc => acc !== id));
      if (activeAccount === id) setActiveAccount(null);
      setQrs(prev => { const n = {...prev}; delete n[id]; return n; });
      setConnectedAccounts(prev => prev.filter(acc => acc !== id));
    } catch (err) {
      console.error("Gagal menghapus akun:", err);
      alert("Gagal menghapus akun. Cek console log.");
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim() && activeAccount) {
      await window.api.addRule(activeAccount, newKeyword.trim());
      setNewKeyword('');
      const data = await window.api.getRules(activeAccount);
      setRules(data);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (activeAccount) {
      await window.api.deleteRule(id);
      const data = await window.api.getRules(activeAccount);
      setRules(data);
    }
  };

  const filteredMessages = activeAccount ? (messages[activeAccount] || []) : [];

  return (
    <div className="flex h-screen w-full font-sans text-[#d1d7db] bg-[#111b21] selection:bg-[#00a884] selection:text-white">
      
      {/* PANEL KIRI (Daftar Akun) */}
      <div className="w-[30%] min-w-[300px] max-w-[420px] flex flex-col border-r border-[#222d34] bg-[#111b21]">
        
        {/* Header Kiri */}
        <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4 py-2 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center">
            <Monitor className="text-[#d1d7db]" size={24} />
          </div>
          <div className="flex items-center space-x-4 text-[#aebac1]">
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="p-2 w-auto h-auto rounded-full hover:bg-[#2a3942] transition-colors" title="Tambah Akun">
                  <Plus size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-[#202c33] text-[#d1d7db] border-[#222d34]">
                <DialogHeader>
                  <DialogTitle className="text-white">Tambah Akun WhatsApp</DialogTitle>
                  <DialogDescription className="text-[#aebac1]">
                    Masukkan ID Unik untuk sesi ini. Disarankan nama divisi (Contoh: CS-1).
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 py-4">
                  <Input 
                    value={newAccountId}
                    onChange={(e) => setNewAccountId(e.target.value)}
                    placeholder="Ketik ID Akun..." 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                    className="bg-[#2a3942] border-none text-white focus-visible:ring-1 focus-visible:ring-[#00a884]"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleAddAccount} className="bg-[#00a884] hover:bg-[#029072] text-white">Tambahkan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <button className="p-2 rounded-full hover:bg-[#2a3942] transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="h-[50px] flex items-center px-3 py-2 border-b border-[#222d34]">
          <div className="flex-1 flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 h-[35px]">
            <Search size={18} className="text-[#8696a0] mr-4" />
            <input 
              type="text" 
              placeholder="Cari akun..." 
              className="bg-transparent border-none outline-none text-[#d1d7db] text-sm w-full placeholder:text-[#8696a0]"
            />
          </div>
          <button className="ml-2 p-1.5 text-[#8696a0]">
            <Filter size={18} />
          </button>
        </div>

        {/* Chat List (Daftar Akun) */}
        <div className="flex-1 overflow-y-auto bg-[#111b21] scrollbar-thin">
          {savedAccounts.map((accId) => {
            const isConnected = connectedAccounts.includes(accId);
            const hasQR = !!qrs[accId];
            const isActive = activeAccount === accId;

            return (
              <div 
                key={accId}
                onClick={() => setActiveAccount(accId)}
                className={`flex items-center px-3 h-[72px] cursor-pointer hover:bg-[#202c33] transition-colors ${isActive ? 'bg-[#2a3942]' : ''}`}
              >
                <div className="w-[50px] h-[50px] rounded-full bg-slate-700 mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <Smartphone className="text-slate-400" size={24} />
                </div>
                <div className="flex-1 border-b border-[#222d34] h-full flex flex-col justify-center pr-2">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-white text-[17px] font-normal truncate">{accId}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${isConnected ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                        {isConnected ? 'Online' : hasQR ? 'Scan QR' : 'Connecting'}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteAccount(e, accId)}
                        className="p-2 hover:bg-[#374c58] rounded-full text-[#8696a0] hover:text-red-500 transition-colors cursor-pointer relative z-50"
                        title="Hapus Akun"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#8696a0]">
                    <span className="truncate">
                      {isConnected ? 'Akun terhubung dan siap memantau pesan.' : hasQR ? 'Klik untuk melihat kode QR login.' : 'Mencoba menghubungi server...'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {savedAccounts.length === 0 && (
            <div className="text-center py-10 px-4 text-[#8696a0] text-sm mt-10">
              Tidak ada obrolan/akun.<br/>Klik ikon '+' di atas untuk menambah akun.
            </div>
          )}
        </div>
      </div>

      {/* PANEL KANAN (Ruang Obrolan / QR / Rule Engine) */}
      <div className="flex-1 flex flex-col relative bg-[#222e35]">
        
        {/* Latar Belakang Khas WA (Doodle) */}
        <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
             style={{ backgroundImage: `url(${bgDoodle})`, backgroundRepeat: 'repeat' }}>
        </div>

        {activeAccount ? (
          <>
            {/* Header Kanan */}
            <div className="h-[60px] bg-[#202c33] flex items-center px-4 py-2 shrink-0 z-10 border-l border-[#222d34]">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mr-4">
                <Smartphone className="text-slate-300" size={20} />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-white text-base">{activeAccount}</span>
                <span className="text-xs text-[#8696a0]">
                  {connectedAccounts.includes(activeAccount) ? 'Online' : 'Membutuhkan tindakan'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-[#aebac1]">
                <button className="p-2 rounded-full hover:bg-[#2a3942] transition-colors"><Search size={20} /></button>
                <button className="p-2 rounded-full hover:bg-[#2a3942] transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Area Pesan / Konten Utama */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-[5%] lg:px-[10%] flex flex-col space-y-2 z-10 scrollbar-thin">
              
              {!connectedAccounts.includes(activeAccount) ? (
                // Layar QR Code
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                    {qrs[activeAccount] ? (
                      <QRCodeSVG value={qrs[activeAccount]} size={256} />
                    ) : (
                      <div className="w-[256px] h-[256px] flex items-center justify-center text-slate-400">
                        Memuat QR Code...
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl text-white font-light mb-4">Gunakan WhatsApp di komputer Anda</h2>
                  <ol className="text-[#8696a0] text-sm space-y-4 max-w-sm text-left list-decimal pl-4">
                    <li>Buka WhatsApp di telepon Anda</li>
                    <li>Ketuk <strong>Menu</strong> di Android, atau <strong>Pengaturan</strong> di iPhone</li>
                    <li>Ketuk <strong>Perangkat Taut</strong> dan pilih <strong>Tautkan Perangkat</strong></li>
                    <li>Arahkan telepon Anda ke layar ini untuk memindai kode QR</li>
                  </ol>
                </div>
              ) : (
                // Layar Live Chat
                <>
                  <div className="flex justify-center mb-4">
                    <span className="bg-[#182229] text-[#8696a0] text-xs py-1 px-3 rounded-lg uppercase shadow-sm">
                      Pesan Terenkripsi Secara End-to-End
                    </span>
                  </div>

                  {filteredMessages.length === 0 ? (
                    <div className="text-center mt-10 text-[#8696a0] text-sm">
                      Menunggu pesan masuk...
                    </div>
                  ) : (
                    filteredMessages.map((m, idx) => {
                      const senderId = m.isGroup ? (m.msg?.key?.participant || m.msg?.key?.remoteJid) : m.msg?.key?.remoteJid;
                      const prevSenderId = idx > 0 ? (filteredMessages[idx - 1].isGroup ? (filteredMessages[idx - 1].msg?.key?.participant || filteredMessages[idx - 1].msg?.key?.remoteJid) : filteredMessages[idx - 1].msg?.key?.remoteJid) : null;
                      const showTail = senderId !== prevSenderId;
                      
                      return (
                      <div key={m.msg?.key?.id || idx} className={`flex mb-0.5 w-full justify-start ${showTail ? 'mt-2' : ''}`}>
                        <div className={`bg-[#202c33] p-1.5 px-2 pb-2 max-w-[65%] md:max-w-[75%] shadow-sm relative group ${showTail ? 'rounded-lg rounded-tl-none' : 'rounded-lg'}`}>
                          {/* Ekor Balon Chat */}
                          {showTail && (
                            <svg viewBox="0 0 8 13" height="13" width="8" className="absolute top-0 -left-[8px] text-[#202c33]">
                              <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                              <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                            </svg>
                          )}
                          
                          {showTail && (
                            <div className="flex justify-between items-center mb-0.5 pr-2">
                              <span className="text-[#e9edef] text-[13px] font-semibold leading-5 text-emerald-500">
                                {senderId?.split('@')[0] || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-[#8696a0] ml-4">{m.isGroup ? 'Group' : 'Personal'}</span>
                            </div>
                          )}
                          
                          <div className="text-[#e9edef] text-[14.2px] leading-5 whitespace-pre-wrap break-words pr-12">
                            {m.textContent}
                          </div>
                          
                          <div className="absolute right-2 bottom-1 text-[11px] text-[#8696a0]">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )})
                  )}

                  {/* Aturan Kata Kunci Ditampilkan di Atas Input */}
                  {rules.length > 0 && (
                    <div className="mt-8 mb-2">
                      <div className="flex flex-wrap gap-2">
                        {rules.map(r => (
                          <div key={r.id} className="bg-[#2a3942] text-[#d1d7db] text-xs pl-3 pr-1 py-1 rounded-full flex items-center shadow-sm border border-[#202c33]">
                            <span>{r.keyword}</span>
                            <button onClick={() => handleDeleteRule(r.id)} className="ml-2 p-1 hover:bg-[#3b4a54] rounded-full text-[#8696a0] hover:text-[#f15c6d]">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer / Input Bar (Rule Engine) */}
            {connectedAccounts.includes(activeAccount) && (
              <div className="h-[62px] bg-[#202c33] flex items-center px-4 shrink-0 z-10 border-l border-[#222d34]">
                <button className="p-2 text-[#8696a0] hover:text-[#d1d7db] transition-colors mx-2">
                  <Filter size={24} />
                </button>
                <form onSubmit={handleAddRule} className="flex-1 flex bg-[#2a3942] rounded-lg px-4 py-2 mx-2">
                  <input 
                    type="text" 
                    placeholder="Ketik kata kunci untuk notifikasi desktop..." 
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="bg-transparent w-full text-[#d1d7db] placeholder:text-[#8696a0] outline-none text-[15px]"
                  />
                </form>
                <button 
                  onClick={handleAddRule}
                  disabled={!newKeyword.trim()}
                  className={`p-2 mx-2 transition-colors ${newKeyword.trim() ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                >
                  <Send size={24} className={newKeyword.trim() ? 'translate-x-0.5' : ''} />
                </button>
              </div>
            )}
          </>
        ) : (
          // Layar Kosong (Belum Pilih Akun)
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] z-10 border-l border-[#222d34]">
            <MonitorSmartphone size={160} strokeWidth={1} className="text-[#8696a0] mb-8 opacity-60" />
            <h1 className="text-3xl text-white font-light mb-4 text-center mt-4">WhatsApp Desktop Clone</h1>
            <p className="text-[#8696a0] text-sm text-center max-w-md leading-relaxed">
              Kirim dan terima pesan tanpa perlu menjaga telepon Anda tetap online.<br/>
              Pilih salah satu akun di samping untuk mengelola Notifikasi Filter.
            </p>
            <div className="mt-10 flex items-center text-[#8696a0] text-xs">
              <span className="bg-[#8696a0] w-3 h-3 rounded-full mr-2 opacity-50 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-[#222e35] rounded-full"></span>
              </span>
              Enkripsi End-to-End diaktifkan oleh Baileys
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
