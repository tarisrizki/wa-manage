import { useState, useEffect } from 'react';
import { WhatsAppMessage } from '../types';

export function useWhatsAppMessages(activeAccount: string | null) {
  const [messages, setMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [rules, setRules] = useState<{id: number, keyword: string}[]>([]);

  // Listen for new incoming messages
  useEffect(() => {
    const cleanupMsg = window.api.onWhatsAppMessage((data: WhatsAppMessage) => {
      setMessages(prev => {
        const accMsgs = prev[data.accountId] || [];
        const newAccMsgs = [...accMsgs, data];
        
        const allMsgs = prev['ALL'] || [];
        const newAllMsgs = [...allMsgs, data];
        
        const next = { ...prev };
        
        // Simpan 200 pesan terakhir per akun
        if (newAccMsgs.length > 200) {
          next[data.accountId] = newAccMsgs.slice(newAccMsgs.length - 200);
        } else {
          next[data.accountId] = newAccMsgs;
        }
        
        // Simpan 500 pesan terakhir untuk tab 'ALL'
        if (newAllMsgs.length > 500) {
          next['ALL'] = newAllMsgs.slice(newAllMsgs.length - 500);
        } else {
          next['ALL'] = newAllMsgs;
        }

        return next;
      });
    });

    return () => {
      cleanupMsg();
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

  const handleDeleteMessage = (msgKeyId: string) => {
    if (!activeAccount) return;
    
    setMessages(prev => {
      const accMsgs = prev[activeAccount] || [];
      return {
        ...prev,
        [activeAccount]: accMsgs.filter(m => m.msg?.key?.id !== msgKeyId)
      };
    });
    
    window.api.deleteMessage(msgKeyId);
  };
  
  const handleClearMessages = (isGroup: boolean) => {
    if (!activeAccount) return;
    
    setMessages(prev => {
      const accMsgs = prev[activeAccount] || [];
      return {
        ...prev,
        [activeAccount]: accMsgs.filter(m => m.isGroup !== isGroup)
      };
    });
    
    window.api.clearMessages(activeAccount, isGroup);
  };

  const filteredMessages = activeAccount ? (messages[activeAccount] || []).filter(msg => {
    // Sesuai permintaan: Filter KHUSUS untuk Grup.
    // Pesan pribadi (!msg.isGroup) selalu tampil semua tanpa difilter.
    if (!msg.isGroup) return true;

    if (!rules || rules.length === 0) return true;
    
    // Gunakan textContent yang sudah disediakan dari backend/database
    const textLower = (msg.textContent || '').toLowerCase();
    
    return rules.some(rule => {
      const kw = rule.keyword?.trim();
      return kw && textLower.includes(kw.toLowerCase());
    });
  }) : [];

  return {
    messages,
    rules,
    filteredMessages,
    handleAddRule,
    handleDeleteRule,
    handleDeleteMessage,
    handleClearMessages
  };
}
