import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Search, AlertTriangle, Play, Square, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from './ui/ToastProvider';

interface GmapsScraperModalProps {
  onClose: () => void;
  activeAccount: string;
}

interface ScrapedLead {
  name: string;
  phone: string;
  hasWa?: boolean;
  address?: string;
}

export function GmapsScraperModal({ onClose, activeAccount }: GmapsScraperModalProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [status, setStatus] = useState('Siap untuk mencari.');
  const [leads, setLeads] = useState<ScrapedLead[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    // Register IPC listeners
    // @ts-ignore
    const cleanupResult = window.api.onGmapsScraperResult((data: ScrapedLead) => {
      setLeads((prev) => {
        // Prevent duplicates in UI just in case
        if (!prev.find(l => l.phone === data.phone)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    // @ts-ignore
    const cleanupStatus = window.api.onGmapsScraperStatus((msg: string) => {
      setStatus(msg);
    });

    // @ts-ignore
    const cleanupEnd = window.api.onGmapsScraperEnd(() => {
      setIsScraping(false);
      showToast({ message: 'Pencarian selesai!', type: 'success' });
    });

    return () => {
      cleanupResult();
      cleanupStatus();
      cleanupEnd();
      // Ensure scraper stops if modal is closed
      // @ts-ignore
      window.api.stopGmapsScraper();
    };
  }, []);

  const handleStart = () => {
    if (!query.trim()) return;
    setIsScraping(true);
    setLeads([]);
    setStatus('Menyiapkan engine pencarian...');
    
    // Gabungkan query untuk pencarian Gmaps, misal "Klinik Aceh Tamiang"
    const fullQuery = location.trim() ? `${query.trim()} ${location.trim()}` : query.trim();
    // @ts-ignore
    window.api.startGmapsScraper(activeAccount, fullQuery, location.trim());
  };

  const handleStop = () => {
    // @ts-ignore
    window.api.stopGmapsScraper();
    setIsScraping(false);
    setStatus('Dihentikan oleh pengguna.');
  };

  const handleExport = () => {
    if (leads.length === 0) return;
    
    // Urutkan untuk export agar yang Ada WA di atas
    const sortedExportLeads = [...leads].sort((a, b) => {
      if (a.hasWa === true && b.hasWa !== true) return -1;
      if (a.hasWa !== true && b.hasWa === true) return 1;
      return 0;
    });

    const excelData = sortedExportLeads.map(l => ({
      'Nama Bisnis': l.name,
      'Alamat': l.address || '-',
      'Nomor Telepon': l.phone,
      'Status WA': l.hasWa ? 'Terdaftar WA' : 'Tidak Terdaftar/Tidak Diketahui'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    
    const safeName = query.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'leads';
    XLSX.writeFile(workbook, `B2B_${safeName}.xlsx`);
    showToast({ message: 'Berhasil di-export ke Excel!', type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Google Maps Scraper</h2>
              <p className="text-sm text-muted-foreground">Ekstrak data prospek dan kontak WhatsApp secara otomatis.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Konten */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center bg-muted/30 border border-border/50 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
            <div className="relative flex-[2] flex items-center w-full sm:w-auto">
              <Search className="absolute left-3 text-muted-foreground" size={18} />
              <input 
                type="text"
                placeholder="Objek (Cth: Klinik, Warkop, Sekolah)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isScraping && handleStart()}
                disabled={isScraping}
                className="w-full bg-transparent border-none pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-0 text-foreground disabled:opacity-50"
              />
            </div>
            <div className="hidden sm:block w-px h-8 bg-border/50 mx-2" />
            <div className="relative flex-[1] flex items-center w-full sm:w-auto border-t border-border/50 sm:border-none mt-2 sm:mt-0 pt-2 sm:pt-0">
              <MapPin className="absolute left-3 text-muted-foreground" size={18} />
              <input 
                type="text"
                placeholder="Wilayah (Opsional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isScraping && handleStart()}
                disabled={isScraping}
                className="w-full bg-transparent border-none pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-0 text-foreground disabled:opacity-50"
              />
            </div>
            <div className="w-full sm:w-auto mt-2 sm:mt-0 ml-0 sm:ml-2">
              {isScraping ? (
                <button 
                  onClick={handleStop}
                  className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Square size={16} /> Stop
                </button>
              ) : (
                <button 
                  onClick={handleStart}
                  disabled={!query.trim()}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
                >
                  <Play size={16} /> Cari
                </button>
              )}
            </div>
          </div>

          {/* Status & Table Area */}
          <div className="flex-1 flex flex-col min-h-0 border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
            
            {/* Table Header & Status (Combined) */}
            <div className="bg-muted/30 px-5 py-3 flex items-center justify-between border-b border-border/50 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground font-medium">
                {isScraping && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                {status}
              </div>
              <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                Total Ditemukan: <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{leads.length}</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-thin">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/20 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-muted-foreground w-16 text-center border-b border-border/50">No</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground w-1/3 border-b border-border/50">Nama Bisnis / Toko</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground w-1/3 border-b border-border/50">Alamat</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground w-1/3 border-b border-border/50">Nomor Telepon (WA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                        {isScraping ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                            <p>Sedang menelusuri peta...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 opacity-50">
                            <MapPin size={40} />
                            <p>Belum ada data. Mulai pencarian di atas.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    [...leads].sort((a, b) => {
                      if (a.hasWa === true && b.hasWa !== true) return -1;
                      if (a.hasWa !== true && b.hasWa === true) return 1;
                      return 0;
                    }).map((l, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-center text-muted-foreground">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{l.name}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{l.address || '-'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">{l.phone}</span>
                            {l.hasWa === true && (
                              <span className="px-2 py-0.5 rounded-full bg-wa-primary/10 text-wa-primary text-xs font-semibold">
                                Ada WA
                              </span>
                            )}
                            {l.hasWa === false && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold">
                                Non-WA
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Dummy element for auto-scroll if needed */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3 items-center">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-muted text-foreground transition-colors"
          >
            Tutup
          </button>
          <button 
            onClick={handleExport}
            disabled={leads.length === 0 || isScraping}
            className="px-5 py-2.5 bg-wa-primary hover:bg-wa-primary/90 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={18} />
            Export ke Excel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
