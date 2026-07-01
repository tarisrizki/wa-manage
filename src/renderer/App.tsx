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
    
    // Gunakan textContent yang sudah disediakan dari backend/database
    const textLower = (msg.textContent || '').toLowerCase();
    
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
    <div className="flex flex-col h-screen w-full font-sans text-wa-textDark bg-wa-bg selection:bg-wa-green selection:text-white overflow-hidden">
      
      {/* Latar Belakang Khas WA (Doodle) */}
      <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
           style={{ backgroundImage: `url(${bgDoodle})`, backgroundRepeat: 'repeat' }}>
      </div>

      {activeAccount && (
        <div className="flex flex-col z-10 shrink-0">
          {/* Header Utama (membentang penuh) */}
          <div className="h-[60px] bg-wa-panel flex items-center px-4 py-2 border-b border-wa-border">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mr-4">
              <Smartphone className="text-slate-300" size={20} />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <span className="text-white text-base font-medium truncate">{activeAccount}</span>
              <span className="text-xs text-wa-textMuted truncate">
                {isActiveAccountConnected ? 'Online' : 'Membutuhkan tindakan'}
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-[#aebac1] shrink-0">
              <button className="p-2 rounded-full hover:bg-wa-hover transition-colors"><Search size={20} /></button>
              <button className="p-2 rounded-full hover:bg-wa-hover transition-colors"><MoreVertical size={20} /></button>
            </div>
          </div>

          {/* Rule Engine / Filter (membentang penuh) */}
          {isActiveAccountConnected && (
            <div className="bg-[#202c33] border-b border-[#313d45] shadow-sm">
              <RuleEngine 
                rules={rules} 
                onAddRule={handleAddRule} 
                onDeleteRule={handleDeleteRule} 
              />
            </div>
          )}
        </div>
      )}

      {/* Kontainer Utama dengan 1 Group untuk 3 Panel */}
      <div className="flex-1 w-full relative z-10 flex">
        <Group orientation="horizontal" className="w-full h-full">
          {/* PANEL 1: DAFTAR AKUN (Sidebar) */}
          <Panel id="panel-sidebar" defaultSize={25} minSize={15}>
            <div className="h-full bg-wa-bg border-r border-[#313d45]/30">
              <Sidebar 
                savedAccounts={savedAccounts}
                connectedAccounts={connectedAccounts}
                qrs={qrs}
                activeAccount={activeAccount}
                setActiveAccount={setActiveAccount}
                onAddAccount={handleAddAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            </div>
          </Panel>

          <Separator id="sep-sidebar" className="group flex items-center justify-center w-2 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#00a884] cursor-col-resize z-30">
            <div className="flex items-center justify-center h-12 w-1.5 bg-[#313d45] group-hover:bg-[#8696a0] rounded-full">
              <GripVertical size={12} className="text-[#8696a0] group-hover:text-white" />
            </div>
          </Separator>

          {/* Sisa Area: Chat atau QR */}
          {activeAccount ? (
            <>
              {!isActiveAccountConnected ? (
                <Panel id="panel-qr" defaultSize={75} minSize={40}>
                  <div className="h-full w-full bg-wa-chatBg flex items-center justify-center">
                    <QRScreen qr={qrs[activeAccount]} />
                  </div>
                </Panel>
              ) : (
                <>
                  {/* PANEL 2: OBROLAN GRUP */}
                  <Panel id="panel-group" defaultSize={37.5} minSize={20}>
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

                  <Separator id="sep-main" className="group flex items-center justify-center w-2 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#00a884] cursor-col-resize z-30">
                    <div className="flex items-center justify-center h-12 w-1.5 bg-[#313d45] group-hover:bg-[#8696a0] rounded-full">
                      <GripVertical size={12} className="text-[#8696a0] group-hover:text-white" />
                    </div>
                  </Separator>

                  {/* PANEL 3: PESAN PRIBADI */}
                  <Panel id="panel-private" defaultSize={37.5} minSize={20}>
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
                </>
              )}
            </>
          ) : (
            <Panel id="panel-empty" defaultSize={75} minSize={40}>
              <div className="h-full w-full bg-wa-chatBg flex flex-col items-center justify-center text-[#8696a0]">
                <MonitorSmartphone size={80} className="mb-6 text-[#41525d] font-light" />
                <h1 className="text-3xl font-light text-[#e9edef] mb-4">WhatsApp Web Manager</h1>
                <p className="text-sm">Pilih akun dari daftar di sebelah kiri untuk mulai mengelola.</p>
              </div>
            </Panel>
          )}
        </Group>
      </div>
    </div>
  );
}
