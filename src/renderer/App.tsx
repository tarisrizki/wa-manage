import { useEffect, useState } from 'react';
import { Search, MoreVertical, Smartphone, MonitorSmartphone, Plus, Settings } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import bgDoodle from './assets/doodle.png';
import { WhatsAppMessage } from './types';

// Komponen Terpisah
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { QRScreen } from './components/QRScreen';
import { RuleEngine } from './components/RuleEngine';

export default function App() {
  const [messages, setMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  
  // Rule Engine State
  const [rules, setRules] = useState<{id: number, keyword: string}[]>([]);

  // Load awal
  useEffect(() => {
    window.api.getSavedAccounts()
      .then(accounts => setSavedAccounts(accounts))
      .catch(err => console.error("Gagal memuat akun yang tersimpan:", err));

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

  // Load Rules saat akun berganti
  useEffect(() => {
    if (activeAccount) {
      window.api.getRules(activeAccount)
        .then(data => setRules(data))
        .catch(err => console.error("Gagal memuat rules:", err));
    }
  }, [activeAccount]);

  const handleAddAccount = (cleanId: string) => {
    setSavedAccounts(prev => Array.from(new Set([...prev, cleanId])));
    window.api.addWhatsAppAccount(cleanId);
    setActiveAccount(cleanId);
  };

  const handleDeleteAccount = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  const handleAddRule = async (keyword: string) => {
    if (activeAccount) {
      try {
        await window.api.addRule(activeAccount, keyword);
        const data = await window.api.getRules(activeAccount);
        setRules(data);
      } catch (err) {
        console.error("Gagal menambah rule:", err);
      }
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (activeAccount) {
      try {
        await window.api.deleteRule(id);
        const data = await window.api.getRules(activeAccount);
        setRules(data);
      } catch (err) {
        console.error("Gagal menghapus rule:", err);
      }
    }
  };

  const filteredMessages = activeAccount ? (messages[activeAccount] || []) : [];
  const isActiveAccountConnected = activeAccount && connectedAccounts.includes(activeAccount);

  const handleDeleteMessage = (msgKeyId: string) => {
    if (!activeAccount) return;
    
    // Hapus dari state
    setMessages(prev => {
      const accMsgs = prev[activeAccount] || [];
      return {
        ...prev,
        [activeAccount]: accMsgs.filter(m => m.msg?.key?.id !== msgKeyId)
      };
    });
    
    // Hapus dari SQLite (Backend)
    window.api.deleteMessage(msgKeyId);
  };
  
  const handleClearMessages = () => {
    if (!activeAccount) return;
    
    // Kosongkan state untuk akun ini
    setMessages(prev => ({
      ...prev,
      [activeAccount]: []
    }));
    
    // Kosongkan dari SQLite (Backend)
    window.api.clearMessages(activeAccount);
  };

  return (
    <div className="flex h-screen w-full font-sans text-wa-textDark bg-wa-bg selection:bg-wa-green selection:text-white">
      
      {/* PANEL KIRI (Daftar Akun) */}
      <Sidebar 
        savedAccounts={savedAccounts}
        connectedAccounts={connectedAccounts}
        qrs={qrs}
        activeAccount={activeAccount}
        setActiveAccount={setActiveAccount}
        onAddAccount={handleAddAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* PANEL KANAN (Ruang Obrolan / QR / Rule Engine) */}
      <div className="flex-1 flex flex-col relative bg-wa-chatBg">
        
        {/* Latar Belakang Khas WA (Doodle) */}
        <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
             style={{ backgroundImage: `url(${bgDoodle})`, backgroundRepeat: 'repeat' }}>
        </div>

        {activeAccount ? (
          <>
            {/* Header Kanan */}
            <div className="h-[60px] bg-wa-panel flex items-center px-4 py-2 shrink-0 z-10 border-l border-wa-border">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mr-4">
                <Smartphone className="text-slate-300" size={20} />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-white text-base">{activeAccount}</span>
                <span className="text-xs text-wa-textMuted">
                  {isActiveAccountConnected ? 'Online' : 'Membutuhkan tindakan'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-[#aebac1]">
                <button className="p-2 rounded-full hover:bg-wa-hover transition-colors"><Search size={20} /></button>
                <button className="p-2 rounded-full hover:bg-wa-hover transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {!isActiveAccountConnected ? (
              <QRScreen qr={qrs[activeAccount]} />
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-[#202c33] border-b border-[#313d45] shadow-sm z-20 shrink-0">
                  <RuleEngine onAddRule={handleAddRule} />
                </div>
                
                <Group direction="horizontal" className="flex-1 w-full h-full relative">
                  {/* Panel Kiri: Grup */}
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full flex flex-col bg-wa-chatBg">
                      <ChatRoom 
                        title="🏢 Obrolan Grup"
                        messages={filteredMessages.filter(m => m.isGroup)} 
                        activeAccount={activeAccount}
                        rules={rules}
                        onDeleteRule={handleDeleteRule}
                        onDeleteMessage={handleDeleteMessage}
                        onClearMessages={handleClearMessages}
                      />
                    </div>
                  </Panel>

                  {/* Pembatas Fleksibel (Resize Handle) */}
                  <Separator className="w-1.5 bg-[#202c33] hover:bg-[#3b4a54] active:bg-[#00a884] transition-colors cursor-col-resize z-30" />

                  {/* Panel Kanan: Pribadi */}
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full flex flex-col bg-wa-chatBg border-l border-[#313d45]/30">
                      <ChatRoom 
                        title="👤 Pesan Pribadi"
                        messages={filteredMessages.filter(m => !m.isGroup)} 
                        activeAccount={activeAccount}
                        rules={rules}
                        onDeleteRule={handleDeleteRule}
                        onDeleteMessage={handleDeleteMessage}
                        onClearMessages={handleClearMessages}
                      />
                    </div>
                  </Panel>
                </Group>
              </div>
            )}


          </>
        ) : (
          // Layar Kosong (Belum Pilih Akun)
          <div className="flex-1 flex flex-col items-center justify-center bg-wa-chatBg z-10 border-l border-wa-border">
            <MonitorSmartphone size={160} strokeWidth={1} className="text-wa-textMuted mb-8 opacity-60" />
            <h1 className="text-3xl text-white font-light mb-4 text-center mt-4">WhatsApp Desktop Clone</h1>
            <p className="text-wa-textMuted text-sm text-center max-w-md leading-relaxed">
              Kirim dan terima pesan tanpa perlu menjaga telepon Anda tetap online.<br/>
              Pilih salah satu akun di samping untuk mengelola Notifikasi Filter.
            </p>
            <div className="mt-10 flex items-center text-wa-textMuted text-xs">
              <span className="bg-wa-textMuted w-3 h-3 rounded-full mr-2 opacity-50 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-wa-chatBg rounded-full"></span>
              </span>
              Enkripsi End-to-End diaktifkan oleh Baileys
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
