import { useCallback } from 'react';
import { api } from '../../api/apiClient';
import {
  categorizeNews,
  extractKeywords,
  generateSEOMetadata,
  generateScriptFromFileContent,
  generateScriptFromReport,
  generateScriptFromUrl,
  performEnToMyTranslationAndScriptGeneration,
  performMyToEnTranslationAndScriptGeneration,
  proofreadScript,
  translatePastedText,
} from '../../../../services/geminiService';
import { InputMode, GeneratedScriptResponse, ScriptLength, ScriptTone, ScriptType } from '../../../../types';
import { UI_STRINGS_MY } from '../../../../constants';

type WorkflowInputs = {
  selectedInputMode: InputMode;
  selectedScriptLength: ScriptLength;
  selectedScriptTone: ScriptTone;
  selectedScriptType: ScriptType;
  fileContent: string;
  urlInput: string;
  englishUrlInput: string;
  reportInput: string;
  pastedTextInput: string;
  reportTargetLanguage: 'Burmese' | 'English';
};

type WorkflowSetters = {
  setGeneratedScript: (value: string | null) => void;
  setIntermediateTranslation: (value: string | null) => void;
  setGroundingSources: (value: any[] | null) => void;
  setProofreadScriptContent: (value: string | null) => void;
  setExtractedKeywords: (value: string[] | null) => void;
  setSeoData: (value: any | null) => void;
  setCategory: (value: string | null) => void;
  setReportStatistics: (value: any[] | null) => void;
  setReportChartData: (value: any[] | null) => void;
  setReportChartTitle: (value: string | null) => void;
  setReportChartType: (value: string | null) => void;
  setWasServedFromCache: (value: boolean) => void;
  setScrapeMethod: (value: string | null) => void;
  setScrapeNotice: (value: string | null) => void;
  setIsLoading: (value: boolean) => void;
  setIsProofreading: (value: boolean) => void;
  setIsExtractingKeywords: (value: boolean) => void;
  setCooldownRemaining: (value: number) => void;
  setError: (value: string | null) => void;
};

