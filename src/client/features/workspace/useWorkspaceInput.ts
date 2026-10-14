import { useCallback, useState } from 'react';
import { InputMode, ScriptLength, ScriptTone, ScriptType } from '../../../../types';

type ResetOutputs = (keepError?: boolean) => void;

type WorkspaceInputOptions = {
  resetOutputs: ResetOutputs;
  generatedScript: string | null;
  error: string | null;
  setError: (message: string | null) => void;
};

export function useWorkspaceInput({
  resetOutputs,
  generatedScript,
  error,
  setError,
}: WorkspaceInputOptions) {
  const [selectedInputMode, setSelectedInputMode] = useState<InputMode>(InputMode.FILE);
  const [selectedScriptLength, setSelectedScriptLength] = useState<ScriptLength>(ScriptLength.STANDARD);
  const [selectedScriptTone, setSelectedScriptTone] = useState<ScriptTone>(ScriptTone.FORMAL);
  const [selectedScriptType, setSelectedScriptType] = useState<ScriptType>(ScriptType.WEB_POST);
  const [fileContent, setFileContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [englishUrlInput, setEnglishUrlInput] = useState('');
  const [reportInput, setReportInput] = useState('');
  const [pastedTextInput, setPastedTextInput] = useState('');
  const [reportTargetLanguage, setReportTargetLanguage] = useState<'Burmese' | 'English'>('Burmese');

  const clearSources = useCallback(() => {
    setFileContent('');
    setUrlInput('');
    setEnglishUrlInput('');
    setReportInput('');
    setPastedTextInput('');
  }, []);

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setSelectedInputMode(mode);
    resetOutputs();
    clearSources();
  }, [clearSources, resetOutputs]);

  const handleScriptLengthChange = useCallback((length: ScriptLength) => {
    setSelectedScriptLength(length);
    if (generatedScript) resetOutputs();
  }, [generatedScript, resetOutputs]);

  const handleScriptToneChange = useCallback((tone: ScriptTone) => {
    setSelectedScriptTone(tone);
    if (generatedScript) resetOutputs();
  }, [generatedScript, resetOutputs]);

  const handleScriptTypeChange = useCallback((type: ScriptType) => {
    setSelectedScriptType(type);
    if (generatedScript) resetOutputs();
  }, [generatedScript, resetOutputs]);

  const handleFileProcessed = useCallback((content: string) => {
    setFileContent(content);
    resetOutputs(Boolean(error));
  }, [error, resetOutputs]);

  const handleUrlChange = useCallback((value: string) => {
    setUrlInput(value);
    resetOutputs(Boolean(error));
  }, [error, resetOutputs]);

  const handleEnglishUrlChange = useCallback((value: string) => {
    setEnglishUrlInput(value);
    resetOutputs(Boolean(error));
  }, [error, resetOutputs]);

  const handleReportChange = useCallback((value: string) => {
    setReportInput(value);
    resetOutputs(Boolean(error));
  }, [error, resetOutputs]);

  const handlePastedTextChange = useCallback((value: string) => {
    setPastedTextInput(value);
    resetOutputs(Boolean(error));
  }, [error, resetOutputs]);

  const handleFileError = useCallback((message: string) => {
    setError(message);
    setFileContent('');
    resetOutputs(true);
  }, [resetOutputs, setError]);

  const validateInputs = useCallback(() => {
    let currentError: string | null = null;
    const isValidUrl = (value: string) => {
      if (!value.trim()) return false;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    switch (selectedInputMode) {
      case InputMode.FILE:
        if (!fileContent.trim()) currentError = 'သတင်းရေးသားရန် မူရင်းဖိုင်တစ်ခု ရွေးချယ် တင်သွင်းပေးပါ။';
        break;
      case InputMode.URL:
        if (!urlInput.trim()) currentError = 'ကျေးဇူးပြု၍ သတင်းဝဘ်လင့်ခ်ကို ထည့်သွင်းပေးပါ။';
        else if (!isValidUrl(urlInput)) currentError = 'ထည့်သွင်းထားသော ဝဘ်လင့်ခ်ပုံစံ လွဲမှားနေပါသည်။ (e.g. https://example.com)';
        break;
      case InputMode.REPORT:
        if (!reportInput.trim()) currentError = 'ဆန်းစစ်ချက် သတင်းရေးရန် အချက်အလက်များ သို့မဟုတ် အစီရင်ခံစာကို ထည့်သွင်းပေးပါ။';
        break;
      case InputMode.TRANSLATE_EN_TO_MY:
        if (!englishUrlInput.trim()) currentError = 'ဘာသာပြန်ရန် အင်္ဂလိပ်သတင်းလင့်ခ်ကို ဖြည့်သွင်းပေးပါ။';
        else if (!isValidUrl(englishUrlInput)) currentError = 'ထည့်သွင်းထားသော အင်္ဂလိပ်ဝဘ်လင့်ခ်ပုံစံ လွဲမှားနေပါသည်။';
        break;
      case InputMode.TRANSLATE_MY_TO_EN:
        if (!urlInput.trim()) currentError = 'သတင်းလင့်ခ်ကို ဖြည့်သွင်းပေးပါ။';
        else if (!isValidUrl(urlInput)) currentError = 'လင့်ခ်ပုံစံ လွဲမှားနေပါသည်။';
        break;
      case InputMode.TRANSLATE_TEXT:
        if (!pastedTextInput.trim()) currentError = 'ဘာသာပြန်ရန် စာသားများကို ကူးယူပြီး ဤနေရာတွင် ထည့်သွင်းပေးပါ။';
        break;
    }

    setError(currentError);
    return currentError === null;
  }, [englishUrlInput, fileContent, pastedTextInput, reportInput, selectedInputMode, setError, urlInput]);

  const isGenerateDisabled = useCallback(() => {
    if (selectedInputMode === InputMode.FILE) return !fileContent.trim();
    if (selectedInputMode === InputMode.URL || selectedInputMode === InputMode.TRANSLATE_MY_TO_EN) return !urlInput.trim();
    if (selectedInputMode === InputMode.REPORT) return !reportInput.trim();
    if (selectedInputMode === InputMode.TRANSLATE_EN_TO_MY) return !englishUrlInput.trim();
    if (selectedInputMode === InputMode.TRANSLATE_TEXT) return !pastedTextInput.trim();
    return true;
  }, [englishUrlInput, fileContent, pastedTextInput, reportInput, selectedInputMode, urlInput]);

  return {
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
    isGenerateDisabled,
  };
}
