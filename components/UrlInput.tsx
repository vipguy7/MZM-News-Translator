import React from 'react';
import { UI_STRINGS_MY } from '../constants';
import { Globe, ClipboardPaste, X, ShieldCheck } from 'lucide-react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  onSwitchToDirectPaste?: () => void;
}

const UrlInput: React.FC<UrlInputProps> = ({ 
  value, 
  onChange, 
  label = UI_STRINGS_MY.ENTER_URL_PROMPT, 
  placeholder = UI_STRINGS_MY.URL_PLACEHOLDER,
  onSwitchToDirectPaste
}) => {
  const inputId = label.replace(/\s/g, '-').toLowerCase();

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="block text-xs font-serif font-black text-slate-800 tracking-wide">
          {label}
        </label>
        {onSwitchToDirectPaste && (
          <button
            type="button"
            onClick={onSwitchToDirectPaste}
            className="inline-flex items-center gap-1.5 text-[11px] font-serif font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>တိုက်ရိုက်ကူးထည့်ရန် (Paste Text)</span>
          </button>
        )}
      </div>

      <div className="relative rounded-xl shadow-xs">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Globe className="w-4 h-4" />
        </div>
        <input
          type="url"
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 sm:text-xs font-serif transition-colors"
          aria-label={label}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Clear URL"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info helper regarding protected sources & search grounding */}
      <div className="flex items-start gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] font-serif text-slate-600 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">အလိုအလျောက် သတင်းရယူမှုစနစ်: </span>
          <span>Reuters, BBC, AP စသည့် ပိတ်ဆို့မှု (401/Anti-Bot) ရှိသော နိုင်ငံတကာသတင်းဌာနလင့်ခ်များကို Stealth Scraping နှင့် Gemini Google Search Grounding ဖြင့် ချောမွေ့စွာ ပြန်လည်ရယူပေးပါမည်။</span>
        </div>
      </div>
    </div>
  );
};

export default UrlInput;