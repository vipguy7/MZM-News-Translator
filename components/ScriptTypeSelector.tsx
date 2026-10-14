import React from 'react';
import { ScriptType } from '../types';
import { UI_STRINGS_MY } from '../constants';
import { FileText, ChevronDown } from 'lucide-react';

interface ScriptTypeSelectorProps {
  selectedType: ScriptType;
  onTypeChange: (type: ScriptType) => void;
}

const ScriptTypeSelector: React.FC<ScriptTypeSelectorProps> = ({ selectedType, onTypeChange }) => {
  const typeOptions = [
    { value: ScriptType.WEB_POST, label: UI_STRINGS_MY.SCRIPT_TYPE_WEB_POST },
    { value: ScriptType.VIDEO_POST, label: UI_STRINGS_MY.SCRIPT_TYPE_VIDEO_POST },
  ];

  return (
    <div className="flex flex-col gap-1.5" id="script-type-container">
      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-serif flex items-center gap-1.5">
        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
        <span>သတင်းအမျိုးအစား (Format)</span>
      </label>
      <div className="relative">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value as ScriptType)}
          className="w-full bg-white border border-slate-200 hover:border-slate-350 cursor-pointer text-slate-800 text-xs px-3.5 py-3 rounded-xl font-serif font-bold shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-slate-900 pr-10"
        >
          {typeOptions.map((option) => (
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

export default React.memo(ScriptTypeSelector);
