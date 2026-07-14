import { useState } from 'react';
import { Monitor, Trash2, Plus, Moon, Sun, Layers, BarChart3, PlugZap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from './ui/ToastProvider';
import { useTheme } from './ThemeProvider';

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
  const { theme, setTheme } = useTheme();

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
    <div className="w-full h-full flex flex-col items-center bg-background overflow-hidden py-3">
      {/* Header (Branding & Add) */}
      <div className="w-full flex flex-col items-center px-2 space-y-4 shrink-0 mb-4">
        {/* Branding */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 ring-1 ring-primary/10" title="WA Manager">
          <Monitor className="text-primary" size={20} strokeWidth={2.5} />
        </div>
        
        <div className="w-8 h-[1px] bg-border/60"></div>

        {/* Add Account */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger>
            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors border border-border/50" title="Tambah Akun">
              <Plus size={20} />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card text-foreground border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Tambah Akun WhatsApp</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Masukkan ID Unik untuk sesi ini. Disarankan nama divisi (Contoh: CS-1).
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 py-4">
              <Input 
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                placeholder="Ketik ID Akun..." 
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                className="bg-muted border-none text-foreground focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddAccount} className="bg-primary hover:bg-primary/90 text-primary-foreground">Tambahkan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Account List */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col items-center space-y-3 px-2">
        {/* ANALYTICS option */}
        <button
          onClick={() => setActiveAccount('ANALYTICS')}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative group ${
            activeAccount === 'ANALYTICS' 
              ? 'bg-wa-primary/10 border-wa-primary/30 text-wa-primary shadow-sm ring-1 ring-wa-primary/20' 
              : 'border-transparent bg-muted/30 hover:bg-muted/80 hover:border-border/50 text-muted-foreground hover:text-foreground'
          }`}
          title="Dashboard Analytics"
        >
          <BarChart3 size={22} />
        </button>

        {/* APIGATEWAY option */}
        <button
          onClick={() => setActiveAccount('API_GATEWAY')}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative group ${
            activeAccount === 'API_GATEWAY' 
              ? 'bg-primary/10 border-primary/30 text-primary shadow-sm ring-1 ring-primary/20' 
              : 'border-transparent bg-muted/30 hover:bg-muted/80 hover:border-border/50 text-muted-foreground hover:text-foreground'
          }`}
          title="Integrasi API"
        >
          <PlugZap size={22} />
        </button>

        {/* ALL ACCOUNTS option */}
        {savedAccounts.length > 0 && (
          <button
            onClick={() => setActiveAccount('ALL')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative group ${
              activeAccount === 'ALL' 
                ? 'bg-primary/10 border-primary/30 text-primary shadow-sm ring-1 ring-primary/20' 
                : 'border-transparent bg-muted/30 hover:bg-muted/80 hover:border-border/50 text-muted-foreground hover:text-foreground'
            }`}
            title="SEMUA AKUN (Gabungan Obrolan)"
          >
            <Layers size={22} />
          </button>
        )}

        {/* Individual Accounts */}
        {savedAccounts.map((accId) => {
          const isConnected = connectedAccounts.includes(accId);
          const hasQR = !!qrs[accId];
          const isActive = activeAccount === accId;
          const statusText = isConnected ? 'Terhubung' : hasQR ? 'Butuh QR' : 'Menghubungkan...';

          return (
            <div key={accId} className="relative group w-12 h-12">
              <button
                onClick={() => setActiveAccount(accId)}
                className={`w-full h-full rounded-2xl flex items-center justify-center transition-all border overflow-hidden ${
                  isActive 
                    ? 'bg-accent border-border/80 shadow-sm ring-1 ring-border' 
                    : 'border-transparent bg-muted/30 hover:bg-muted/80 hover:border-border/50 text-muted-foreground hover:text-foreground'
                }`}
                title={`${accId} - ${statusText}`}
              >
                <span className="font-bold text-sm uppercase">
                  {accId.substring(0, 2)}
                </span>
              </button>
              
              {/* Status Dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-[2.5px] border-background rounded-full ${
                isConnected ? 'bg-emerald-500' : hasQR ? 'bg-amber-500' : 'bg-gray-400'
              }`} title={statusText}></div>

              {/* Delete Button (Hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showConfirm({
                    title: 'Hapus Akun',
                    message: `Yakin ingin menghapus akun ${accId}?`,
                    confirmText: 'Hapus',
                    onConfirm: () => onDeleteAccount(e, accId)
                  });
                }}
                className="absolute -top-1 -right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                title="Hapus Akun"
              >
                <Trash2 size={10} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Footer / Theme Toggle */}
      <div className="w-full flex flex-col items-center pt-4 pb-2 shrink-0 border-t border-border/30 mt-auto">
        <button 
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? "Mode Terang" : "Mode Gelap"}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );
}
