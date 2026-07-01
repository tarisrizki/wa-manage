import { useState } from 'react';
import { Filter, X } from 'lucide-react';

export interface RuleEngineProps {
  rules: {id: number, keyword: string}[];
  onAddRule: (keyword: string) => void;
  onDeleteRule: (id: number) => void;
}

export function RuleEngine({ rules, onAddRule, onDeleteRule }: RuleEngineProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      onAddRule(newKeyword.trim());
      setNewKeyword('');
    }
  };

  return (
    <div className="min-h-[62px] flex flex-col justify-center px-4 py-3 shrink-0 z-10 w-full">
      <div className="flex items-center w-full">
        <div className="flex items-center space-x-2 sm:space-x-3 text-wa-textMuted bg-wa-hover px-2 sm:px-3 py-1.5 rounded-md border border-wa-border/50 shrink-0">
          <Filter size={18} className="text-wa-green shrink-0" />
          <span className="text-sm font-medium text-wa-textDark whitespace-nowrap hidden md:inline">Filter Obrolan Grup:</span>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex bg-wa-panel rounded-lg px-3 sm:px-4 py-2 mx-2 sm:mx-3 shadow-inner border border-wa-border min-w-0">
          <input 
            type="text" 
            placeholder="Ketik kata kunci..." 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="bg-transparent w-full text-wa-textDark placeholder:text-wa-textMuted outline-none text-[14px]"
          />
        </form>
        <button 
          type="button"
          onClick={handleSubmit}
          disabled={!newKeyword.trim()}
          className={`px-3 sm:px-4 py-2 shrink-0 rounded-lg font-medium transition-colors ${newKeyword.trim() ? 'bg-wa-green hover:bg-wa-greenHover text-white shadow-sm' : 'bg-wa-panel text-wa-textMuted cursor-not-allowed'}`}
        >
          <span className="hidden sm:inline">Tambah Rule</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {/* Daftar Filter Aktif */}
      {rules && rules.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 ml-0 sm:ml-[44px] md:ml-[156px]">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center bg-[#005c4b]/30 border border-[#00a884]/30 text-[#00a884] px-3 py-1 rounded-full text-xs font-medium">
              <span>{rule.keyword}</span>
              <button 
                onClick={() => onDeleteRule(rule.id)}
                className="ml-2 p-0.5 hover:bg-[#00a884]/20 rounded-full transition-colors text-[#00a884] hover:text-white"
                title="Hapus Filter"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
