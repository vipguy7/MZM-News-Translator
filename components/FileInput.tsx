
import React, { useState, useCallback } from 'react';
import { UI_STRINGS_MY } from '../constants';
import { getHeaders } from '../services/geminiService';

interface FileInputProps {
  onFileProcessed: (content: string) => void;
  onError: (message: string) => void;
}

const FileInput: React.FC<FileInputProps> = ({ onFileProcessed, onError }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [useEnhanced, setUseEnhanced] = useState<boolean>(true);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsParsing(true);
      onError(''); 

      try {
        let textContent = '';
        if (file.type === 'text/plain') {
          textContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error(UI_STRINGS_MY.ERROR_FILE_READ));
            reader.readAsText(file);
          });
        } else if (
          file.type === 'application/pdf' || 
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.name.toLowerCase().endsWith('.docx')
        ) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const fileData = await base64Promise;
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          
          const response = await fetch('/api/parse-file', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ 
              fileData, 
              fileType: file.type, 
              fileName: file.name,
              enhanced: isPdf ? useEnhanced : false
            })
          });

          let result;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              result = await response.json();
            } catch (e) {
              throw new Error("ဆာဗာ၏ တုန့်ပြန်မှုပုံစံ မှားယွင်းနေပါသည်။");
            }
          } else {
            const errorText = await response.text();
            throw new Error(`ဆာဗာမှ အမှားအယွင်း တုန့်ပြန်မှု ပြန်ပေးသည်: ${errorText.substring(0, 100)}`);
          }

          if (!response.ok) {
            throw new Error(result?.error || UI_STRINGS_MY.ERROR_FILE_PARSE);
          }
          textContent = result.text;
          
          if (result.isOcrUsed) {
            console.log("PDF parsed successfully using Gemini Intelligent OCR.");
          }
        } else {
          throw new Error(UI_STRINGS_MY.ERROR_UNSUPPORTED_FILE_TYPE);
        }
        
        if (!textContent.trim()) {
            throw new Error(UI_STRINGS_MY.ERROR_FILE_PARSE + " (ဖိုင်တွင် စာသားမတွေ့ပါ သို့မဟုတ် ထုတ်ယူ၍မရပါ။)");
        }
        onFileProcessed(textContent);

      } catch (err: any) {
        console.error("File processing error:", err);
        onError(err.message || UI_STRINGS_MY.ERROR_FILE_PARSE);
        setFileName(null);
        onFileProcessed(''); 
      } finally {
        setIsParsing(false);
        if (event.target) {
            event.target.value = ''; 
        }
      }
    } else {
        setFileName(null);
        onFileProcessed('');
    }
  }, [onFileProcessed, onError, useEnhanced]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label htmlFor="file-upload-input-trigger" className="block text-sm font-bold text-slate-800 font-serif">
          {UI_STRINGS_MY.UPLOAD_PROMPT_LABEL}
        </label>
        
        {/* Toggle for premium layout-aware parsing */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-all shadow-xs shrink-0">
          <input
            id="enhanced-pdf-checkbox-file"
            type="checkbox"
            checked={useEnhanced}
            onChange={(e) => setUseEnhanced(e.target.checked)}
            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
          />
          <label htmlFor="enhanced-pdf-checkbox-file" className="text-[11px] font-serif font-semibold text-slate-700 cursor-pointer select-none">
            OCR ဖြင့်ဖတ်မည် (Enhanced PDF Parse)
          </label>
        </div>
      </div>
      
      <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <label
          htmlFor="file-upload-input-trigger"
          className={`cursor-pointer bg-white py-2 px-4 border border-slate-400 rounded-md shadow-sm text-sm font-semibold text-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{isParsing ? (UI_STRINGS_MY.LOADING + '...') : UI_STRINGS_MY.UPLOAD_BUTTON_TEXT}</span>
          <input 
            id="file-upload-input-trigger" 
            name="file-upload" 
            type="file" 
            className="sr-only" 
            accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            onChange={handleFileChange}
            disabled={isParsing}
          />
        </label>
        {fileName && !isParsing && (
          <span className="text-sm text-slate-700 font-serif">{UI_STRINGS_MY.FILE_SELECTED_PREFIX}{fileName}</span>
        )}
        {!fileName && !isParsing && (
          <span className="text-sm text-slate-700 font-serif">{UI_STRINGS_MY.NO_FILE_SELECTED}</span>
        )}
         {isParsing && fileName && (
          <span className="text-sm text-blue-700 flex items-center font-serif bg-blue-50/55 border border-blue-100 rounded-lg px-2.5 py-1 animate-pulse">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {useEnhanced ? (
              <span><strong>{fileName}</strong> မှOCR နည်းပညာဖြင့် ဇယားများနှင့် ပုံရိပ်များကို သန့်စင်ဖတ်ရှုနေပါသည်... ခေတ္တစောင့်ရန်</span>
            ) : (
              <span><strong>{fileName}</strong> ကို စစ်ဆေးနေပါသည်...</span>
            )}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-serif italic pt-0.5 leading-relaxed">
        💡 Enhanced True-Layout Parser သည် PDF ဖိုင်ထဲရှိ Multi-column စာသားများ၊ အချက်အလက်ဇယားများ နှင့် ပုံရိပ်စကင်ဖတ်ထားသော စာရွက်စာตမ်းများကို ပြန်လည်ထုတ်ယူပေးနိုင်သည်။
      </p>
    </div>
  );
};

export default FileInput;