export function useGenerationWorkflow({
  currentUser,
  userProfile,
  inputs,
  useSEO,
  generatedScript,
  isLoading,
  isProofreading,
  isExtractingKeywords,
  resetOutputs,
  validateInputs,
  setActiveTab,
  onProfileRefresh,
  setters,
}: {
  currentUser: unknown;
  userProfile: { customApiKey?: string } | null;
  inputs: WorkflowInputs;
  useSEO: boolean;
  generatedScript: string | null;
  isLoading: boolean;
  isProofreading: boolean;
  isExtractingKeywords: boolean;
  resetOutputs: () => void;
  validateInputs: () => boolean;
  setActiveTab: (tab: 'workspace' | 'library' | 'corrections' | 'guide' | 'admin') => void;
  onProfileRefresh: () => void;
  setters: WorkflowSetters;
}) {
  const handlePerformTransaction = useCallback(async (action: () => Promise<any>) => {
    if (!currentUser) throw new Error('ယခုဝင်သော အကောင့်မရှိပါ။');
    const usageDetail = await api.get<any>('/api/user/profile');
    const hasCustomKey = Boolean(userProfile?.customApiKey?.trim());
    if (!hasCustomKey && usageDetail.usageToday >= usageDetail.limit) {
      throw new Error('ယနေ့အတွက် အခမဲ့ဆောင်ရွက်ခွင့် (၃၀) ကြိမ် ကုန်ဆုံးသွားပါပြီ။ ဆက်တင် (Settings) တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ (Unlimited) ဆက်လက် သုံးစွဲနိုင်ပါပြီ။');
    }
    return action();
  }, [currentUser, userProfile]);

  const handleGenerateScript = useCallback(async () => {
    resetOutputs();
    if (!validateInputs()) return;
    setters.setIsLoading(true);

    try {
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
      } = inputs;
      let response: GeneratedScriptResponse | null = null;

      const triggerAction = async () => {
        switch (selectedInputMode) {
          case InputMode.FILE:
            return fileContent ? generateScriptFromFileContent(fileContent, selectedScriptLength, selectedScriptTone, selectedScriptType) : null;
          case InputMode.URL:
            return urlInput ? generateScriptFromUrl(urlInput, selectedScriptLength, selectedScriptTone, selectedScriptType) : null;
          case InputMode.REPORT:
            return reportInput ? generateScriptFromReport(reportInput, selectedScriptLength, selectedScriptTone, selectedScriptType, reportTargetLanguage) : null;
          case InputMode.TRANSLATE_EN_TO_MY:
            return englishUrlInput ? performEnToMyTranslationAndScriptGeneration(englishUrlInput, selectedScriptLength, selectedScriptTone, selectedScriptType) : null;
          case InputMode.TRANSLATE_MY_TO_EN:
            return urlInput ? performMyToEnTranslationAndScriptGeneration(urlInput, selectedScriptLength, selectedScriptTone, selectedScriptType) : null;
          case InputMode.TRANSLATE_TEXT:
            return pastedTextInput ? translatePastedText(pastedTextInput) : null;
          default:
            return null;
        }
      };

      response = await handlePerformTransaction(triggerAction);
      if (!response?.script) {
        setters.setError(`${UI_STRINGS_MY.ERROR_GENERATING_SCRIPT} (သက်ဆိုင်ရာ အကြောင်းအရာမရရှိပါ)`);
        return;
      }

      setters.setGeneratedScript(response.script);
      setters.setIntermediateTranslation(response.intermediateTranslation || null);
      setters.setGroundingSources(response.sources || null);
      setters.setWasServedFromCache(Boolean(response.fromCache));
      setters.setReportStatistics(response.statistics || null);
      setters.setReportChartData(response.chartData || null);
      setters.setReportChartTitle(response.chartTitle || null);
      setters.setReportChartType(response.chartType || null);
      setters.setScrapeMethod(response.scrapeMethod || null);
      setters.setScrapeNotice(response.scrapeNotice || null);
      setters.setError(null);

      if (useSEO) {
        try {
          setters.setSeoData(await generateSEOMetadata(response.script) || null);
        } catch (error) {
          console.error('SEO generation failed:', error);
        }
      }
      try {
        setters.setCategory(await categorizeNews(response.script));
      } catch (error) {
        console.error('Categorization failed:', error);
      }

      setActiveTab('workspace');
      onProfileRefresh();
      setters.setCooldownRemaining(15);
    } catch (error: any) {
      console.error('Generation error:', error);
      setters.setError(error.message || UI_STRINGS_MY.ERROR_GENERATING_SCRIPT);
      setters.setGeneratedScript(null);
      setters.setIntermediateTranslation(null);
      setters.setGroundingSources(null);
    } finally {
      setters.setIsLoading(false);
    }
  }, [handlePerformTransaction, inputs, onProfileRefresh, resetOutputs, setActiveTab, setters, useSEO, validateInputs]);

  const handleProofreadScript = useCallback(async () => {
    if (!generatedScript || isLoading || isProofreading) return;
    setters.setWasServedFromCache(false);
    setters.setProofreadScriptContent(null);
    setters.setError(null);
    setters.setIsProofreading(true);
    try {
      setters.setProofreadScriptContent(await handlePerformTransaction(() => proofreadScript(generatedScript)));
    } catch (error: any) {
      console.error('Proofreading error:', error);
      setters.setError(error.message || UI_STRINGS_MY.ERROR_PROOFREADING_SCRIPT);
      setters.setProofreadScriptContent(null);
    } finally {
      setters.setIsProofreading(false);
    }
  }, [generatedScript, handlePerformTransaction, isLoading, isProofreading, setters]);

  const handleExtractKeywords = useCallback(async () => {
    if (!generatedScript || isLoading || isProofreading || isExtractingKeywords) return;
    setters.setIsExtractingKeywords(true);
    setters.setError(null);
    setters.setExtractedKeywords(null);
    try {
      const mainScript = generatedScript.split(/\n\n---\n/)[0] || '';
      setters.setExtractedKeywords(await handlePerformTransaction(() => extractKeywords(mainScript)));
    } catch (error: any) {
      console.error('Keyword extraction error:', error);
      setters.setError(error.message || UI_STRINGS_MY.ERROR_EXTRACTING_KEYWORDS);
      setters.setExtractedKeywords(null);
    } finally {
      setters.setIsExtractingKeywords(false);
    }
  }, [generatedScript, handlePerformTransaction, isExtractingKeywords, isLoading, isProofreading, setters]);

  return { handleGenerateScript, handleProofreadScript, handleExtractKeywords, handlePerformTransaction };
}
