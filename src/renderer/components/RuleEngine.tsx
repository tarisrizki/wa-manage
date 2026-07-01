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
    <div className="flex flex-col justify-center px-4 py-2 shrink-0 z-10 w-full bg-[#111b21] border-b border-[#202c33]">
      <div className="flex items-center w-full">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 shadow-inner border border-transparent focus-within:border-[#313d45] transition-colors min-w-0">
          <Filter size={15} className="text-[#8696a0] mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Saring obrolan grup..." 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="bg-transparent w-full text-[#e9edef] placeholder:text-[#8696a0] outline-none text-[13.5px]"
          />
        </form>
        {newKeyword.trim() && (
          <button 
            type="button"
            onClick={handleSubmit}
            className="ml-2 px-3 py-1.5 shrink-0 rounded-lg font-medium transition-colors bg-[#00a884] hover:bg-[#008f6f] text-white text-[13px] shadow-sm"
          >
            Tambah
          </button>
        )}
      </div>

      {/* Daftar Filter Aktif */}
      {rules && rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center bg-[#005c4b]/40 border border-[#00a884]/30 text-[#00a884] px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide">
              <span>{rule.keyword}</span>
              <button 
                onClick={() => onDeleteRule(rule.id)}
                className="ml-1.5 p-0.5 hover:bg-[#00a884]/20 rounded-sm transition-colors text-[#00a884] hover:text-white"
                title="Hapus Filter"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
