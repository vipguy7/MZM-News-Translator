import { useCallback, useReducer } from 'react';
import type { GroundingChunk, ReportChartData, ReportStatistic, SEOData } from '../../../../types';

type GenerationState = {
  generatedScript: string | null;
  intermediateTranslation: string | null;
  groundingSources: GroundingChunk[] | null;
  proofreadScriptContent: string | null;
  extractedKeywords: string[] | null;
  seoData: SEOData | null;
  category: string | null;
  reportStatistics: ReportStatistic[] | null;
  reportChartData: ReportChartData[] | null;
  reportChartTitle: string | null;
  reportChartType: string | null;
  isLoading: boolean;
  isProofreading: boolean;
  isExtractingKeywords: boolean;
  cooldownRemaining: number;
  error: string | null;
  wasServedFromCache: boolean;
  scrapeMethod: string | null;
  scrapeNotice: string | null;
};

type GenerationAction =
  | { type: 'reset'; keepError: boolean }
  | { type: 'setGeneratedScript'; value: string | null }
  | { type: 'setIntermediateTranslation'; value: string | null }
  | { type: 'setGroundingSources'; value: GroundingChunk[] | null }
  | { type: 'setProofreadScriptContent'; value: string | null }
  | { type: 'setExtractedKeywords'; value: string[] | null }
  | { type: 'setSeoData'; value: SEOData | null }
  | { type: 'setCategory'; value: string | null }
  | { type: 'setReportStatistics'; value: ReportStatistic[] | null }
  | { type: 'setReportChartData'; value: ReportChartData[] | null }
  | { type: 'setReportChartTitle'; value: string | null }
  | { type: 'setReportChartType'; value: string | null }
  | { type: 'setIsLoading'; value: boolean }
  | { type: 'setIsProofreading'; value: boolean }
  | { type: 'setIsExtractingKeywords'; value: boolean }
  | { type: 'setCooldownRemaining'; value: number }
  | { type: 'setError'; value: string | null }
  | { type: 'setWasServedFromCache'; value: boolean }
  | { type: 'setScrapeMethod'; value: string | null }
  | { type: 'setScrapeNotice'; value: string | null };

const initialState: GenerationState = {
  generatedScript: null,
  intermediateTranslation: null,
  groundingSources: null,
  proofreadScriptContent: null,
  extractedKeywords: null,
  seoData: null,
  category: null,
  reportStatistics: null,
  reportChartData: null,
  reportChartTitle: null,
  reportChartType: null,
  isLoading: false,
  isProofreading: false,
  isExtractingKeywords: false,
  cooldownRemaining: 0,
  error: null,
  wasServedFromCache: false,
  scrapeMethod: null,
  scrapeNotice: null,
};

function reducer(state: GenerationState, action: GenerationAction): GenerationState {
  if (action.type === 'reset') {
    return {
      ...initialState,
      error: action.keepError ? state.error : null,
    };
  }

  const key = action.type.replace(/^set/, '') as keyof GenerationState;
  const stateKey = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof GenerationState;
  return { ...state, [stateKey]: action.value } as GenerationState;
}

export function useGenerationState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const resetOutputs = useCallback((keepError = false) => {
    dispatch({ type: 'reset', keepError });
  }, []);

  const actions = {
    setGeneratedScript: (value: string | null) => dispatch({ type: 'setGeneratedScript', value }),
    setIntermediateTranslation: (value: string | null) => dispatch({ type: 'setIntermediateTranslation', value }),
    setGroundingSources: (value: GroundingChunk[] | null) => dispatch({ type: 'setGroundingSources', value }),
    setProofreadScriptContent: (value: string | null) => dispatch({ type: 'setProofreadScriptContent', value }),
    setExtractedKeywords: (value: string[] | null) => dispatch({ type: 'setExtractedKeywords', value }),
    setSeoData: (value: SEOData | null) => dispatch({ type: 'setSeoData', value }),
    setCategory: (value: string | null) => dispatch({ type: 'setCategory', value }),
    setReportStatistics: (value: ReportStatistic[] | null) => dispatch({ type: 'setReportStatistics', value }),
    setReportChartData: (value: ReportChartData[] | null) => dispatch({ type: 'setReportChartData', value }),
    setReportChartTitle: (value: string | null) => dispatch({ type: 'setReportChartTitle', value }),
    setReportChartType: (value: string | null) => dispatch({ type: 'setReportChartType', value }),
    setIsLoading: (value: boolean) => dispatch({ type: 'setIsLoading', value }),
    setIsProofreading: (value: boolean) => dispatch({ type: 'setIsProofreading', value }),
    setIsExtractingKeywords: (value: boolean) => dispatch({ type: 'setIsExtractingKeywords', value }),
    setCooldownRemaining: (value: number) => dispatch({ type: 'setCooldownRemaining', value }),
    setError: (value: string | null) => dispatch({ type: 'setError', value }),
    setWasServedFromCache: (value: boolean) => dispatch({ type: 'setWasServedFromCache', value }),
    setScrapeMethod: (value: string | null) => dispatch({ type: 'setScrapeMethod', value }),
    setScrapeNotice: (value: string | null) => dispatch({ type: 'setScrapeNotice', value }),
  };

  return { state, actions, resetOutputs };
}
