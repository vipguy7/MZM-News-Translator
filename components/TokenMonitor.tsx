import React, { useState } from 'react';
import { KeyRound, BatteryFull, BatteryLow, Save } from 'lucide-react';

interface TokenMonitorProps {
  usageToday: number;
  limit: number;
  hasCustomKey: boolean;
  onSaveApiKey: (key: string) => Promise<void>;
  preferredModel?: 'gemini' | 'gemini-pro' | 'gemini-2.5-flash' | 'openai';
  onOpenSettings?: () => void;
}

export default function TokenMonitor({ 
  usageToday, 
  limit, 
  hasCustomKey, 
  onSaveApiKey,
  preferredModel = 'gemini',
  onOpenSettings
}: TokenMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const remaining = Math.max(0, limit - usageToday);
  const percent = hasCustomKey ? 100 : Math.round((remaining / limit) * 100);

  const getModelLabel = () => {
    switch (preferredModel) {
      case 'gemini': return 'Gemini 3.5 Flash (Free Version)';
      case 'gemini-pro': return 'Gemini 3.5 Flash (Optimized)';
      case 'gemini-2.5-flash': return 'Gemini 2.5 Flash (Free)';
      case 'openai': return 'OpenAI GPT-4o-mini';
      default: return 'Gemini 3.5 Flash (Free Version)';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveApiKey(apiKeyInput);
    setIsSaving(false);
    setIsExpanded(false);
    setApiKeyInput('');
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-xl p-4 mb-6 transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasCustomKey ? 'bg-emerald-100 text-emerald-600' : remaining < 5 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
            {hasCustomKey ? <KeyRound className="w-5 h-5" /> : remaining < 5 ? <BatteryLow className="w-5 h-5" /> : <BatteryFull className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-sm font-serif text-slate-800">
              {hasCustomKey ? 'Gemini API Key ဖြင့် ချိတ်ဆက်ထားပါသည်' : 'အခမဲ့ တိုကင် အခြေအနေ (Token Monitor)'}
            </h4>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              {hasCustomKey ? 'ကန့်သတ်ချက်မရှိ အသုံးပြုနိုင်ပါသည် (Unlimited Access)' : `ယနေ့အတွက် လက်ကျန် ( ${remaining} / ${limit} ) ကြိမ်`}
            </p>
          </div>
        </div>
        
        {!hasCustomKey && (
          <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${remaining < 5 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      {/* Model Engine Indicator Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-serif">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-500">AI Engine:</span>
          <span className="font-black text-slate-900 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded-md text-[10.5px]">
            {getModelLabel()}
          </span>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            ပြောင်းလဲမည် (Change)
          </button>
        )}
      </div>

      {isExpanded && !hasCustomKey && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
          <p className="text-[11px] mb-3 text-slate-600 font-serif leading-relaxed">
            အခမဲ့ပေးထားသော ၃၀ ကြိမ် ကုန်ဆုံးသွားပါက ဆက်လက်သုံးစွဲရန် Google AI Studio မှ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">အခမဲ့ API Key</a> ရယူပြီး ဤနေရာတွင် ထည့်သွင်းပါ။
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Paste your Gemini API Key here..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !apiKeyInput.trim()}
              className="bg-zinc-900 text-white text-xs px-4 rounded-lg flex items-center justify-center gap-1.5 hover:bg-zinc-800 cursor-pointer focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
            >
              {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
              သိမ်းမည် (Save)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
