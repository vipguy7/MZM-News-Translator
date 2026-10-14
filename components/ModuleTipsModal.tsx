import React, { useState, useMemo } from 'react';

export type ModuleTipType = 
  | 'file' 
  | 'url' 
  | 'report' 
  | 'en2my' 
  | 'my2en' 
  | 'text' 
  | 'style' 
  | 'seo' 
  | 'proofreader';

interface ModuleTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedModule?: ModuleTipType;
}

interface TipItem {
  id: ModuleTipType;
  icon: string;
  title: string;
  keywords: string[];
  description: string;
  howItWorks: string;
  bestPractices: string[];
  mizzimaPolicySafety: string;
}

const ModuleTipsModal: React.FC<ModuleTipsModalProps> = ({ 
  isOpen, 
  onClose, 
  initialSelectedModule = 'file' 
}) => {
  const [selectedModule, setSelectedModule] = useState<ModuleTipType>(initialSelectedModule);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tipsList: TipItem[] = useMemo(() => [
    {
      id: 'file',
      icon: '📁',
      title: 'စာဖိုင်မှ သတင်းရေးသားခြင်း (File Input)',
      keywords: ['file', 'စာဖိုင်', 'docx', 'pdf', 'upload', 'တင်ခြင်း'],
      description: 'ကွန်ပျူတာ သို့မဟုတ် ဖုန်းထဲတွင် သိမ်းဆည်းထားသော သတင်းကုန်ကြမ်း၊ မှတ်တမ်းဖိုင်များကို အခြေခံ၍ သတင်းဆောင်းပါး သို့မဟုတ် Broadcast ဇာတ်ညွှန်း ရေးသားပေးသော စနစ်ဖြစ်သည်။',
      howItWorks: 'စနစ်ထဲသို့ တင်လိုက်သော .txt, .pdf သို့မဟုတ် .docx ဖိုင်ထဲရှိ စာသားအချက်အလက်အားလုံးကို အချက်အလက်ဆန်းစစ် စက်ရုပ် (Gemini AI) မှ အသေးစိတ် ခြုံငုံဖတ်ရှုသည်။ ထို့နောက် သတ်မှတ်ထားသော သတင်းအလျားနှင့် လေသံအတိုင်း စံနှုန်းမီ သတင်းဆောင်းပါးတစ်ခုအဖြစ် လှပစွာ ပြုစုသီကုံးပေးပါသည်။',
      bestPractices: [
        'ဖိုင်ထဲရှိ စာသားအချက်အလက်များသည် တိကျစစ်မှန်ပြီး ရှေ့နောက်ညီညွတ်မှု ရှိရပါမည်။',
        'အချက်အလက် ကွဲလွဲနေခြင်း သို့မဟုတ် မပြည့်စုံခြင်းများရှိက သတ်မှတ်သတင်း၏ ခိုင်မာမှုကို ထိခိုက်စေနိုင်သည်။',
        'ဖိုင်အရွယ်အစား အလွန်ကြီးမားလွန်းပါက အဓိက သတင်းအနှစ်ချုပ်များကိုသာ ဦးစွာ ရွေးထုတ်တင်ပြရန် အကြံပြုပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 Mizzima AI Code of Conduct အရ လုံခြုံမှုမရှိသော သတင်းရင်းမြစ်များ၏ လျှို့ဝှက်ချက် ဖော်ပြထားသော ဖိုင်များ သို့မဟုတ် မူပိုင်ခွင့်မလွတ်ကင်းသည့် တရားမဝင် ဒေတာဖိုင်များကို တင်သွင်းခြင်း မပြုရပါ။'
    },
    {
      id: 'url',
      icon: '🌐',
      title: 'ဝဘ်လင့်ခ် (URL) မှ သတင်းရေးသားခြင်း',
      keywords: ['url', 'ဝဘ်ဆိုက်', 'လင့်', 'link', 'website'],
      description: 'တရားဝင် သတင်းဌာနများ သို့မဟုတ် ဝဘ်စာမျက်နှာများ၏ လင့်ခ် (URL) ကို အသုံးပြု၍ သတင်းဆောင်းပါးများကို ထုတ်ယူ ဆန်းစစ်နိုင်သော စနစ်ဖြစ်သည်။',
      howItWorks: 'သင်ထည့်သွင်းလိုက်သော သတင်းလင့်ခ်သို့ သွားရောက်ကာ စာမျက်နှာပေါ်ရှိ HTML ကုဒ်များထဲမှ သတင်းနှင့်မသက်ဆိုင်သော ကြော်ငြာများ၊ Sidebar အညွှန်းများကို ဖယ်ထုတ်ပြီး မူရင်းသတင်းစာသားများကိုသာ သီးသန့်ဆွဲထုတ်ယူသည်။ အဆိုပါစာသားကို ဆန်းစစ်ပြီး ဖတ်ရှုသူများ ပိုမိုနားလည်လွယ်မည့် မဇ္ဈိမသတင်းစတိုင်ဖြင့် ပြန်လည်ရေးသားပေးပါသည်။',
      bestPractices: [
        'Facebook သို့မဟုတ် လူမှုကွန်ရက် ပို့စ်လင့်ခ်များအစား တရားဝင် သတင်းဝဘ်ဆိုက်များ၏ လင့်ခ်များကိုသာ သုံးပါ။',
        'လင့်ခ်သည် အများပြည်သူ ဝင်ရောက်ဖတ်ရှုနိုင်သော လင့်ခ်ဖြစ်ရမည် (Paywall ဝင်ခွင့်တောင်းသော လင့်ခ်များ သို့မဟုတ် Login ဝင်ရန် လိုအပ်သော လင့်ခ်များကို AI မှ ဖတ်ရှုနိုင်မည် မဟုတ်ပါ)။',
        'ခေါင်းစဉ်တပ်ထားသော သတင်းဆောင်းပါး တိုက်ရိုက်လင့်ခ် ဖြစ်ရန် လိုအပ်ပြီး Main page သို့မဟုတ် Category page လင့်ခ်များ မဖြစ်ရပါ။'
      ],
      mizzimaPolicySafety: '🔒 အခြားသတင်းဌာနတစ်ခုခု၏ သတင်းကို ပြန်လည်သုံးသပ်ကိုးကားပါက မူရင်းသတင်း မူပိုင်ခွင့်ရှင်ကို သတ်မှတ်ထားသည့်အတိုင်း ပွင့်လင်းမြင်သာစွာ Attribution (ကိုးကားချက်) ထည့်သွင်းပေးရမည်။'
    },
    {
      id: 'report',
      icon: '📋',
      title: 'အစီရင်ခံစာမှ သတင်းရေးသားမှု (Report Option)',
      keywords: ['report', 'အစီရင်ခံစာ', 'ထုတ်ပြန်ချက်', 'un', 'ngo', 'သုတေသန'],
      description: 'ကုလသမဂ္ဂအဖွဲ့အစည်းများ (UN)၊ နိုင်ငံတကာ လူ့အခွင့်အရေးနှင့် သုတေသနအဖွဲ့များ၊ NGO/INGO တို့၏ ရှည်လျားပြီး ဒေတာကိန်းဂဏန်းများပြည့်နှက်နေသော အစီရင်ခံစာများကို သတင်းအဖြစ် ပြောင်းလဲပေးသည့် စနစ်ဖြစ်သည်။',
      howItWorks: 'ရှုပ်ထွေးလှသော ဒေတာကိန်းဂဏန်းများ၊ ဇယားများမှ အရေးကြီးဆုံးနှင့် သတင်းတန်ဖိုး အရှိဆုံးအချက်များကို ဂျာနယ်လစ်ဇင်မျက်စိဖြင့် ထုတ်ယူသည်။ မဇ္ဈိမ၊ ဘီဘီစီ၊ မြန်မာနောင်းတို့၏ သတင်းဆောင်းပါး အဆင့်အတန်းအတိုင်း ခေါင်းစဉ်ဆွဲဆောင်မှုရှိစွာ၊ သတင်းဦးတည်ချက် ခိုင်မာစွာ၊ မျှတမှုရှိစွာ ရေးသားပေးပါသည်။',
      bestPractices: [
        'အစီရင်ခံစာထဲရှိ သတင်းထုတ်ပြန်ချက် သို့မဟုတ် ရှာဖွေတွေ့ရှိချက် အကျဉ်းချုပ်များကို တိုက်ရိုက်ကူးယူထည့်သွင်းပေးနိုင်ပါသည်။',
        'ဒေတာဇယားများနှင့် ကောက်ချက်များကို ရှင်းလင်းစွာဖော်ပြထားသော စာသားများကို သုံးခြင်းဖြင့် ပိုမိုတိကျသော သတင်းကို ရရှိပါမည်။',
        'သတင်းလေသံအတွက် Formal (အလေးအနက်ထားမှု) သို့မဟုတ် Informative (အချက်အလက်ဦးစားပေး) ကို ရွေးချယ်အသုံးပြုရန် အထူးသင့်လျော်ပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 သတင်းရင်းမြစ် တိကျခိုင်မာစေရန်နှင့် အဂတိလိုက်စားမှု၊ တစ်ဖက်သတ် စွပ်စွဲမှုကို ရှောင်ရှားရန် အစီရင်ခံစာ၏ သတင်းရင်းမြစ် အစုအဖွဲ့ကို ကောင်းမွန်စွာ စိစစ်ပြီးမှသာ သတင်းထုတ်ဝေရပါမည်။'
    },
    {
      id: 'en2my',
      icon: '🇬🇧',
      title: 'အင်္ဂလိပ်မှ မြန်မာ ပြောင်းလဲခြင်း (En to My)',
      keywords: ['translate', 'translation', 'en2my', 'အင်္ဂလိပ်', 'မြန်မာ', 'ဘာသာပြန်'],
      description: 'နိုင်ငံတကာ အင်္ဂလိပ်သတင်းလင့်ခ်များကို ပြည်တွင်းဖတ်ရှုသူများ လွယ်ကူစွာ ဖတ်ရှုနားလည်နိုင်မည့် မြန်မာ့သတင်းစံနှုန်းအသုံးအနှုန်းများဖြင့် တိုက်ရိုက်ပြန်ဆိုရေးသားသည့် စနစ်ဖြစ်သည်။',
      howItWorks: 'စကားလုံးချင်း တိုက်ရိုက်စက်ရုပ်ဆန်ဆန် ဘာသာပြန်ခြင်းမျိုး မဟုတ်ဘဲ၊ ထည့်သွင်းလိုက်သော အင်္ဂလိပ်စာမူမှ ဆိုလိုရင်း၊ နောက်ခံအကြောင်းအရာနှင့် အဓိကအချက်များကို နားလည်အောင် ဆွဲထုတ်သည်။ ထို့နောက် မြန်မာစာပေအရေးအသား၊ ဂျာနယ်လစ်ဇင် အသုံးအနှုန်းများနှင့် သီကုံးကာ သတင်းအဖြစ် ရေးသားပေးပါသည်။',
      bestPractices: [
        'Reuters, AP, AFP စသည့် ကမ္ဘာကျော် သတင်းဌာနကြီးများ၏ တရားဝင်လင့်ခ်များကို သုံးခြင်းဖြင့် အဆင့်မြင့်မားသော သတင်းများကို ဖန်တီးနိုင်သည်။',
        'ပိုမိုဆွဲဆောင်မှုရှိစေရန် သတင်းထုတ်ကုန်အဖြစ် Broadcast Video Script (ရုပ်သံ/အသံဖတ်ထုတ်လွှင့်မှုပုံစံ) ကို သတ်မှတ်အသုံးပြုနိုင်ပါသည်။',
        'ဘာသာပြန်ဆိုစဉ် နည်းပညာစကားလုံးများ၊ စစ်ဘက် သိုမဟုတ် သံတမန်အခေါ်အဝေါ်များကို သဘာဝကျသော မြန်မာဝေါဟာရများဖြင့် လှပစွာဖြည့်စွက်ပေးပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 တိုင်းတစ်ပါး၏ မီဒီယာအမြင်များကိုလည်း မြန်မာ့စံနှုန်းနှင့် ကိုက်ညီအောင် သတိပြုသုံးသပ်ရမည်။ မုသားများ၊ အမုန်းစကားများ သို့မဟုတ် တစ်ဖက်သတ် ဝါဒဖြန့်မှုများ ပါဝင်နေပါက AI ကို အသုံးမပြုဘဲ လူကိုယ်တိုင် စိစစ်ဖယ်ရှားရပါမည်။'
    },
    {
      id: 'my2en',
      icon: '🇲🇲',
      title: 'မြန်မာမှ အင်္ဂလိပ် ပြောင်းလဲခြင်း (My to En)',
      keywords: ['translate', 'translation', 'my2en', 'မြန်မာ', 'အင်္ဂလိပ်', 'english', 'international'],
      description: 'ပြည်တွင်း သတင်းဖြစ်ရပ်များကို ကမ္ဘာ့ပရိသတ်များ၊ နိုင်ငံတကာ သံတမန်များနှင့် ဖတ်ရှုသူများ သိရှိစေရန်အလို့ငှာ သန့်ရှင်းသပ်ရပ်သော နိုင်ငံတကာ အင်္ဂလိပ်သတင်းအဖြစ် ရေးသားပေးသော စနစ်ဖြစ်သည်။',
      howItWorks: 'မြန်မာလင့်ခ်ထဲမှ သတင်းဒေတာများကို ဆွဲယူကာ အင်္ဂလိပ်စာဖတ်သူများအတွက် သဘာဝကျပြီး ထစ်ငေါ့မှုမရှိစေမည့် နိုင်ငံတကာ သတင်းအရေးအသားပုံစံ (Associated Press Style, AFP Style) ဖြင့် ပြန်လည်ဆန်းစစ် သီကုံးပေးပါသည်။',
      bestPractices: [
        'ပြည်တွင်းဖြစ်ရပ်များ၏ နောက်ခံသတင်းအကြောင်းအရာ (Context) ကို နိုင်ငံတကာစာဖတ်သူ လွယ်ကူစွာ နားလည်စေရန် ကောင်းမွန်စွာ ရှင်းပြပေးလေ့ရှိပါသည်။',
        'အမည်နာမများ (ဥပမာ- ရွာအမည်၊ ပုဂ္ဂိုလ်အမည်) ကို အင်္ဂလိပ်လို ပေါင်းရာတွင် အလွဲအမှားမရှိစေရန် သတင်းထောက်မှ လူကိုယ်တိုင် ထပ်မံအတည်ပြုရန် လိုအပ်ပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 နိုင်ငံတကာသို့ သတင်းဖြန့်ဝေရာတွင် မဇ္ဈိမ၏ ပရော်ဖက်ရှင်နယ် ဂုဏ်သိက္ခာကို သိက္ခာအရှိဆုံး ထိန်းသိမ်းရန် လိုအပ်သဖြင့် အချက်အလက်များ လွဲချော်မှု လုံးဝမရှိစေရန် တင်းကျပ်စွာ စစ်ဆေးရပါမည်။'
    },
    {
      id: 'text',
      icon: '✍️',
      title: 'စာသားတိုက်ရိုက် ဘာသာပြန်ခြင်း (Direct Text Translation)',
      keywords: ['text', 'translate', 'စာသား', 'ကူးထည့်', 'direct', 'translation'],
      description: 'လင့်ခ် သို့မဟုတ် ဖိုင်များ သုံးရန်မလိုအပ်ဘဲ မိမိဘာသာပြန်လိုသော စာသား သို့မဟုတ် သတင်းအခြေခံစကားလုံးများကို ကူးယူထည့်သွင်းပြီး တိုက်ရိုက် ဘာသာပြန်ယူနိုင်သော စနစ်ဖြစ်သည်။',
      howItWorks: 'ကူးထည့်လိုက်သော စာသား၏ အကြောင်းအရာကို ဆန်းစစ်ကာ အင်္ဂလိပ်မှ မြန်မာ သို့မဟုတ် မြန်မာမှ အင်္ဂလိပ်သို့ အနီးစပ်ဆုံးနှင့် အဓိပ္ပာယ်အရှိဆုံး ဂျာနယ်လစ်ဇင်အရေးအသားပုံစံဖြင့် စာမူပြန်ဆိုပေးပါသည်။',
      bestPractices: [
        'ရှည်လျားလွန်းသော စာမူကြီးများထက် စာပိုဒ်အနည်းငယ်ချင်းစီ (သို့မဟုတ် စာလုံးရေ ၁၅၀၀ ခန့်) အပိုင်းလိုက် ဘာသာပြန်ခြင်းက ပိုမိုမြန်ဆန်ပြီး တိကျလှပသော ဘာသာပြန်ဆိုမှုကို ပေးပါသည်။',
        'ပြည့်စုံကွဲပြားသော ဆောင်းပါးအကျဉ်းချုပ်များကို ကူးထည့်၍ ဘာသာပြန်ခိုင်းရန် အထူးကောင်းမွန်ပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 တရားဝင်မဟုတ်သော ရင်းမြစ်များမှ ထိခိုက်လွယ်လွန်းသော ကောလာဟလ စာသားကြမ်းများကို စိစစ်အတည်ပြုခြင်းမရှိဘဲ ယခုဇယားထဲသို့ ထည့်သွင်းခြင်း ရှောင်ကြဉ်ပါ။'
    },
    {
      id: 'style',
      icon: '⚙️',
      title: 'သတင်းဟန်နှင့် အရှည်ရွေးချယ်မှု (Script Preferences)',
      keywords: ['style', 'tone', 'length', 'type', 'preference', 'ပုံစံ', 'လေသံ', 'အရှည်'],
      description: 'ရေးသားမည့်သတင်း၏ အနက်ဖွင့်ပုံ၊ အရှည်အတိုနှင့် သတင်းတင်ပြမည့် ပုံသဏ္ဌာန် (ဝဘ်ဆိုက်စာမူ သို့မဟုတ် ရုပ်သံသတင်းဖတ်စာ) တို့ကို စိတ်ကြိုက်ရွေးချယ်ဆောင်ရွက်သည့်စနစ် ဖြစ်သည်။',
      howItWorks: 'ရွေးချယ်လိုက်သော Tone (ဥပမာ- အလေးအနက်ထားသော Formal, အချက်အလက်ရိုးရှင်းသော Informative, ဆောင်းပါးဆန်ဆန်ဆွဲဆောင်သော Creative) နှင့် Length (အကျဉ်း၊ အလတ်၊ အပြည့်စုံဆုံး) စံနှုန်းများကို AI ဖန်တီးမှုအင်ဂျင်ထဲသို့ စနစ်တကျထည့်သွင်းပြီး သတင်းကို အံကိုက်ဖန်တီးစေပါသည်။',
      bestPractices: [
        'ရုပ်မြင်သံကြား/Radio တွင် တိုက်ရိုက်ဖတ်ကြားမည့် ဗီဒီယိုဖြစ်ပါက Broadcast Video Script အမျိုးအစားကို ရွေးချယ်ပါ။ ၎င်းသည် နိဒါန်း၊ ဖတ်ကြားရန်အပိုင်းနှင့် နိဂုံးများကို ကွက်တိသတ်မှတ်ပေးပါမည်။',
        'ဝဘ်ဆိုက် သို့မဟုတ် Facebook စာတန်းများ တင်ပြရန်အတွက်မူ Web Post / Article ကို ရွေးချယ်ရန် အကြံပြုပါမည်။'
      ],
      mizzimaPolicySafety: '🔒 သတင်းအကြောင်းအရာ၏ အမှန်တရားပေါ်မူတည်၍ လေသံကို ရိုးသားစွာ ရွေးချယ်ရမည်။ စိုးရိမ်ထိတ်လန့်မှု သို့မဟုတ် ဖောင်းပွမှုဖြစ်စေမည့် ဘက်လိုက်လေသံများကို တမင်ဖန်တီးခြင်းမှ ရှောင်ကြဉ်ရပါမည်။'
    },
    {
      id: 'seo',
      icon: '📈',
      title: 'SEO နှင့် သော့ချက်စာလုံးအကြံပေး (SEO Optimization)',
      keywords: ['seo', 'keyword', 'meta', 'title', 'tag', 'ရှာဖွေမှု', 'သော့ချက်စာလုံး'],
      description: 'ရေးသားပြီးသောသတင်းများကို ဝဘ်ဆိုက်နှင့် ဆိုရှယ်မီဒီယာများပေါ်တွင် လူရှာဖွေရလွယ်ကူစေရန်နှင့် Website Performance တက်လာစေရန် အလိုအလျောက် အနီးကပ်အကြံပြုပေးသောစနစ်ဖြစ်သည်။',
      howItWorks: 'မဇ္ဈိမ သတင်းဌာန၏ ဆောင်းပါးပါ အဓိက အပြန်အလှန်ချိတ်ဆက်မှုများ၊ လူမှုကွန်ရက်ပေါ်တွင် လက်ရှိ ရေပန်းစားနေနိုင်သော ရှာဖွေစကားလုံးများကို တွက်ချက်သည်။ ထိုမှတစ်ဆင့် ဆွဲဆောင်မှုအရှိဆုံး Meta Title ၊ ရှာဖွေမှု ဖော်ပြချက် (Meta Description) နှင့် Keyword Tags များကို အသင့်အသုံးချနိုင်ရန် ထုတ်လုပ်ပေးပါသည်။',
      bestPractices: [
        'သတင်းဖန်တီးရန် ခလုတ်မနှိပ်မီ "SEO အကြံပြုချက်များ ရယူရန်" ခလုတ်ကို ဖွင့်ထားပါ။',
        'AI ပေးသော သော့ချက်စာလုံးများကို ဝဘ်ဆိုက်ပေါ်တွင် Tag များအဖြစ် အသင့်ကူးယူ (Copy & Paste) ကပ်၍ သုံးစွဲနိုင်ပါသည်။'
      ],
      mizzimaPolicySafety: '🔒 ပရိသတ်ကို ကလစ်ခေါက်ဝင်စေရန် လှည့်စားထားသော Clickbait ခေါင်းစဉ်များ၊ Meta ခေါင်းစဉ်များ တင်ခြင်းမျိုး လုံးဝမပြုလုပ်ရန် မူဝါဒမှ တားမြစ်ထားသည်။'
    },
    {
      id: 'proofreader',
      icon: '✍️',
      title: 'စာလုံးပေါင်း သတ်ပုံစိစစ်ပြင်ဆင်ရေး (AI Proofreader)',
      keywords: ['proofread', 'proofreader', 'diff', 'စာလုံးပေါင်း', 'သတ်ပုံ', 'သဒ္ဒါ', 'အမှားစစ်'],
      description: 'ရေးသားပြီးသား မြန်မာသတင်းစာသားများထဲမှ စာလုံးပေါင်းသတ်ပုံအမှားများ၊ သဒ္ဒါနှင့် ဝါကျကျောရိုးကွဲလွဲမှုများကို အလိုအလျောက် စိစစ်ထောက်ပြ ပြင်ဆင်ပေးသော စနစ်ဖြစ်သည်။',
      howItWorks: '"စစ်ဆေးပြင်ဆင်ရန်" ခလုတ်အား နှိပ်ခြင်းဖြင့် မြန်မာစာအဖွဲ့နှင့် ပြည်တွင်းသတင်းစာစံနှုန်းသတ်ပုံများအရ စာသားကို တိုက်ရိုက်ဆန်းစစ်သည်။ သတ်ပုံလွဲမှားမှုများကို လျှပ်တစ်ပြက်ပြင်ဆင်ပေးကာ မူရင်းနှင့် ပြင်ဆင်ပြီးစာသား ယှဉ်တွဲပြသမှု (Diff Visualization Panel) ဖြင့် အမြင်သာဆုံး ပြသပေးပါသည်။',
      bestPractices: [
        'AI က ရေးသားပေးသော သတင်းစာမူကိုသာမက၊ သင်ကိုယ်တိုင် ရေးသားထားသော မည်သည့်မြန်မာစာသားကိုမဆို ဤစနစ်ဖြင့် သတ်ပုံအမှား စိစစ်ပြင်ဆင်နိုင်ပါသည်။',
        'ပြုပြင်မှုများကို သေချာစွာ နှိုင်းယှဉ်ကြည့်ရှုပြီး မိမိကိုယ်တိုင် လက်ခံလိုသော စကားစုများကို စိစစ်အတည်ပြုအသုံးပြုပါ။'
      ],
      mizzimaPolicySafety: '🔒 စာလုံးပေါင်းအမှားများ၊ သတ်ပုံအမှားများသည် ရည်ရွယ်ချက်မပါသော်လည်း သတင်းဌာနနှင့် ကလောင်ရှင်၏ ပတ်သက်မှု ယုံကြည်စိတ်ချရမှုကို ထိခိုက်စေတတ်သောကြောင့် ဤအဆင့်ကို သေချာစနစ်တကျ ဖြတ်သန်းရန် ဖြစ်ပါသည်။'
    }
  ], []);

  const filteredTips = useMemo(() => {
    if (!searchQuery.trim()) return tipsList;
    const query = searchQuery.toLowerCase();
    return tipsList.filter(tip => 
      tip.title.toLowerCase().includes(query) ||
      tip.description.toLowerCase().includes(query) ||
      tip.keywords.some(kw => kw.includes(query))
    );
  }, [searchQuery, tipsList]);

  // Adjust chosen selected module if the currently selected is not in the filtered search results.
  React.useEffect(() => {
    if (filteredTips.length > 0 && !filteredTips.some(t => t.id === selectedModule)) {
      setSelectedModule(filteredTips[0].id);
    }
  }, [filteredTips, selectedModule]);

  if (!isOpen) return null;

  const currentTip = tipsList.find(tip => tip.id === selectedModule) || tipsList[0];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div 
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-[80vh] overflow-hidden animate-fade-in"
        id="module-tips-container"
      >
        
        {/* Header section */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold font-serif text-amber-400 flex items-center gap-2">
              💡 မဇ္ဈိမ သတင်းခန်း မော်ဂျူးလမ်းညွှန်ချက်များနှင့် အသုံးပြုပုံ
            </h3>
            <p className="text-[11px] text-slate-300 font-serif leading-tight">
              MZM Newsroom AI platform ရှိ မော်ဂျူးတစ်ခုစီ၏ အသေးစိတ်အလုပ်လုပ်ပုံနှင့် ကျင့်ဝတ်လမ်းညွှန်ချက်များ
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white font-sans text-2xl font-bold cursor-pointer transition-colors p-2 rounded-xl hover:bg-slate-800"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Search Bar Block */}
        <div className="px-5 py-3.5 bg-slate-100 border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="ရှာဖွေလိုသောလုပ်ဆောင်ချက်များကို ရိုက်ထည့်ပါ... (ဥပမာ- SEO, စာဖိုင်, သတ်ပုံ)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-serif"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-sans font-bold cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Found {filteredTips.length} elements
          </div>
        </div>

        {/* Workspace: Side bar tabs + detailed description */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Hand: Category/Modules List */}
          <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-205 overflow-y-auto max-h-[25vh] md:max-h-full">
            <div className="p-3 space-y-1">
              <span className="block px-2 py-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-sans select-none">
                Modules List
              </span>
              {filteredTips.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-serif italic">
                  ရှာဖွေမှုရလဒ်မရှိပါ
                </div>
              ) : (
                filteredTips.map((tip) => (
                  <button
                    key={tip.id}
                    onClick={() => setSelectedModule(tip.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-serif ${
                      selectedModule === tip.id
                        ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-750 font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/50 border-l-4 border-transparent'
                    }`}
                  >
                    <span className="text-sm shrink-0">{tip.icon}</span>
                    <span className="truncate">{tip.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Hand: Detailed view of the current selected module explanation */}
          <div className="w-full md:w-2/3 p-6 overflow-y-auto space-y-6 bg-white font-serif select-text max-h-[50vh] md:max-h-full">
            
            {/* Module Name Card header */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 bg-blue-50 text-blue-600 rounded-xl shadow-inner font-sans">
                  {currentTip.icon}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-slate-950 leading-tight">
                  {currentTip.title}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-655 font-medium leading-relaxed italic bg-amber-50/50 px-3.5 py-2.5 border-l-2 border-amber-400 rounded-r-xl">
                📋 {currentTip.description}
              </p>
            </div>

            {/* How it works block */}
            <div className="space-y-2.5">
              <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 uppercase letter tracking-wide">
                ⚙️ နောက်ကွယ်မှ အလုပ်လုပ်ပုံနည်းပညာ
              </h5>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif pl-1">
                {currentTip.howItWorks}
              </p>
            </div>

            {/* Practical recommendations list */}
            <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                ✅ အကောင်းဆုံးသတင်းရရှိရန် အကြံပြုချက်များ (Best Practices)
              </h5>
              <ul className="space-y-2 pl-4 list-disc text-xs text-slate-700 leading-relaxed">
                {currentTip.bestPractices.map((bp, index) => (
                  <li key={index}>
                    <span className="font-serif">{bp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policy & Ethical Guidelines Integration */}
            <div className="bg-purple-50/40 border border-purple-200/60 p-4 rounded-xl text-xs sm:text-sm text-purple-950 font-serif space-y-1.5 leading-relaxed">
              <h5 className="font-bold text-purple-900 flex items-center gap-1.5">
                🛡️ မဇ္ဈိမ AI ဂုဏ်သိက္ခာနှင့် အန္တရာယ်ကင်းကျင့်ဝတ်သတိပေးချက်
              </h5>
              <div className="text-slate-700 pl-1">
                {currentTip.mizzimaPolicySafety}
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions bar */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left shrink-0">
          <p className="text-[10px] text-slate-400 font-serif">
            💡 Module Tips System v1.5 • Crafted for Mizzima Newsroom Editor Center
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold font-serif rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
          >
            ✓ စာမျက်နှာသို့ပြန်သွားမည်
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModuleTipsModal;
