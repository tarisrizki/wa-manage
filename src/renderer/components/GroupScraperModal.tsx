import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, AlertTriangle, Users, Search } from 'lucide-react';
import { useToast } from './ui/ToastProvider';
import * as XLSX from 'xlsx';

interface GroupScraperModalProps {
  activeAccount: string;
  onClose: () => void;
}

export function GroupScraperModal({ activeAccount, onClose }: GroupScraperModalProps) {
  const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Fetch daftar grup
    const fetchGroups = async () => {
      try {
        // @ts-ignore
        if (window.api && window.api.getGroups) {
          // @ts-ignore
          const fetchedGroups = await window.api.getGroups(activeAccount);
          setGroups(fetchedGroups || []);
        }
      } catch (err) {
        console.error("Gagal mengambil daftar grup:", err);
        showToast({ message: 'Gagal mengambil daftar grup', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, [activeAccount]);

  const handleExtract = async () => {
    if (!selectedGroup) return;
    setIsExtracting(true);

    try {
      // @ts-ignore
      const result = await window.api.scrapeGroup(activeAccount, selectedGroup);
      
      if (result.success && result.data) {
        let validContactsCount = 0;
        let hiddenContactsCount = 0;
        
        if (exportFormat === 'xlsx') {
          const excelData: { 'Nama': string, 'Nomor Telepon': string }[] = [];
          result.data.forEach((p: any) => {
            const rawId = p.phoneNumber || p.id;
            const name = p.name || p.notify || p.vname || '';
            if (rawId) {
              if (rawId.includes('@lid')) {
                hiddenContactsCount++;
              } else {
                const phone = rawId.split('@')[0].replace(/\D/g, '');
                if (phone) {
                  excelData.push({ 'Nama': name, 'Nomor Telepon': phone });
                  validContactsCount++;
                }
              }
            }
          });
          const worksheet = XLSX.utils.json_to_sheet(excelData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Kontak Grup");
          const groupObj = groups.find(g => g.id === selectedGroup);
          const safeName = groupObj ? groupObj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'grup';
          XLSX.writeFile(workbook, `kontak_${safeName}.xlsx`);
        } else {
          let csvContent = "Nama,Nomor Telepon\n";
          result.data.forEach((p: any) => {
            const rawId = p.phoneNumber || p.id;
            const name = p.name || p.notify || p.vname || '';
            if (rawId) {
              if (rawId.includes('@lid')) {
                hiddenContactsCount++;
              } else {
                const phone = rawId.split('@')[0].replace(/\D/g, '');
                if (phone) {
                  csvContent += `"${name.replace(/"/g, '""')}","${phone}"\n`;
                  validContactsCount++;
                }
              }
            }
          });
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          const groupObj = groups.find(g => g.id === selectedGroup);
          const safeName = groupObj ? groupObj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'grup';
          link.setAttribute("download", `kontak_${safeName}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        if (validContactsCount === 0) {
           showToast({ message: `Tidak ada nomor WA publik yang bisa diekstrak. (${hiddenContactsCount} disembunyikan oleh privasi grup)`, type: 'error' });
        } else if (hiddenContactsCount > 0) {
           showToast({ message: `Berhasil mengekstrak ${validContactsCount} kontak. (${hiddenContactsCount} disembunyikan oleh privasi)`, type: 'success' });
        } else {
           showToast({ message: `Berhasil mengekstrak ${validContactsCount} kontak!`, type: 'success' });
        }
      } else {
        showToast({ message: result.message || 'Gagal mengekstrak kontak', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      showToast({ message: 'Terjadi kesalahan sistem saat mengekstrak grup', type: 'error' });
    } finally {
      setIsExtracting(false);
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (activeAccount === 'ALL') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
          <div className="flex flex-col items-center text-center mt-4 mb-2">
            <AlertTriangle size={50} className="text-yellow-500 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Pilih Akun Spesifik</h2>
            <p className="text-sm text-muted-foreground">
              Fitur Ekstrak Grup membutuhkan Anda untuk memilih satu akun spesifik (bukan tab ALL) di sidebar kiri.
            </p>
            <button 
              onClick={onClose}
              className="mt-6 w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Group Scraper (Ekstrak Nomor)</h2>
              <p className="text-sm text-muted-foreground">Akun Aktif: {activeAccount}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Peringatan Keamanan */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-bold mb-1">Peringatan Keamanan Akun (Anti-Ban)</p>
            <p>Fitur ini aman jika digunakan secara berkala. Namun, <b>TIDAK DISARANKAN</b> mengirim Broadcast ke seluruh nomor asing sekaligus dari akun utama. Gunakan <i>Spintax</i>, Jeda Waktu, atau Akun Tumbal saat melakukan Broadcast massal ke daftar hasil ekstrak ini.</p>
          </div>
        </div>

        {/* Konten */}
        <div className="p-5 flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text"
              placeholder="Cari nama grup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[250px] border border-border/50 rounded-xl bg-background scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3"></div>
                <p>Memuat daftar grup...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                <Users size={48} className="mb-3" />
                <p>Tidak ada grup yang ditemukan.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/50">
                {filteredGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g.id)}
                    className={`flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${selectedGroup === g.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${selectedGroup === g.id ? 'text-primary' : 'text-foreground'}`}>{g.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{g.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3 items-center">
          <div className="mr-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Format:</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV Biasa (.csv)</option>
            </select>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted text-foreground transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleExtract}
            disabled={!selectedGroup || isExtracting}
            className={`px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm
              ${(!selectedGroup || isExtracting) 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-md'
              }`}
          >
            {isExtracting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                Mengekstrak...
              </>
            ) : (
              <>
                <Download size={16} />
                Ekstrak & Unduh
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
