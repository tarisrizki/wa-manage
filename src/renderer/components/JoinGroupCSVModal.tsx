import React, { useState, useRef } from 'react';
import { X, Upload, Play, CheckCircle, AlertCircle, Clock, SkipForward } from 'lucide-react';

interface JoinGroupCSVModalProps {
  activeAccount: string;
  onClose: () => void;
}

interface GroupLink {
  originalLink: string;
  code: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'failed';
  message?: string;
  subject?: string;
}

export function JoinGroupCSVModal({ activeAccount, onClose }: JoinGroupCSVModalProps) {
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{ total: number, success: number, skipped: number, failed: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      const parsedLinks: GroupLink[] = [];
      const regex = /chat\.whatsapp\.com\/([A-Za-z0-9]+)/;
      
      for (const line of lines) {
        const match = line.match(regex);
        if (match && match[1]) {
          // Avoid duplicates
          if (!parsedLinks.find(l => l.code === match[1])) {
            parsedLinks.push({
              originalLink: line.trim(),
              code: match[1],
              status: 'pending'
            });
          }
        }
      }
      
      setLinks(parsedLinks);
      setSummary(null);
      setProgress(0);
    };
    reader.readAsText(file);
  };

  const startJoining = async () => {
    if (links.length === 0) return;
    
    setIsProcessing(true);
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < links.length; i++) {
      if (links[i].status === 'success' || links[i].status === 'skipped') continue;

      setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'processing' } : l));
      
      try {
        const result = await window.api.joinGroupByCode(activeAccount, links[i].code);
        
        if (result.success) {
          success++;
          setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'success', subject: result.subject } : l));
        } else if (result.reason === 'require_approval') {
          skipped++;
          setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'skipped', subject: result.subject, message: 'Membutuhkan persetujuan admin' } : l));
        } else {
          failed++;
          setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'failed', message: result.reason } : l));
        }
      } catch (err: any) {
        failed++;
        setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'failed', message: err?.message || 'Error' } : l));
      }
      
      setProgress(Math.round(((i + 1) / links.length) * 100));

      // Delay to avoid ban (25 to 45 seconds for newly created/fresh accounts)
      if (i < links.length - 1) {
        const delay = Math.floor(Math.random() * (45000 - 25000 + 1)) + 25000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setSummary({ total: links.length, success, skipped, failed });
    setIsProcessing(false);
  };

  // [BUG FIX] Escaping CSV yang benar. Sebelumnya hanya menghapus koma, sehingga:
  // 1) Data tetap bisa rusak jika ada tanda kutip (") atau baris baru di nama grup.
  // 2) Rentan "CSV/Formula Injection": jika nama grup diawali =, +, -, atau @, Excel/Google
  //    Sheets bisa mengeksekusinya sebagai formula saat file dibuka.
  const csvEscape = (value: string) => {
    const str = String(value ?? '');
    const guarded = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${guarded.replace(/"/g, '""')}"`;
  };

  const exportToCSV = () => {
    if (links.length === 0) return;
    
    // Header CSV
    let csvContent = "Link Asli,Kode Invite,Nama Grup,Status,Pesan/Keterangan\n";
    
    links.forEach(link => {
      const row = [
        csvEscape(link.originalLink),
        csvEscape(link.code),
        csvEscape(link.subject || ''),
        csvEscape(link.status),
        csvEscape(link.message || '')
      ];
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", url);
    linkElement.setAttribute("download", `laporan-join-grup-${new Date().getTime()}.csv`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-wa-panel border border-[#313d45] rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#313d45]">
          <h2 className="text-xl font-medium text-white flex items-center">
            <Upload size={20} className="mr-3 text-wa-primary" />
            Join Grup dari CSV
          </h2>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#8696a0] hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!isProcessing && !summary && (
            <div className="mb-6">
              <p className="text-sm text-[#8696a0] mb-4">
                Unggah file CSV yang berisi link grup WhatsApp. Sistem akan otomatis mengekstrak link yang mengandung <code>chat.whatsapp.com/KODE</code> dan melakukan proses join secara bergilir. Grup yang membutuhkan persetujuan admin akan otomatis dilewati.
                <br /><br />
                <span className="text-yellow-500 font-medium flex items-center">
                  <AlertCircle size={16} className="inline mr-1" />
                  Mode Keamanan Aktif: Jeda waktu antara 25-45 detik diberlakukan antar join grup untuk melindungi akun WA baru dari pemblokiran (banned).
                </span>
              </p>
              <div 
                className="border-2 border-dashed border-[#313d45] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#202c33] hover:border-wa-primary transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={40} className="text-[#8696a0] mb-4" />
                <p className="text-white font-medium mb-1">Klik untuk memilih file CSV</p>
                <p className="text-sm text-[#8696a0]">Pastikan file mengandung link invite grup</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.txt" 
                  className="hidden" 
                />
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Daftar Link Ditemukan ({links.length})</span>
                {isProcessing && (
                  <span className="text-xs text-wa-primary font-medium">{progress}%</span>
                )}
              </div>
              
              {isProcessing && (
                <div className="w-full bg-[#202c33] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-wa-primary h-1.5 transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}

              <div className="bg-[#111b21] rounded-lg border border-[#313d45] max-h-60 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-[#8696a0] bg-[#202c33] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Link / Nama Grup</th>
                      <th className="px-4 py-2 font-medium text-right w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#313d45]">
                    {links.map((link, idx) => (
                      <tr key={idx} className="hover:bg-[#202c33]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-[#e9edef] truncate max-w-[400px]">
                            {link.subject ? link.subject : link.code}
                          </div>
                          {link.message && (
                            <div className="text-xs text-[#8696a0] mt-1 line-clamp-1">{link.message}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {link.status === 'pending' && <span className="text-[#8696a0] flex items-center justify-end"><Clock size={14} className="mr-1"/> Menunggu</span>}
                          {link.status === 'processing' && <span className="text-blue-400 flex items-center justify-end animate-pulse"><Clock size={14} className="mr-1"/> Memproses</span>}
                          {link.status === 'success' && <span className="text-wa-primary flex items-center justify-end"><CheckCircle size={14} className="mr-1"/> Berhasil</span>}
                          {link.status === 'skipped' && <span className="text-orange-400 flex items-center justify-end"><SkipForward size={14} className="mr-1"/> Dilewati</span>}
                          {link.status === 'failed' && <span className="text-red-400 flex items-center justify-end"><AlertCircle size={14} className="mr-1"/> Gagal</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-6 bg-[#202c33] rounded-xl p-5 border border-[#313d45]">
              <h3 className="text-white font-medium mb-4 flex items-center">
                <CheckCircle size={18} className="mr-2 text-wa-primary" />
                Selesai Diproses
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#111b21] p-3 rounded-lg text-center">
                  <div className="text-2xl font-light text-white">{summary.total}</div>
                  <div className="text-xs text-[#8696a0] mt-1">Total Link</div>
                </div>
                <div className="bg-[#111b21] p-3 rounded-lg text-center border-b-2 border-wa-primary">
                  <div className="text-2xl font-light text-wa-primary">{summary.success}</div>
                  <div className="text-xs text-[#8696a0] mt-1">Berhasil</div>
                </div>
                <div className="bg-[#111b21] p-3 rounded-lg text-center border-b-2 border-orange-400">
                  <div className="text-2xl font-light text-orange-400">{summary.skipped}</div>
                  <div className="text-xs text-[#8696a0] mt-1">Dilewati</div>
                </div>
                <div className="bg-[#111b21] p-3 rounded-lg text-center border-b-2 border-red-400">
                  <div className="text-2xl font-light text-red-400">{summary.failed}</div>
                  <div className="text-xs text-[#8696a0] mt-1">Gagal</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#313d45] flex justify-end space-x-3 bg-[#202c33]/30 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2 rounded-full text-sm font-medium text-[#8696a0] hover:text-white hover:bg-[#313d45] transition-colors disabled:opacity-50"
          >
            Tutup
          </button>
          
          {links.length > 0 && !isProcessing && !summary && (
            <button
              onClick={startJoining}
              className="px-5 py-2 rounded-full text-sm font-medium bg-wa-primary text-[#111b21] hover:bg-[#00bfa5] transition-colors shadow-lg shadow-wa-primary/20 flex items-center"
            >
              <Play size={16} className="mr-2" />
              Mulai Join Grup
            </button>
          )}

          {summary && (
            <>
              <button
                onClick={exportToCSV}
                className="px-5 py-2 rounded-full text-sm font-medium border border-wa-primary text-wa-primary hover:bg-wa-primary/10 transition-colors flex items-center"
              >
                <Upload size={16} className="mr-2 rotate-180" />
                Unduh Laporan (CSV)
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full text-sm font-medium bg-wa-primary text-[#111b21] hover:bg-[#00bfa5] transition-colors"
              >
                Selesai
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
