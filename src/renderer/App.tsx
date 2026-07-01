import { useEffect, useState } from 'react';
import { Search, MoreVertical, Smartphone, MonitorSmartphone, Plus, Settings, GripVertical } from 'lucide-react';
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

  // Load Riwayat Pesan saat akun berganti
  useEffect(() => {
    if (activeAccount) {
      window.api.getMessages(activeAccount)
        .then(history => {
          setMessages(prev => ({
            ...prev,
            [activeAccount]: history
          }));
        })
        .catch(err => console.error("Gagal memuat riwayat pesan:", err));
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

  const filteredMessages = activeAccount ? (messages[activeAccount] || []).filter(msg => {
    if (!rules || rules.length === 0) return true;
    
    // Ambil teks pesan (sama seperti di backend)
    let innerMessage = msg.msg?.message;
    if (innerMessage?.ephemeralMessage?.message) innerMessage = innerMessage.ephemeralMessage.message;
    else if (innerMessage?.viewOnceMessage?.message) innerMessage = innerMessage.viewOnceMessage.message;
    else if (innerMessage?.viewOnceMessageV2?.message) innerMessage = innerMessage.viewOnceMessageV2.message;
    
    const text = innerMessage?.conversation || 
                 innerMessage?.extendedTextMessage?.text || 
                 innerMessage?.imageMessage?.caption || 
                 innerMessage?.videoMessage?.caption || '';
                 
    const textLower = text.toLowerCase();
    return rules.some(rule => {
      const kw = rule.keyword?.trim();
      return kw && textLower.includes(kw.toLowerCase());
    });
  }) : [];
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
  
  const handleClearMessages = (isGroup: boolean) => {
    if (!activeAccount) return;
    
    // Kosongkan state untuk akun ini (hanya tipe pesan yang diminta)
    setMessages(prev => {
      const accMsgs = prev[activeAccount] || [];
      return {
        ...prev,
        [activeAccount]: accMsgs.filter(m => m.isGroup !== isGroup)
      };
    });
    
    // Kosongkan dari SQLite (Backend)
    window.api.clearMessages(activeAccount, isGroup);
  };

  return (
    <div className="flex h-screen w-full font-sans text-wa-textDark bg-wa-bg selection:bg-wa-green selection:text-white">
      <Group orientation="horizontal" className="w-full h-full">
        {/* PANEL KIRI (Daftar Akun) */}
        <Panel defaultSize={25} minSize={20} maxSize={40}>
          <Sidebar 
            savedAccounts={savedAccounts}
            connectedAccounts={connectedAccounts}
            qrs={qrs}
            activeAccount={activeAccount}
            setActiveAccount={setActiveAccount}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </Panel>

        {/* Pembatas Sidebar */}
        <Separator className="group flex items-center justify-center w-2 hover:w-3 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#00a884] transition-all cursor-col-resize z-30 border-r border-[#313d45]/30">
          <div className="flex items-center justify-center h-12 w-1.5 bg-[#313d45] group-hover:bg-[#8696a0] rounded-full transition-colors">
            <GripVertical size={12} className="text-[#8696a0] group-hover:text-white" />
          </div>
        </Separator>

        {/* PANEL KANAN (Ruang Obrolan / QR / Rule Engine) */}
        <Panel defaultSize={75} minSize={50}>
          <div className="flex-1 flex flex-col relative bg-wa-chatBg h-full">
        
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
                  <RuleEngine 
                    rules={rules} 
                    onAddRule={handleAddRule} 
                    onDeleteRule={handleDeleteRule} 
                  />
                </div>
                
                <Group orientation="horizontal" className="flex-1 w-full h-full relative">
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
                        onClearMessages={() => handleClearMessages(true)}
                      />
                    </div>
                  </Panel>

                  {/* Pembatas Fleksibel (Resize Handle) */}
                  <Separator className="group flex items-center justify-center w-2 hover:w-3 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#00a884] transition-all cursor-col-resize z-30">
                    <div className="flex items-center justify-center h-12 w-1.5 bg-[#313d45] group-hover:bg-[#8696a0] rounded-full transition-colors">
                      <GripVertical size={12} className="text-[#8696a0] group-hover:text-white" />
                    </div>
                  </Separator>

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
                        onClearMessages={() => handleClearMessages(false)}
                      />
                    </div>
                  </Panel>
                </Group>
              </div>
            )}
          </>
        ) : (
          // Layar Kosong (Belum Pilih Akun)
          <div className="flex-1 flex flex-col items-center justify-center bg-wa-chatBg z-10 border-l border-wa-border opacity-70">
            <MonitorSmartphone size={100} strokeWidth={1} className="text-[#3b4a54] mb-6" />
            <h2 className="text-2xl font-light text-[#e9edef] mb-2">WhatsApp Web Manager</h2>
            <p className="text-[#8696a0] max-w-md text-center text-sm leading-relaxed">
              Pilih akun dari daftar di sebelah kiri atau tambahkan akun baru untuk mulai memantau pesan dan menetapkan filter khusus.
            </p>
          </div>
        )}
          </div>
        </Panel>
      </Group>
    </div>
  );
}
