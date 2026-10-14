import React, { useState } from 'react';
import { GroundingChunk, SEOData, ReportStatistic, ReportChartData } from '../types';
import { UI_STRINGS_MY } from '../constants';
import { 
  Copy, 
  Newspaper, 
  LayoutGrid, 
  Sparkles, 
  Bookmark, 
  Link as LinkIcon, 
  Check, 
  TrendingUp, 
  Tag,
  ThumbsUp,
  ThumbsDown,
  Scissors,
  Smartphone,
  TableProperties,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { auth, googleSignIn } from '../services/firebaseService';
import { exportToGoogleSheets } from '../services/sheetsService';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#3bb2f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

interface ScriptDisplayProps {
  script: string | null;
  sources?: GroundingChunk[] | null;
  seoData?: SEOData[] | SEOData | null; // Support array or single object representation securely
  category?: string | null;
  wasServedFromCache?: boolean;
  statistics?: ReportStatistic[] | null;
  chartData?: ReportChartData[] | null;
  chartTitle?: string | null;
  chartType?: string | null;
  scrapeMethod?: string | null;
  scrapeNotice?: string | null;
}

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ 
  script, 
  sources, 
  seoData, 
  category, 
  wasServedFromCache = false,
  statistics = null,
  chartData = null,
  chartTitle = null,
  chartType = null,
  scrapeMethod = null,
  scrapeNotice = null
}) => {
  const [activeLayout, setActiveLayout] = useState<'newspaper' | 'bento' | 'split'>('newspaper');
  const [copied, setCopied] = useState<boolean>(false);
  const [paragraphsPerChunk, setParagraphsPerChunk] = useState<number>(3);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [splitViewType, setSplitViewType] = useState<'pages' | 'stack'>('pages');

  const [isExportingSheet, setIsExportingSheet] = useState<boolean>(false);
  const [sheetExportUrl, setSheetExportUrl] = useState<string | null>(null);
  const [sheetExportError, setSheetExportError] = useState<string | null>(null);

  const handleExportToSheets = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to export this script to Google Sheets? This will create a new spreadsheet in your Google Drive.`
    );
    if (!confirmed) return;

    setIsExportingSheet(true);
    setSheetExportError(null);
    try {
      let sd = seoData ? (Array.isArray(seoData) ? seoData[0] : seoData) as SEOData : null;
      let seoStr = "";
      if (sd) {
        seoStr = `Title: ${sd.optimizedTitle}\nDescription: ${sd.metaDescription}\nTags: ${sd.hashtags.join(", ")}`;
      }
      
      try {
        const url = await exportToGoogleSheets({
          title: sd?.optimizedTitle || "Untitled Script",
          script: script || "",
          seo: seoStr,
          category: category || "",
        });
        setSheetExportUrl(url);
      } catch (err: any) {
        if (err.message === 'Please sign in with Google to export to Google Sheets.') {
          // Attempt inline sign in
          await googleSignIn();
          // Retry
          const url = await exportToGoogleSheets({
            title: sd?.optimizedTitle || "Untitled Script",
            script: script || "",
            seo: seoStr,
            category: category || "",
          });
          setSheetExportUrl(url);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error(err);
      setSheetExportError(err.message || 'Export failed.');
    } finally {
      setIsExportingSheet(false);
    }
  };

  // Sentiment feedback and words correction memory states
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [comment, setComment] = useState<string>('');
  const [wrongWord, setWrongWord] = useState<string>('');
  const [correctedWord, setCorrectedWord] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Split script by the custom separator for additional details
  const scriptParts = script ? script.split(/\n\n---\n/) : [];
  const mainScriptContent = scriptParts[0] || '';
  const additionalInfo = scriptParts.length > 1 ? scriptParts[1] : null;

  const handleSendQuickFeedback = async (selectedRating: 'good' | 'bad') => {
    setRating(selectedRating);
    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in to submit your feedback.");
      const token = await user.getIdToken();

      const response = await fetch('/api/news-feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: selectedRating,
          originalText: mainScriptContent ? mainScriptContent.substring(0, 1500) : '',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit feedback rating.");
      }

      setFeedbackSubmitted(true);
    } catch (e: any) {
      console.error(e);
      setFeedbackError(e.message || "An error occurred during submission.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSubmitDetailedFeedback = async () => {
    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in to submit your feedback.");
      const token = await user.getIdToken();

      const response = await fetch('/api/news-feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: 'bad',
          originalText: mainScriptContent ? mainScriptContent.substring(0, 1500) : '',
          comment,
          wrongWord,
          correctedWord,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit feedback correction.");
      }

      setFeedbackSubmitted(true);
    } catch (e: any) {
      console.error(e);
      setFeedbackError(e.message || "An error occurred during submission.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (!script) {
    return (
      <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-550 font-serif text-sm">
        {UI_STRINGS_MY.NO_SCRIPT_YET}
      </div>
    );
  }

  // Support varying representations of SEOData securely
  const singleSeoData: SEOData | null = seoData 
    ? (Array.isArray(seoData) ? seoData[0] : seoData) as SEOData
    : null;

  // Split content into clean logical paragraphs
  const paragraphs = mainScriptContent
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Quick Split chunk calculation
  const chunkedParagraphs: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
    chunkedParagraphs.push(paragraphs.slice(i, i + paragraphsPerChunk));
  }

  const cleanParagraphText = (text: string) => {
    return text
      .replace(/^(နိဒါန်း|အဓိက အကြောင်းအရာ|နိဂုံး|နိဂုံးနှင့် တိုက်တွန်းချက်|သတင်းခေါင်းစဉ်|နိဒါန်း \(Opening Hook\)|အဓိက အကြောင်းအရာ \(Narration Body\)|နိဂုံး \(Conclusion & Call-to-Action\)|Lead:|Body:|Conclusion:)\s*:\s*/i, '')
      .trim();
  };

  const getSectionHeader = (originalText: string, index: number, total: number) => {
    const lower = originalText.toLowerCase();
    
    // Explicit keyword matching
    if (lower.startsWith('နိဒါန်း') || lower.startsWith('lead') || lower.startsWith('intro')) {
      return 'နိဒါန်း (Lead Hook)';
    }
    if (lower.startsWith('နိဂုံး') || lower.startsWith('conclusion') || lower.startsWith('outro') || lower.startsWith('call-to-action')) {
      return 'နိဂုံးနှင့် တိုက်တွန်းချက် (Closing Summary)';
    }
    if (lower.startsWith('အဓိက') || lower.startsWith('body') || lower.startsWith('narration')) {
      return 'အဓိကသတင်းအချက်အလက် (Core Highlights)';
    }
    
    // Positional fallback defaults
    if (index === 0) return 'နိဒါန်း (Lead Hook)';
    if (index === total - 1 && total > 1) return 'နိဂုံးနှင့် နိဂုံးချုပ် (Concluding Take)';
    return `သတင်းအချက်အလက် အပိုင်း (${index + 1})`;
  };

  const handleCopy = () => {
    const stripFormat = (text: string) => {
      return text.replace(/^#+\s+/gm, '') // Remove Markdown headers
                 .replace(/\*\*/g, '')   // Remove bold
                 .replace(/\*/g, '')     // Remove italic/bullets
                 .replace(/^(နိဒါန်း|အဓိက အကြောင်းအရာ|နိဂုံး|နိဂုံးနှင့် တိုက်တွန်းချက်|သတင်းခေါင်းစဉ်|နိဒါန်း \(Opening Hook\)|အဓိက အကြောင်းအရာ \(Narration Body\)|နိဂုံး \(Conclusion & Call-to-Action\)):/gm, '')
                 .trim();
    };

    let textToCopy = singleSeoData ? `${singleSeoData.optimizedTitle}\n\n` : '';
    textToCopy += stripFormat(mainScriptContent || '');
    
    // Ensure we copy additional info if present
    if (additionalInfo) {
      textToCopy += `\n\n---\n${stripFormat(additionalInfo)}`;
    }

    if (singleSeoData) {
      textToCopy += `\n\n${UI_STRINGS_MY.SEO_TITLE_LABEL} ${singleSeoData.optimizedTitle}`;
      textToCopy += `\n${UI_STRINGS_MY.SEO_META_DESCRIPTION_LABEL} ${singleSeoData.metaDescription}`;
      textToCopy += `\n${UI_STRINGS_MY.SEO_HASHTAGS_LABEL} ${singleSeoData.hashtags.map(t => `#${t.replace(/^#/, '')}`).join(' ')}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-2 space-y-6">
      
      {/* Dynamic Navigation Dashboard within results */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 mb-2 gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            {UI_STRINGS_MY.GENERATED_SCRIPT_HEADING}
          </h2>
          <p className="text-xs text-slate-550 font-serif mt-1">အလိုအလျောက် ရေးသားပြင်ဆင်ထားသော သတင်းဆောင်းပါး</p>
        </div>

        {/* Layout Switcher & Actions Panel */}
        <div className="flex flex-wrap items-center gap-3">
          {wasServedFromCache && (
            <span className="text-[10px] font-sans bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1">
              <span>🕒 Cached</span>
            </span>
          )}

          {/* Interactive Layout Tabs Block */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => setActiveLayout('newspaper')}
              className={`px-3 py-1.5 rounded-md text-xs font-serif font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeLayout === 'newspaper'
                  ? 'bg-blue-600 text-white shadow font-bold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>သတင်းစာပုံစံ</span>
            </button>
            <button
              onClick={() => setActiveLayout('bento')}
              className={`px-3 py-1.5 rounded-md text-xs font-serif font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeLayout === 'bento'
                  ? 'bg-blue-600 text-white shadow font-bold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>ကတ်ပြားပုံစံ</span>
            </button>
            <button
              onClick={() => setActiveLayout('split')}
              className={`px-3 py-1.5 rounded-md text-xs font-serif font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeLayout === 'split'
                  ? 'bg-blue-600 text-white shadow font-bold'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
              }`}
              title="မိုဘိုင်းဖုန်းပေါ်တွင် အလွယ်တကူ အပိုင်းခွဲ၍ ဖတ်ရှုရန်စနစ်"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Quick Split</span>
            </button>
          </div>

          <button 
            onClick={handleCopy}
            className={`text-xs font-serif font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-550 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>
          
          <button 
            onClick={handleExportToSheets}
            disabled={isExportingSheet || !!sheetExportUrl}
            className={`text-xs font-serif font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
              sheetExportUrl 
                ? 'bg-emerald-600 text-white' 
                : 'bg-[#0f9d58] hover:bg-[#0b8043] text-white disabled:opacity-50'
            }`}
            title="Export Script to Google Sheets"
          >
            {sheetExportUrl ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Exported</span>
              </>
            ) : isExportingSheet ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <TableProperties className="w-3.5 h-3.5 shrink-0" />
                <span>Export to Sheets</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {sheetExportUrl && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex justify-between items-center mb-6">
          <span>Success! Your script was exported.</span>
          <a href={sheetExportUrl} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 font-semibold font-sans">
            Open Sheet
          </a>
        </div>
      )}

      {sheetExportError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs mb-6">
          <strong>Export Failed:</strong> {sheetExportError}
        </div>
      )}

      {/* Gemini Search Grounding retrieval notification banner */}
      {scrapeMethod === 'gemini_search_grounding' && (
        <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/80 border border-blue-200 rounded-xl text-xs font-serif text-slate-800 shadow-xs mb-6 animate-fade-in">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-blue-950 text-sm">
                Google Search Grounding ဖြင့် မူရင်းသတင်းအချက်အလက်ကို ပြန်လည်ရယူထားပါသည်
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                Bot Protection Bypassed
              </span>
            </div>
            <p className="text-[11px] text-slate-650 leading-relaxed">
              {scrapeNotice || "မူရင်းသတင်းဝဘ်ဆိုဒ်တွင် ပိတ်ဆို့မှု (401 Unauthorized / Bot Protection) ကြုံတွေ့ရသဖြင့် Gemini Google Search Grounding နည်းပညာဖြင့် သတင်းအချက်အလက်အပြည့်အစုံကို ချောမွေ့စွာ ရှာဖွေရယူပြီး သတင်းရေးသားပေးထားပါသည်။"}
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side Dynamic Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Article content block */}
        <div className="lg:col-span-8 space-y-6">
          {activeLayout === 'newspaper' ? (
            <div className="bg-[#FAF8F5] text-slate-900 border border-amber-200/60 shadow-md rounded-2xl p-6 sm:p-8 font-serif select-text">
              {/* Retro Editorial Header banner */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
                <p className="text-[10px] tracking-widest font-sans font-bold text-slate-500 uppercase">MIZZIMA DAILY NEWS • AI HUB</p>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 font-serif my-1">မဇ္ဈိမမြန်မာသတင်းစာ</div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans px-2 mt-2 border-t border-slate-200 pt-1.5">
                  <span>နေ့စဉ်သတင်း</span>
                  <span>ရန်ကုန်၊ မြန်မာ။</span>
                </div>
              </div>

              {/* Title Header */}
              {singleSeoData?.optimizedTitle ? (
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-snug tracking-tight mb-5 border-b border-dashed border-slate-300 pb-4">
                  {singleSeoData.optimizedTitle}
                </h3>
              ) : null}

              {/* Pure paragraphs rendered professionally */}
              <div className="space-y-4">
                {paragraphs.map((p, idx) => {
                  const cleaned = cleanParagraphText(p);
                  if (idx === 0) {
                    return (
                      <p key={idx} className="text-lg font-medium text-slate-900 leading-relaxed bg-blue-50 border-l-4 border-blue-600 pl-4 py-2 rounded-r">
                        {cleaned}
                      </p>
                    );
                  }
                  return (
                    <p key={idx} className="text-base text-slate-800 leading-relaxed text-justify">
                      {cleaned}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : activeLayout === 'split' ? (
            <div className="bg-[#FAF8F5] text-slate-900 border border-amber-200/60 shadow-md rounded-2xl p-5 sm:p-6 font-serif">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-4 gap-3 border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-indigo-600" />
                    မိုဘိုင်းဖတ်ရှုမှုစနစ် (Quick Split Reader)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ဆောင်းပါးရှည်ကြီးများကို စာပိုဒ်အစိပ်များခွဲ၍ မိုဘိုင်းဖုန်းပေါ်တွင် ဖတ်ရလွယ်ကူစေရန် ပြုလုပ်ပေးသောစနစ်</p>
                </div>
                
                {/* Chunking controllers / Options */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600">စာပိုဒ်ခွဲအရွယ်အစား:</span>
                    <select
                      value={paragraphsPerChunk}
                      onChange={(e) => {
                        setParagraphsPerChunk(Number(e.target.value));
                        setCurrentChunkIndex(0);
                      }}
                      className="bg-white border border-slate-250 text-xs font-serif font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800"
                    >
                      <option value={1}>၁ ပိုဒ်စီ (1 paragraph)</option>
                      <option value={2}>၂ ပိုဒ်စီ (2 paragraphs)</option>
                      <option value={3}>၃ ပိုဒ်စီ (3 paragraphs)</option>
                      <option value={4}>၄ ပိုဒ်စီ (4 paragraphs)</option>
                      <option value={5}>၅ ပိုဒ်စီ (5 paragraphs)</option>
                    </select>
                  </div>

                  {/* Split Display Strategy Mode Toggle */}
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setSplitViewType('pages')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        splitViewType === 'pages'
                          ? 'bg-zinc-950 text-white shadow'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      တစ်မျက်နှာစီ (Pages)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitViewType('stack')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        splitViewType === 'stack'
                          ? 'bg-zinc-950 text-white shadow'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      စာရင်းလိုက် (List)
                    </button>
                  </div>
                </div>
              </div>

              {/* Splitting engine rendering */}
              {paragraphs.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  ခွဲခြမ်းစရာ သတင်းအကြောင်းအရာ မရှိသေးပါ။
                </div>
              ) : splitViewType === 'pages' ? (
                // Paginated Reader View
                <div className="space-y-5">
                  {/* Reading Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold">
                      <span>READING PROGRESS</span>
                      <span>အပိုင်း {currentChunkIndex + 1} / {chunkedParagraphs.length} ({Math.round(((currentChunkIndex + 1) / chunkedParagraphs.length) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${((currentChunkIndex + 1) / chunkedParagraphs.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Selected Chunk Content Area */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 min-h-[220px] flex flex-col justify-between shadow-xs relative">
                    <div className="absolute right-3 top-3 text-[10px] font-bold font-mono text-zinc-400 select-none bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      PART {currentChunkIndex + 1}
                    </div>

                    <div className="space-y-4 pt-2">
                      {/* Active Title inside the page if index is 0 */}
                      {currentChunkIndex === 0 && singleSeoData?.optimizedTitle && (
                        <h4 className="text-lg font-black text-slate-950 leading-snug pb-3 mb-2 border-b border-dashed border-slate-200">
                          {singleSeoData.optimizedTitle}
                        </h4>
                      )}

                      {/* Paragraph texts */}
                      {chunkedParagraphs[currentChunkIndex]?.map((paraText, pIdx) => {
                        const cleaned = cleanParagraphText(paraText);
                        const isMainLead = currentChunkIndex === 0 && pIdx === 0;
                        return (
                          <p 
                            key={pIdx} 
                            className={`leading-relaxed text-slate-850 text-justify text-base ${
                              isMainLead 
                                ? 'text-lg font-semibold bg-blue-50/70 border-l-4 border-blue-600 pl-4 py-2.5 rounded-r' 
                                : ''
                            }`}
                          >
                            {cleaned}
                          </p>
                        );
                      })}
                    </div>

                    {/* Word counts info */}
                    <div className="text-[10px] font-sans font-medium text-slate-400 mt-6 border-t border-slate-100 pt-3 flex justify-between">
                      <span>💡 မိုဘိုင်းအတွက် အဆင်ပြေဆုံးဖတ်ရှုမှုအရွယ်အစား</span>
                      <span>ဤအပိုင်းတိုအတွင်း စာလုံးရေ: {(chunkedParagraphs[currentChunkIndex]?.join(' ') || '').length} လုံး</span>
                    </div>
                  </div>

                  {/* Navigation controls - large targets for mobile at least 44px height */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <button
                      type="button"
                      disabled={currentChunkIndex === 0}
                      onClick={() => setCurrentChunkIndex(prev => Math.max(0, prev - 1))}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-250 bg-white font-bold text-xs hover:bg-slate-50 active:bg-stone-100 transition-colors disabled:opacity-40 disabled:hover:bg-white text-slate-700 cursor-pointer select-none"
                    >
                      ◀ ရှေ့သို့ (Prev)
                    </button>
                    
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap px-2">
                      {currentChunkIndex + 1} / {chunkedParagraphs.length}
                    </span>

                    <button
                      type="button"
                      disabled={currentChunkIndex === chunkedParagraphs.length - 1}
                      onClick={() => setCurrentChunkIndex(prev => Math.min(chunkedParagraphs.length - 1, prev + 1))}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-550 border border-transparent font-bold text-white text-xs hover:shadow-xs active:scale-[0.99] transition-all disabled:opacity-40 disabled:hover:bg-blue-600 disabled:active:scale-100 cursor-pointer select-none"
                    >
                      နောက်သို့ (Next) ▶
                    </button>
                  </div>
                </div>
              ) : (
                // Stack Timeline View
                <div className="space-y-4">
                  {chunkedParagraphs.map((chunk, cIdx) => (
                    <div key={cIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-500">SECTION {cIdx + 1}</span>
                        <span className="text-[10px] font-serif font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                          {(chunk.join(' ').length)} Characters
                        </span>
                      </div>
                      <div className="p-4 sm:p-5 space-y-3">
                        {chunk.map((paraText, pIdx) => {
                          const cleaned = cleanParagraphText(paraText);
                          const isMainLead = cIdx === 0 && pIdx === 0;
                          return (
                            <p 
                              key={pIdx} 
                              className={`leading-relaxed text-slate-805 text-justify text-base ${
                                isMainLead 
                                  ? 'text-lg font-semibold bg-blue-50/75 border-l-4 border-blue-600 pl-4 py-2 rounded-r' 
                                  : ''
                              }`}
                            >
                              {cleaned}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Card-Based Bento Segmentation View
            <div className="space-y-4">
              {paragraphs.map((p, idx) => {
                const cleaned = cleanParagraphText(p);
                const header = getSectionHeader(p, idx, paragraphs.length);
                
                let cardTheme = 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-md';
                let accentBar = 'bg-slate-400';
                let tagStyle = 'text-slate-600 bg-slate-100';

                if (idx === 0) {
                  cardTheme = 'bg-blue-50/50 border-blue-200/80 hover:border-blue-300 hover:shadow-md';
                  accentBar = 'bg-blue-500';
                  tagStyle = 'text-blue-700 bg-blue-105/80';
                } else if (idx === paragraphs.length - 1 && paragraphs.length > 1) {
                  cardTheme = 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300 hover:shadow-md';
                  accentBar = 'bg-emerald-500';
                  tagStyle = 'text-emerald-700 bg-emerald-105/80';
                } else {
                  cardTheme = 'bg-stone-50/40 border-slate-200 hover:border-indigo-200 hover:shadow-md';
                  accentBar = 'bg-indigo-500';
                  tagStyle = 'text-indigo-700 bg-indigo-105/80';
                }

                return (
                  <div 
                    key={idx} 
                    className={`border rounded-xl md:rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${cardTheme}`}
                  >
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-inherit bg-slate-50/70">
                      <div className={`w-1.5 h-6 rounded-full ${accentBar}`} />
                      <h4 className="font-serif text-sm font-bold text-slate-850">
                        {header}
                      </h4>
                      <span className={`ml-auto text-[10px] uppercase font-sans font-semibold tracking-wider px-2.5 py-0.5 rounded-full ${tagStyle}`}>
                        PART {idx + 1}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6">
                      <p className="font-serif text-slate-905 leading-relaxed text-base whitespace-pre-wrap">
                        {cleaned}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscript / Additional details generated implicitly */}
          {additionalInfo && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-serif whitespace-pre-wrap flex gap-3">
              <span className="text-slate-500">ℹ️</span>
              <div className="space-y-1">
                {additionalInfo.split('\n').map((line, index) => (
                  <p key={index} className="mb-0.5">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Hand: Interactive Meta and SEO Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Metrics Dashboard */}
          {category && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-serif font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  {UI_STRINGS_MY.CATEGORIZATION_LABEL}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold font-serif px-3 py-1 rounded-full border border-indigo-100">
                  {category}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-serif text-slate-650">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">အက္ခရာစုစုပေါင်း</span>
                  <span className="font-sans font-semibold text-slate-800">{mainScriptContent.length} လုံး</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">သတင်းပုံစံ</span>
                  <span className="font-sans font-semibold text-slate-800">Unicode</span>
                </div>
              </div>
            </div>
          )}

          {/* SEO Optimizations Meta Card */}
          {singleSeoData && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                <h3 className="font-serif text-sm font-bold text-slate-800">SEO Optimizations</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-serif font-bold text-slate-500 uppercase tracking-wider">
                    {UI_STRINGS_MY.SEO_TITLE_LABEL}
                  </span>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-slate-350 transition-colors">
                    <p className="text-xs text-slate-800 font-serif font-medium leading-normal">{singleSeoData.optimizedTitle}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-serif font-bold text-slate-500 uppercase tracking-wider">
                    {UI_STRINGS_MY.SEO_META_DESCRIPTION_LABEL}
                  </span>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-slate-350 transition-colors">
                    <p className="text-[11px] text-slate-700 font-serif leading-relaxed italic">"{singleSeoData.metaDescription}"</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-serif font-bold text-slate-500 uppercase tracking-wider">
                    {UI_STRINGS_MY.SEO_HASHTAGS_LABEL}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {singleSeoData.hashtags.map((tag, i) => (
                      <span 
                        key={i} 
                        className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors font-medium cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(`#${tag.replace(/^#/, '')}`);
                        }}
                        title="ကူးယူရန်"
                      >
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Grounding Links collection */}
          {sources && sources.length > 0 && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <Bookmark className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="font-serif text-sm font-bold text-slate-800">{UI_STRINGS_MY.SOURCES_HEADING}</h3>
              </div>

              <ul className="space-y-3 font-serif text-xs">
                {sources.map((source, index) =>
                  source.web && source.web.uri ? (
                    <li key={index} className="flex items-start gap-2.5">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <a
                        href={source.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline break-all font-medium transition-colors"
                        title={source.web.title || source.web.uri}
                      >
                        {source.web.title || source.web.uri}
                      </a>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Extracted Stats & Charts Block */}
      {((statistics && statistics.length > 0) || (chartData && chartData.length > 0)) && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 space-y-6 mt-6 animate-fade-in">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900 leading-tight">
                ဆန်းစစ်ချက် ကိန်းဂဏန်းများနှင့် ဇယားများ (Statistical Analysis & Diagrams)
              </h3>
              <p className="text-[11px] text-slate-500 font-serif mt-0.5">အစီရင်ခံစာပါ အချက်အလက်များမှ ကောက်နုတ်ထားသည့် ကိန်းဂဏန်းများပြဇယား</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* List of Key stats */}
            {statistics && statistics.length > 0 && (
              <div className="lg:col-span-5 space-y-4">
                <h4 className="font-serif text-xs font-bold text-slate-700 tracking-wider uppercase">
                  📈 ကောက်နုတ်ချက် ကိန်းဂဏန်းများ (Key Metrics)
                </h4>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {statistics.map((stat, i) => (
                    <div key={i} className="p-3.5 bg-[#FAF8F5] border border-amber-200/50 rounded-xl hover:border-amber-350 hover:shadow-xs transition-all space-y-1">
                      <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-205 pb-1.5">
                        <span className="font-serif text-xs font-bold text-slate-800 leading-normal">{stat.metric}</span>
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-105 shrink-0 select-all">{stat.value}</span>
                      </div>
                      <p className="font-serif text-[11px] text-slate-600 leading-relaxed pt-1 select-text">{stat.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recharts Graphical Chart */}
            {chartData && chartData.length > 0 && (
              <div className={`${statistics && statistics.length > 0 ? "lg:col-span-7" : "lg:col-span-12"} space-y-4`}>
                <h4 className="font-serif text-xs font-bold text-slate-705 tracking-wider uppercase">
                  📊 အချက်အလက်ပြဇယား: {chartTitle || "အစီရင်ခံစာ ကိန်းဂဏန်းများ (Visual Chart)"}
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <div className="w-full h-72 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'serif' }} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'serif' }} />
                          <Line type="monotone" dataKey="value" name="Value" stroke="#2563eb" strokeWidth={2.5} activeDot={{ r: 7 }} />
                        </LineChart>
                      ) : chartType === 'pie' ? (
                        <PieChart>
                          <Pie 
                            data={chartData} 
                            cx="50%" 
                            cy="50%" 
                            labelLine={true}
                            label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={95} 
                            fill="#3b82f6" 
                            dataKey="value"
                            nameKey="label"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'serif' }} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'serif' }} />
                        </PieChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'serif' }} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'serif' }} />
                          <Bar dataKey="value" name="Value" fill="#2563eb" radius={[5, 5, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Core Feedback and Words Correction System Panel */}
      <div className="border-t border-slate-100 pt-6 mt-6 bg-slate-50/50 -mx-6 px-6 pb-2 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-serif text-[13px] font-bold text-slate-850 flex items-center gap-1.5 uppercase">
              <span>သတင်းရေးသားမှု အရည်အသွေး ဆန်းစစ်ချက် (News Generation Sentiment & Optimization)</span>
            </h4>
            <p className="text-[11px] text-slate-550 font-serif mt-0.5">
              ဤဆောင်းပါးသည် သတင်းခန်းစံနှုန်းများနှင့် ကိုက်ညီမှုရှိပါသလား? သင်၏အကြံပြုချက်ကို သိမ်းဆည်းနိုင်ပါသည်။
            </p>
          </div>

          {feedbackSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs px-4 py-2 rounded-xl font-serif font-semibold animate-fade-in flex items-center gap-1.5 self-start sm:self-center">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>သတင်းပြင်ဆင်မှု တုံ့ပြန်ချက်ကို သိမ်းဆည်းပြီးပါပြီ။ သင်၏ ပြင်ဆင်ချက်စာရင်းကို နောက်တစ်ကြိမ်တွင် အလိုအလျောက် သုံးပါမည်။</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSendQuickFeedback('good')}
                disabled={isSubmittingFeedback}
                className={`px-3 py-2 border rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer hover:bg-white active:bg-slate-100 transition-all ${
                  rating === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' : 'bg-transparent text-slate-700 border-slate-250 hover:border-slate-400'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>ပုံစံကောင်းမွန်သည် (Good)</span>
              </button>
              <button
                onClick={() => {
                  setRating('bad');
                  setFeedbackSubmitted(false);
                }}
                disabled={isSubmittingFeedback}
                className={`px-3 py-2 border rounded-lg text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer hover:bg-white active:bg-slate-100 transition-all ${
                  rating === 'bad' ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm' : 'bg-transparent text-slate-700 border-slate-250 hover:border-slate-400'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>ပြင်ဆင်စရာရှိသည် (Needs Work)</span>
              </button>
            </div>
          )}
        </div>

        {/* Error notice if feedback fails */}
        {feedbackError && (
          <p className="text-xs text-red-650 font-serif font-semibold mt-2">⚠️ {feedbackError}</p>
        )}

        {/* Expanded Correction & Optimization Form for Bad Rating */}
        {rating === 'bad' && !feedbackSubmitted && (
          <div className="border border-rose-250 bg-white shadow-xs rounded-xl p-4 mt-4 space-y-4 animate-slide-down">
            <div className="border-b border-slate-100 pb-2.5">
              <span className="text-rose-700 font-serif font-extrabold text-xs block">
                ❌ စကားလုံးအမှားပြင်ဆင်၍ မှတ်ဉာဏ်ထဲထည့်သွင်းခြင်း (Correction Rules Memory Sync)
              </span>
              <p className="text-[10px] text-slate-500 font-serif mt-0.5">
                မှားယွင်းသည့် ဝေါဟာရများ၊ ပုဂ္ဂိုလ်အမည်များ သို့မဟုတ် ဘာသာပြန်အမှားများကို ဤနေရာတွင် ပြင်ဆင်ပေးပါ။ ၎င်းတို့ကို သင်၏ကိုယ်ပိုင် စကားလုံးပြင်ဆင်မှု မှတ်ဉာဏ်ထဲတွင် အလိုအလျောက် သိမ်းဆည်းပေးမည် ဖြစ်ပြီး နောက်တစ်ကြိမ် generating သုံးသည့်အခါ မော်ဒယ်က ထိုအမှားကို ထပ်မံအတုမယူစေရန် တိုက်ရိုက် တားဆီးပေးမည်ဖြစ်ပါသည်။
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase tracking-wider">
                  စကားလုံးအမှား (ရှိပါက) (e.g. "နိုင်းဂျီးရီးယား")
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs p-2 text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="မှားသုံးထားသော သုံးနှုန်းမှု သို့မဟုတ် အမည်..."
                  value={wrongWord}
                  onChange={(e) => setWrongWord(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase tracking-wider">
                  ပြင်ဆင်မည့်စကားလုံးအမှန် (e.g. "နိုင်ဂျီးရီးယား")
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs p-2 text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="အစားထိုးသုံးရမည့် စကားလုံးအမှန်..."
                  value={correctedWord}
                  onChange={(e) => setCorrectedWord(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase tracking-wider">
                မှတ်ချက် သို့မဟုတ် ပြင်ဆင်ရန် အကြံပြုချက် (Comment / Review Details)
              </label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 border border-slate-250 rounded-lg text-xs p-2 text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                placeholder="နောက်တစ်ကြိမ် generate လုပ်ရာတွင် ပိုမိုကောင်းမွန်စေရန် ယေဘုယျအကြံပြုချက်..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                   setRating(null);
                   setWrongWord('');
                   setCorrectedWord('');
                   setComment('');
                }}
                className="px-3.5 py-1.5 text-xs text-slate-550 border border-slate-250 rounded-lg hover:bg-slate-50 active:bg-slate-100 font-serif font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDetailedFeedback}
                disabled={isSubmittingFeedback}
                className="px-4 py-1.5 text-xs text-white bg-zinc-950 hover:bg-zinc-900 border border-transparent rounded-lg font-serif font-bold flex items-center gap-1.5 cursor-pointer select-none"
              >
                {isSubmittingFeedback ? 'သိမ်းဆည်းနေဆဲ...' : 'တုံ့ပြန်မှုနှင့်စကားလုံးအမှန် သိမ်းဆည်းရန်'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ScriptDisplay;
