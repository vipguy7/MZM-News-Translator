import React, { useState, useCallback } from 'react';
import { UI_STRINGS_MY } from '../constants';
import { getHeaders } from '../services/geminiService';

interface ReportInputProps {
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
  targetLanguage: 'Burmese' | 'English';
  onLanguageChange: (lang: 'Burmese' | 'English') => void;
}

const ReportInput: React.FC<ReportInputProps> = ({ 
  value, 
  onChange, 
  isError,
  targetLanguage,
  onLanguageChange
}) => {
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [useEnhanced, setUseEnhanced] = useState<boolean>(true);

  const handlePdfUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate 50MB size limit
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      setParseError("ဖိုင်အရွယ်အစားသည် 50MB ထက်မကြီးရပါ။ (The PDF file must not exceed 50MB.)");
      setFileName(null);
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setParseError("PDF ဖိုင်အမျိုးအစားသာ တင်ခွင့်ရှိပါသည်။ (Only PDF files are supported here.)");
      setFileName(null);
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
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
      const response = await fetch('/api/parse-file', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ 
          fileData, 
          fileType: 'application/pdf', 
          fileName: file.name,
          enhanced: useEnhanced
        })
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (e) {
          throw new Error("တုန့်ပြန်မှု ဖိုင်ပုံစံ မှားယွင်းနေပါသည်။");
        }
      } else {
        const errorText = await response.text();
        throw new Error(`ဆာဗာမှ မမျှော်လင့်ထားသော တုန့်ပြန်မှု ရရှိသည်: ${errorText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || "ဖိုင်ကိုဖတ်ခြင်း မအောင်မြင်ပါ။");
      }

      const textContent = result.text;

      if (!textContent || !textContent.trim()) {
        throw new Error("PDF ဖိုင်ထဲတွင် စာသားများ မတွေ့ရပါ။");
      }

      onChange(textContent);
      
      if (result.isOcrUsed) {
        console.log("Report PDF processed beautifully with high-accuracy Gemini layout OCR.");
      }
    } catch (err: any) {
      console.error("PDF upload error:", err);
      setParseError(err.message || "PDF ဖိုင်ဖတ်ရာတွင် အမှားအယွင်းရှိပါသည်။");
      setFileName(null);
    } finally {
      setIsParsing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [onChange, useEnhanced]);

  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleSummarize = useCallback(async () => {
    if (!value || !value.trim()) return;

    setIsSummarizing(true);
    setSummaryError(null);
    setSummary(null);

    try {
      const response = await fetch('/api/summarize-report', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({
          text: value,
          targetLanguage: targetLanguage
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
        throw new Error(`ဆာဗာမှ မမျှော်လင့်ထားသော တုန့်ပြန်မှု ရရှိသည်: ${errorText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result?.error || "အကျဉ်းချုပ်ဖတ်ယူခြင်း မအောင်မြင်ပါ။");
      }

      setSummary(result.summary || '');
    } catch (err: any) {
      console.error("Report summarization error:", err);
      setSummaryError(err.message || "အစီရင်ခံစာအား အကျဥ်းချုံ့ရာတွင် အမှားအယွင်းရှိပါသည်။");
    } finally {
      setIsSummarizing(false);
    }
  }, [value, targetLanguage]);

  const handleCopySummary = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [summary]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label htmlFor="report-input" className="block text-sm font-bold text-slate-800 font-serif">
          {UI_STRINGS_MY.ENTER_REPORT_PROMPT}
        </label>
        
        <div className="flex items-center gap-3 shrink-0">
          {/* Toggle for premium layout-aware parsing */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1 transition-all shadow-xs">
            <input
              id="enhanced-pdf-checkbox-report"
              type="checkbox"
              checked={useEnhanced}
              onChange={(e) => setUseEnhanced(e.target.checked)}
              className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="enhanced-pdf-checkbox-report" className="text-[10.5px] font-serif font-semibold text-slate-700 cursor-pointer select-none">
              ✨ တဆင့်မြှင့် OCR သုံးမည်
            </label>
          </div>

          {/* PDF File Upload triggers */}
          <div className="relative shrink-0">
            <label
              htmlFor="pdf-upload-input"
              className={`cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-350 shadow-sm rounded-lg px-3 py-1.5 text-xs font-serif font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] ${
                isParsing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>📎 PDF တင်ရန် (Max 50MB)</span>
              <input 
                id="pdf-upload-input"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={handlePdfUpload}
                disabled={isParsing}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Target output language select controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs">
        <span className="text-xs font-serif font-bold text-slate-700 flex items-center gap-1.5">
          <span>📰</span> သန့်စင်ထွက်ရှိမည့် သတင်းဘာသာစကား (Output News Language):
        </span>
        <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onLanguageChange('Burmese')}
            className={`px-3.5 py-1 text-xs font-serif font-semibold rounded-md transition-all cursor-pointer ${
              targetLanguage === 'Burmese' 
                ? 'bg-blue-600 text-white shadow-sm font-bold' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            မြန်မာဘာသာ (Burmese)
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('English')}
            className={`px-3.5 py-1 text-xs font-serif font-semibold rounded-md transition-all cursor-pointer ${
              targetLanguage === 'English' 
                ? 'bg-blue-600 text-white shadow-sm font-bold' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            အင်္ဂလိပ်ဘာသာ (English)
          </button>
        </div>
      </div>

      {fileName && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-serif text-blue-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm">📄</span>
            <span>ထည့်သွင်းထားသော ဖိုင်- <strong>{fileName}</strong></span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setFileName(null);
              onChange('');
            }}
            className="text-red-550 hover:text-red-700 font-bold px-2 py-0.5 cursor-pointer"
            title="ဖျက်ရန်"
          >
            ✕
          </button>
        </div>
      )}

      {isParsing && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs font-serif text-sky-800 flex items-center gap-2.5 shadow-sm">
          <svg className="animate-spin h-4 w-4 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {useEnhanced ? (
            <span>Gemini AI Intelligent Layout & OCR စနစ်ဖြင့် PDF <strong>{fileName}</strong> ထဲရှိ ဇယားများ၊ စာများနှင့် ကိန်းဂဏန်းများကို အလွန်တိကျစွာ ထုတ်ယူဖတ်ရှုနေပါသည်... စက္ကန့်အနည်းငယ် စောင့်ပါ...</span>
          ) : (
            <span>PDF <strong>{fileName}</strong> မှ အချက်အလက်များကို ထုတ်ယူနေပါသည်... စက္ကန့်အနည်းငယ် စောင့်ပါ...</span>
          )}
        </div>
      )}

      {parseError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-serif text-red-600 shadow-sm animate-fade-in">
          ⚠️ {parseError}
        </div>
      )}

      <div className="relative">
        <textarea
          id="report-input"
          value={value}
          onChange={(e) => {
            setParseError(null);
            onChange(e.target.value);
          }}
          placeholder={UI_STRINGS_MY.REPORT_PLACEHOLDER}
          className={`mt-1 block w-full px-4 py-3 bg-white border rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-serif min-h-[180px] leading-relaxed transition-all ${
            isError ? 'border-red-500 ring-red-500' : 'border-slate-300 hover:border-slate-400'
          }`}
          aria-invalid={isError ? 'true' : 'false'}
          rows={7}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pt-1">
        <p className="text-[11px] text-slate-500 italic font-serif flex-1 leading-normal">
          💡 သတင်းဌာနများ၏ သတင်းရေးသားစံသတ်မှတ်ချက်များအတိုင်း ပြည့်စုံသော သတင်းတင်ပြချက်ကို ဆန်းစစ်ရေးသားပေးပါလိမ့်မည်။ PDF တင်သွင်းပါကလည်း အလိုအလျောက် သတင်းပြောင်းလဲရေးသားပေးနိုင်ပါသည်။
        </p>
        <div className="text-[10px] text-slate-400 font-mono select-none self-end sm:self-auto shrink-0 bg-slate-100 hover:bg-slate-200/60 px-2 py-0.5 rounded border border-slate-200/80 transition-colors">
          {value.length.toLocaleString()} chars
        </div>
      </div>

      {/* Quick Summary Action button & Display card section */}
      {value && value.trim().length > 0 && (
        <div className="pt-2 border-t border-dashed border-slate-200 mt-2 hover:border-slate-350 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 font-serif">
              အစီရင်ခံစာအား သီးသန့် အကျဉ်းချုပ်ဖတ်ရှုလိုပါသလား?
            </span>
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs border ${
                isSummarizing 
                  ? 'bg-slate-100 text-slate-400 border-slate-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 hover:border-emerald-600'
              }`}
            >
              {isSummarizing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>အကျဉ်းချုပ်နေပါသည်...</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>ဆန့်ထုတ်အကျဉ်းချုပ်ချက် ဖတ်ရှုမည် (Get Concise Summary)</span>
                </>
              )}
            </button>
          </div>

          {summaryError && (
            <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-serif text-red-600 shadow-sm animate-fade-in">
              ⚠️ {summaryError}
            </div>
          )}

          {summary && (
            <div className="mt-3.5 bg-emerald-50/45 border border-emerald-200 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all animate-fade-in relative select-text">
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-emerald-100 select-none">
                <h4 className="text-xs font-bold text-emerald-900 font-serif flex items-center gap-1.5">
                  <span>✨</span> စာရွက်စာတမ်း အချက်အလက် ခွဲခြမ်းစိတ်ဖြာချက် အကျဉ်းချုပ်
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-serif font-bold transition-all ${
                      isCopied 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isCopied ? "✓ ကူးယူပြီး" : "📋 ကော်ပီကူးရန်"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummary(null)}
                    className="cursor-pointer p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-md transition-colors"
                    title="ပိတ်ရန်"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-[12px] text-slate-700 font-serif leading-relaxed">
                {summary.split('\n').map((line, idx) => {
                  const cleanedLine = line.replace(/^[-\*\s•\d\.]+\s*/, '').trim();
                  if (!cleanedLine) return null;
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-black shrink-0 mt-0.5">•</span>
                      <span>{cleanedLine}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportInput;
