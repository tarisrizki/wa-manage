import { useEffect, useRef } from 'react';
import { ShieldCheck, Trash2, Trash } from 'lucide-react';
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
      {/* Header/Banner */}
        <div className="flex justify-center mb-6 sticky top-0 z-20">
          <div className="bg-wa-panel px-4 py-2 rounded-xl shadow-sm border border-wa-border flex items-center justify-between w-full max-w-sm">
            <span className="flex items-center text-xs text-wa-textMuted font-semibold">
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
          <div className="text-center mt-10 text-wa-textMuted text-sm">
            Menunggu pesan masuk...
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
            const isHighlighted = rules.some(r => r.is_active === 1 && m.textContent.toLowerCase().includes(r.keyword.toLowerCase()));
            
            return (
              <div key={uniqueKey} className={`flex mb-0.5 w-full justify-start ${showTail ? 'mt-2' : ''}`}>
                <div className={`p-1.5 px-2 pb-2 max-w-[65%] md:max-w-[75%] shadow-sm relative group ${showTail ? 'rounded-lg rounded-tl-none' : 'rounded-lg'} ${isHighlighted ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-wa-panel'}`}>
                  {/* Ekor Balon Chat */}
                  {showTail && (
                    <svg viewBox="0 0 8 13" height="13" width="8" className={`absolute top-0 -left-[8px] ${isHighlighted ? 'text-emerald-900/40' : 'text-wa-panel'}`}>
                      <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                      <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                    </svg>
                  )}
                  
                  {showTail && (
                    <div className="flex justify-between items-center mb-0.5 pr-2">
                      <span className="text-[#e9edef] text-[13px] font-semibold leading-5 text-emerald-500">
                        {m.isGroup ? (
                          <span className="flex items-center">
                            <span className="text-gray-400 font-normal truncate max-w-[150px]">
                              {m.groupName || 'Unknown Group'}
                            </span>
                            <span className="text-gray-500 mx-1">›</span>
                            <span className="truncate max-w-[120px]">
                              {m.senderName || senderId?.split('@')[0] || 'Unknown'}
                            </span>
                          </span>
                        ) : (
                          <span>{m.senderName || senderId?.split('@')[0] || 'Unknown'}</span>
                        )}
                      </span>
                      {/* Delete Icon (muncul saat hover) */}
                      {onDeleteMessage && m.msg?.key?.id && (
                        <button 
                          onClick={() => onDeleteMessage(m.msg.key.id as string)}
                          className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 focus:outline-none"
                          title="Hapus Pesan"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <span className="text-[10px] text-wa-textMuted ml-4">{m.isGroup ? 'Group' : 'Personal'}</span>
                    </div>
                  )}
                  
                  <div className="text-[#e9edef] text-[14.2px] leading-5 whitespace-pre-wrap break-words pr-12">
                    {m.textContent}
                  </div>
                
                <div className="absolute right-2 bottom-1 text-[11px] text-wa-textMuted">
                  {timeString}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Spacer to avoid bottom cutoff */}
      <div className="h-4"></div>
    </div>
  );
}
