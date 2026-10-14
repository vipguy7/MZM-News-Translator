
import React from 'react';
import { UI_STRINGS_MY } from '../constants';

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({
  value,
  onChange,
  label = UI_STRINGS_MY.PASTE_TEXT_PROMPT,
  placeholder = UI_STRINGS_MY.PASTE_TEXT_PLACEHOLDER
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor="textarea-input" className="block text-sm font-medium text-black font-serif">
        {label}
      </label>
      <textarea
        id="textarea-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-400 rounded-md shadow-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-serif min-h-[120px]"
        aria-label={label}
        rows={5}
      />
    </div>
  );
};

export default TextAreaInput;