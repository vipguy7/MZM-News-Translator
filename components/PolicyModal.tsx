import React, { useState } from 'react';

interface PolicyModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ 
  isOpen, 
  onAgree, 
  onClose,
  showCloseButton = false 
}) => {
  const [lang, setLang] = useState<'my' | 'en'>('my');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
        
        {/* Header section with Language Segment Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 p-5 gap-3 bg-slate-50">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
              🛡️ {lang === 'my' ? 'မဇ္ဈိမ သတင်းခန်း AI မူဝါဒ' : 'Mizzima Newsroom AI Policy'}
            </h3>
            <p className="text-xs text-slate-500 font-serif">
              {lang === 'my' 
                ? 'ဂျာနယ်လစ်ဇင်ကျင့်ဝတ်နှင့်အညီ တာဝန်ယူမှုရှိသော နည်းပညာအသုံးပြုမှုစံနှုန်း' 
                : 'Standards for Ethical and Responsible Use of AI in Journalism'}
            </p>
          </div>
          
          {/* Segment Toggle */}
          <div className="inline-flex self-start sm:self-auto bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 shadow-inner">
            <button
              onClick={() => setLang('my')}
              className={`px-3 py-1.5 text-xs font-serif font-semibold rounded-md transition-all cursor-pointer ${
                lang === 'my'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              မြန်မာဘာသာ
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 text-xs font-serif font-semibold rounded-md transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Content Section (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-700 font-serif max-h-[60vh] select-text">
          {lang === 'my' ? (
            <div className="space-y-6">
              {/* Introduction */}
              <p className="font-medium text-slate-800 text-base leading-relaxed">
                မဇ္ဈိမမီဒီယာသည် နည်းပညာကို ဂျာနယ်လစ်ဇင်လုပ်ငန်းများတွင် အစားထိုးရန်အတွက်မဟုတ်ဘဲ ပိုမိုကောင်းမွန်လာစေရန် အထောက်အကူပြုပစ္စည်းအဖြစ်သာ အသုံးပြုရန် ကတိပြုထားပါသည်။ ကျွန်ုပ်တို့၏ အဓိကရည်မှန်းချက်မှာ ဖြစ်ရပ်မှန်များကို တိကျမှန်ကန်စွာ၊ မျှမျှတတနှင့် ပွင့်လင်းမြင်သာမှုရှိစွာ တင်ပြရန် ဖြစ်ပါသည်။ AI နည်းပညာကို သတင်းထောက်များအား ကူညီရန်နှင့် လုပ်ငန်းစဉ်များ ပိုမိုမြန်ဆန်ချောမွေ့စေရန် စွမ်းအားထက်မြက်သော လက်ထောက်ကိရိယာအဖြစ် ရှုမြင်သော်လည်း၊ ၎င်းသည် လူသားတို့၏ ဆုံးဖြတ်ချက်၊ ကျင့်ဝတ်ဆိုင်ရာ စဉ်းစားဆင်ခြင်မှု သို့မဟုတ် ဂျာနယ်လစ်ဇင်၏ တာဝန်ယူမှုစံနှုန်းများအတွက် အစားထိုးစရာ ကိရိယာ မဟုတ်ပါ။
              </p>

              {/* SECTION 1 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  ၁။ လမ်းညွှန်အခြေခံမူများ (Guiding Principles)
                </h4>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">လူသားဦးဆောင်ပြီး တာဝန်ယူမှု (Human Accountability):</strong> သတင်းကျင့်ဝတ်အရ မိမိအမည် သို့မဟုတ် မီဒီယာတံဆိပ်အောက်တွင် ထုတ်ဝေလိုက်သည့် သတင်းအချက်အလက်တိုင်းအတွက် သက်ဆိုင်ရာသတင်းထောက်နှင့် အယ်ဒီတာအဖွဲ့တွင်သာ အပြည့်အဝ တာဝန်ရှိသည်။ မည်သည့် AI ကိရိယာမျိုးကိုမျှ အကြောင်းပြချက် ပေး၍မရပါ။
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">တိကျမှန်ကန်မှုနှင့် စိစစ်မှု (Accuracy & Verification):</strong> AI မှ ထုတ်လုပ်ပေးသော အကြောင်းအရာများ၊ ဆန်းစစ်ချက်များ သို့မဟုတ် သုတေသနများအားလုံးကို အတည်မပြုရသေးသော သတင်းရင်းမြစ်တစ်ခုကဲ့သို့သာ သတ်မှတ်ရမည်။ AI က ဖန်တီးပေးသည့် မည်သည့်အချက်အလက်ကိုမဆို လူသားသတင်းထောက်ကိုယ်တိုင် ပြန်လည်စိစစ်၍ အချက်အလက်မှန်ကန်ကြောင်း အတည်ပြုရမည်။
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">ပွင့်လင်းမြင်သာမှု (Transparency):</strong> ကျွန်ုပ်တို့၏ သတင်းဖန်တီးမှု ဖြစ်စဉ်တွင် AI အသုံးပြုထားပါက၊ အထူးသဖြင့် နောက်ဆုံးရလဒ်တွင် AI ၏ ပါဝင်ပတ်သက်မှုသည် အရေးကြီးသည့် ကဏ္ဍတွင်ရှိပါက စာဖတ်ပရိသတ်အား ပွင့်လင်းမြင်သာစွာ အသိပေးဖော်ပြရမည်။
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">ကျင့်ဝတ်နှင့်အညီ အသုံးပြုမှု (Ethical Use):</strong> သတင်းမှားများ၊ ကောလာဟလများ၊ အမုန်းစကားများ သို့မဟုတ် ပုံသေကားချပ် အမြင်များကို ဖြစ်ပေါ်စေမည့် မည်သည့်လုပ်ငန်းမျိုးတွင်မဆို AI ကို အသုံးပြုခြင်း လုံးဝပြုလုပ်မည်မဟုတ်ပါ။ AI မော်ဒယ်များ၏ အဂတိလိုက်စားမှု သို့မဟုတ် ဘက်လိုက်မှုကို သတိပြုကာ လျှော့ချရန် ကြိုးပမ်းမည်။
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">သတင်းရင်းမြစ် ကာကွယ်ရေးနှင့် လျှို့ဝှက်ချက်ထိန်းသိမ်းမှု (Source Protection):</strong> လုံခြုံရေးမရှိသော သို့မဟုတ် အများပြည်သူသုံး AI ကိရိယာများထဲသို့ လျှို့ဝှက်ချက်များ၊ ထိခိုက်လွယ်သောအကြောင်းအရာများ သို့မဟုတ် သတင်းရင်းမြစ်ဆိုင်ရာ အချက်အလက်များကို လုံးဝမထည့်သွင်းရပါ။ အချက်အလက်လုံခြုံရေးနှင့် မူပိုင်ခွင့်ကို အာမခံထားသည့် အတည်ပြုပြီးသား လုံခြုံသော AI စနစ်များကိုသာ အသုံးပြုရမည်။
                    </div>
                  </li>
                </ul>
              </div>

              {/* SECTION 2 */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  ၂။ ခွင့်ပြုထားသော နှင့် တားမြစ်ထားသော အသုံးပြုမှုများ (Approved & Prohibited Uses)
                </h4>
                
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-xl space-y-2.5">
                  <h5 className="font-bold text-emerald-800 text-xs sm:text-sm flex items-center gap-1.5">
                    ✅ ခွင့်ပြုထားသော လုပ်ငန်းများ (လူသားကြီးကြပ်မှုဖြင့်)
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-700 text-xs sm:text-sm">
                    <li><strong>အသံဖလှယ်စာသားဖတ်ခြင်း (Transcription):</strong> အင်တာဗျူး အသံဖိုင် သို့မဟုတ် ဗီဒီယိုဖိုင်များကို စာသားအဖြစ် ပြောင်းလဲခြင်း။ (လွဲမှားမှုမရှိစေရန် သတင်းထောက်ကိုယ်တိုင် စစ်ဆေးရမည်)</li>
                    <li><strong>သုတေသနနှင့် အချက်အလက်ဆန်းစစ်မှု (Research & Analysis):</strong> အချက်အလက်အမြောက်အမြားကို ဆန်းစစ်ရန်၊ ရှည်လျားသော စာရွက်စာတမ်းများကို အကျဉ်းချုပ်ရန်နှင့် လူသားတို့ ရှာဖွေရခက်ခဲသော အလားအလာများကို ဖော်ထုတ်ရန် အသုံးပြုခြင်း။</li>
                    <li><strong>သတင်းဌာနတွင်း အသုံးပြုမှု (Internal Content Creation):</strong> သတင်းခေါင်းစဉ်အမျိုးမျိုး ဖန်တီးရန်၊ ဆိုရှယ်မီဒီယာပို့စ်များ ရေးသားရန် သို့မဟုတ် စီမံကိန်းရေးဆွဲရန်နှင့် အရောင်းမြှင့်တင်ရန်အတွက် အကျဉ်းချုပ်များ ရေးသားခြင်း။</li>
                    <li><strong>စာလုံးပေါင်းနှင့် သဒ္ဒါစစ်ဆေးခြင်း (Grammar Assistance):</strong> စာလုံးပေါင်း၊ ဝေါဟာရနှင့် ဖတ်ရှုရ လွယ်ကူမှုတို့ကို စစ်ဆေးသည့်နေရာတွင် AI အထောက်အကူပြုစနစ်များ အသုံးပြုခြင်း။</li>
                    <li><strong>အလိုအလျောက် ထပ်ခါတလဲလုပ်ရသောအလုပ်များ (Automated Production):</strong> သတင်းဉာဏ်စမ်းမေးခွန်းများ၊ ဓာတ်ပုံစာတန်းများ သို့မဟုတ် ပုံသေနည်းလမ်းစနစ်သုံး အကျဉ်းချုပ်မှတ်တမ်းများ ဖန်တီးသကဲ့သို့ လုပ်ငန်းများတွင် အသုံးပြုခြင်း။ (အယ်ဒီတာများက စစ်ဆေးရမည်)</li>
                  </ul>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/80 p-4 rounded-xl space-y-2.5">
                  <h5 className="font-bold text-rose-800 text-xs sm:text-sm flex items-center gap-1.5">
                    ❌ တင်းကျပ်စွာ တားမြစ်ထားသော လုပ်ငန်းများ
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-700 text-xs sm:text-sm">
                    <li><strong>သတင်းအလုံးစုံရေးသားခြင်း (News Generation):</strong> သတင်းများ၊ ဆောင်းပါးများ သို့မဟုတ် အတွေးအမြင်များကို AI အသုံးပြု၍ အလုံးစုံအစမှအဆုံးအထိ ရေးသားခိုင်းခြင်း လုံးဝမပြုလုပ်ရ။ စာရေးသူမှာ လူသားသတင်းထောက်သာ ဖြစ်ရမည်။</li>
                    <li><strong>အညွှန်းမပါသော AI ရုပ်သံ/အသံများ (Unlabeled Visuals/Audio):</strong> အချက်အလက် အစစ်အမှန်ဟု အထင်မှားစေနိုင်သော AI ဖန်တီးထားသည့် ပုံများ၊ ဗီဒီယို သို့မဟုတ် အသံများကို တိကျသော အမှတ်အသား သို့မဟုတ် စာတန်းမထည့်ဘဲ လုံးဝမထုတ်ဝေရ။</li>
                    <li><strong>အချက်အလက်နှင့် ကိုးကားချက်များ တီထွင်ခြင်း (Fabricating Information):</strong> မည်သည့်အခြေအနေမျိုးတွင်မဆို သတင်းကိုးကားချက်များ၊ ကိန်းဂဏန်းများ သို့မဟုတ် သတင်းအချက်အလက်များကို AI သုံးပြီး အပိုဖန်တီးခြင်း၊ စိတ်ကူးယဉ်ရေးသားခြင်း လုံးဝ မပြုလုပ်ရ။</li>
                    <li><strong>မူပိုင်ခွင့် ချိုးဖောက်ခြင်း (Bypassing Copyright):</strong> ခွင့်ပြုချက်မရှိဘဲ မူပိုင်ခွင့်ရှိသော ရုပ်သံ/စာသားများကို ရယူရန် သို့မဟုတ် သတင်းဝဘ်ဆိုက်များ၏ ငွေပေးချေမှုစနစ် (Paywalls) ကို ကျော်ဖြတ်ရန် AI ကို အသုံးမပြုရ။</li>
                    <li><strong>လျှို့ဝှက်ချက်များကို မျှဝေခြင်း (Sharing Confidential Data):</strong> သတင်းဌာနတွင်း လျှို့ဝှက်စာရွက်စာတမ်းများ၊ မူပိုင်အချက်အလက်များနှင့် သတင်းပေးသူများ၏ အချက်အလက်များကို ခွင့်ပြုချက်မရထားသော အများသုံး AI စနစ်များသို့ မျှဝေပို့ဆောင်ခြင်း လုံးဝမပြုလုပ်ရ။</li>
                  </ul>
                </div>
              </div>

              {/* SECTION 3 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  ၃။ တာဝန်ယူမှုနှင့် ပွင့်လင်းမြင်သာမှု (Accountability and Transparency)
                </h4>
                <p>
                  <strong>အညွှန်းတပ်ခြင်း (Labeling):</strong> လက်ရာတစ်ခုတွင် AI က အခရာကျကျ ပါဝင်ပတ်သက်ထားပါက ရှင်းလင်းစွာ ဝန်ခံဖော်ပြရမည်။ ဥပမာ - "ဤဆောင်းပါးအား ဒေတာဆန်းစစ်ချက်နှင့် သတင်းအနှစ်ချုပ်ရယူရန် AI အထောက်အကူပြုစနစ်ဖြင့် ပူးပေါင်းဖန်တီးထားပါသည်။"
                </p>
                <p>
                  <strong>အယ်ဒီတာများ၏ အခန်းကဏ္ဍ (Editor's Role):</strong> ထုတ်ဝေလိုက်သော သတင်းတိုင်း ယခုမူဝါဒနှင့် ကိုက်ညီစေရန် အယ်ဒီတာများတွင် တာဝန်ရှိသည်။ သတင်းကျင့်ဝတ်နှင့်အညီ AI ကို အသုံးချနိုင်ရေး သတင်းထောက်များနှင့် ပူးပေါင်းဆောင်ရွက်မည်။
                </p>
              </div>

              {/* SECTION 4, 5 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  ၄။ စည်းကမ်းချိုးဖောက်မှု၏ အကျိုးဆက်များ (Consequences of Violating the Policy)
                </h4>
                <p className="border-l-4 border-red-500 pl-3 italic text-slate-700 bg-slate-50 py-2 rounded-r-lg">
                  ဤမူဝါဒကို ချိုးဖောက်ခြင်း၊ အထူးသဖြင့် ဂျာနယ်လစ်ဇင်၏ ဂုဏ်သိက္ခာကို ထိခိုက်စေခြင်း သို့မဟုတ် ပရိသတ်ကို လှည့်စားခြင်းပြုလုပ်ပါက အပြင်းအထန် အရေးယူခံရမည်ဖြစ်ပြီး သတိပေးခြင်းမှအစ အလုပ်မှထုတ်ပယ်ခြင်းအထိ ပြစ်ဒဏ် သက်ရောက်စေမည် ဖြစ်သည်။
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Introduction */}
              <p className="font-medium text-slate-800 text-base leading-relaxed">
                The Mizzima Media is committed to using technology to enhance our journalism, not to replace it. Our core mission remains to report the truth accurately, fairly, and with transparency. AI is viewed as a powerful tool to assist our journalists and improve our workflows, but it is not a substitute for human judgment, ethical decision-making, or journalistic accountability.
              </p>

              {/* SECTION 1 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  1. Our Guiding Principles
                </h4>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">Human Accountability:</strong> A journalist is ultimately responsible for every piece of content published under their name or the organization's masthead, regardless of what AI tools were used in its creation.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">Accuracy and Verification:</strong> AI-generated content, data, or research must be treated as an unverified source. All information generated by AI must be fact-checked and verified by a human journalist.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">Transparency:</strong> We will be transparent with our audience about the use of AI in our content creation process, particularly when it has a significant role in the final product.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">Ethical Use:</strong> We will not use AI in any way that promotes misinformation, disinformation, hate speech, or stereotypes. We will be mindful of the potential for AI models to perpetuate bias and will take steps to mitigate it.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 shrink-0 font-bold mt-0.5">▪</span>
                    <div>
                      <strong className="text-slate-900">Source Protection and Confidentiality:</strong> Journalists must not input any confidential, sensitive, or source-related information into public or non-secure AI tools. We will use only approved, secure AI platforms that guarantee data privacy and intellectual property rights.
                    </div>
                  </li>
                </ul>
              </div>

              {/* SECTION 2 */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  2. Approved and Prohibited Uses
                </h4>
                
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-xl space-y-2.5">
                  <h5 className="font-bold text-emerald-800 text-xs sm:text-sm flex items-center gap-1.5">
                    ✅ Approved Uses (with human oversight)
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-700 text-xs sm:text-sm">
                    <li><strong>Transcription:</strong> Using AI to transcribe audio or video interviews to save time. The journalist must review the transcript for accuracy.</li>
                    <li><strong>Research and Data Analysis:</strong> Using AI to analyze large datasets, summarize long documents, or identify patterns and trends that would be difficult to find manually.</li>
                    <li><strong>Content Generation for Internal Use:</strong> Generating headlines, social media posts, or summaries of articles for internal planning or promotional purposes.</li>
                    <li><strong>Grammar and Style Assistance:</strong> Using AI-powered tools to check for spelling and readability.</li>
                    <li><strong>Automated Production Tasks:</strong> Using AI to automate repetitive tasks like creating news quizzes, generating photo captions, or producing simple, template-based reports. These must be reviewed by an editor.</li>
                  </ul>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/80 p-4 rounded-xl space-y-2.5">
                  <h5 className="font-bold text-rose-800 text-xs sm:text-sm flex items-center gap-1.5">
                    ❌ Prohibited Uses
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-700 text-xs sm:text-sm">
                    <li><strong>Generating News Articles or Reporting:</strong> AI tools are not to be used to write news articles, reports, or opinion pieces from scratch. A human journalist must always be the author.</li>
                    <li><strong>Creating Unlabeled Images, Video, or Audio:</strong> We will not publish AI-generated images, video, or audio that could be mistaken for authentic, real-world content without clear and prominent labeling.</li>
                    <li><strong>Fabricating Quotes or Information:</strong> Under no circumstances will a journalist use AI to invent quotes, facts, or any information that is not independently verifiable.</li>
                    <li><strong>Bypassing Copyright:</strong> Journalists are prohibited from using AI to circumvent digital paywalls or to use third-party copyrighted material without permission.</li>
                    <li><strong>Sharing Confidential Information:</strong> Sharing any confidential information including internal documents, proprietary data, or details about sources, with non-approved AI platforms is strictly forbidden.</li>
                  </ul>
                </div>
              </div>

              {/* SECTION 3 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  3. Accountability and Transparency
                </h4>
                <p>
                  <strong>Labeling:</strong> When AI tools play a substantial role in the final, published content, we will add a clear label or disclosure. For example: "This article was produced with the assistance of an AI-powered tool for data analysis and summarization."
                </p>
                <p>
                  <strong>Editor's Role:</strong> Editors are responsible for ensuring that all published content adheres to this policy. They will work with journalists to identify appropriate and ethical uses of AI.
                </p>
              </div>

              {/* SECTION 4, 5 */}
              <div className="space-y-3.5">
                <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                  4. Consequences of Violating the Policy
                </h4>
                <p className="border-l-4 border-red-500 pl-3 italic text-slate-700 bg-slate-50 py-2 rounded-r-lg">
                  Violation of this policy, particularly in a manner that compromises journalistic integrity or misleads our audience, will be treated as a serious breach of professional conduct and may result in disciplinary action, up to and including termination of employment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions block */}
        <div className="border-t border-slate-200 p-5 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[11.5px] text-slate-500 font-serif text-center sm:text-left">
            {lang === 'my' 
              ? '🔒 ဤပလတ်ဖောင်းကို ဆက်လက်အသုံးပြုရန် မူဝါဒကို ကျေနပ်သဘောတူရန် လိုအပ်ပါသည်။' 
              : '🔒 You must agree to Mizzima AI Policy to use this workspace.'}
          </p>
          <div className="flex justify-center sm:justify-end gap-3 shrink-0">
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-xs bg-slate-200 hover:bg-slate-300 transition-colors text-slate-750 font-semibold rounded-xl font-serif cursor-pointer shadow-sm"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
            )}
            <button
              onClick={onAgree}
              className="px-6 py-2.5 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl font-serif cursor-pointer shadow-md hover:shadow-lg transition-all"
            >
              {lang === 'my' ? '✓ သဘောတူပါသည်' : '✓ I Agree & Accept'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PolicyModal;
