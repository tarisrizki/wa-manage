import { useEffect, useRef, useState } from 'react';
import { Trash2, Users, User, Reply, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { WhatsAppMessage } from '../types';
import { useToast } from './ui/ToastProvider';

export interface ChatRoomProps {
  title?: string;
  messages: WhatsAppMessage[];
  activeAccount: string;
  rules: { id: number, keyword: string, is_active?: number }[];
  onDeleteMessage?: (msgKeyId: string) => void;
  onClearMessages?: () => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  filterComponent?: React.ReactNode;
}

export function ChatRoom({ title, messages, activeAccount, rules, onDeleteMessage, onClearMessages, onLoadMore, isLoading, filterComponent }: ChatRoomProps) {
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
      {/* Header/Banner (Fixed Top) */}
      {title && (
        <div className="h-[50px] bg-background flex items-center px-4 md:px-5 shrink-0 border-b border-border/50 z-30 shadow-sm w-full justify-between relative group">
          <div className="flex items-center flex-1 min-w-0">
            <span className="flex items-center text-[13px] text-foreground font-semibold tracking-wide shrink-0">
              {title === 'Obrolan Grup' ? <Users size={16} className="mr-2 text-primary" /> : <User size={16} className="mr-2 text-primary" />}
              <span className="hidden xl:inline-block">{title ? title.toUpperCase() : ''}</span>
            </span>
            {filterComponent}
          </div>
          {messages.length > 0 && onClearMessages && (
            <button 
              onClick={() => {
                showConfirm({
                  title: 'Bersihkan Pesan',
                  message: `Apakah Anda yakin ingin menghapus semua pesan di ${title}? (Hanya dihapus dari tampilan)`,
                  onConfirm: () => onClearMessages()
                });
              }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10 flex items-center text-[12px] font-medium"
              title="Bersihkan layar"
            >
              <Trash2 size={14} className="mr-1.5" />
              Bersihkan
            </button>
          )}
        </div>
      )}

      {/* Scrollable Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-transparent scrollbar-thin relative z-10 px-4 py-6 md:px-12 lg:px-20 flex flex-col space-y-2">

        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col space-y-4 px-4 py-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="w-48 h-16 bg-muted animate-pulse rounded-2xl rounded-tl-md"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full opacity-60 select-none mt-20">
            {title?.includes('Grup') ? (
              <Users size={80} strokeWidth={1} className="text-muted-foreground mb-6" />
            ) : (
              <User size={80} strokeWidth={1} className="text-muted-foreground mb-6" />
            )}
            <h3 className="text-xl text-foreground font-light mb-2">Belum Ada Pesan</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
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
                      <span className="bg-muted text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm flex items-center border border-border/50">
                        <span className="truncate max-w-[200px]">{tailText}</span>
                        {activeAccount === 'ALL' && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="text-primary uppercase tracking-wider font-bold">Via {m.accountId}</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Bubble Pesan */}
                  <div className={`relative max-w-[85%] rounded-2xl p-2.5 pl-3 shadow-sm ${isHighlighted
                      ? 'bg-primary/10 text-foreground border border-primary/20 ring-1 ring-primary/10'
                      : fromMe
                        ? 'bg-muted text-foreground border border-border/50'
                        : 'bg-card text-foreground border border-border/50'
                    } group transition-all duration-300 hover:shadow-md ${!showTail ? 'mt-1' : fromMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}>

                    {/* Sender Name in Group (hanya untuk pesan orang lain) */}
                    {m.isGroup && showTail && !fromMe && (
                      <div className="flex items-center justify-between mb-1 pr-2">
                        <div className="text-primary text-[13px] font-bold tracking-tight flex-1 min-w-0">
                          <div className="truncate">
                            {m.senderName || senderId?.split('@')[0] || 'Unknown'}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-4 font-medium shrink-0">Group</span>
                      </div>
                    )}

                    {/* Delete Icon (muncul saat hover) - Berlaku untuk SEMUA pesan */}
                    {onDeleteMessage && m.msg?.key?.id && (
                      <button
                        onClick={() => onDeleteMessage(m.msg?.key?.id as string)}
                        className={`absolute top-1 ${fromMe ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus:outline-none bg-background hover:bg-card rounded-full p-1.5 shadow-sm z-10 border border-border`}
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
                      className={`absolute top-1 ${fromMe ? 'left-8' : 'right-8'} opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary focus:outline-none bg-background hover:bg-card rounded-full p-1.5 shadow-sm z-20 cursor-pointer border border-border`}
                      title="Balas Pesan"
                    >
                      <Reply size={13} />
                    </button>

                    {/* Badge untuk keyword yang cocok */}
                    {isHighlighted && matchedRules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {matchedRules.map(r => (
                          <span key={r.id} className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {r.keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Teks Pesan */}
                    <div className="text-inherit text-[13.5px] leading-5 whitespace-pre-wrap break-words pr-12">
                      {m.textContent}
                    </div>

                    {/* Waktu */}
                    <div className={`absolute right-3 bottom-1.5 text-[10px] font-medium text-muted-foreground/70`}>
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
        <div className="shrink-0 bg-card border-t border-border flex flex-col z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {/* Reply Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border/50">
            <div className="flex items-center text-xs font-medium text-muted-foreground">
              <Reply size={14} className="mr-2" />
              Membalas <span className="font-bold text-foreground mx-1">{replyTarget.name}</span>
              <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-2">Via {replyTarget.accountId}</span>
            </div>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Reply Input */}
          <div className="flex items-end p-3 gap-3 bg-background">
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
              className="flex-1 bg-background text-foreground text-sm py-2 px-3 max-h-32 min-h-[44px] focus:outline-none resize-none scrollbar-thin placeholder-muted-foreground"
              rows={Math.min(5, Math.max(1, replyText.split('\n').length))}
              disabled={isSending}
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !replyText.trim()}
              className="text-primary hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent disabled:cursor-not-allowed w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0"
            >
              <Send size={18} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
