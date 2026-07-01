import { useEffect, useRef } from 'react';
import { ShieldCheck, Trash2, Trash, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { WhatsAppMessage } from '../types';

export interface ChatRoomProps {
  title?: string;
  messages: WhatsAppMessage[];
  activeAccount: string;
  rules: {id: number, keyword: string}[];
  onDeleteRule?: (id: number) => void;
  onDeleteMessage?: (msgKeyId: string) => void;
  onClearMessages?: () => void;
}

export function ChatRoom({ title, messages, activeAccount, rules, onDeleteRule, onDeleteMessage, onClearMessages }: ChatRoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll ke bawah hanya ketika messages untuk akun ini bertambah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeAccount]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-transparent scrollbar-thin relative z-10 px-4 py-6 md:px-12 lg:px-20 flex flex-col space-y-2">
      {/* Header/Banner (Glassmorphism) */}
        <div className="flex justify-center mb-6 sticky top-2 z-20">
          <div className="bg-[#111b21]/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg border border-white/5 flex items-center justify-between w-full max-w-sm">
            <span className="flex items-center text-[13px] text-gray-300 font-semibold tracking-wide">
              {title ? (
                <>
                  <span className="mr-2">{title.includes('Grup') ? '🏢' : '👤'}</span>
                  {title.toUpperCase()}
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="mr-2 text-wa-textMuted" />
                  PESAN TERENKRIPSI SECARA END-TO-END
                </>
              )}
            </span>
            {messages.length > 0 && onClearMessages && (
              <button 
                onClick={() => {
                  if (confirm('Yakin ingin menghapus SEMUA chat di layar ini?')) {
                    onClearMessages();
                  }
                }}
                className="text-red-400 hover:text-red-300 p-1.5 rounded-md hover:bg-wa-hover transition-colors ml-4 flex items-center"
                title="Bersihkan Semua Pesan"
              >
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full opacity-60 select-none mt-20">
            {title?.includes('Grup') ? (
              <Users size={80} strokeWidth={1} className="text-gray-500 mb-6" />
            ) : (
              <User size={80} strokeWidth={1} className="text-gray-500 mb-6" />
            )}
            <h3 className="text-xl text-gray-300 font-light mb-2">Belum Ada Pesan</h3>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Pesan baru yang masuk akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const remoteJid = m.msg?.key?.remoteJid;
            const senderId = m.isGroup ? (m.msg?.key?.participant || remoteJid) : remoteJid;
            
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevRemoteJid = prevMsg?.msg?.key?.remoteJid;
            const prevSenderId = prevMsg ? (prevMsg.isGroup ? (prevMsg.msg?.key?.participant || prevRemoteJid) : prevRemoteJid) : null;
            
            // Ekor chat ditampilkan jika pesan sebelumnya berasal dari orang yang berbeda ATAU dari chat/grup yang berbeda
            const showTail = (senderId !== prevSenderId) || (remoteJid !== prevRemoteJid);
            
            // Memperbaiki Timestamp Bug (Menggunakan waktu asli dari pesan jika ada, fallback ke Date.now)
            let timeString = '';
            if (m.msg?.messageTimestamp) {
              // Timestamp Baileys biasanya dalam detik, namun terkadang ms
              const ts = Number(m.msg.messageTimestamp);
              const date = new Date(ts > 1e11 ? ts : ts * 1000);
              timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
              timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            // Memperbaiki Fallback Key: kombinasi id + remoteJid + idx agar unik
            const uniqueKey = m.msg?.key?.id ? `${m.msg.key.id}-${idx}` : `msg-${idx}`;
            // Filter kata kunci: pastikan rules tidak kosong
            const validRules = rules.filter(r => r.is_active === 1 && r.keyword && r.keyword.trim() !== '');
            const matchedRules = validRules.filter(r => m.textContent.toLowerCase().includes(r.keyword.toLowerCase()));
            const isHighlighted = matchedRules.length > 0;
            
            return (
              <motion.div 
                key={uniqueKey}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex flex-col ${isHighlighted ? 'mt-4' : ''}`}
              >
                {/* Tail / Pemisah Grup Bubble */}
                {showTail && (
                  <div className="flex justify-center my-3">
                    <span className="bg-[#182229] text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                      {m.isGroup ? (m.groupName || 'Unknown Group') : 'Personal'} 
                      <span className="mx-1.5">•</span> 
                      {m.senderName || senderId?.split('@')[0] || 'Unknown'}
                    </span>
                  </div>
                )}
                
                {/* Bubble Pesan */}
                <div className={`relative max-w-[85%] rounded-2xl p-2 pl-3 shadow-sm ${
                  isHighlighted 
                    ? 'bg-[#005c4b] text-white border border-[#00a884]/40 ring-1 ring-[#00a884]/20' 
                    : 'bg-wa-panel text-[#e9edef] border border-transparent'
                } group transition-all duration-300 hover:shadow-md ${
                  showTail ? 'rounded-tl-md' : 'mt-1'
                }`}>
                  
                  {/* Sender Name in Group */}
                  {m.isGroup && showTail && (
                    <div className="flex items-center justify-between mb-1 pr-2">
                      <span className="text-[#53bdeb] text-[13px] font-semibold tracking-tight">
                        <span className="truncate max-w-[120px]">
                          {m.senderName || senderId?.split('@')[0] || 'Unknown'}
                        </span>
                      </span>
                      <span className="text-[10px] text-gray-500 ml-4 font-medium">Group</span>
                    </div>
                  )}

                  {/* Delete Icon (muncul saat hover) - Berlaku untuk SEMUA pesan */}
                  {onDeleteMessage && m.msg?.key?.id && (
                    <button 
                      onClick={() => onDeleteMessage(m.msg.key.id as string)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 focus:outline-none bg-wa-panel/80 hover:bg-wa-panel rounded-full p-1.5 shadow-sm z-10"
                      title="Hapus Pesan"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  
                  {/* Badge untuk keyword yang cocok */}
                  {isHighlighted && matchedRules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {matchedRules.map(r => (
                        <span key={r.id} className="bg-[#00a884]/20 text-[#00a884] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {r.keyword}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Teks Pesan */}
                  <div className="text-[#e9edef] text-[14.2px] leading-5 whitespace-pre-wrap break-words pr-12">
                    {m.textContent}
                  </div>
                
                  {/* Waktu */}
                  <div className="absolute right-3 bottom-1.5 text-[10px] text-gray-400 font-medium">
                    {timeString}
                  </div>
                </div>
              </motion.div>
            )
        })
      )}

      {/* Spacer to avoid bottom cutoff */}
      <div className="h-4"></div>
    </div>
  );
}
