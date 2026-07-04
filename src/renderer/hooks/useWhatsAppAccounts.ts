import { useState, useEffect } from 'react';
import { useToast } from '../components/ui/ToastProvider';

export function useWhatsAppAccounts() {
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    window.api.getSavedAccounts()
      .then(accounts => setSavedAccounts(accounts))
      .catch(err => console.error("Gagal memuat akun yang tersimpan:", err));

    const cleanupQR = window.api.onWhatsAppQR((data) => {
      setQrs(prev => ({ ...prev, [data.accountId]: data.qr }));
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
      cleanupConn();
      unlistenLoggedOut();
    };
  }, []);

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
      showToast({ message: "Gagal menghapus akun. Cek console log.", type: 'error' });
    }
  };

  return {
    savedAccounts,
    connectedAccounts,
    activeAccount,
    setActiveAccount,
    qrs,
    handleAddAccount,
    handleDeleteAccount
  };
}
