import { useState } from 'react';
import { Filter } from 'lucide-react';

export interface RuleEngineProps {
  onAddRule: (keyword: string) => void;
}

export function RuleEngine({ onAddRule }: RuleEngineProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      onAddRule(newKeyword.trim());
      setNewKeyword('');
    }
  };

  return (
    <div className="h-[62px] flex items-center px-4 shrink-0 z-10 w-full">
      <div className="flex items-center space-x-3 text-wa-textMuted bg-wa-hover px-3 py-1.5 rounded-md border border-wa-border/50">
        <Filter size={18} className="text-wa-green" />
        <span className="text-sm font-medium text-wa-textDark whitespace-nowrap">Filter Notifikasi:</span>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 flex bg-wa-panel rounded-lg px-4 py-2 mx-3 shadow-inner border border-wa-border">
        <input 
          type="text" 
          placeholder="Ketik kata kunci penting (contoh: komplain, transfer, nama staf)..." 
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          className="bg-transparent w-full text-wa-textDark placeholder:text-wa-textMuted outline-none text-[14px]"
        />
      </form>
      <button 
        type="button"
        onClick={handleSubmit}
        disabled={!newKeyword.trim()}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${newKeyword.trim() ? 'bg-wa-green hover:bg-wa-greenHover text-white shadow-sm' : 'bg-wa-panel text-wa-textMuted cursor-not-allowed'}`}
      >
        Tambah Rule
      </button>
    </div>
  );
}
