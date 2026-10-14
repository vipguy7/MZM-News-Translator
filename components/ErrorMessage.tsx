import React from 'react';

interface ErrorMessageProps {
  message: string | null;
  onOpenSettings?: () => void;
  onSwitchToPasteMode?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onOpenSettings, onSwitchToPasteMode }) => {
  if (!message) return null;

  const messageLower = message.toLowerCase();
  const isQuotaError = 
    messageLower.includes('quota') ||
    messageLower.includes('limit') ||
    messageLower.includes('429') ||
    messageLower.includes('exhausted') ||
    messageLower.includes('rate_limit') ||
    messageLower.includes('resource_exhausted');

  const is503Error = 
    messageLower.includes('503') ||
    messageLower.includes('high demand') ||
    messageLower.includes('unavailable') ||
    messageLower.includes('temporary') ||
    messageLower.includes('service_unavailable');

  const isScrapeError = 
    messageLower.includes('scraping') ||
    messageLower.includes('puppeteer') ||
    messageLower.includes('401') ||
    messageLower.includes('protected') ||
    messageLower.includes('bot protection') ||
    messageLower.includes('copy-paste') ||
    messageLower.includes('ကူးထည့်');

  let errorTitle = "လုပ်ဆောင်ချက် အမှားအယွင်းရှိပါသည်";
  if (isScrapeError) {
    errorTitle = "သတင်းဝဘ်လင့်ခ် ရယူခြင်း အခက်အခဲ (Protected URL / Scrape Issue)";
  } else if (isQuotaError) {
    errorTitle = "လက်ရှိအခမဲ့အကြိမ်ရေ (သို့) API Quota ကန့်သတ်ချက် ပြည့်သွားပါသည်";
  } else if (is503Error) {
    errorTitle = "မော်ဒယ်သည် လက်ရှိအချိန်တွင် တောင်းဆိုမှု အလွန်များပြားနေပါသည် (Model Unavailable)";
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-slate-800 p-5 my-5 rounded-2xl shadow-sm border border-red-200 animate-fade-in" role="alert">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
        <div className="space-y-1.5 flex-1">
          <p className="font-bold font-serif text-red-800 text-sm">
            {errorTitle}
          </p>
          <p className="font-serif text-xs text-slate-650 leading-relaxed break-words max-h-40 overflow-y-auto pr-1 select-text">
            {message}
          </p>

          {isScrapeError && onSwitchToPasteMode && (
            <div className="mt-3.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 font-serif text-xs text-blue-900 leading-relaxed">
              <p>
                <strong>💡 လွယ်ကူမြန်ဆန်သော နည်းလမ်း:</strong> ဝဘ်ဆိုဒ်တွင် Anti-bot/Paywall ရှိနေပါက စာသားများကို ကူးယူပြီး 'တိုက်ရိုက်ကူးထည့်ခြင်း' စနစ်ဖြင့် ချက်ချင်း ဆက်လက်ရေးသားနိုင်ပါသည်။
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onSwitchToPasteMode}
                  className="cursor-pointer inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-transform active:scale-95"
                >
                  📋 စာသားတိုက်ရိုက်ကူးထည့်ရန် သွားမည် (Paste Text Mode)
                </button>
              </div>
            </div>
          )}

          {isQuotaError && (
            <div className="mt-3.5 p-3.5 bg-orange-50 border border-orange-200 rounded-xl space-y-2.5 font-serif text-xs text-amber-900 leading-relaxed">
              <p>
                <strong>💡 ဖြေရှင်းရန် နည်းလမ်းများ (Instructions to solve):</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>၁ မိနစ်ခန့်စောင့်ဆိုင်းပါ-</strong> Standard အခမဲ့ API Limit သည် တစ်မိနစ်လျှင် ပြန်လည်သက်တမ်းတိုးပေးသည့်အတွက် ခေတ္တစောင့်ပြီး ထပ်မံလုပ်ဆောင်နိုင်ပါသည်။ (Wait 1 minute for the free-tier API quota window to reset, then try running it again).
                </li>
                <li>
                  <strong>ကိုယ်ပိုင် API Key ထည့်သွင်းအသုံးပြုပါ-</strong> အကန့်အသတ်မရှိ မြန်ဆန်စွာ အသုံးပြုနိုင်ရန်အတွက် သင်၏ကိုယ်ပိုင် <strong>Google AI Studio API Key</strong> ကို Settings တွင် အလွယ်တကူ ထည့်သွင်းနိုင်ပါသည်။
                </li>
              </ul>
              {onOpenSettings && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="cursor-pointer inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-transform active:scale-95"
                  >
                    ⚙️ ကိုယ်ပိုင် API Key သတ်မှတ်ရန် Settings သို့သွားမည်
                  </button>
                </div>
              )}
            </div>
          )}

          {is503Error && (
            <div className="mt-3.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5 font-serif text-xs text-blue-900 leading-relaxed">
              <p>
                <strong>💡 ဖြေရှင်းရန် လမ်းညွှန်ချက် (Instructions to solve):</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>၁၀-၂၀ စက္ကန့်ခန့်စောင့်ပြီး ပြန်လည်စမ်းသပ်ပါ-</strong> Gemini API တွင် ဝန်ပိမှု (Spikes in demand) သည် ယာယီသာဖြစ်ပြီး စက္ကန့်အနည်းငယ်အတွင်း အလိုအလျောက် ပြေလည်သွားတတ်ပါသည်။ (Spikes in demand are highly temporary, retrying in 10-20 seconds usually resolves it perfectly).
                </li>
                <li>
                  <strong>အကြောင်းအရာ ပြောင်းလဲစမ်းသပ်ပါ-</strong> ရေးသားလိုသော ကုန်ကြမ်းစာသား သို့မဟုတ် ဆောင်းပါး Settings (အရှည် / လေသံ) ကို အနည်းငယ် ပြုပြင်ပြီး ဆက်လက်စမ်းသပ်ပါ။
                </li>
                <li>
                  <strong>ကိုယ်ပိုင် API Key ထည့်သွင်းအသုံးပြုပါ-</strong> သီးသန့်မြန်နှုန်းမြင့် လိုင်းရရှိရန် သင်၏ကိုယ်ပိုင် <strong>Google AI Studio API Key</strong> အား Settings တွင် ထည့်သွင်းအသုံးပြုနိုင်ပါသည်။
                </li>
              </ul>
              {onOpenSettings && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="cursor-pointer inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-transform active:scale-95"
                  >
                    ⚙️ ကိုယ်ပိုင် API Key သတ်မှတ်ရန် Settings သို့သွားမည်
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
