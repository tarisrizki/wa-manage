import { useEffect, useRef, useState } from 'react';
import { Trash2, Trash, Users, User, Reply, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { WhatsAppMessage } from '../types';
import { useToast } from './ui/ToastProvider';

export interface ChatRoomProps {
  title?: string;
  messages: WhatsAppMessage[];
  activeAccount: string;
  rules: {id: number, keyword: string, is_active?: number}[];
  onDeleteMessage?: (msgKeyId: string) => void;
  onClearMessages?: () => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function ChatRoom({ title, messages, activeAccount, rules, onDeleteMessage, onClearMessages, onLoadMore, isLoading }: ChatRoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // State untuk membalas pesan
  const [replyTarget, setReplyTarget] = useState<{ jid: string, name: string, accountId: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { showToast, showConfirm } = useToast();

  const handleSendReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    
    setIsSending(true);
    try {
      const success = await window.api.sendMessage(replyTarget.accountId, replyTarget.jid, replyText);
      if (success) {
        setReplyText('');
        setReplyTarget(null);
        showToast({ message: 'Pesan terkirim', type: 'success' });
      } else {
        showToast({ message: 'Gagal mengirim pesan. Pastikan koneksi WhatsApp stabil.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      showToast({ message: 'Terjadi kesalahan saat mengirim pesan.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  // Auto scroll ke bawah hanya ketika messages untuk akun ini bertambah,
  // kecuali jika ini adalah proses prepending (Muat Pesan Lama).
  const prevMessagesLength = useRef(0);
  const prevScrollHeight = useRef(0);
  const prevLastMessageId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!scrollRef.current) return;
    
    const currentLength = messages.length;
    const pLength = prevMessagesLength.current;
    
    const currentLastMessageId = messages[currentLength - 1]?.msg?.key?.id as string | undefined;
    
    // Deteksi jika pesan lama dimuat: array bertambah, tapi pesan terakhir (terbaru) tetap sama
    const isPrepend = pLength > 0 && currentLength > pLength && currentLastMessageId === prevLastMessageId.current;

    if (isPrepend) {
      // Pertahankan posisi scroll relatif agar tidak melompat ke bawah
      const newScrollHeight = scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop += (newScrollHeight - prevScrollHeight.current);
    } else {
      // Auto-scroll ke bawah untuk pesan baru
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    prevMessagesLength.current = currentLength;
    prevScrollHeight.current = scrollRef.current.scrollHeight;
    prevLastMessageId.current = currentLastMessageId;
  }, [messages, activeAccount]);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0 && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
      {/* Scrollable Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-transparent scrollbar-thin relative z-10 px-4 py-6 md:px-12 lg:px-20 flex flex-col space-y-2">
        {/* Header/Banner (Glassmorphism) */}
          <div className="flex justify-center mb-6 sticky top-2 z-20">
            <div className="bg-wa-panel/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg border border-white/5 flex items-center justify-between w-full max-w-sm">
              <span className="flex items-center text-[13px] text-gray-300 font-semibold tracking-wide">
                <span className="mr-2">{title?.includes('Grup') ? '🏢' : '👤'}</span>
                {title ? title.toUpperCase() : ''}
              </span>
              {messages.length > 0 && onClearMessages && (
                <button 
                  onClick={() => {
                    showConfirm({
                      title: 'Bersihkan Pesan',
                      message: 'Yakin ingin menghapus SEMUA chat di layar ini?',
                      confirmText: 'Hapus Semua',
                      onConfirm: () => onClearMessages()
                    });
                  }}
                  className="text-wa-danger hover:text-red-300 p-1.5 rounded-md hover:bg-wa-hover transition-colors ml-4 flex items-center"
                  title="Bersihkan Semua Pesan"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col space-y-4 px-4 py-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="w-48 h-16 bg-wa-hover/50 animate-pulse rounded-2xl rounded-tl-md"></div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
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
            <>
              {messages.map((m, idx) => {
              const remoteJid = m.msg?.key?.remoteJid;
              const senderId = m.isGroup ? (m.msg?.key?.participant || remoteJid) : remoteJid;
              
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const prevRemoteJid = prevMsg?.msg?.key?.remoteJid;
              const prevSenderId = prevMsg ? (prevMsg.isGroup ? (prevMsg.msg?.key?.participant || prevRemoteJid) : prevRemoteJid) : null;
              
              const prevAccountId = idx > 0 ? messages[idx - 1].accountId : null;
              
              // Ekor chat ditampilkan jika pesan sebelumnya berasal dari orang yang berbeda, grup yang berbeda, ATAU akun yang berbeda
              const showTail = (senderId !== prevSenderId) || (remoteJid !== prevRemoteJid) || (m.accountId !== prevAccountId);
              
              // Memperbaiki Timestamp Bug (Menggunakan waktu asli dari pesan jika ada, fallback ke Date.now)
              let timeString = '';
              if (m.msg?.messageTimestamp) {
                // Timestamp Baileys biasanya dalam detik, namun terkadang ms
                const ts = Number(m.msg.messageTimestamp);
                const date = new Date(ts > 1e11 ? ts : ts * 1000);
                timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              } else {
                timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              }
              
              // Memperbaiki Fallback Key: kombinasi id + remoteJid + idx agar unik
              const uniqueKey = m.msg?.key?.id ? `${m.msg.key.id}-${idx}` : `msg-${idx}`;
              // Filter kata kunci: pastikan rules tidak kosong
              const validRules = rules.filter(r => r.is_active === 1 && r.keyword && r.keyword.trim() !== '');
              const matchedRules = validRules.filter(r => m.textContent.toLowerCase().includes(r.keyword.toLowerCase()));
              const isHighlighted = matchedRules.length > 0;
              const fromMe = m.msg?.key?.fromMe;
              
              // Nama pengirim untuk tail separator
              let tailText = '';
              if (m.isGroup) {
                tailText = `${m.groupName || 'Unknown Group'} • ${fromMe ? 'Anda' : (m.senderName || senderId?.split('@')[0] || 'Unknown')}`;
              } else {
                tailText = fromMe 
                  ? `Anda ➔ ${m.senderName || senderId?.split('@')[0] || 'Unknown'}`
                  : `Personal • ${m.senderName || senderId?.split('@')[0] || 'Unknown'}`;
              }
              
              return (
                <motion.div 
                  key={uniqueKey}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex flex-col w-full ${isHighlighted ? 'mt-4' : ''} ${fromMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Tail / Pemisah Grup Bubble */}
                  {showTail && (
                    <div className={`flex my-3 w-full justify-center`}>
                      <span className="bg-[#182229] text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm flex items-center">
                        <span className="truncate max-w-[200px]">{tailText}</span>
                        {activeAccount === 'ALL' && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="text-wa-teal uppercase tracking-wider font-bold">Via {m.accountId}</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* Bubble Pesan */}
                  <div className={`relative max-w-[85%] rounded-2xl p-2 pl-3 shadow-sm ${
                    isHighlighted 
                      ? 'bg-wa-teal text-white border border-wa-teal/40 ring-1 ring-wa-teal/20' 
                      : fromMe
                        ? 'bg-wa-primary text-white border border-transparent'
                        : 'bg-wa-panel text-wa-textDark border border-transparent'
                  } group transition-all duration-300 hover:shadow-md ${
                    !showTail ? 'mt-1' : fromMe ? 'rounded-tr-md' : 'rounded-tl-md'
                  }`}>
                    
                    {/* Sender Name in Group (hanya untuk pesan orang lain) */}
                    {m.isGroup && showTail && !fromMe && (
                      <div className="flex items-center justify-between mb-1 pr-2">
                        <div className="text-wa-primary text-[13px] font-bold tracking-tight flex-1 min-w-0">
                          <div className="truncate">
                            {m.senderName || senderId?.split('@')[0] || 'Unknown'}
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 ml-4 font-medium shrink-0">Group</span>
                      </div>
                    )}

                    {/* Delete Icon (muncul saat hover) - Berlaku untuk SEMUA pesan */}
                    {onDeleteMessage && m.msg?.key?.id && (
                      <button 
                        onClick={() => onDeleteMessage(m.msg?.key?.id as string)}
                        className={`absolute top-1 ${fromMe ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 focus:outline-none bg-wa-bg hover:bg-wa-panel rounded-full p-1.5 shadow-sm z-10`}
                        title="Hapus Pesan"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    
                    {/* Reply Icon (muncul saat hover) */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setReplyTarget({
                          jid: remoteJid || '',
                          name: fromMe ? 'Anda' : (m.senderName || (m.isGroup ? m.groupName : senderId?.split('@')[0]) || 'Unknown'),
                          accountId: m.accountId
                        });
                      }}
                      className={`absolute top-1 ${fromMe ? 'left-8' : 'right-8'} opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-wa-teal focus:outline-none bg-wa-bg hover:bg-wa-panel rounded-full p-1.5 shadow-sm z-20 cursor-pointer`}
                      title="Balas Pesan"
                    >
                      <Reply size={13} />
                    </button>
                    
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
                    <div className="absolute right-3 bottom-1.5 text-[10px] text-wa-textMuted font-light">
                      {timeString}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </>
          )}

        <div className="h-4"></div>
      </div>
      
      {/* Reply Box Fixed at Bottom */}
      {replyTarget && (
        <div className="shrink-0 bg-wa-panel border-t border-[#313d45]/50 flex flex-col z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
          {/* Reply Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#202c33] border-b border-[#313d45]">
            <div className="flex items-center text-sm font-medium text-gray-300">
              <Reply size={16} className="mr-2 text-[#00a884]" />
              Membalas <span className="font-bold text-[#e9edef] mx-1">{replyTarget.name}</span>
              <span className="text-[10px] bg-[#313d45] text-gray-400 px-2 py-0.5 rounded-full ml-2">Via {replyTarget.accountId}</span>
            </div>
            <button 
              onClick={() => setReplyTarget(null)}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#313d45] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Reply Input */}
          <div className="flex items-end p-3 gap-3 bg-wa-chatBg">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Ketik pesan..."
              className="flex-1 bg-wa-panel text-[#e9edef] text-sm rounded-xl py-3 px-4 max-h-32 min-h-[48px] focus:outline-none resize-none scrollbar-thin placeholder-gray-500 border border-transparent focus:border-[#313d45] transition-colors"
              rows={Math.min(5, Math.max(1, replyText.split('\n').length))}
              disabled={isSending}
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !replyText.trim()}
              className="bg-[#00a884] hover:bg-[#008f6f] disabled:bg-[#00a884]/40 disabled:cursor-not-allowed text-white w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md"
            >
              <Send size={20} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
