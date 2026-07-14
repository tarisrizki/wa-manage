import { useState } from 'react';
import { Megaphone, MonitorSmartphone, Users, Download, MapPin } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { useWhatsAppAccounts } from './hooks/useWhatsAppAccounts';
import { useWhatsAppMessages } from './hooks/useWhatsAppMessages';

// Komponen Terpisah
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { QRScreen } from './components/QRScreen';
import { RuleEngine } from './components/RuleEngine';
import { BroadcastModal } from './components/BroadcastModal';
import { JoinGroupCSVModal } from './components/JoinGroupCSVModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { GroupScraperModal } from './components/GroupScraperModal';
import { GmapsScraperModal } from './components/GmapsScraperModal';
import { ApiGateway } from './components/ApiGateway';

export default function App() {
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isGmapsModalOpen, setIsGmapsModalOpen] = useState(false);

  const {
    savedAccounts,
    connectedAccounts,
    activeAccount,
    setActiveAccount,
    qrs,
    handleAddAccount,
    handleDeleteAccount
  } = useWhatsAppAccounts();

  const {
    rules,
    filteredMessages,
    isFilterEnabled,
    setIsFilterEnabled,
    handleAddRule,
    handleDeleteRule,
    handleDeleteMessage,
    handleClearMessages,
    handleLoadMoreMessages,
    isLoadingMessages,
    selectedGroupJid,
    setSelectedGroupJid
  } = useWhatsAppMessages(activeAccount);

  // Tab 'ALL' dianggap selalu terkoneksi asalkan ada minimal 1 akun yang terkoneksi
  const isActiveAccountConnected = activeAccount === 'ALL' 
    ? connectedAccounts.length > 0 
    : (activeAccount && connectedAccounts.includes(activeAccount));

  return (
    <div className="flex flex-col h-screen w-full font-sans text-foreground bg-background selection:bg-primary selection:text-primary-foreground overflow-hidden">
      

      <AnimatePresence>
        {isBroadcastModalOpen && activeAccount && activeAccount !== 'ANALYTICS' && (
          <BroadcastModal 
            activeAccount={activeAccount} 
            onClose={() => setIsBroadcastModalOpen(false)} 
          />
        )}
        {isJoinGroupModalOpen && activeAccount && activeAccount !== 'ANALYTICS' && (
          <JoinGroupCSVModal
            activeAccount={activeAccount}
            onClose={() => setIsJoinGroupModalOpen(false)}
          />
        )}
        {isScraperModalOpen && activeAccount && activeAccount !== 'ANALYTICS' && (
          <GroupScraperModal
            activeAccount={activeAccount}
            onClose={() => setIsScraperModalOpen(false)}
          />
        )}
        {isGmapsModalOpen && activeAccount !== 'ANALYTICS' && (
          <GmapsScraperModal onClose={() => setIsGmapsModalOpen(false)} activeAccount={activeAccount!} />
        )}
      </AnimatePresence>

      {/* Kontainer Utama */}
      <div className="flex-1 w-full relative z-10 flex min-h-0 overflow-hidden">
        
        {/* SIDEBAR FIXED (ICON ONLY) */}
        <div className="w-[72px] shrink-0 h-full z-20 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
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

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
          {activeAccount === 'API_GATEWAY' ? (
            <ApiGateway />
          ) : activeAccount === 'ANALYTICS' ? (
            <AnalyticsDashboard />
          ) : activeAccount ? (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Header Utama (Area Kanan) */}
              <div className="h-[60px] bg-background flex items-center px-6 py-2 border-b border-border/50 shrink-0 shadow-sm z-20">
                <div className="flex-1 flex items-center min-w-0">
                  <span className="text-foreground text-lg font-semibold tracking-tight truncate mr-3">{activeAccount}</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center ${isActiveAccountConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActiveAccountConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {isActiveAccountConnected ? 'Online' : 'Menghubungkan...'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground shrink-0">
                  <button 
                    onClick={() => setIsGmapsModalOpen(true)}
                    className="px-3 py-1.5 rounded-md hover:bg-primary/20 text-primary hover:text-primary transition-all flex items-center text-sm font-medium"
                    title="Cari Leads (B2B) dari Google Maps"
                  >
                    <MapPin size={16} className="mr-2" />
                    Cari Leads
                  </button>
                  <button 
                    onClick={() => setIsScraperModalOpen(true)}
                    className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center text-sm font-medium"
                    title="Ekstrak Peserta Grup ke CSV"
                  >
                    <Download size={16} className="mr-2" />
                    Ekstrak Grup
                  </button>
                  <button 
                    onClick={() => setIsJoinGroupModalOpen(true)}
                    className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center text-sm font-medium"
                    title="Join Grup dari CSV"
                  >
                    <Users size={16} className="mr-2" />
                    Join Grup
                  </button>
                  <button 
                    onClick={() => setIsBroadcastModalOpen(true)}
                    className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center text-sm font-medium"
                    title="Kirim Broadcast"
                  >
                    <Megaphone size={16} className="mr-2" />
                    Broadcast
                  </button>
                </div>
              </div>

              {/* Konten Chat / QR */}
              <div className="flex-1 flex flex-col min-h-0 relative">
                {!isActiveAccountConnected ? (
                  <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                    <QRScreen qr={qrs[activeAccount]} />
                  </div>
                ) : (
                  <Group orientation="horizontal" className="w-full h-full relative">
                    {/* Panel Kiri: Grup */}
                    <Panel defaultSize={50} minSize={20}>
                      <div className="h-full flex flex-col bg-background overflow-hidden relative">
                        <ChatRoom 
                          title="Obrolan Grup"
                          activeAccount={activeAccount} 
                          messages={filteredMessages.filter(m => m.isGroup)} 
                          rules={rules}
                          onDeleteMessage={handleDeleteMessage}
                          onClearMessages={() => handleClearMessages(true)}
                          onLoadMore={() => handleLoadMoreMessages()}
                          isLoading={isLoadingMessages}
                          filterComponent={
                            <RuleEngine 
                              rules={rules} 
                              onAddRule={handleAddRule} 
                              onDeleteRule={handleDeleteRule}
                              isFilterEnabled={isFilterEnabled}
                              setIsFilterEnabled={setIsFilterEnabled}
                              activeAccount={activeAccount!}
                              selectedGroupJid={selectedGroupJid}
                              setSelectedGroupJid={setSelectedGroupJid}
                            />
                          }
                        />
                      </div>
                    </Panel>

                    {/* Pembatas Fleksibel (Resize Handle) */}
                    <Separator className="w-1 bg-border/50 hover:bg-primary/50 transition-colors cursor-col-resize z-30 flex items-center justify-center" />

                    {/* Panel Kanan: Pribadi */}
                    <Panel defaultSize={50} minSize={20}>
                      <div className="h-full flex flex-col bg-background overflow-hidden relative">
                        <ChatRoom 
                          title="Pesan Personal"
                          activeAccount={activeAccount} 
                          messages={filteredMessages.filter(m => !m.isGroup)} 
                          rules={rules}
                          onDeleteMessage={handleDeleteMessage}
                          onClearMessages={() => handleClearMessages(false)}
                          onLoadMore={() => handleLoadMoreMessages()}
                          isLoading={isLoadingMessages}
                        />
                      </div>
                    </Panel>
                  </Group>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full w-full bg-background flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center border border-border">
                <MonitorSmartphone size={40} className="text-muted-foreground/60" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Pilih Akun WhatsApp</h2>
              <p className="max-w-md text-center mb-8">Klik pada salah satu akun di sidebar kiri untuk mengelola pesan dan pengaturan, atau tambah akun baru.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
