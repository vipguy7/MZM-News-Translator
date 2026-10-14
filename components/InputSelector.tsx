import React, { useState, useRef, useEffect } from 'react';
import { InputMode } from '../types';
import { UI_STRINGS_MY } from '../constants';
import { 
  FileText, 
  Link, 
  TrendingUp, 
  Languages, 
  Globe, 
  Keyboard,
  ChevronDown,
  Check
} from 'lucide-react';

interface InputSelectorProps {
  selectedMode: InputMode;
  onSelectMode: (mode: InputMode) => void;
}

const InputSelector: React.FC<InputSelectorProps> = ({ selectedMode, onSelectMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const modes = [
    { 
      mode: InputMode.FILE, 
      label: UI_STRINGS_MY.FILE_UPLOAD_TAB,
      icon: FileText,
      description: "PDF, DOCX, TXT ဖတ်ခြင်း"
    },
    { 
      mode: InputMode.URL, 
      label: UI_STRINGS_MY.URL_INPUT_TAB,
      icon: Link,
      description: "web url မှရေးသား"
    },
    { 
      mode: InputMode.REPORT, 
      label: UI_STRINGS_MY.REPORT_TAB,
      icon: TrendingUp,
      description: "အစီရင်ခံစာများ အကျဥ်းချုပ်ခြင်း"
    },
    { 
      mode: InputMode.TRANSLATE_EN_TO_MY, 
      label: UI_STRINGS_MY.TRANSLATE_EN_TO_MY_TAB,
      icon: Languages,
      description: "EN-BUR Translator"
    },
    { 
      mode: InputMode.TRANSLATE_MY_TO_EN, 
      label: UI_STRINGS_MY.TRANSLATE_MY_TO_EN_TAB,
      icon: Globe,
      description: "BUR-EN Translator"
    },
    { 
      mode: InputMode.TRANSLATE_TEXT, 
      label: UI_STRINGS_MY.TRANSLATE_TEXT_TAB,
      icon: Keyboard,
      description: " TEXT ဘာသာပြန်ခြင်း"
    },
  ];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeOption = modes.find(m => m.mode === selectedMode) || modes[0];
  const ActiveIcon = activeOption.icon;

  return (
    <div className="relative w-full" ref={containerRef} id="input-mode-dropdown-parent">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-slate-350 px-4 py-3 rounded-xl transition-all duration-205 cursor-pointer select-none text-left shadow-xs outline-none"
        id="input-mode-dropdown-trigger"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
            <ActiveIcon className="w-4 h-4 shrink-0" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-[13px] font-extrabold text-slate-900 leading-tight">
              {activeOption.label}
            </span>
            <span className="text-[10px] font-sans text-slate-500 max-w-[200px] sm:max-w-none line-clamp-1">
              {activeOption.description}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-stone-100 animate-fade-in"
          id="input-mode-dropdown-options"
        >
          {modes.map((item) => {
            const ItemIcon = item.icon;
            const isSelected = item.mode === selectedMode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  onSelectMode(item.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between text-left px-4 py-3 hover:bg-zinc-50 transition-colors select-none cursor-pointer group ${
                  isSelected ? 'bg-zinc-50/70' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isSelected ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-[12.5px] font-bold text-slate-900 leading-snug">
                      {item.label}
                    </span>
                    <span className="text-[9.5px] font-sans text-slate-500">
                      {item.description}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-slate-900 font-extrabold shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InputSelector;
