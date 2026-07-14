import { useState, useEffect, useRef } from 'react';
import { Filter, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from './ui/ToastProvider';

export interface RuleEngineProps {
  activeAccount: string;
  rules: {id: number, keyword: string}[];
  isFilterEnabled: boolean;
  setIsFilterEnabled: (val: boolean) => void;
  onAddRule: (keyword: string) => void;
  onDeleteRule: (id: number) => void;
  selectedGroupJid: string | null;
  setSelectedGroupJid: (jid: string | null) => void;
}

export function RuleEngine({ activeAccount, rules, isFilterEnabled, setIsFilterEnabled, onAddRule, onDeleteRule, selectedGroupJid, setSelectedGroupJid }: RuleEngineProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (activeAccount && activeAccount !== 'ALL') {
      window.api.getGroups(activeAccount).then(res => setGroups(res || [])).catch(() => setGroups([]));
    } else {
      setGroups([]);
    }
  }, [activeAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      onAddRule(newKeyword.trim());
      showToast({ message: `Keyword '${newKeyword.trim()}' ditambahkan.`, type: 'success' });
      setNewKeyword('');
    }
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroupName = selectedGroupJid 
    ? groups.find(g => g.id === selectedGroupJid)?.name || 'Grup Tidak Dikenal'
    : `Semua Grup (${groups.length})`;

  return (
    <div className="flex flex-nowrap items-center shrink-1 min-w-0 sm:ml-4 sm:pl-4 sm:border-l sm:border-border/50 gap-2 overflow-visible">
      {/* Custom Group Select Dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between bg-muted/30 border border-border/60 hover:border-border rounded-md px-2.5 py-1.5 w-[130px] md:w-[160px] text-left focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all"
        >
          <span className="text-[11.5px] text-foreground truncate mr-2">{selectedGroupName}</span>
          <svg className={`w-3 h-3 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-[200px] md:w-[250px] bg-popover text-popover-foreground border border-border/50 rounded-md shadow-xl z-50 py-1 max-h-[300px] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => { setSelectedGroupJid(null); setIsDropdownOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${!selectedGroupJid ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              Semua Grup ({groups.length})
            </button>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedGroupJid(g.id); setIsDropdownOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[12px] transition-colors truncate ${selectedGroupJid === g.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden xl:block h-4 w-[1px] bg-border/50 mx-0.5 shrink-0"></div>

      {/* Saring Toggle */}
      <button
        onClick={() => setIsFilterEnabled(!isFilterEnabled)}
        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
          isFilterEnabled 
            ? 'bg-primary text-primary-foreground shadow-sm' 
            : 'text-muted-foreground hover:bg-muted'
        }`}
        title={isFilterEnabled ? "Filter aktif: Menyembunyikan obrolan lain" : "Filter nonaktif: Menampilkan semua obrolan"}
      >
        {isFilterEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
        <span className="hidden lg:inline">{isFilterEnabled ? 'Filter Aktif' : 'Semua Obrolan'}</span>
      </button>

      {/* Search Input Container */}
      <div className="flex items-center bg-muted/30 border border-border/60 hover:border-border rounded-md px-2 py-1 w-[120px] md:w-[160px] lg:w-[200px] shrink-0 focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all overflow-hidden">
         <Filter size={12} className="text-muted-foreground mr-2 shrink-0" />
         
         {/* Active Tags */}
         {rules.map(rule => (
           <span key={rule.id} className="flex items-center bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-[4px] mr-1.5 shrink-0 select-none">
             {rule.keyword}
             <X size={10} className="ml-1 cursor-pointer hover:text-foreground opacity-70 hover:opacity-100 transition-opacity" onClick={() => {
               onDeleteRule(rule.id);
               showToast({ message: `Keyword dihapus.`, type: 'success' });
             }} />
           </span>
         ))}

         {/* Input */}
         <form onSubmit={handleSubmit} className="flex-1 min-w-[60px]">
           <input 
             type="text"
             placeholder={rules.length === 0 ? "Filter keyword..." : ""}
             value={newKeyword}
             onChange={(e) => setNewKeyword(e.target.value)}
             className="bg-transparent w-full text-[11.5px] outline-none text-foreground placeholder:text-muted-foreground/70"
           />
         </form>
      </div>
    </div>
  );
}
