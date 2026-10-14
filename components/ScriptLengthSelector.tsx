import React from 'react';
import { ScriptLength } from '../types';
import { UI_STRINGS_MY } from '../constants';
import { Ruler, ChevronDown } from 'lucide-react';

interface ScriptLengthSelectorProps {
  selectedLength: ScriptLength;
  onLengthChange: (length: ScriptLength) => void;
}

const ScriptLengthSelector: React.FC<ScriptLengthSelectorProps> = ({ selectedLength, onLengthChange }) => {
  const lengthOptions = [
    { value: ScriptLength.STANDARD, label: UI_STRINGS_MY.SCRIPT_LENGTH_STANDARD },
    { value: ScriptLength.ONE_MINUTE, label: UI_STRINGS_MY.SCRIPT_LENGTH_ONE_MINUTE },
    { value: ScriptLength.FIVE_MINUTES, label: UI_STRINGS_MY.SCRIPT_LENGTH_FIVE_MINUTES },
    { value: ScriptLength.LONG_ARTICLE, label: UI_STRINGS_MY.SCRIPT_LENGTH_LONG_ARTICLE },
  ];

  return (
    <div className="flex flex-col gap-1.5" id="script-length-container">
      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-serif flex items-center gap-1.5">
        <Ruler className="w-3 h-3 text-slate-400 shrink-0" />
        <span> ဆောင်းပါး အတို/အရှည် (Length)</span>
      </label>
      <div className="relative">
        <select
          value={selectedLength}
          onChange={(e) => onLengthChange(e.target.value as ScriptLength)}
          className="w-full bg-white border border-slate-200 hover:border-slate-350 cursor-pointer text-slate-800 text-xs px-3.5 py-3 rounded-xl font-serif font-bold shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-slate-900 pr-10"
        >
          {lengthOptions.map((option) => (
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

export default ScriptLengthSelector;
