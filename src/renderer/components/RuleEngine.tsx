import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useToast } from './ui/ToastProvider';

export interface RuleEngineProps {
  rules: {id: number, keyword: string}[];
  onAddRule: (keyword: string) => void;
  onDeleteRule: (id: number) => void;
}

export function RuleEngine({ rules, onAddRule, onDeleteRule }: RuleEngineProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      onAddRule(newKeyword.trim());
      showToast({ message: `Keyword '${newKeyword.trim()}' ditambahkan.`, type: 'success' });
      setNewKeyword('');
    }
  };

  return (
    <div className="flex flex-col justify-center px-4 py-2 shrink-0 z-10 w-full bg-wa-bg border-b border-wa-border">
      <div className="flex items-center w-full">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-wa-panel rounded-lg px-3 py-1.5 shadow-inner border border-transparent focus-within:border-wa-primary/50 transition-colors min-w-0">
          <Filter size={15} className="text-wa-textMuted mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Saring obrolan grup..." 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="bg-transparent w-full text-wa-textDark placeholder:text-wa-textMuted outline-none text-[13.5px]"
          />
        </form>
        {newKeyword.trim() && (
          <button 
            type="button"
            onClick={handleSubmit}
            className="ml-2 px-3 py-1.5 shrink-0 rounded-lg font-medium transition-colors bg-wa-primary hover:bg-wa-primary/90 text-white text-[13px] shadow-sm"
          >
            Tambah
          </button>
        )}
      </div>

      {/* Daftar Filter Aktif */}
      {rules && rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center bg-wa-primary/10 border border-wa-primary/30 text-wa-primary px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide">
              <span>{rule.keyword}</span>
              <button 
                onClick={() => {
                  onDeleteRule(rule.id);
                  showToast({ message: `Keyword dihapus.`, type: 'success' });
                }}
                className="ml-1.5 p-0.5 hover:bg-wa-primary/20 rounded-sm transition-colors text-wa-primary hover:text-white"
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
