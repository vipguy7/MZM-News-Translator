import React, { useState, useEffect } from 'react';
import { UI_STRINGS_MY } from '../constants';

export type LoadingMode = 'auth' | 'generate' | 'keywords' | 'proofread';

interface QueueStatus {
  isBusy: boolean;
  activeUser: string | null;
  queueLength: number;
  position: number;
  selfIsActive: boolean;
}

interface LoadingSpinnerProps {
  mode?: LoadingMode;
  queueStatus?: QueueStatus | null;
}

interface LoadingStage {
  minSeconds: number;
  text: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ mode = 'generate', queueStatus = null }) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [progress, setProgress] = useState<number>(5);

  // Define stage wordings based on loading mode
  const stages: Record<LoadingMode, LoadingStage[]> = {
    auth: [
      { minSeconds: 0, text: 'လုံခြုံရေးစနစ် စစ်ဆေးနေသည်...' },
      { minSeconds: 3, text: 'အသုံးပြုသူ ပရိုဖိုင်ကို ရယူနေပါသည်...' },
      { minSeconds: 6, text: 'သတင်းလုပ်ငန်းစဉ်များ စတင်ပြင်ဆင်နေ...' }
    ],
    generate: [
      { minSeconds: 0, text: 'တင်သွင်းထားသော အချက်အလက်များကို အသေးစိတ် ဆန်းစစ်နေ...' },
      { minSeconds: 3.5, text: 'သတင်းခေါင်းစဉ်နှင့် သတင်းရေးမည့်ပုံစံကို စတင်ပြင်ဆင်...' },
      { minSeconds: 7.5, text: 'သတ်မှတ်ထားသော သတင်းအရေးအသားပုံစံဖြင့် စာပိုဒ်များရေးသားနေ...' },
      { minSeconds: 12, text: 'သတင်းအချက်အလက် တိကျမှန်ကန်မှုနှင့် စာလုံးပေါင်းသတ်ပုံများကို ပြန်လည်စိစစ်နေ...' }
    ],
    keywords: [
      { minSeconds: 0, text: 'ရေးသားပြီးသော သတင်းစာမူတစ်ခုလုံးကိုပြန်လည်စစ်ဆေးနေ...' },
      { minSeconds: 3, text: 'အဓိကကျသော အရေးကြီးစကားလုံးများနှင့် အကြောင်းအရာများကို ကောက်နုတ်တင်ပြရန် ပြင်ဆင်နေ...' },
      { minSeconds: 6, text: 'SEO Tagsနှင့် hashtags များရွေးထုတ်နေ...'}
    ],
    proofread: [
      { minSeconds: 0, text: 'မြန်မာစာလုံးပေါင်းသတ်ပုံ စံညွှန်းစနစ်ကို အသုံးပြုပြီး တစ်လုံးချင်း ဖတ်ရှုစစ်ဆေးနေပါသည်...' },
      { minSeconds: 4, text: 'မြန်မာဝါကျအဆင်အပြင်၊ ဝေါဟာရနှင့် သဒ္ဒါကျောရိုး အမှားများကို နှိုင်းယှဉ်စိစစ်နေပါသည်...' },
      { minSeconds: 8, text: 'မူရင်းစာမူနှင့် ပြင်ဆင်ပြီးစာမူအကြား နှိုင်းယှဉ်ချက် (Diff Visualization) ကို ပြင်ဆင်နေပါသည်...' }
    ]
  };

  const currentStages = stages[mode] || stages['generate'];

  // Determine current active stage index and text
  const activeIndex = currentStages.reduce((acc, stage, idx) => {
    if (seconds >= stage.minSeconds) {
      return idx;
    }
    return acc;
  }, 0);

  useEffect(() => {
    // Timer to track elapsed seconds
    const timer = setInterval(() => {
      setSeconds(prev => prev + 0.5);
    }, 500);

    // Dynamic progress bar simulation hook (reaches up to 98% smoothly)
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 98;
        
        // Define max progress bounds depending on current elapsed time to make the progress feel native
        let limit = 98;
        if (seconds < 3) limit = 35;
        else if (seconds < 7) limit = 65;
        else if (seconds < 11) limit = 88;

        if (prev < limit) {
          const increment = Math.floor(Math.random() * 3) + 1; // 1% to 3%
          return Math.min(prev + increment, limit);
        }
        return prev;
      });
    }, 400);

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, [seconds]);

  const isWaitingInQueue = queueStatus && queueStatus.position > 0 && !queueStatus.selfIsActive;
  const currentStageText = isWaitingInQueue 
    ? `⚠️ အခြား ဆရာ/မ တစ်ဦး (${queueStatus.activeUser || 'စာတည်းသူ'}) သည် လက်ရှိအချိန်၌ စနစ်တွင် သတင်းရေးသားနေပါသည်။ ထို့ကြောင့် သင်၏တောင်းဆိုမှုကို စောင့်ဆိုင်းတန်း၌ တန်းစီထားရှိပါသည် (Waiting in queue...)`
    : currentStages[activeIndex].text;

  return (
    <div className="flex flex-col justify-center items-center my-12 p-6 sm:p-8 bg-sky-50/40 border border-sky-100 rounded-2xl max-w-xl mx-auto space-y-6 shadow-sm animate-fade-in" aria-label={UI_STRINGS_MY.LOADING} role="status">
      
      {/* Subtle, Slower 3-Dot Fluid Wave Animation */}
      <div className="flex space-x-3 items-center justify-center h-8">
        <div className="w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full shadow-md shadow-amber-200/50 animate-fluid-bounce-1"></div>
        <div className="w-3.5 h-3.5 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-full shadow-md shadow-indigo-200/50 animate-fluid-bounce-2"></div>
        <div className="w-3.5 h-3.5 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-full shadow-md shadow-blue-200/50 animate-fluid-bounce-3"></div>
      </div>

      {/* Progress indicators */}
      <div className="w-full space-y-4">
        {/* Stage text and percent label */}
        <div className="flex justify-between items-end gap-3 px-1">
          <p className="text-xs sm:text-sm text-slate-800 font-serif font-semibold text-left flex-1 min-h-[30px] flex items-center leading-relaxed">
            {currentStageText}
          </p>
          {!isWaitingInQueue && (
            <span className="text-xs sm:text-sm font-mono font-bold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
              {progress}%
            </span>
          )}
        </div>

        {isWaitingInQueue ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4 font-serif">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-800 font-bold">🎯 စောင့်ဆိုင်းတန်း တန်းစီနံပါတ် (Queue Position):</span>
              <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded-md text-[13px] font-mono animate-bounce">
                #{queueStatus.position} / {queueStatus.queueLength}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-800">⏳ ခန့်မှန်းစောင့်ဆိုင်းချိန် (Est. Wait Time):</span>
              <span className="font-bold text-amber-900 font-mono">
                ~ {queueStatus.position * 15} စက္ကန့် (Seconds)
              </span>
            </div>
            
            {/* Elegant Queue Pipeline CSS Animation Panel */}
            <div className="relative py-2 px-1 flex flex-col items-center justify-center space-y-1.5 border-t border-amber-100/60 pt-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700/80 font-bold">Queue Processing Pipeline</span>
              <div className="relative w-full h-8 bg-amber-500/5 rounded-lg border border-amber-200/50 overflow-hidden flex items-center px-3 justify-between">
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-amber-50 to-transparent z-10" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-amber-50 to-transparent z-10" />
                
                {/* Active Server Node (Gateway) on Left */}
                <div className="flex items-center space-x-1.5 z-20">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[9.5px] font-bold text-emerald-800 select-none">AI GATEWAY</span>
                </div>

                {/* Queue flow of sliding tasks from right to left */}
                <div className="flex-1 flex justify-end items-center space-x-6 pr-1 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-queue-flow" />
                  <div className="w-2 h-2 rounded-full bg-amber-600 animate-queue-flow [animation-delay:0.5s]" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-queue-flow [animation-delay:1s]" />
                  <span className="text-[9px] font-mono font-bold text-amber-600/70 animate-pulse select-none">WAITING_LINE</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden shadow-inner border border-amber-250">
              <div 
                className="bg-amber-500 h-full rounded-full animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        ) : (
          /* Custom Progress Bar container */
          <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden shadow-inner border border-slate-200">
            <div 
              className="bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Detailed visual checklist showing complete, active, and pending stages */}
        <div className="pt-4 border-t border-sky-100 space-y-2.5 text-left font-serif text-xs px-1">
          {isWaitingInQueue ? (
            <>
              <div className="flex items-start space-x-3 text-emerald-600 font-medium">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-emerald-300 bg-emerald-50 text-[10px] mt-0.5 font-bold">✓</div>
                <span>စာမူဆာဗာနှင့် ဆက်သွယ်ရရှိမှု အောင်မြင်ပါသည်။ (Connected to script server)</span>
              </div>
              <div className="flex items-start space-x-3 text-emerald-600 font-medium">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-emerald-300 bg-emerald-50 text-[10px] mt-0.5 font-bold">✓</div>
                <span>လုပ်ငန်းစဉ်အား စောင့်ဆိုင်းတန်း၌ နေရာယူပြီးပါပြီ။ (Position registered in queue)</span>
              </div>
              <div className="flex items-start space-x-3 text-amber-600 font-semibold animate-pulse-slow">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-amber-300 bg-amber-50 text-[10px] mt-0.5 font-bold">●</div>
                <span>အခြားစာရေးသားမှု ပြီးဆုံးသည်အထိ စာမူဆာဗာမှ စောင့်ဆိုင်းနေပါသည်... (Waiting for active lock release)</span>
              </div>
            </>
          ) : (
            currentStages.map((stage, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              return (
                <div 
                  key={idx} 
                  className={`flex items-start space-x-3 transition-colors duration-500 ${
                    isCompleted ? 'text-emerald-600' : isActive ? 'text-blue-600 font-semibold animate-pulse-slow' : 'text-slate-400'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border text-[10px] mt-0.5 ${
                    isCompleted 
                      ? 'bg-emerald-50 border-emerald-300 font-bold' 
                      : isActive 
                        ? 'bg-blue-50 border-blue-300 font-bold' 
                        : 'bg-slate-50 border-slate-200'
                  }`}>
                    {isCompleted ? '✓' : isActive ? '●' : '○'}
                  </div>
                  <span className="leading-tight">{stage.text}</span>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10.5px] text-slate-400 italic text-center font-serif pt-1 select-none">
          💡 အပြည့်အစုံဆောင်ရွက်ပြီးစီးသည်အထိ ခေတ္တခဏ စောင့်ဆိုင်းပေးပါ...
        </p>
      </div>

      {/* Embedded Fluid Wave Animation styles */}
      <style>
        {`
          @keyframes fluid-bounce {
            0%, 100% {
              transform: translateY(0) scale(0.9);
              opacity: 0.5;
              filter: blur(0.1px);
            }
            50% {
              transform: translateY(-5px) scale(1.05);
              opacity: 1;
              filter: blur(0);
            }
          }
          .animate-fluid-bounce-1 {
            animation: fluid-bounce 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1) 0s;
          }
          .animate-fluid-bounce-2 {
            animation: fluid-bounce 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1) 0.35s;
          }
          .animate-fluid-bounce-3 {
            animation: fluid-bounce 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1) 0.7s;
          }
          @keyframes queue-flow {
            0% {
              transform: translateX(120px) scale(0.7);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            85% {
              opacity: 0.8;
            }
            100% {
              transform: translateX(-40px) scale(0.9);
              opacity: 0;
            }
          }
          .animate-queue-flow {
            animation: queue-flow 2.5s infinite linear;
          }
        `}
      </style>
    </div>
  );
};

export default LoadingSpinner;
