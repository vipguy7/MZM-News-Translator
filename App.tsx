import React, { useState, useEffect, useCallback } from 'react';
import { 
  InputMode, 
  GeneratedScriptResponse, 
  GroundingChunk, 
  ScriptLength, 
  ScriptTone, 
  ScriptType, 
  SEOData 
} from './types';
import { UI_STRINGS_MY } from './constants';
import InputSelector from './components/InputSelector';
import FileInput from './components/FileInput';
import UrlInput from './components/UrlInput';
import ReportInput from './components/ReportInput';
import TextAreaInput from './components/TextAreaInput';
import ScriptDisplay from './components/ScriptDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import ScriptLengthSelector from './components/ScriptLengthSelector';
import ScriptToneSelector from './components/ScriptToneSelector';
import ScriptTypeSelector from './components/ScriptTypeSelector';
import DisclaimerMessage from './components/DisclaimerMessage';
import ProofreadDiffView from './components/ProofreadDiffView';
import PolicyModal from './components/PolicyModal';
import ModuleTipsModal, { ModuleTipType } from './components/ModuleTipsModal';
import TokenMonitor from './components/TokenMonitor';
import {
  generateScriptFromFileContent,
  generateScriptFromUrl,
  generateScriptFromReport,
  performEnToMyTranslationAndScriptGeneration,
  performMyToEnTranslationAndScriptGeneration,
  translatePastedText,
  proofreadScript,
  extractKeywords,
  generateSEOMetadata,
  categorizeNews,
  setCustomApiKeyForGemini,
} from './services/geminiService';
import { clearAppCache } from './services/cacheService';
import { useAuthSession } from './src/client/features/auth/useAuthSession';
import { api } from './src/client/api/apiClient';
import { useWorkspaceInput } from './src/client/features/workspace/useWorkspaceInput';
import { useLibraryFeature } from './src/client/features/library/useLibraryFeature';
import { useCorrectionsFeature } from './src/client/features/corrections/useCorrectionsFeature';
import { useVocabularyFeature } from './src/client/features/admin/useVocabularyFeature';
import { useGenerationWorkflow } from './src/client/features/workspace/useGenerationWorkflow';
import { useGenerationState } from './src/client/features/workspace/useGenerationState';
import { 
  Menu, 
  X, 
  PenTool, 
  FolderHeart, 
  SpellCheck, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  History,
  Globe,
  RefreshCw,
  UserCheck,
  MoreVertical,
  SlidersHorizontal
} from 'lucide-react';

// Firebase core & auth services
import { 
  getOrCreateUserProfile, 
  updateUserApiKey, 
  auth
} from './services/firebaseService';

