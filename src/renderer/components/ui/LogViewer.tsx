import React from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface LogMessage {
  msg: string;
  isError?: boolean;
}

interface LogViewerProps {
  logs: LogMessage[];
  isSending: boolean;
  progress: { total: number; current: number };
}

export function LogViewer({ logs, isSending, progress }: LogViewerProps) {
  if (!isSending && logs.length === 0) {
    return null;
  }

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-l border-border/50 w-1/3">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <h3 className="font-semibold text-gray-200 flex items-center text-sm">
          <Clock size={16} className="mr-2 text-wa-primary" />
          Terminal Eksekusi
        </h3>
        {isSending && (
          <span className="text-xs font-medium text-wa-primary bg-wa-primary/10 px-2 py-1 rounded-full animate-pulse">
            Memproses...
          </span>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-[11px] sm:text-xs">
        {logs.map((log, idx) => (
          <div key={idx} className={`flex items-start ${log.isError ? 'text-red-400' : 'text-emerald-400'}`}>
            <span className="mr-2 opacity-50 shrink-0">[{new Date().toLocaleTimeString()}]</span>
            <span>
              {log.msg}
            </span>
          </div>
        ))}
        {isSending && (
          <div className="flex items-center text-gray-500 mt-4 animate-pulse">
            <span className="mr-2">...</span>
            Menunggu proses selanjutnya
          </div>
        )}
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10">
        <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
          <span>Progres: {progress.current} / {progress.total} target</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-wa-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
