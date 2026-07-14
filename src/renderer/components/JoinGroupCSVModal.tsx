import { useState, useRef } from 'react';
import { X, Play, CheckCircle, AlertCircle, Clock, SkipForward, FileSpreadsheet } from 'lucide-react';
import { useGroupJoin } from '../hooks/useGroupJoin';
import { useExcelImport } from '../hooks/useExcelImport';
import { FileUploadArea } from './ui/FileUploadArea';

interface JoinGroupCSVModalProps {
  activeAccount: string;
  onClose: () => void;
}

export function JoinGroupCSVModal({ activeAccount, onClose }: JoinGroupCSVModalProps) {
  const [speedMode, setSpeedMode] = useState<'safe' | 'normal' | 'fast'>('safe');
  const [joinMethod, setJoinMethod] = useState<'csv' | 'link'>('csv');
  const [singleLink, setSingleLink] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    links,
    setLinks,
    isProcessing,
    isValidating,
    isValidationDone,
    progress,
    summary,
    startValidation,
    startJoin
  } = useGroupJoin();

  const { importFile } = useExcelImport<{ originalLink: string; code: string; status: any }>((row) => {
    // For CSV/Text parsing, use rawLine
    const textToMatch = row.rawLine || Object.values(row).join(' ');
    const match = textToMatch.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (match && match[1]) {
      return { originalLink: textToMatch, code: match[1], status: 'pending' };
    }
    return null;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importFile(file);
    if (result.success && result.data.length > 0) {
      // Deduplicate
      const uniqueLinks = result.data.filter((link, index, self) => 
        index === self.findIndex((t) => t.code === link.code)
      );
      setLinks(uniqueLinks);
    }
  };

  const handleAddSingleLink = () => {
    if (!singleLink.trim()) return;
    const match = singleLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (match && match[1]) {
      if (!links.find(l => l.code === match[1])) {
        setLinks(prev => [...prev, { originalLink: singleLink.trim(), code: match[1], status: 'pending' }]);
      } else {
        alert('Link ini sudah ada di daftar!');
      }
      setSingleLink('');
    } else {
      alert('Format link tidak valid! Pastikan mengandung chat.whatsapp.com/KODE');
    }
  };

  const toggleCheck = (index: number) => {
    setLinks(prev => prev.map((l, i) => i === index ? { ...l, checked: !l.checked } : l));
  };

  const toProcessCount = links.filter(l => l.checked && l.status === 'validated').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[85vh] overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-card/50">
          <div className="flex items-center">
            <div className="bg-wa-primary/20 p-2 rounded-xl mr-3">
              <FileSpreadsheet className="text-wa-primary" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Auto-Join Grup</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Akun: {activeAccount}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing || isValidating}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Kolom Kiri: Input & Setting */}
          <div className="w-[350px] border-r border-border/50 bg-card/30 p-5 flex flex-col overflow-y-auto">
            
            <div className="flex bg-muted/50 p-1 rounded-lg mb-6">
              <button 
                onClick={() => setJoinMethod('csv')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${joinMethod === 'csv' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Dari File CSV/Txt
              </button>
              <button 
                onClick={() => setJoinMethod('link')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${joinMethod === 'link' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Input Manual
              </button>
            </div>

            {joinMethod === 'csv' ? (
              <FileUploadArea 
                onFileUpload={handleFileUpload} 
                title="Upload Link Grup"
                description="Upload file CSV atau TXT yang berisi daftar link grup WhatsApp."
                accept=".csv, text/plain"
                fileInputRef={fileInputRef}
              />
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">Masukkan Link WhatsApp</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={singleLink}
                    onChange={(e) => setSingleLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-wa-primary focus:ring-1 focus:ring-wa-primary/30"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSingleLink()}
                  />
                  <button 
                    onClick={handleAddSingleLink}
                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium text-sm transition-colors"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            )}

            {links.length > 0 && !isValidationDone && !isValidating && (
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => startValidation(activeAccount, links)}
                  className="w-full bg-wa-primary hover:bg-wa-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Cek Validitas Link ({links.length})
                </button>
              </div>
            )}

            {isValidationDone && (
              <div className="mt-6 space-y-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    <Clock size={16} className="mr-2 text-wa-primary" /> Kecepatan Join
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border/50 transition-colors">
                      <input type="radio" name="speed" checked={speedMode === 'safe'} onChange={() => setSpeedMode('safe')} className="text-wa-primary focus:ring-wa-primary" />
                      <div className="ml-3">
                        <span className="block text-sm font-medium text-foreground">Aman (Safe)</span>
                        <span className="block text-xs text-muted-foreground">Jeda 15-17 detik. Anti-banned.</span>
                      </div>
                    </label>
                    <label className="flex items-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border/50 transition-colors">
                      <input type="radio" name="speed" checked={speedMode === 'normal'} onChange={() => setSpeedMode('normal')} className="text-wa-primary focus:ring-wa-primary" />
                      <div className="ml-3">
                        <span className="block text-sm font-medium text-foreground">Normal</span>
                        <span className="block text-xs text-muted-foreground">Jeda 7-9 detik.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={() => startJoin(activeAccount, links, speedMode)}
                  disabled={isProcessing || toProcessCount === 0}
                  className="w-full bg-wa-primary hover:bg-wa-primary/90 text-primary-foreground font-medium py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {isProcessing ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-1" /> Proses Join...</>
                  ) : (
                    <><Play size={18} /> Mulai Join Grup ({toProcessCount})</>
                  )}
                </button>
              </div>
            )}
            
            {/* Progress Bar (Visible during validation or processing) */}
            {(isValidating || isProcessing) && (
              <div className="mt-6">
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                  <span>Progres:</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-wa-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Tabel Hasil */}
          <div className="flex-1 bg-background flex flex-col p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daftar Grup ({links.length})</h3>
            <div className="flex-1 border border-border/50 rounded-xl overflow-hidden bg-card/30 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      {isValidationDone && (
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            className="rounded text-wa-primary focus:ring-wa-primary"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setLinks(prev => prev.map(l => l.status === 'validated' ? { ...l, checked } : l));
                            }}
                            checked={links.some(l => l.status === 'validated') && links.every(l => l.status !== 'validated' || l.checked)}
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Info Grup</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {links.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                          Belum ada link yang ditambahkan.
                        </td>
                      </tr>
                    ) : (
                      links.map((link, idx) => (
                        <tr key={idx} className={`hover:bg-muted/20 transition-colors ${link.status === 'success' ? 'bg-emerald-500/5' : ''}`}>
                          {isValidationDone && (
                            <td className="px-4 py-3">
                              {link.status === 'validated' && (
                                <input 
                                  type="checkbox" 
                                  checked={link.checked || false}
                                  onChange={() => toggleCheck(idx)}
                                  className="rounded text-wa-primary focus:ring-wa-primary"
                                />
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              link.status === 'pending' ? 'bg-muted text-muted-foreground' :
                              link.status === 'validating' || link.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                              link.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' :
                              link.status === 'success' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                              link.status === 'skipped' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-red-500/10 text-red-500'
                            }`}>
                              {link.status === 'validating' ? '⏳ Mengecek...' : 
                               link.status === 'validated' ? '✅ Valid' : 
                               link.status === 'processing' ? '⏳ Join...' : 
                               link.status === 'success' ? '🎉 Berhasil' : 
                               link.status === 'skipped' ? '⏭️ Lewati' : 
                               link.status === 'failed' ? '❌ Gagal' : 'Menunggu'}
                            </span>
                          </td>
                          <td className="px-4 py-3 min-w-[200px]">
                            {link.subject ? (
                              <div>
                                <p className="font-medium text-foreground line-clamp-1">{link.subject}</p>
                                <p className="text-xs text-muted-foreground flex gap-2 mt-1">
                                  <span>👤 {link.size || 0} Member</span>
                                  {link.joinApprovalMode && <span className="text-amber-500">🔒 Butuh Persetujuan</span>}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px] font-mono">{link.code}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                            {link.isJoined ? <span className="text-amber-500 font-medium">Sudah Bergabung</span> : 
                             link.message ? <span className="text-red-400">{link.message}</span> : 
                             link.status === 'pending' ? 'Belum divalidasi' : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="mt-4 bg-muted/30 p-4 rounded-xl border border-border/50 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Ringkasan Selesai</h4>
                  <p className="text-xs text-muted-foreground">Proses telah selesai untuk {summary.total} grup.</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center bg-background border border-border px-4 py-2 rounded-lg shadow-sm">
                    <span className="block text-xl font-bold text-emerald-500">{summary.success}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Berhasil</span>
                  </div>
                  <div className="text-center bg-background border border-border px-4 py-2 rounded-lg shadow-sm">
                    <span className="block text-xl font-bold text-amber-500">{summary.skipped}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Dilewati</span>
                  </div>
                  <div className="text-center bg-background border border-border px-4 py-2 rounded-lg shadow-sm">
                    <span className="block text-xl font-bold text-red-500">{summary.failed}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Gagal</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