const App: React.FC = () => {
  // Modals visibility states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);
  const [tipsActiveTab, setTipsActiveTab] = useState<ModuleTipType>('file');
  
  const { state: generationState, actions: generationActions, resetOutputs } = useGenerationState();
  const {
    generatedScript,
    intermediateTranslation,
    groundingSources,
    proofreadScriptContent,
    extractedKeywords,
    seoData,
    category,
    reportStatistics,
    reportChartData,
    reportChartTitle,
    reportChartType,
    isLoading,
    isProofreading,
    isExtractingKeywords,
    cooldownRemaining,
    error,
    wasServedFromCache,
    scrapeMethod,
    scrapeNotice,
  } = generationState;
  const {
    setGeneratedScript,
    setIntermediateTranslation,
    setGroundingSources,
    setProofreadScriptContent,
    setExtractedKeywords,
    setSeoData,
    setCategory,
    setReportStatistics,
    setReportChartData,
    setReportChartTitle,
    setReportChartType,
    setIsLoading,
    setIsProofreading,
    setIsExtractingKeywords,
    setCooldownRemaining,
    setError,
    setWasServedFromCache,
    setScrapeMethod,
    setScrapeNotice,
  } = generationActions;
  const [useSEO, setUseSEO] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<any>(null);

  // New UI enhancements & Tabs
  const [activeTab, setActiveTab] = useState<'workspace' | 'library' | 'corrections' | 'guide' | 'admin'>('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [foldedSections, setFoldedSections] = useState<{ [key: string]: boolean }>({
    inputConfig: false,
    styleOptions: true,
    seoOptions: true
  });

  // Shared account credit data used by the shell and token monitor.
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const {
    currentUser,
    userProfile,
    setUserProfile,
    authLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    isSignUpMode,
    setIsSignUpMode,
    authError,
    tempApiKey,
    setTempApiKey,
    tempOpenAiKey,
    setTempOpenAiKey,
    preferredModel,
    setPreferredModelLocal,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
    saveApiKeys,
  } = useAuthSession();

  // Handle 15-second cooldown counting down every second
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(Math.max(0, cooldownRemaining - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Poll server for queue status when loading is active
  useEffect(() => {
    if (!isLoading) {
      setQueueStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const data = await api.get<any>('/api/queue-status', {
          headers: userProfile?.customApiKey
            ? { 'x-custom-gemini-key': userProfile.customApiKey }
            : undefined,
        });
        setQueueStatus(data);
      } catch (err) {
        console.warn('Failed to fetch queue status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, [isLoading, currentUser, userProfile]);

  // Check Mizzima AI Policy agreement status
  useEffect(() => {
    if (currentUser) {
      const agreed = localStorage.getItem('mzm_ai_policy_agreed');
      if (agreed !== 'true') {
        setIsPolicyOpen(true);
      }
    }
  }, [currentUser]);

  // Fetch callbacks for backend SQL services
  const fetchUserProfileData = useCallback(async () => {
    if (!currentUser) return;
    setProfileLoading(true);
    try {
      const data = await api.get<any>('/api/user/profile');
      setUserProfileData(data);
    } catch (err) {
      console.error("Failed to fetch user profile data", err);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser]);

  const libraryFeature = useLibraryFeature({
    currentUser,
    onProfileRefresh: fetchUserProfileData,
  });
  const correctionsFeature = useCorrectionsFeature({ currentUser });
  const vocabularyFeature = useVocabularyFeature({ currentUser });
  const {
    savedScripts,
    scriptsLoading,
    isSavingToLibrary,
    saveToLibrarySuccess,
    fetchSavedScripts,
    saveToLibrary,
    deleteSavedScript,
  } = libraryFeature;
  const {
    userCorrectionsList,
    correctionsLoading,
    newWrongWord,
    setNewWrongWord,
    newCorrectedWord,
    setNewCorrectedWord,
    isSubmittingCorrection,
    correctionError,
    fetchUserCorrections,
    handleAddUserCorrection,
    handleToggleCorrection,
    handleDeleteCorrection,
  } = correctionsFeature;
  const {
    globalVocabularyList,
    globalLoading,
    newGlobalEnglish,
    setNewGlobalEnglish,
    newGlobalBurmese,
    setNewGlobalBurmese,
    newGlobalPart,
    setNewGlobalPart,
    newGlobalNotes,
    setNewGlobalNotes,
    isSubmittingGlobal,
    globalError,
    fetchGlobalVocabulary,
    handleAddGlobalVocabulary,
    handleDeleteGlobalVocabulary,
  } = vocabularyFeature;

  // Sync data dynamically based on active tab select
  useEffect(() => {
    if (currentUser) {
      fetchUserProfileData();
      if (activeTab === 'library') {
        fetchSavedScripts();
      } else if (activeTab === 'corrections') {
        fetchUserCorrections();
      } else if (activeTab === 'admin') {
        fetchGlobalVocabulary();
      }
    }
  }, [currentUser, activeTab, fetchUserProfileData, fetchSavedScripts, fetchUserCorrections, fetchGlobalVocabulary]);

  const handleAgreePolicy = useCallback(() => {
    localStorage.setItem('mzm_ai_policy_agreed', 'true');
    setIsPolicyOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    resetOutputs();
  }, [resetOutputs, signOutUser]);

  const handleSaveApiKey = useCallback(async () => {
    try {
      await saveApiKeys();
      setIsSettingsOpen(false);
      alert('API KEY သတ်မှတ်ချက်များကို သိမ်းဆည်းပြီးပါပြီ (API Key settings saved successfully!)');
    } catch (error) {
      console.error(error);
      alert('ဆက်တင် မှတ်ထားခြင်း မအောင်မြင်ပါ။');
    }
  }, [saveApiKeys]);

  const workspaceInput = useWorkspaceInput({
    resetOutputs,
    generatedScript,
    error,
    setError,
  });
  const {
    selectedInputMode,
    selectedScriptLength,
    selectedScriptTone,
    selectedScriptType,
    fileContent,
    urlInput,
    englishUrlInput,
    reportInput,
    pastedTextInput,
    reportTargetLanguage,
    setReportTargetLanguage,
    handleInputModeChange,
    handleScriptLengthChange,
    handleScriptToneChange,
    handleScriptTypeChange,
    handleFileProcessed,
    handleUrlChange,
    handleEnglishUrlChange,
    handleReportChange,
    handlePastedTextChange,
    handleFileError,
    validateInputs,
    isGenerateDisabled: hasMissingInput,
  } = workspaceInput;

  const handleOpenActiveModuleTips = useCallback(() => {
    let modeTip: ModuleTipType = 'file';
    switch (selectedInputMode) {
      case InputMode.FILE: modeTip = 'file'; break;
      case InputMode.URL: modeTip = 'url'; break;
      case InputMode.REPORT: modeTip = 'report'; break;
      case InputMode.TRANSLATE_EN_TO_MY: modeTip = 'en2my'; break;
      case InputMode.TRANSLATE_MY_TO_EN: modeTip = 'my2en'; break;
      case InputMode.TRANSLATE_TEXT: modeTip = 'text'; break;
    }
    setTipsActiveTab(modeTip);
    setIsTipsOpen(true);
  }, [selectedInputMode]);

  const { handleGenerateScript, handleProofreadScript, handleExtractKeywords } = useGenerationWorkflow({
    currentUser,
    userProfile,
    inputs: {
      selectedInputMode,
      selectedScriptLength,
      selectedScriptTone,
      selectedScriptType,
      fileContent,
      urlInput,
      englishUrlInput,
      reportInput,
      pastedTextInput,
      reportTargetLanguage,
    },
    useSEO,
    generatedScript,
    isLoading,
    isProofreading,
    isExtractingKeywords,
    resetOutputs,
    validateInputs,
    setActiveTab,
    onProfileRefresh: fetchUserProfileData,
    setters: generationActions,
  });

  const handleClearCache = () => {
    clearAppCache();
    alert(UI_STRINGS_MY.CACHE_CLEARED_SUCCESS);
  };

  const isGenerateDisabled = (): boolean => {
    if (isLoading || isProofreading || cooldownRemaining > 0) return true; 
    return hasMissingInput();
  };

  const downloadFile = (content: string | null, baseFileName: string, extension: 'txt') => {
    if (!content) return;
    const mimeType = 'text/plain;charset=utf-8';
    const cleanContent = content
      .replace(/^#+\s+/gm, '') 
      .replace(/\*\*/g, '')   
      .replace(/\*/g, '')     
      .replace(/^(နိဒါန်း|အဓိက အကြောင်းအရာ|နိဂုံး|နိဂုံးနှင့် တိုက်တွန်းချက်|သတင်းခေါင်းစဉ်|နိဒါန်း \(Opening Hook\)|အဓိက အကြောင်းအရာ \(Narration Body\)|နိဂုံး \(Conclusion & Call-to-Action\)):/gm, '')
      .trim();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([cleanContent], { type: mimeType }));
    link.download = `${baseFileName}_${new Date().toISOString().slice(0,10)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Saved news custom database actions
  const handleSaveToLibrary = async () => {
    if (!currentUser || !generatedScript) return;
    try {
      await saveToLibrary({
        title: seoData?.optimizedTitle || generatedScript.split('\n')[0]?.substring(0, 100) || "ခေါင်းစဉ်မရှိ သတင်းစာမူ",
        content: generatedScript,
        category: category || "သတင်းတို",
        originalInput: fileContent || urlInput || reportInput || pastedTextInput || "သတင်းအချက်အလက်မြန်မာ",
        scriptType: selectedScriptType,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };
  const handleDeleteSavedScript = deleteSavedScript;

  const handleOpenScriptFromLibrary = (scriptItem: any) => {
    setGeneratedScript(scriptItem.content);
    setCategory(scriptItem.category);
    setError(null);
    setSeoData(null);
    setActiveTab('workspace'); // switch smoothly back
    
    // Smooth scroll down to result panel
    setTimeout(() => {
      const el = document.getElementById("workspace-results-active") || document.getElementById("right-workspace-pane");
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // CSV Exporter using UTF-8 BOM
  const handleExportCSV = (list: any[]) => {
    const headers = ['date', 'title', 'body text', 'hashtags', 'News category'];
    const rows = list.map(item => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '';
      const titleCleaned = (item.title || "ခေါင်းစဉ်မဲ့သတင်း").replace(/"/g, '""');
      const bodyCleaned = (item.content || "").replace(/"/g, '""');
      
      // Parse hashtags from text if not saved explicitly
      const hashtagsMatch = bodyCleaned.match(/#\w+/g);
      const hashtagsStr = hashtagsMatch ? hashtagsMatch.join(' ') : '#MyanmarNews';
      const categoryStr = (item.category || "General").replace(/"/g, '""');

      return `"${dateStr}","${titleCleaned}","${bodyCleaned}","${hashtagsStr}","${categoryStr}"`;
    });

    // Unicode BOM trigger to safely display Burmese script in MS Excel
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Media_Library_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const getButtonText = () => {
    if (cooldownRemaining > 0) {
      return `ခေတ္တဆိုင်းငံ့ထားပါဦးမည် (${cooldownRemaining} စက္ကန့် စောင့်ဆိုင်းပါ)`;
    }
    if (isLoading) {
      if (selectedInputMode === InputMode.TRANSLATE_EN_TO_MY || selectedInputMode === InputMode.TRANSLATE_MY_TO_EN) {
        return UI_STRINGS_MY.TRANSLATING_AND_GENERATING_BUTTON;
      }
      if (selectedInputMode === InputMode.TRANSLATE_TEXT) {
        return UI_STRINGS_MY.TRANSLATING_BUTTON;
      }
      return UI_STRINGS_MY.GENERATING_SCRIPT_BUTTON;
    }
    if (selectedInputMode === InputMode.TRANSLATE_TEXT) {
      return UI_STRINGS_MY.TRANSLATE_BUTTON_TEXT;
    }
    return UI_STRINGS_MY.GENERATE_SCRIPT_BUTTON;
  };

  const renderInputs = () => {
    switch(selectedInputMode) {
      case InputMode.FILE:
        return <FileInput onFileProcessed={handleFileProcessed} onError={handleFileError} />;
      case InputMode.URL:
        return (
          <UrlInput 
            value={urlInput} 
            onChange={handleUrlChange} 
            onSwitchToDirectPaste={() => handleInputModeChange(InputMode.TRANSLATE_TEXT)} 
          />
        );
      case InputMode.REPORT:
        return (
          <ReportInput 
            value={reportInput} 
            onChange={handleReportChange} 
            targetLanguage={reportTargetLanguage}
            onLanguageChange={setReportTargetLanguage}
          />
        );
      case InputMode.TRANSLATE_EN_TO_MY:
        return (
          <UrlInput 
            value={englishUrlInput} 
            onChange={handleEnglishUrlChange} 
            label={UI_STRINGS_MY.ENTER_ENGLISH_URL_PROMPT} 
            placeholder="ဥပမာ https://www.reuters.com/... သို့မဟုတ် https://www.bbc.com/news/..."
            onSwitchToDirectPaste={() => handleInputModeChange(InputMode.TRANSLATE_TEXT)} 
          />
        );
      case InputMode.TRANSLATE_MY_TO_EN:
        return (
          <UrlInput 
            value={urlInput} 
            onChange={handleUrlChange} 
            label={UI_STRINGS_MY.ENTER_BURMESE_URL_PROMPT}
            placeholder="မြန်မာသတင်းဝဘ်လင့်ခ် ထည့်သွင်းရန်..." 
            onSwitchToDirectPaste={() => handleInputModeChange(InputMode.TRANSLATE_TEXT)} 
          />
        );
      case InputMode.TRANSLATE_TEXT:
        return <TextAreaInput value={pastedTextInput} onChange={handlePastedTextChange} />;
      default:
        return null;
    }
  };

  // -------------------------------------------------------------
  // Render Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col justify-center items-center p-4">
        <LoadingSpinner mode="auth" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Auth Login view if not currently logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center py-10 px-4 select-none">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black text-white font-serif tracking-tight flex justify-center items-center gap-2">
              <span className="bg-white text-zinc-950 px-2.5 py-0.5 rounded font-mono font-black text-xl">MZM</span>
              News Writer
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-serif">
              စူပါအမြန်ဆုံး Burmese Language Newsroom အေအိုင်စနစ်တော်
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={signInWithEmail}>
            <div className="rounded-md space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-serif">
                  အီးမေးလ်လိပ်စာ
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-sans text-xs"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-serif">
                  စကားဝှက်
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-sans text-xs"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 text-xs rounded-lg font-serif">
                ⚠️ {authError}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent text-xs font-bold rounded-lg text-white bg-white hover:bg-zinc-200 active:bg-zinc-300 font-serif cursor-pointer shadow-md text-zinc-950 transition-all uppercase tracking-wider"
              >
                {isSignUpMode ? 'အကောင့်သစ်မှတ်ပုံတင်မည်' : 'အကောင့်ဝင်ရောက်မည်'}
              </button>
            </div>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-3 text-zinc-650 text-[9px] font-bold font-serif uppercase tracking-wider">သို့မဟုတ်</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold rounded-lg bg-zinc-950 hover:bg-zinc-805 border border-zinc-800 text-zinc-200 transition-all font-serif cursor-pointer select-none"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google Account ဖြင့်သတင်းထုတ်မည်</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUpMode(!isSignUpMode)}
                className="text-xs text-zinc-400 hover:text-white font-serif font-bold hover:underline cursor-pointer"
              >
                {isSignUpMode
                  ? 'အကောင့်ရှိပြီးသားလား? ဖုန်းနံပါတ်/အီးမေးလ်ဖြင့် ဝင်ရန်'
                  : 'အကောင့်သစ် လုံးဝမရှိသေးပါက? အခမဲ့ပြုလုပ်ရန်'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser?.email === 'axiom.data7@gmail.com';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row text-slate-900 tracking-normal font-newspaper-body">
      {/* 1. DESKTOP COLLAPSIBLE/AUTOHIDE SIDE PANEL MENU */}
      <aside className={`hidden md:flex flex-col bg-zinc-950 text-zinc-100 border-r border-zinc-900 h-screen sticky top-0 shrink-0 select-none z-30 font-sans transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}>
        <div className="flex flex-col flex-1 p-4 justify-between h-full">
          <div className="space-y-6">
            {/* Logo area */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-850 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-white text-zinc-950 p-2 rounded-xl font-mono text-center font-black tracking-tighter leading-none shrink-0">
                  <span className="text-base">MZM</span>
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 animate-fade-in-quick">
                    <h1 className="text-xs font-black font-serif text-white tracking-tight leading-none flex items-center gap-1.5">
                      Miz Newsroom
                      <span className="bg-red-600 text-white text-[8px] font-sans font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">AI</span>
                    </h1>
                    <p className="text-[10px] text-zinc-400 font-serif mt-1 truncate">Burmese News Workspace</p>
                  </div>
                )}
              </div>
              
              {/* Sleek Autohide Collapse Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 border border-zinc-800 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Navigation links */}
            <nav className="space-y-2" aria-label="Sidebar Navigation">
              <button
                onClick={() => setActiveTab('workspace')}
                className={`w-full flex items-center rounded-xl text-[13px] font-serif font-bold cursor-pointer transition-all select-none ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                } ${
                  activeTab === 'workspace' 
                    ? 'bg-white text-zinc-950 shadow-md transform scale-[1.01]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
                title={isSidebarCollapsed ? "ရေးသားခန်း (Workspace)" : undefined}
              >
                <PenTool className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">ရေးသားခန်း</span>}
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`w-full flex items-center rounded-xl text-[13px] font-serif font-bold cursor-pointer transition-all select-none ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                } ${
                  activeTab === 'library' 
                    ? 'bg-white text-zinc-950 shadow-md transform scale-[1.01]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
                title={isSidebarCollapsed ? "သတင်းတိုက် (Library)" : undefined}
              >
                <FolderHeart className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">သတင်းတိုက်</span>}
              </button>

              <button
                onClick={() => setActiveTab('corrections')}
                className={`w-full flex items-center rounded-xl text-[13px] font-serif font-bold cursor-pointer transition-all select-none ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                } ${
                  activeTab === 'corrections' 
                    ? 'bg-white text-zinc-950 shadow-md transform scale-[1.01]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
                title={isSidebarCollapsed ? "ပြင်ဆင်ချက် (Corrections)" : undefined}
              >
                <SpellCheck className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">ပြင်ဆင်ချက်</span>}
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`w-full flex items-center rounded-xl text-[13px] font-serif font-bold cursor-pointer transition-all select-none ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                } ${
                  activeTab === 'guide' 
                    ? 'bg-white text-zinc-950 shadow-md transform scale-[1.01]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                }`}
                title={isSidebarCollapsed ? "လမ်းညွှန် (Guide)" : undefined}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">လမ်းညွှန်</span>}
              </button>

              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center rounded-xl text-[13px] font-serif font-bold cursor-pointer transition-all select-none border border-transparent ${
                    isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-3'
                  } ${
                    activeTab === 'admin' 
                      ? 'bg-blue-600 text-white shadow-md transform scale-[1.01]' 
                      : 'text-blue-400 hover:text-blue-300 hover:bg-zinc-900/55'
                  }`}
                  title={isSidebarCollapsed ? "စီမံခန့်ခွဲ (Admin)" : undefined}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">စီမံခန့်ခွဲ</span>}
                </button>
              )}
            </nav>
          </div>

          {/* Sidebar bottom/footer */}
          <div className="pt-4 border-t border-zinc-900 space-y-4">
            {/* User Account / Credits Meter */}
            <div className={`bg-zinc-900 border border-zinc-850 rounded-xl transition-all ${
              isSidebarCollapsed ? 'p-2 text-center' : 'p-3 text-[11px]'
            }`}>
              {isSidebarCollapsed ? (
                <div className="flex flex-col items-center gap-1" title={currentUser.email}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-zinc-300 font-mono">
                    {userProfile?.customApiKey ? "🔑" : `${userProfileData ? (userProfileData.limit - userProfileData.usageToday) : (userProfile?.credits ?? 0)}`}
                  </span>
                </div>
              ) : (
                <>
                  <div className="font-mono text-zinc-400 truncate mb-1" title={currentUser.email}>
                    {currentUser.email}
                  </div>
                  <div className="font-serif text-white font-bold leading-none">
                    {userProfile?.customApiKey ? (
                      <span className="text-emerald-400">🔑 Key Active</span>
                    ) : (
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        လက်ကျန်: {userProfileData ? (userProfileData.limit - userProfileData.usageToday) : (userProfile?.credits ?? 0)} ကြိမ်
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Concise Control Action buttons */}
            <div className={`grid gap-1 px-1 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-[10px] font-serif transition-colors cursor-pointer select-none"
                title="ဆက်တင်"
              >
                <Settings className="w-3.5 h-3.5" />
                {!isSidebarCollapsed && <span className="mt-1">ဆက်တင်</span>}
              </button>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-[10px] font-serif transition-colors cursor-pointer select-none"
                title="လမ်းညွှန်ချက်"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {!isSidebarCollapsed && <span className="mt-1">လမ်းညွှန်</span>}
              </button>
              <button
                onClick={handleSignOut}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-955/40 hover:bg-rose-900/50 hover:text-rose-200 text-rose-450 text-[10px] font-serif transition-colors cursor-pointer select-none border border-transparent"
                title="ထွက်မည်"
              >
                <LogOut className="w-3.5 h-3.5" />
                {!isSidebarCollapsed && <span className="mt-1">ထွက်မည်</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & HAMBURGER */}
      <div className="md:hidden flex bg-zinc-950 text-white border-b border-zinc-800 sticky top-0 px-4 py-3 items-center justify-between z-40 select-none">
        <div className="flex items-center gap-2">
          <div className="bg-white text-zinc-950 p-1.5 rounded-lg font-mono text-xs font-black">
            MZM
          </div>
          <span className="text-sm font-black font-serif tracking-tight">Miz Newsroom</span>
        </div>
        
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5 animate-pulse" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 3. MOBILE SIDE PANEL OVERLAY */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" id="mobile-sidebar-overlay-container">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsMobileSidebarOpen(false)} />
          
          <aside className="relative flex flex-col w-64 bg-zinc-950 text-zinc-100 h-full p-5 justify-between animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-805">
                <div className="flex items-center gap-2.5">
                  <div className="bg-white text-zinc-950 p-2 rounded-lg font-mono text-center font-black">
                    MZM
                  </div>
                  <div>
                    <h1 className="text-xs font-serif font-black text-white leading-none">Miz Newsroom</h1>
                    <p className="text-[10px] text-zinc-400 font-serif mt-1">Burmese News AI</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation links - Concise */}
              <nav className="space-y-1" aria-label="Mobile Navigation">
                <button
                  onClick={() => {
                    setActiveTab('workspace');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer select-none ${
                    activeTab === 'workspace' 
                      ? 'bg-white text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 shrink-0" />
                  <span>ရေးသားခန်း</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('library');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer select-none ${
                    activeTab === 'library' 
                      ? 'bg-white text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <FolderHeart className="w-3.5 h-3.5 shrink-0" />
                  <span>သတင်းတိုက်</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('corrections');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer select-none ${
                    activeTab === 'corrections' 
                      ? 'bg-white text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <SpellCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>ပြင်ဆင်ချက်</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('guide');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer select-none ${
                    activeTab === 'guide' 
                      ? 'bg-white text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>လမ်းညွှန်</span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-serif font-bold cursor-pointer select-none ${
                      activeTab === 'admin' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-blue-400 hover:text-blue-300 hover:bg-zinc-900'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>စီမံခန့်ခွဲ</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Bottom section of Mobile sidebar */}
            <div className="pt-4 border-t border-zinc-805 space-y-4">
              <div className="bg-zinc-900 p-2.5 rounded-xl text-[10px]">
                <div className="font-mono text-zinc-400 truncate mb-1">{currentUser.email}</div>
                <div className="font-serif text-white font-bold leading-none">
                  {userProfile?.customApiKey ? (
                    <span className="text-emerald-400">🔑 Key Active</span>
                  ) : (
                    <span>လက်ကျန်: {userProfileData ? (userProfileData.limit - userProfileData.usageToday) : (userProfile?.credits ?? 0)} ကြိမ်</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => { setIsSettingsOpen(true); setIsMobileSidebarOpen(false); }}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white text-[9px] font-serif cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 mb-0.5" />
                  <span>ဆက်တင်</span>
                </button>
                <button
                  onClick={() => { setIsHelpOpen(true); setIsMobileSidebarOpen(false); }}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white text-[9px] font-serif cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 mb-0.5" />
                  <span>လမ်းညွှန်</span>
                </button>
                <button
                  onClick={() => { handleSignOut(); setIsMobileSidebarOpen(false); }}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-rose-950/40 text-rose-400 hover:text-rose-255 text-[9px] font-serif cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 mb-0.5" />
                  <span>ထွက်မည်</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 4. REAL MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
        
        {/* Embedded Disclaimer Banner */}
        <div className="max-w-7xl w-full mx-auto opacity-95 mb-4">
          <DisclaimerMessage />
        </div>

        {/* --- RENDER TAB VIEWPORT --- */}
        <div className="max-w-7xl w-full mx-auto animate-fade-in flex-1">
        
        {/* TAB 1: NEWSROOM WORKSPACE */}
        {activeTab === 'workspace' && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="main-editor-layout-grid-parent">
            
            {/* Form Controls Sidebar (LEFT) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4" id="left-controls-pane">
              <TokenMonitor 
                usageToday={userProfileData?.usageToday ?? (userProfile ? (30 - userProfile.credits) : 0)} 
                limit={userProfileData?.limit ?? 30} 
                hasCustomKey={!!userProfile?.customApiKey} 
                preferredModel={preferredModel}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSaveApiKey={async (key) => {
                  try {
                    await updateUserApiKey(currentUser.uid, key);
                    const updated = await getOrCreateUserProfile(currentUser);
                    setUserProfile(updated);
                    setCustomApiKeyForGemini(key.trim() || undefined);
                  } catch (e) {
                    console.error("Failed to save api key:", e);
                  }
                }} 
              />
              <div className="bg-white border border-slate-200 p-5 rounded-2xl relative shadow-sm">
                
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <h2 className="text-xs font-black font-serif text-slate-850 uppercase tracking-wider">
                    <span>AI အရေးအသားထိန်းရန်(Controls)</span>
                  </h2>
                  <button
                    onClick={handleOpenActiveModuleTips}
                    className="text-[10px] bg-stone-100 hover:bg-stone-200 border border-slate-300 text-slate-800 font-serif font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    💡Tips
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Step 1: Input selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 font-serif">
                      ၁။ သတင်းထုတ်လုပ်ရန် ထည့်သွင်းမှုပုံစံ ရွေးချယ်ရန် (Input Mode)
                    </label>
                    <InputSelector selectedMode={selectedInputMode} onSelectMode={handleInputModeChange} />
                  </div>

                  {/* Step 2: Content Fields styled as sleek foldable sections */}
                  <div className="space-y-3" id="foldable-controls-container">
                    
                    {/* Collapsible Panel 1: Input Content Fields */}
                    <div className="bg-stone-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => setFoldedSections(prev => ({ ...prev, inputConfig: !prev.inputConfig }))}
                        className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 hover:bg-stone-200/85 border-b border-slate-200 cursor-pointer select-none text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded font-black">01</span>
                          <span className="text-xs font-serif font-black text-slate-800 tracking-wide">
                            ထည့်သွင်းမှုအချက်အလက် (Input Source Fields)
                          </span>
                        </div>
                        {!foldedSections.inputConfig ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 transition-transform" />
                        ) : (
                          <ChevronLeft className="w-4 h-4 text-slate-500 transition-transform" />
                        )}
                      </button>
                      
                      {!foldedSections.inputConfig && (
                        <div className="p-4 space-y-4 animate-fade-in">
                          {renderInputs()}
                        </div>
                      )}
                    </div>

                    {/* Collapsible Panel 2: Style, tone & length configuration */}
                    {selectedInputMode !== InputMode.TRANSLATE_TEXT && (
                      <div className="bg-stone-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => setFoldedSections(prev => ({ ...prev, styleOptions: !prev.styleOptions }))}
                          className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 hover:bg-stone-200/85 border-b border-slate-200 cursor-pointer select-none text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 font-mono text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded font-black">02</span>
                            <span className="text-xs font-serif font-black text-slate-800 tracking-wide">
                              သတင်းလေယူလေသိမ်းနှင့်ရေးသားဟန် (Voice, Tone & Style)
                            </span>
                          </div>
                          {!foldedSections.styleOptions ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 transition-transform" />
                          ) : (
                            <ChevronLeft className="w-4 h-4 text-slate-500 transition-transform" />
                          )}
                        </button>
                        
                        {!foldedSections.styleOptions && (
                          <div className="p-4 space-y-4 animate-fade-in">
                            <ScriptLengthSelector 
                              selectedLength={selectedScriptLength}
                              onLengthChange={handleScriptLengthChange}
                            />
                            <ScriptToneSelector
                              selectedTone={selectedScriptTone}
                              onToneChange={handleScriptToneChange}
                            />
                            {selectedInputMode !== InputMode.TRANSLATE_MY_TO_EN && (
                              <ScriptTypeSelector
                                selectedType={selectedScriptType}
                                onTypeChange={handleScriptTypeChange}
                              />
                            )}
                            
                            <div className="text-right pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setTipsActiveTab('style');
                                  setIsTipsOpen(true);
                                }}
                                className="text-[11px] text-slate-600 hover:text-slate-900 hover:underline font-serif font-bold cursor-pointer"
                              >
                                💡 စကားလုံးသဒ္ဒါပြင်ဆင်မှုဟန်များဖတ်ရန်
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapsible Panel 3: SEO Metadata Options */}
                    {selectedInputMode !== InputMode.TRANSLATE_TEXT && (
                      <div className="bg-stone-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => setFoldedSections(prev => ({ ...prev, seoOptions: !prev.seoOptions }))}
                          className="w-full flex items-center justify-between px-4 py-3 bg-stone-100 hover:bg-stone-200/85 border-b border-slate-200 cursor-pointer select-none text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 font-mono text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded font-black">03</span>
                            <span className="text-xs font-serif font-black text-slate-800 tracking-wide">
                              ရှာဖွေမှုအညွှန်းစနစ် (Search Engine Optimization API)
                            </span>
                          </div>
                          {!foldedSections.seoOptions ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 transition-transform" />
                          ) : (
                            <ChevronLeft className="w-4 h-4 text-slate-500 transition-transform" />
                          )}
                        </button>
                        
                        {!foldedSections.seoOptions && (
                          <div className="p-4 space-y-4 animate-fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <label className="flex items-center cursor-pointer group select-none">
                                <div className="relative">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={useSEO}
                                    onChange={() => setUseSEO(!useSEO)}
                                  />
                                  <div className={`block w-9 h-5 rounded-full transition-colors ${useSEO ? 'bg-zinc-950' : 'bg-slate-350'}`}></div>
                                  <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${useSEO ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-2.5 text-xs font-serif font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                  {UI_STRINGS_MY.SEO_OPTIMIZATION_TOGGLE} (SEO Metadata အလိုအလျောက် ရေးဆွဲစနစ်)
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {error && (
                  <ErrorMessage 
                    message={error} 
                    onOpenSettings={() => setIsSettingsOpen(true)} 
                    onSwitchToPasteMode={() => handleInputModeChange(InputMode.TRANSLATE_TEXT)}
                  />
                )}

                {/* Primary Actions Button */}
                <div className="mt-5">
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGenerateDisabled()}
                    className={`w-full font-bold py-3.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer font-serif text-sm flex items-center justify-center gap-2 select-none outline-none border focus:ring-2 focus:ring-amber-500/20 ${
                      cooldownRemaining > 0 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-zinc-950 hover:bg-zinc-900 border-transparent text-white disabled:bg-stone-100 disabled:text-slate-400 disabled:border-slate-200'
                    }`}
                  >
                    {isLoading && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {cooldownRemaining > 0 && (
                      <span className="text-base animate-pulse">⏳</span>
                    )}
                    <span>{getButtonText()}</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Results Output Canvas (RIGHT) */}
            <div className="lg:col-span-7 space-y-4" id="right-workspace-pane">
              {isLoading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[400px] flex items-center justify-center shadow-xs">
                  <LoadingSpinner mode="generate" queueStatus={queueStatus} />
                </div>
              )}

              {!isLoading && (
                <>
                  {generatedScript ? (
                    <div className="space-y-4">
                      {intermediateTranslation && (
                        <div className="p-5 bg-stone-100/50 border border-slate-250 rounded-2xl shadow-inner">
                          <h2 className="font-serif text-[12px] font-extrabold text-slate-800 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
                            {UI_STRINGS_MY.INTERMEDIATE_TRANSLATION_HEADING}
                          </h2>
                          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed select-text font-serif">
                            {intermediateTranslation}
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm relative">
                        <ScriptDisplay 
                          script={generatedScript}
                          sources={groundingSources || undefined}
                          seoData={seoData}
                          category={category}
                          wasServedFromCache={wasServedFromCache}
                          statistics={reportStatistics}
                          chartData={reportChartData}
                          chartTitle={reportChartTitle}
                          chartType={reportChartType}
                          scrapeMethod={scrapeMethod}
                          scrapeNotice={scrapeNotice}
                        />
                      </div>

                      {/* Extended Interactive Post-Generation Utilities */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                          <span className="text-sm">⚡</span>
                          <h3 className="font-serif text-[12px] font-extrabold text-slate-800 uppercase tracking-wider">တည်းဖြတ်ရန် အဆင့်မြင့် လုပ်ဆောင်ချက်များ</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            onClick={() => downloadFile(generatedScript, "news_myanmar_script", 'txt')}
                            className="bg-stone-50 hover:bg-stone-100 text-slate-800 font-bold py-3 px-4 rounded-xl border border-slate-250 shadow-xs text-xs font-serif cursor-pointer transition-all flex items-center justify-center gap-2 select-none"
                          >
                            💾 Text (.Txt) ဒေါင်းရန်
                          </button>

                          <button
                            onClick={handleSaveToLibrary}
                            disabled={isSavingToLibrary || saveToLibrarySuccess}
                            className={`font-serif font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
                              saveToLibrarySuccess 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            {isSavingToLibrary ? 'သိမ်းဆည်းနေပါသည်...' : saveToLibrarySuccess ? '✅ သိမ်းဆည်းပြီးပါပြီ' : '📁 ဖိုင်ထဲတွင် သိမ်းဆည်းရန်'}
                          </button>

                          <button
                            onClick={handleProofreadScript}
                            disabled={isProofreading}
                            className="bg-zinc-950 hover:bg-zinc-900 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all text-xs font-serif cursor-pointer flex items-center justify-center gap-2 select-none"
                          >
                            🔍 သတ်ပုံစစ်ဆေးမည် (Proofread)
                          </button>
                        </div>
                      </div>

                      {/* Keywords extracts */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-2.5">
                          <h3 className="font-serif text-[12px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏷️ သတင်း Keyword အဓိက စကားလုံးများ Extracting</span>
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleExtractKeywords}
                            disabled={isExtractingKeywords}
                            className="bg-stone-100 hover:bg-stone-200 border border-slate-300 text-slate-800 text-xs py-2 px-4 rounded-lg font-serif font-bold cursor-pointer transition-colors"
                          >
                            {isExtractingKeywords ? 'ထုတ်ယူနေပါသည်...' : 'သတင်းအသုံးနူန်းအလိုက် Key Tags ထုတ်ယူမည်'}
                          </button>
                        </div>

                        {isExtractingKeywords && <LoadingSpinner mode="keywords" />}

                        {extractedKeywords && !isExtractingKeywords && (
                          <div className="bg-stone-50 p-4 border border-slate-200 rounded-xl flex flex-wrap gap-2 animate-fade-in">
                            {extractedKeywords.map((k, i) => (
                              <span key={i} className="bg-white text-slate-800 text-xs font-serif font-extrabold px-3 py-1.5 rounded-lg border border-slate-250 hover:border-slate-400 cursor-pointer select-all">
                                #{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl py-24 px-6 text-center shadow-xs flex flex-col justify-center items-center h-full min-h-[500px]">
                      <div className="w-16 h-16 bg-stone-100 border border-slate-200 rounded-full flex items-center justify-center text-3xl mb-4 text-center">
                        🖋️
                      </div>
                      <h3 className="font-serif text-slate-900 font-extrabold text-base">
                        စာကားလုံးကျစ်လစ်စေရန် ထပ်မံတည်းဖြတ်မှု
                      </h3>
                      <p className="max-w-md text-slate-500 font-serif text-xs leading-relaxed mt-2">
                        ဘယ်ဘက်တွင် သတင်းကော်ပီဖိုင်၊ အစီရင်ခံစာ သို့မဟုတ် လင့်ခ်တစ်ခုခု ထည့်သွင်းပြီး "စတင်ရေးသားမည်" ကို နှိပ်လိုက်ပါ။ ဤနေရာတွင် စာသားများ အချောထွက်ပေါ်လာမည် ဖြစ်ပါသည်။
                      </p>
                    </div>
                  )}

                  {isProofreading && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[250px] flex items-center justify-center shadow-xs">
                      <LoadingSpinner mode="proofread" />
                    </div>
                  )}

                  {/* Proofreading results difference block */}
                  {!isProofreading && proofreadScriptContent && generatedScript && (
                    <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                      <ProofreadDiffView 
                        originalScript={generatedScript}
                        proofreadScript={proofreadScriptContent}
                      />
                      <div className="text-center pt-2">
                        <button
                          onClick={() => downloadFile(proofreadScriptContent, "proofread_script_final", 'txt')}
                          className="bg-zinc-950 hover:bg-zinc-900 text-white font-bold py-3 px-8 rounded-xl shrink-0 cursor-pointer font-serif text-xs"
                        >
                          💾 တည်းဖြတ်ပြီးသတင်း (.Txt) သိမ်းမည်
                        </button>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>

          </main>
        )}

        {/* TAB 2: USER PROFILE & LIBRARY */}
        {activeTab === 'library' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
            
            {/* Split Grid: Profile Dashboard Left, Usage status progress Right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 border-b border-stone-200 items-start">
              <div className="md:col-span-6 space-y-4">
                <div>
                  <span className="text-[10px] bg-zinc-950 text-white px-2.5 py-1 rounded-full font-serif font-bold uppercase tracking-widest">
                    သတင်းခန်းအဖွဲ့ဝင် (Active News Publisher Profile)
                  </span>
                  <h3 className="text-xl font-black text-slate-950 font-serif mt-2">{currentUser.email}</h3>
                  <p className="text-xs text-slate-500 font-serif leading-normal mt-1">
                    Joined Account: Registered securely under Cloud SQL Relational Database.
                  </p>
                </div>

                <div className="inline-flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="p-1 px-3 bg-stone-100 rounded-lg border border-slate-250 font-bold block">
                    DB ID: {userProfileData?.user?.id || 'Allocating...'}
                  </span>
                  <span className="p-1 px-3 bg-stone-100 rounded-lg border border-slate-250 font-bold block">
                    ROLE: {isSuperAdmin ? '🔴 SUPER JOURNALISM ADMIN' : '🟢 REGISTERED PRESS CORRESPONDENT'}
                  </span>
                </div>
              </div>

              {/* Progress and Warning alerts bar */}
              <div className="md:col-span-6 bg-stone-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <div>
                  <div className="flex justify-between items-center text-xs font-serif font-bold text-slate-800 mb-1.5">
                    <span>ယနေ့ ကန့်သတ်ချက် သုံးစွဲမှု (Daily Usage Level)</span>
                    <span>{userProfileData?.usageToday ?? 0} / {userProfileData?.limit ?? 30} ကြိမ်</span>
                  </div>
                  
                  {/* Dynamic Progress Indicator */}
                  <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (((userProfileData?.usageToday ?? 0) / (userProfileData?.limit ?? 30)) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-serif mt-1.5">
                    * ကိုယ်ပိုင် Gemini API Key ရှိပါက အထက်ပါ ကန့်သတ်ချက်မရှိ သုံးစွဲနိုင်ပါသည်။
                  </p>
                </div>
              </div>
            </div>

            {/* Warn notice older than 30 days */}
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-serif flex gap-3 leading-relaxed">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <strong className="block mb-0.5">အရေးကြီး သတိပေးချက် (Data Pruning Warning) -</strong>
                သင်သိမ်းဆည်းထားသော သတင်းဆောင်းပါးများကို စနစ်၏တန်ဖိုးရှိသော memory လုံခြုံရေးအရ <strong className="text-red-700">ရက်ပေါင်း ၃၀ ကျော်ပါက အလိုအလျောက် ပယ်ဖျက်သွားမည် ဖြစ်ပါသည်။</strong> ပယ်ဖျက်ခြင်းမပြုလုပ်မီ သင်၏ သတင်းစာမူများကို အောက်ပါ <strong className="font-extrabold text-blue-800">"ဒေါင်းလုဒ်ဆွဲမည် (.CSV File)"</strong> ခလုတ်ကို အသုံးပြုပြီး စက်ထဲသို့ အဆင်သင့် ကူးယူသိမ်းဆည်းသိမ်းထားရန် တိုက်တွန်းအပ်ပါသည်။
              </div>
            </div>

            {/* Custom Saved Scripts List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="font-serif text-sm font-bold text-slate-900">
                  📚 သင်သိမ်းဆည်းထားသော သတင်းစာမူများ (Your Saved Scripts Library)
                </h4>

                <button
                  onClick={() => handleExportCSV(savedScripts)}
                  disabled={savedScripts.length === 0}
                  className="px-4 py-2 border rounded-lg text-xs font-serif font-extrabold cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-stone-100 disabled:text-slate-400 disabled:border-slate-200 shadow-sm flex items-center justify-center gap-1.5 self-start select-none border-transparent"
                >
                  📥 ဒေါင်းလုဒ်ဆွဲရန် (CSV Output Download)
                </button>
              </div>

              {scriptsLoading ? (
                <LoadingSpinner mode="auth" />
              ) : savedScripts.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-3xl block mb-2 select-none">🗄️</span>
                  <p className="text-xs text-slate-500 font-serif"> သင့်ဖိုင်တွင် လက်ရှိအချိန်အထိ မည်သည့်သတင်းမှ သိမ်းဆည်းထားခြင်းမရှိသေးပါ။</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs font-serif">
                    <thead>
                      <tr className="bg-stone-50 border-b border-slate-200 text-slate-500 select-none text-[11px]">
                        <th className="p-4 font-bold">ရက်စွဲ (Date)</th>
                        <th className="p-4 font-bold">သတင်းခေါင်းစဉ် (Title)</th>
                        <th className="p-4 font-bold">သတင်းအမျိုးအစား</th>
                        <th className="p-4 font-bold">ပုံစံ (Type)</th>
                        <th className="p-4 font-bold text-right">လုပ်ဆောင်ချက်များ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedScripts.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-50/20 transition-all">
                          <td className="p-4 font-mono text-[10px] text-slate-500">
                            {item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'}
                          </td>
                          <td className="p-4 font-extrabold text-slate-850 max-w-sm truncate select-text" title={item.title}>
                            {item.title}
                          </td>
                          <td className="p-4">
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="p-4 uppercase font-mono text-[10px] text-slate-500">
                            {item.scriptType || 'NEWS'}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenScriptFromLibrary(item)}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-bold cursor-pointer border border-blue-200 transition-colors inline-block"
                            >
                              ဖတ်ရှု/ပြင်ဆင်ရန်
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.content);
                                alert("သတင်းကူးယူပြီးပါပြီ။");
                              }}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded font-bold cursor-pointer border border-slate-250 transition-colors inline-block"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleDeleteSavedScript(item.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold cursor-pointer border border-rose-200 transition-colors inline-block"
                            >
                              ဖျက်မည်
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: PERSONAL VOCABULARY CORRECTIONS */}
        {activeTab === 'corrections' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
            
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 font-serif">
                📖 စကားလုံးအမှားပြင်ဆင်ချက်များ (Personal Dictionary Corrections & Memory Sync)
              </h3>
              <p className="text-xs text-slate-500 font-serif leading-relaxed mt-1">
                ကိုယ်တိုင်သတ်မှတ်ထားသော စကားလုံးပြင်စည်းကမ်းများကို သိမ်းဆည်းပေးမည် ဖြစ်ပြီး၊ နောက်တစ်ကြိမ် generate လုပ်သည့်အခါ မော်ဒယ်၏ မြန်မာစာလုံးသဒ္ဒါအသုံးကို ၁၀၀% တိကျစွာ လမ်းညွှန်ပြုပြင်ပေးမည်။
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form to add a new spelling error mapping */}
              <form onSubmit={handleAddUserCorrection} className="lg:col-span-5 bg-stone-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider font-serif">
                  စကားလုံးပြင်ဆင်မှုအသစ် ထည့်ရန် (Add Single Rule)
                </span>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    စကားလုံးအလွဲ သို့မဟုတ် အမည်မှား (Original Word, Term or Name)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans"
                    placeholder="e.g. မိုဒီ သို့မဟုတ် နိုင်းဂျီးရီးယား"
                    value={newWrongWord}
                    onChange={(e) => setNewWrongWord(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    မှန်ကန်သောအသုံးနှုန်း (Corrected Standard Replacement)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans"
                    placeholder="e.g. မိုဒီ သို့မဟုတ် နိုင်ဂျီးရီးယား"
                    value={newCorrectedWord}
                    onChange={(e) => setNewCorrectedWord(e.target.value)}
                  />
                </div>

                {correctionError && (
                  <p className="text-xs text-red-600 font-serif">⚠️ {correctionError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 disabled:opacity-55 text-white font-bold py-2.5 rounded-lg text-xs font-serif cursor-pointer flex items-center justify-center select-none"
                >
                  {isSubmittingCorrection ? "သိမ်းဆည်းနေပါသည်..." : "ကိုယ်ပိုင်အမှားပြင်ဆင်ချက်သိမ်းဆည်းမည်"}
                </button>
              </form>

              {/* List of existing spelling corrections */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="font-serif text-sm font-bold text-slate-900">
                  📋 သင်သိမ်းဆည်းထားသော စကားလုံးပြင်စည်းကမ်းများ
                </h4>

                {correctionsLoading ? (
                  <LoadingSpinner mode="auth" />
                ) : userCorrectionsList.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400 font-serif">စကားလုံး ပြင်ဆင်ထည့်သွင်းထားခြင်းမရှိသေးပါ။</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs font-serif">
                      <thead>
                        <tr className="bg-stone-50 border-b border-slate-200 text-slate-500">
                          <th className="p-3 font-bold">စကားလုံးအလွဲ (Original)</th>
                          <th className="p-3 font-bold">အစားထိုးရမည့်စကားလုံး (Correct)</th>
                          <th className="p-3 font-bold">ဖွင့်/ပိတ် (Is Active)</th>
                          <th className="p-3 font-bold text-right">လုပ်ဆောင်ချက်</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userCorrectionsList.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50">
                            <td className="p-3 font-extrabold text-rose-700 select-text">
                              {rule.originalWord}
                            </td>
                            <td className="p-3 font-extrabold text-emerald-700 select-text">
                              {rule.correctedWord}
                            </td>
                            <td className="p-3">
                              <label className="flex items-center cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={rule.isEnabled}
                                  onChange={() => handleToggleCorrection(rule.id, rule.isEnabled)}
                                  className="form-checkbox text-zinc-950 w-4 h-4 rounded-md border-slate-300"
                                />
                                <span className="ml-1.5 text-slate-500 text-[10px]">
                                  {rule.isEnabled ? 'အသုံးပြုမည်' : 'မသုံးပါ'}
                                </span>
                              </label>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteCorrection(rule.id)}
                                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: CATEGORY TEMPLATES REFERENCE GUIDE */}
        {activeTab === 'guide' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 font-serif">
              ‌သတင်းအမျိုးအစားအလိုက် AIမှရေးဖွဲ့သည့်ပု့စံများ (Journalism Reference Guide)
              </h3>
              <p className="text-xs text-slate-500 font-serif leading-relaxed mt-1">
                မဇ္ဈိမသတင်းဌာန သတင်းခန်းစံနှုန်းများအရ အမျိုးအစားအလိုက် လေ့ကျင့်သတ်မှတ်ထားသည်။
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">Politics (နိုင်ငံရေးသတင်း)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖွဲ့စည်းပုံဖော်မြူလာ:</strong> Headline &rarr; Opening Hook (အဓိကအချိုးကွေ့) &rarr; Lead Hook (ဆန်းသစ်သည့်လှုံ့ဆော်မှု) &rarr; Statement Analysis &rarr; Stakeholders Opinion &rarr; Constitutional Reference &rarr; Call-to-action (နိဂုံး).
                  <br />
                  <strong>အာရုံစိုက်ရန်:</strong> သမာသမတ်ကျမှုရှိရမည်ဖြစ်ပြီး၊ ပါတီဂိုဏ်းဂဏစွဲများ ကင်းရှင်းစေရန် ဟန်ချက်ညီဖွဲ့စည်းထားသည်။
                </p>
              </div>

              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-serif">Economy (စီးပွားရေးသတင်း)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖော်မြူလာ:</strong> Financial Highlight &rarr; Macroeconomic Impact &rarr; Market Statistics &rarr; Direct Stakeholder Quote &rarr; Global Factors Analysis &rarr; Future Trend Index.
                  <br />
                  <strong>အာရုံစိုက်ရန်:</strong> ငွေကြေးကိန်းဂဏန်းများ၊ ဂျီဒီပီ (GDP) ဒေတာများကို တိကျမှန်ကန်စွာ ဇယားများနှင့် တိုက်ဆိုင်ပြသရမည်။
                </p>
              </div>

              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-blue-105 bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold font-serif">Social (လူမှုရေးသတင်း)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖော်မြူလာ:</strong> Human Interest Angle &rarr; Case Incident &rarr; Social Impact Range &rarr; NGO/CBO Comments &rarr; Community Feedback &rarr; Civic Conclusion.
                </p>
              </div>

              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">World (နိုင်ငံတကာသတင်း)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖော်မြူလာ:</strong> Geopolitics Anchor &rarr; Instant Update Story &rarr; Historic Timeline &rarr; UN/International Response &rarr; Regional Stability Indicator.
                </p>
              </div>

              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold font-serif">Sports & Tech (အားကစားနှင့် နည်းပညာ)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖော်မြူလာ:</strong> Tech Invention / Match Result &rarr; Feature Breakthrough &rarr; Scientific data details &rarr; Expert review statement &rarr; User feedback poll.
                </p>
              </div>

              <div className="p-5 bg-stone-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold font-serif">Entertainment (ဖျော်ဖြေရေးကဏ္ဍ)</span>
                <p className="text-[11px] text-slate-650 leading-relaxed font-serif">
                  <strong>ဖော်မြူလာ:</strong> Headline Spotlight &rarr; Cultural Reference &rarr; Artist Profiles &rarr; Review Scores &rarr; Audience Sentiment trends &rarr; Scheduling.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: SUPER ADMIN DASHBOARD */}
        {activeTab === 'admin' && isSuperAdmin && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
            
            <div className="border-b border-blue-150 pb-4">
              <span className="text-[9px] bg-blue-600 text-white px-2.5 py-1 rounded-full font-serif font-extrabold uppercase tracking-widest">
                🔴 Super Admin Dashboard Controls
              </span>
              <h3 className="text-base font-black text-slate-950 font-serif mt-2">
                ပင်မ မြန်မာသတင်းစာလုံး ညွှန်းတမ်းကြီးကြပ်ရေး (Global Translation Standards Dictation API)
              </h3>
              <p className="text-xs text-slate-550 font-serif mt-1 leading-relaxed">
                ဤကဏ္ဍတွင် ဖြည့်စွက်ထားသော English Term မှ Standard Burmese Standard Vocabulary ပြင်ဆင်ချက်များသည် <strong>Mizzima Application တစ်ခုလုံးရှိ အသုံးပြုသူအားလုံး၏ generating လုပ်ငန်းစဉ်တိုင်းတွင်</strong> အလိုအလျောက် သဒ္ဒါစည်းကမ်းအဖြစ် ပါဝင်သွားမည်ဖြစ်သည်။ (Protected endpoint, restricted exclusively to axiom.data7@gmail.com).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form to add global translation pair */}
              <form onSubmit={handleAddGlobalVocabulary} className="lg:col-span-5 bg-stone-50 border border-slate-250 p-5 rounded-2xl space-y-4 shadow-xs">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wide block">
                  ဂလိုဘယ်သတ်မှတ်ချက်အသစ် ကောက်နုတ်ရန် (Add Global Standard Word)
                </span>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    မူရင်း အင်္ဂလိပ် ဝေါဟာရ (English Word)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    placeholder="e.g. Secretary General"
                    value={newGlobalEnglish}
                    onChange={(e) => setNewGlobalEnglish(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    မြန်မာစာပြန်ဆိုချက် စံသတ်မှတ်ချက် (Standard Burmese Standard)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    placeholder="e.g. အထွေထွေအတွင်းရေးမှူးချုပ်"
                    value={newGlobalBurmese}
                    onChange={(e) => setNewGlobalBurmese(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    စကားရပ်အမျိုးအစား (Part of Speech)
                  </label>
                  <select
                    value={newGlobalPart}
                    onChange={(e) => setNewGlobalPart(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif"
                  >
                    <option value="Noun">နာမ် (Noun)</option>
                    <option value="Verb">ကြိယာ (Verb)</option>
                    <option value="Title">ဂုဏ်ထူးဆောင်ဘွဲ့အမည် (Title/Protocol)</option>
                    <option value="Place">ဒေသန္တရအမည် (Place Name)</option>
                    <option value="General">ယေဘုယျအသုံးအနှုန်း</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 font-serif uppercase">
                    ဖြည့်စွက်အကြံပြုချက်/ညွှန်းကိန်း (Notes)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif"
                    placeholder="သတင်းစာသားထဲ ထည့်သွင်းစဉ်သတိပြုရန်မှတ်ချက်..."
                    value={newGlobalNotes}
                    onChange={(e) => setNewGlobalNotes(e.target.value)}
                  />
                </div>

                {globalError && (
                  <p className="text-xs text-red-650 font-serif">⚠️ {globalError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingGlobal}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-55 text-white font-bold py-2.5 rounded-lg text-xs font-serif cursor-pointer shadow-xs border border-transparent flex items-center justify-center select-none"
                >
                  {isSubmittingGlobal ? "ဆက်သွယ်သိမ်းဆည်းနေဆဲ..." : "ကမ္ဘာ့အဆင့်ပြင်သတ်မှတ်ချက် တင်သွင်းရန်"}
                </button>
              </form>

              {/* View/Delete existing global glossary items */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="font-serif text-sm font-bold text-slate-900">
                  📋 Global Standards Table (ယူနီကုဒ်စံသတ်မှတ်ချက် စုစည်းမှု)
                </h4>

                {globalLoading ? (
                  <LoadingSpinner mode="auth" />
                ) : globalVocabularyList.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400 font-serif">လက်ရှိဒေတာဘေ့စ်တွင် မည်သည့် Global Vocabulary မှမရှိသေးပါ။</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs font-serif">
                      <thead>
                        <tr className="bg-stone-50 border-b border-slate-200 text-slate-500">
                          <th className="p-3 font-bold">English Word</th>
                          <th className="p-3 font-bold">ဘသာပြန်စံနှုန်း</th>
                          <th className="p-3 font-bold">POS</th>
                          <th className="p-3 font-bold">အချက်အလက် (Notes)</th>
                          <th className="p-3 font-bold text-right">လုပ်ဆောင်ချက်</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {globalVocabularyList.map((vocab) => (
                          <tr key={vocab.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-800 select-text">{vocab.englishWord}</td>
                            <td className="p-3 font-extrabold text-blue-700 select-text">{vocab.burmeseTranslation}</td>
                            <td className="p-3 text-slate-550">{vocab.partOfSpeech || 'General'}</td>
                            <td className="p-3 text-slate-500 max-w-[120px] truncate" title={vocab.notes}>{vocab.notes || '-'}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteGlobalVocabulary(vocab.id)}
                                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* --- Settings Modal --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-950 font-serif">⚙️ ဆက်တင်များ (Settings)</h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-950 font-bold font-serif cursor-pointer text-xl p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[12px] text-slate-600 font-serif leading-relaxed">
                စံသတ်မှတ်ချက်အရ အကောင့်တစ်ခုလျှင် <strong>တစ်ရက် အခမဲ့ (၃၀) ကြိမ်</strong> အသုံးပြု သုံးစွဲနိုင်သည်။ ကန့်သတ်ချက်မရှိ သုံးစွဲလိုလျှင် သို့မဟုတ် high demand load များကို ကျော်လွှားရန် ကိုယ်ပိုင် Gemini / OpenAI API Key ကို ထည့်သွင်းအသုံးပြုပါ။
              </p>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-serif">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 font-mono text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-serif">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={tempOpenAiKey}
                  onChange={(e) => setTempOpenAiKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 font-mono text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  placeholder="sk-proj-..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 font-serif">
                  အသုံးပြုမည့် AI Model Engine (Default: Gemini 3.5 Flash Free Version)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPreferredModelLocal('gemini')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      preferredModel === 'gemini' 
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-950/20' 
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-serif font-black">Gemini 3.5 Flash</span>
                      <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded font-bold uppercase ${preferredModel === 'gemini' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        Free (Default)
                      </span>
                    </div>
                    <span className={`text-[10px] font-serif mt-1 ${preferredModel === 'gemini' ? 'text-zinc-300' : 'text-slate-500'}`}>
                      အမြန်ဆုံးနှင့် အခမဲ့အဆင့်တွင် အတည်ငြိမ်ဆုံး စနစ်
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModelLocal('gemini-pro')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      preferredModel === 'gemini-pro' 
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-950/20' 
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-serif font-black">Gemini 3.5 Flash</span>
                      <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded font-bold uppercase ${preferredModel === 'gemini-pro' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}>
                        Optimized
                      </span>
                    </div>
                    <span className={`text-[10px] font-serif mt-1 ${preferredModel === 'gemini-pro' ? 'text-zinc-300' : 'text-slate-500'}`}>
                      သတင်းအရေးအသား တိကျမှုပိုမိုကောင်းမွန်အောင် ညှိထားသည်
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModelLocal('gemini-2.5-flash')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      preferredModel === 'gemini-2.5-flash' 
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-950/20' 
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-serif font-black">Gemini 2.5 Flash</span>
                      <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded font-bold uppercase ${preferredModel === 'gemini-2.5-flash' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800'}`}>
                        Free
                      </span>
                    </div>
                    <span className={`text-[10px] font-serif mt-1 ${preferredModel === 'gemini-2.5-flash' ? 'text-zinc-300' : 'text-slate-500'}`}>
                      ပေါ့ပါးမြန်ဆန်သော အရန် Gemini Free Model
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModelLocal('openai')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      preferredModel === 'openai' 
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-950/20' 
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[12px] font-serif font-black">OpenAI GPT-4o-mini</span>
                      <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded font-bold uppercase ${preferredModel === 'openai' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        OpenAI Key
                      </span>
                    </div>
                    <span className={`text-[10px] font-serif mt-1 ${preferredModel === 'openai' ? 'text-zinc-300' : 'text-slate-500'}`}>
                      ကိုယ်ပိုင် OpenAI Key (sk-proj-...) ဖြင့်သုံးရန်
                    </span>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-500 font-serif mt-2 italic leading-relaxed">
                  * <strong>Gemini 3.5 Flash (Free Version)</strong> သည် စံသတ်မှတ်ချက်အရ အကောင်းဆုံးနှင့် အမြန်ဆုံး အခမဲ့ engine ဖြစ်ပြီး Mizzima Media Guideline စည်းမျဉ်းများအတိုင်း စနစ်တကျ ရေးသားပေးပါသည်။
                </p>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-[11px] font-black text-slate-900 font-serif">🔑 အခမဲ့ API Keys ရယူနည်း</h4>
                <ol className="list-decimal text-[11px] text-slate-600 pl-4 space-y-1.5 font-serif leading-relaxed">
                  <li>Google AI Studio (<a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">aistudio.google.com</a>) သို့မဟုတ် OpenAI Portal (<a href="https://platform.openai.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a>) တွင် ရယူပါ။</li>
                  <li>သင်၏ Account ကိုသုံး၍ API Key သစ်များကို လွယ်ကူလျင်မြန်စွာ ဖန်တီးရယူနိုင်ပါသည်။</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 px-4 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer border border-slate-200"
              >
                ပိတ်မည်
              </button>
              <button
                onClick={handleSaveApiKey}
                className="p-2 px-5 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs border border-transparent"
              >
                သိမ်းဆည်းမည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Help Guidelines Pop-up Modal --- */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-250 pb-4">
              <h3 className="text-lg font-black text-slate-950 font-serif flex items-center gap-2">
                💡 အသုံးပြုနည်းလမ်းညွှန် (User Guide)
              </h3>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-slate-950 font-bold font-serif cursor-pointer text-2xl p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif text-slate-700 leading-relaxed">
              <p className="text-[13px] text-slate-950 font-bold mb-3">
                Burmese News AI Workspace ၏ အဓိက လုပ်ဆောင်ချက်များ -
              </p>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">📁 ဖိုင်တင်ပြီး သတင်းရေးသားခြင်း</h4>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    ဖမ်းယူထားသော ဖိုင်များ (PDF, DOCX, TXT) ကို ကွက်လပ်မကျန် ဖတ်ရှုပြီး၊ ဗီဒီယိုသတင်း script သို့မဟုတ် သတင်းစာသား အချောကို ပြန်လည် ရေးသားပေးသည်။ ရေးသားပြီးသော သတင်းတွင် ထပ်မံဖြည့်စွက်အချက်အလက်များ/ ဖန်တီးထားသော အကြောင်းအရာများ မပါရှိစေရန် ထိန်းညှိထားသည်။
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">🌐 ဝဘ်ဆိုက် (URL)မှ သတင်းထုတ်လုပ်ခြင်း</h4>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    အသုံးပြုလိုသည့် သတင်း web linkကို ထည့်သွင်းလိုက်ပါက Gemini AIက ၎င်းစာမျက်နှာမှ သတင်းစာသားများကို အလိုအလျောက် သီးသန့်ဆွဲထုတ်ပြီး ရွေးချယ်ထားသော သတင်းပုံစံသို့ ပြန်လည်ရေးသားပေးပါသည်။
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">🇬🇧 ဘာသာပြန်သတင်း အင်္ဂလိပ်မှ မြန်မာ</h4>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    မူရင်း အင်္ဂလိပ်ဘာသာ သတင်းလင့်ခ်ကို ထည့်သွင်းပေးပြီး မြန်မာဘာသာသို့ တိုက်ရိုက်ပြန်ဆို ရေးသားပေးသည်။ မူရင်းသတင်းအရင်းအမြစ်၏ သတင်းအရည်အသွေးအား မထိခိုက်စေရန် ဘာသာပြန်ဆိုသည့် စနစ်တွင်ထိန်းညှိပေးထားသည်။
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 animate-slide-up">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="py-3 px-6 bg-zinc-950 hover:bg-black-900 text-white rounded-xl text-xs font-serif font-black shadow-xs cursor-pointer select-none"
              >
                နားလည်ပါပြီ (ပိတ်မည်)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Mizzima Newsroom AI Policy Modal --- */}
      <PolicyModal
        isOpen={isPolicyOpen}
        onAgree={handleAgreePolicy}
        onClose={() => setIsPolicyOpen(false)}
        showCloseButton={localStorage.getItem('mzm_ai_policy_agreed') === 'true'}
      />

      {/* --- Interactive Pop-up Tips System Modal --- */}
      <ModuleTipsModal
        isOpen={isTipsOpen}
        onClose={() => setIsTipsOpen(false)}
        initialSelectedModule={tipsActiveTab}
      />

      {/* --- Dedicated Human-Crafted Footer Credits --- */}
      <footer className="text-center mt-12 py-6 border-t border-slate-205 space-y-3">
        <button
          onClick={handleClearCache}
          className="text-xs text-slate-400 hover:text-slate-950 hover:underline font-serif font-bold transition-all focus:outline-none rounded cursor-pointer"
        >
          {UI_STRINGS_MY.CLEAR_CACHE_BUTTON}
        </button>
        <p className="text-xs text-slate-400 font-serif font-semibold tracking-wide">&copy; {new Date().getFullYear()} Burmese Newsroom AI Workspace. All rights reserved.</p>
      </footer>
    </div>
  </div>
  );
};

export default App;
