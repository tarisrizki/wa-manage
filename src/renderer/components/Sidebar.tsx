import { useState } from 'react';
import { Monitor, Trash2, Smartphone, Plus, Inbox } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from './ui/ToastProvider';

export interface SidebarProps {
  savedAccounts: string[];
  connectedAccounts: string[];
  qrs: Record<string, string>;
  activeAccount: string | null;
  setActiveAccount: (id: string | null) => void;
  onAddAccount: (id: string) => void;
  onDeleteAccount: (e: React.MouseEvent, id: string) => void;
}

export function Sidebar({ savedAccounts, connectedAccounts, qrs, activeAccount, setActiveAccount, onAddAccount, onDeleteAccount }: SidebarProps) {
  const [newAccountId, setNewAccountId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { showConfirm } = useToast();

  const handleAddAccount = () => {
    if (newAccountId && newAccountId.trim()) {
      const cleanId = newAccountId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanId) return;
      onAddAccount(cleanId);
      setNewAccountId('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col border-r border-wa-border bg-wa-bg overflow-hidden">
      {/* Header Kiri */}
      <div className="h-[60px] bg-wa-panel flex items-center justify-between px-4 py-2 shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center">
          <Monitor className="text-wa-textDark" size={24} />
        </div>
        <div className="flex items-center space-x-4 text-[#aebac1]">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="p-2 w-auto h-auto rounded-full hover:bg-wa-hover transition-colors" title="Tambah Akun" />}>
              <Plus size={20} />
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-wa-panel text-wa-textDark border-wa-border">
              <DialogHeader>
                <DialogTitle className="text-white">Tambah Akun WhatsApp</DialogTitle>
                <DialogDescription className="text-wa-textMuted">
                  Masukkan ID Unik untuk sesi ini. Disarankan nama divisi (Contoh: CS-1).
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <Input 
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                  placeholder="Ketik ID Akun..." 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  className="bg-wa-hover border-none text-white focus-visible:ring-1 focus-visible:ring-wa-green"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleAddAccount} className="bg-wa-primary hover:bg-wa-primary/90 text-white">Tambahkan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* <button className="p-2 rounded-full hover:bg-wa-hover transition-colors">
            <MoreVertical size={20} />
          </button> */}
        </div>
      </div>

      {/* Search Bar (Hidden until implemented) */}
      {/* 
      <div className="h-[50px] flex items-center px-3 py-2 border-b border-wa-border">
        <div className="flex-1 flex items-center bg-wa-panel rounded-lg px-3 py-1.5 h-[35px]">
          <Search size={18} className="text-wa-textMuted mr-4" />
          <input 
            type="text" 
            placeholder="Cari akun..." 
            className="bg-transparent border-none outline-none text-wa-textDark text-sm w-full placeholder:text-wa-textMuted"
          />
        </div>
        <button className="ml-2 p-1.5 text-wa-textMuted">
          <Filter size={18} />
        </button>
      </div> 
      */}

      {/* Chat List (Daftar Akun) */}
      <div className="flex-1 overflow-y-auto bg-wa-bg scrollbar-thin">
        {/* Item "Semua Akun" */}
        {savedAccounts.length > 0 && (
          <div 
            onClick={() => setActiveAccount('ALL')}
            className={`flex items-center px-3 h-[72px] cursor-pointer hover:bg-wa-panel transition-colors ${activeAccount === 'ALL' ? 'bg-wa-hover' : ''}`}
          >
            <div className="w-[50px] h-[50px] rounded-full bg-[#00a884] mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
              <Inbox className="text-white" size={24} />
            </div>
            <div className="flex-1 border-b border-wa-border h-full flex flex-col justify-center pr-2 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-white text-[17px] font-semibold truncate mr-2">Semua Akun</span>
              </div>
              <div className="flex items-center text-sm text-wa-textMuted">
                <span className="truncate">Tampilkan pesan dari seluruh perangkat.</span>
              </div>
            </div>
          </div>
        )}

        {savedAccounts.map((accId) => {
          const isConnected = connectedAccounts.includes(accId);
          const hasQR = !!qrs[accId];
          const isActive = activeAccount === accId;

          return (
            <div 
              key={accId}
              onClick={() => setActiveAccount(accId)}
              className={`flex items-center px-3 h-[72px] cursor-pointer hover:bg-wa-panel transition-colors ${isActive ? 'bg-wa-hover' : ''}`}
            >
              <div className="w-[50px] h-[50px] rounded-full bg-slate-700 mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
                <Smartphone className="text-slate-400" size={24} />
              </div>
              <div className="flex-1 border-b border-wa-border h-full flex flex-col justify-center pr-2 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-white text-[17px] font-medium truncate mr-2">{accId}</span>
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        {isConnected && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wa-teal opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isConnected ? 'bg-wa-teal' : hasQR ? 'bg-amber-500' : 'bg-gray-500'
                        }`}></span>
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm({
                          title: 'Hapus Akun',
                          message: 'Yakin ingin menghapus akun ini? Anda harus scan QR ulang jika ingin login kembali.',
                          confirmText: 'Hapus',
                          onConfirm: () => onDeleteAccount(e, accId)
                        });
                      }}
                      className="p-2 hover:bg-[#374c58] rounded-full text-wa-textMuted hover:text-wa-danger transition-colors cursor-pointer relative z-50"
                      title="Hapus Akun"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center text-sm text-wa-textMuted">
                  <span className="truncate">
                    {isConnected ? 'Akun terhubung dan siap memantau pesan.' : hasQR ? 'Klik untuk melihat kode QR login.' : 'Mencoba menghubungi server...'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {savedAccounts.length === 0 && (
          <div className="text-center py-10 px-4 text-wa-textMuted text-sm mt-10">
            Tidak ada obrolan/akun.<br/>Klik ikon '+' di atas untuk menambah akun.
          </div>
        )}
      </div>
    </div>
  );
}
