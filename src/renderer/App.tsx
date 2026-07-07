import { useState } from 'react';
import { Smartphone, GripVertical, Megaphone, MonitorSmartphone, Users } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { AnimatePresence } from 'framer-motion';

import { useWhatsAppAccounts } from './hooks/useWhatsAppAccounts';
import { useWhatsAppMessages } from './hooks/useWhatsAppMessages';

// Komponen Terpisah
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { QRScreen } from './components/QRScreen';
import { RuleEngine } from './components/RuleEngine';
import { BroadcastModal } from './components/BroadcastModal';
import { JoinGroupCSVModal } from './components/JoinGroupCSVModal';

export default function App() {
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);

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
    handleAddRule,
    handleDeleteRule,
    handleDeleteMessage,
    handleClearMessages,
    handleLoadMoreMessages,
    isLoadingMessages
  } = useWhatsAppMessages(activeAccount);

  // Tab 'ALL' dianggap selalu terkoneksi asalkan ada minimal 1 akun yang terkoneksi
  const isActiveAccountConnected = activeAccount === 'ALL' 
    ? connectedAccounts.length > 0 
    : (activeAccount && connectedAccounts.includes(activeAccount));

  return (
    <div className="flex flex-col h-screen w-full font-sans text-wa-textDark bg-wa-bg selection:bg-wa-green selection:text-white overflow-hidden">
      

      <AnimatePresence>
        {isBroadcastModalOpen && activeAccount && (
          <BroadcastModal 
            activeAccount={activeAccount} 
            onClose={() => setIsBroadcastModalOpen(false)} 
          />
        )}
        {isJoinGroupModalOpen && activeAccount && (
          <JoinGroupCSVModal
            activeAccount={activeAccount}
            onClose={() => setIsJoinGroupModalOpen(false)}
          />
        )}
      </AnimatePresence>

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
              <button 
                onClick={() => setIsJoinGroupModalOpen(true)}
                className="p-2 rounded-full hover:bg-wa-hover text-wa-primary transition-colors flex items-center"
                title="Join Grup dari CSV"
              >
                <Users size={20} className="mr-2" />
                <span className="text-sm font-medium">Join Grup</span>
              </button>
              <button 
                onClick={() => setIsBroadcastModalOpen(true)}
                className="p-2 rounded-full hover:bg-wa-hover text-wa-primary transition-colors flex items-center"
                title="Kirim Broadcast"
              >
                <Megaphone size={20} className="mr-2" />
                <span className="text-sm font-medium">Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kontainer Utama dengan 1 Group untuk 3 Panel */}
      <div className="flex-1 w-full relative z-10 flex min-h-0 overflow-hidden">
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
                    <div className="h-full flex flex-col bg-wa-chatBg overflow-hidden">
                      <RuleEngine 
                        rules={rules} 
                        onAddRule={handleAddRule} 
                        onDeleteRule={handleDeleteRule} 
                      />
                      <ChatRoom 
                        title="🏢 Obrolan Grup"
                        messages={filteredMessages.filter(m => m.isGroup)} 
                        activeAccount={activeAccount}
                        rules={rules}
                        onDeleteMessage={handleDeleteMessage}
                        onClearMessages={() => handleClearMessages(true)}
                        onLoadMore={handleLoadMoreMessages}
                        isLoading={isLoadingMessages}
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
                    <div className="h-full flex flex-col bg-wa-chatBg border-l border-[#313d45]/30 overflow-hidden">
                      <ChatRoom 
                        title="👤 Pesan Pribadi"
                        messages={filteredMessages.filter(m => !m.isGroup)} 
                        activeAccount={activeAccount}
                        rules={rules}
                        onDeleteMessage={handleDeleteMessage}
                        onClearMessages={() => handleClearMessages(false)}
                        onLoadMore={handleLoadMoreMessages}
                        isLoading={isLoadingMessages}
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
