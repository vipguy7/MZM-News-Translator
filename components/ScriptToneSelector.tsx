import React from 'react';
import { ScriptTone } from '../types';
import { UI_STRINGS_MY } from '../constants';
import { Volume2, ChevronDown } from 'lucide-react';

interface ScriptToneSelectorProps {
  selectedTone: ScriptTone;
  onToneChange: (tone: ScriptTone) => void;
}

const ScriptToneSelector: React.FC<ScriptToneSelectorProps> = ({ selectedTone, onToneChange }) => {
  const toneOptions = [
    { value: ScriptTone.FORMAL, label: UI_STRINGS_MY.SCRIPT_TONE_FORMAL },
    { value: ScriptTone.FRIENDLY, label: UI_STRINGS_MY.SCRIPT_TONE_FRIENDLY },
    { value: ScriptTone.URGENT, label: UI_STRINGS_MY.SCRIPT_TONE_URGENT },
    { value: ScriptTone.INVESTIGATIVE, label: UI_STRINGS_MY.SCRIPT_TONE_INVESTIGATIVE },
    { value: ScriptTone.PRESS_RELEASE, label: (UI_STRINGS_MY as any).SCRIPT_TONE_PRESS_RELEASE  || 'သတင်းထုတ်ပြန်ချက်' },
    { value: ScriptTone.REPORT, label: (UI_STRINGS_MY as any).SCRIPT_TONE_REPORT || 'အစီရင်ခံစာသတင်း' },
  ];

  return (
    <div className="flex flex-col gap-1.5" id="script-tone-container">
      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-serif flex items-center gap-1.5">
        <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
        <span>သတင်းရေးသားဟန် (Tone)</span>
      </label>
      <div className="relative">
        <select
          value={selectedTone}
          onChange={(e) => onToneChange(e.target.value as ScriptTone)}
          className="w-full bg-white border border-slate-200 hover:border-slate-350 cursor-pointer text-slate-800 text-xs px-3.5 py-3 rounded-xl font-serif font-bold shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-slate-900 pr-10"
        >
          {toneOptions.map((option) => (
            <option key={option.value} value={option.value} className="font-serif">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ScriptToneSelector);
