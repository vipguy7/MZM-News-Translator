

import { 
    SYSTEM_INSTRUCTION_TRANSLATOR_EN_TO_MY,
    SYSTEM_INSTRUCTION_TRANSLATOR_MY_TO_EN,
    SYSTEM_INSTRUCTION_AUTO_TRANSLATOR,
    SYSTEM_INSTRUCTION_SCRIPT_WRITER_BURMESE,
    SYSTEM_INSTRUCTION_SCRIPT_WRITER_ENGLISH,
    SYSTEM_INSTRUCTION_REPORT_WRITER,
    LANGUAGE_BURMESE, 
    LANGUAGE_ENGLISH,
    UI_STRINGS_MY
} from '../constants'; 
import { GeneratedScriptResponse, ScriptLength, ScriptTone, ScriptType, GroundingChunk } from '../types';
import { generateCacheKey, getFromCache, setInCache } from './cacheService';
import { auth } from './firebaseService';

let activeCustomApiKey: string | undefined = undefined;
let activeCustomOpenAiKey: string | undefined = undefined;
let activePreferredModel: 'gemini' | 'gemini-pro' | 'gemini-2.5-flash' | 'openai' | undefined = undefined;

export const setCustomApiKeyForGemini = (key?: string) => {
  activeCustomApiKey = key;
};

export const setCustomApiKeyForOpenAi = (key?: string) => {
  activeCustomOpenAiKey = key;
};

export const setPreferredModel = (model?: 'gemini' | 'gemini-pro' | 'gemini-2.5-flash' | 'openai') => {
  activePreferredModel = model;
};

export const getHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('Failed to get Firebase ID token for headers:', e);
    }
  }

  if (activeCustomApiKey && activeCustomApiKey.trim()) {
    headers['X-Custom-Gemini-Key'] = activeCustomApiKey.trim();
  }

  if (activeCustomOpenAiKey && activeCustomOpenAiKey.trim()) {
    headers['X-Custom-Openai-Key'] = activeCustomOpenAiKey.trim();
  }

  if (activePreferredModel) {
    headers['x-preferred-model'] = activePreferredModel;
  }

  return headers;
};

const handleUnsuccessfulResponse = async (response: Response, defaultMessage: string): Promise<never> => {
  let errorMessage = defaultMessage;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const err = await response.json();
      errorMessage = err.error || errorMessage;
    } else {
      const text = await response.text();
      if (text.includes('<pre>')) {
        const preMatch = text.match(/<pre>([\s\S]*?)<\/pre>/);
        if (preMatch && preMatch[1]) {
          errorMessage = preMatch[1].trim().split('\n')[0];
        }
      } else if (response.status === 404) {
        errorMessage = `API Error (404): Endpoint standard URL map not found. Please verify the server is running.`;
      } else if (response.status === 403) {
        errorMessage = `API Error (403): Forbidden. Session might be expired or access is restricted.`;
      } else if (response.status === 502 || response.status === 503) {
        errorMessage = `Server Initialization In Progress: The backend is booting or warming up connection clients (Status: ${response.status}). Please try again in 5 seconds.`;
      } else {
        errorMessage = `Server Error (${response.status}): ${response.statusText || 'Unexpected Connection Loss'}`;
      }
    }
  } catch (parseError) {
    errorMessage = `Server Error (${response.status}): Connection failed standard decoding.`;
  }
  throw new Error(errorMessage);
};

const safeParseJson = async (response: Response, fallbackMessage: string): Promise<any> => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    const snippet = text.substring(0, 300).trim();
    const errorMsg = snippet ? ` (Received response: ${snippet})` : "";
    throw new Error(`${fallbackMessage}${errorMsg}`);
  }
  try {
    return await response.json();
  } catch (e: any) {
    throw new Error(`${fallbackMessage}: Failed to parse JSON response (${e.message || e})`);
  }
};

const getScriptLengthInstruction = (scriptLength: ScriptLength): string => {
  switch (scriptLength) {
    case ScriptLength.ONE_MINUTE:
      return `The script should be concise, suitable for a 1-minute news broadcast (approximately 150-180 words).`;
    case ScriptLength.FIVE_MINUTES:
      return `The script should be detailed, suitable for a 5-minute news broadcast (approximately 750-900 words).`;
    case ScriptLength.LONG_ARTICLE:
      return `The script should be an in-depth long-form news article or feature story (minimum 1200 words). Provide detailed context, background, and expert analysis where the input information allows.`;
    case ScriptLength.STANDARD:
    default:
      return `The script length should be standard for a typical news report.`;
  }
};

const getScriptToneInstruction = (scriptTone: ScriptTone): string => {
  switch (scriptTone) {
    case ScriptTone.FORMAL:
      return `The narration tone of the script should be formal and objective.`;
    case ScriptTone.FRIENDLY:
      return `The narration tone of the script should be friendly and engaging.`;
    case ScriptTone.URGENT:
      return `The narration tone of the script should be urgent and impactful.`;
    case ScriptTone.INVESTIGATIVE:
      return `The narration tone of the script should be investigative and insightful.`;
    case ScriptTone.PRESS_RELEASE:
      return `The script is intended as a professional Press Release. Act as an expert public relations (PR) professional/press officer.
The output format must strictly follow authoritative press release standards:
1. Start with an extremely compelling and formal headline in all-caps or title case.
2. Include a standard Dateline at the beginning of the lead paragraph (e.g., "[CITY, NATION] — [Date]").
3. Present an immediate strong announcement or hook, answering the core questions: Who, What, When, Where, Why.
4. Elaborate with 2-3 structured body paragraphs containing critical project details, quotes, objectives, and long-term significance or impact.
5. Conclude with a brief summary statement and an organic boilerplate or Media Contact placeholder at the end.
Do NOT use Markdown formatting (like * or #) or explicit section headers. Use double line-break paragraph spacing.`;
    case ScriptTone.REPORT:
      return `The script is intended as a high-fidelity News Report or Document Analysis. Act as an objective, senior investigative journalist.
The output format must blend rigorous empirical news analysis with absolute clarity:
1. Provide a professional, highly informative News Report Headline.
2. Structure the content logically, combining the actual core occurrence with extensive context, underlying background factors, statistical indicators or metrics, and community implications.
3. Write in an evidence-based, data-backed, highly formal journalistic style.
4. Use double line-break spacing between paragraphs to ensure high legibility.
Do NOT use markdown headers or symbols (like ** or #). Just provide the formatted analytical report content.`;
    default:
      return `The narration tone of the script should be realistic and suitable for general news reporting.`;
  }
};

const getScriptTypeInstruction = (scriptType: ScriptType): string => {
  switch (scriptType) {
    case ScriptType.VIDEO_POST:
      return `The script is intended for a video news report. Your role is to act as a clear, professional news anchor.
The script must be structured for high audience retention and clarity. Provide the content in a natural narrative flow without explicit labels or structural headings.

Start with a powerful hook—a compelling question or the most important point—to capture viewer interest instantly.
Present the news using a professional, friendly, and conversational tone.
Explain the key points (who, what, where, when, why) clearly.
Conclude with a concise summary and a professional closing statement.

CRITICAL: The output must ONLY be the spoken narration script. Do NOT include headings, timestamps, or visual cues. Do NOT use Markdown formatting (* or #).`;
    case ScriptType.WEB_POST:
    default:
      return `The script is intended for a web news post. Format it as a professional and readable news article in ${LANGUAGE_BURMESE}.
Provide a concise and compelling headline first, followed by the article content.
Provide a professional narrative flow without using explicit labels such as "နိဒါန်း" or "အဓိက အကြောင်းအရာ". 
Use double line-break spacing between paragraphs for maximum readability. 
The output must be only the formatted article text. Do NOT use Markdown formatting (* or #).`;
  }
};

export interface ScrapeUrlResult {
  title: string;
  content: string;
  excerpt?: string;
  method?: string;
  sources?: GroundingChunk[];
  sourceAgency?: string;
  note?: string;
}

const fetchAndCleanUrlContent = async (url: string): Promise<ScrapeUrlResult> => {
    const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ url })
    });
    if (!response.ok) {
        await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_URL_FETCH_CLEAN);
    }
    const data = await safeParseJson(response, UI_STRINGS_MY.ERROR_URL_FETCH_CLEAN);
    return {
      title: data.title || '',
      content: data.content || '',
      excerpt: data.excerpt,
      method: data.method,
      sources: data.sources || [],
      sourceAgency: data.sourceAgency,
      note: data.note
    };
};

const generateScriptInternal = async (
  prompt: string,
  useSearchGrounding: boolean = false,
  systemInstruction: string = SYSTEM_INSTRUCTION_SCRIPT_WRITER_BURMESE,
): Promise<GeneratedScriptResponse> => {
  const cachePayload = { prompt, useSearchGrounding, systemInstruction };
  const cacheKey = await generateCacheKey(cachePayload);
  const cached = getFromCache<GeneratedScriptResponse>(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ prompt, useSearchGrounding, systemInstruction })
  });
  
  if (!response.ok) {
      await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_GENERATING_SCRIPT);
  }

  const result = await safeParseJson(response, UI_STRINGS_MY.ERROR_GENERATING_SCRIPT);
  setInCache(cacheKey, result);
  return result;
};

export const generateScriptFromFileContent = async (
  fileText: string, 
  scriptLength: ScriptLength,
  scriptTone: ScriptTone,
  scriptType: ScriptType
): Promise<GeneratedScriptResponse> => {
  const lengthInstruction = getScriptLengthInstruction(scriptLength);
  const toneInstruction = getScriptToneInstruction(scriptTone);
  const typeInstruction = getScriptTypeInstruction(scriptType);
  const prompt = `You are tasked with transforming raw text content extracted from a user-uploaded document (which may contain messy line break patterns, tables, transcripts, or unformatted notes) into a professional, highly readable news script.
Analyze the extracted text, filter out irrelevant file scaffolding (such as page numbers, file metadata, or system headers), and identify the central newsworthy topic.
Based *only* on the provided information, generate a beautifully crafted news story in ${LANGUAGE_BURMESE}.

User Extracted File Content:
\"\"\"
${fileText}
\"\"\"

Directives:
1. ${lengthInstruction}
2. ${toneInstruction}
3. ${typeInstruction}
4. Reorganize any disjointed raw details into a standard journalistic pyramid (most critical hook first, followed by key evidence, quotes, and background).
5. Translate tables or raw lists into fully cohesive, fluid literary Burmese prose.
6. Absolutely forbid inventing or hallucinating any facts, names, dates, or numbers not present in the source text.
7. Focus onproducing a polished title and clean paragraphs with double line-breaks.`;
  return generateScriptInternal(prompt, false, SYSTEM_INSTRUCTION_SCRIPT_WRITER_BURMESE);
};

export const generateScriptFromUrl = async (
  url: string, 
  scriptLength: ScriptLength,
  scriptTone: ScriptTone,
  scriptType: ScriptType
): Promise<GeneratedScriptResponse> => {
  const scrapeResult = await fetchAndCleanUrlContent(url);
  const combinedText = (scrapeResult.title ? scrapeResult.title + "\n\n" : "") + scrapeResult.content;
  const lengthInstruction = getScriptLengthInstruction(scriptLength);
  const toneInstruction = getScriptToneInstruction(scriptTone);
  const typeInstruction = getScriptTypeInstruction(scriptType);
  const prompt = `The following text was extracted from the URL: ${url}. Based *only* on this information, generate a professional news script in ${LANGUAGE_BURMESE}.
${lengthInstruction} ${toneInstruction} ${typeInstruction}
The script must strictly summarize the provided text and not introduce any new facts.
Focus on producing the news script body and titles with Burmese native writing style.

Extracted Content:
"""
${combinedText}
"""`;
  const result = await generateScriptInternal(prompt, false, SYSTEM_INSTRUCTION_SCRIPT_WRITER_BURMESE);

  // Merge scrape sources with script generation sources
  const allSources: GroundingChunk[] = [...(result.sources || [])];
  if (scrapeResult.sources && scrapeResult.sources.length > 0) {
    for (const src of scrapeResult.sources) {
      if (src.web?.uri && !allSources.some(s => s.web?.uri === src.web?.uri)) {
        allSources.push(src);
      }
    }
  }

  return {
    ...result,
    sources: allSources.length > 0 ? allSources : undefined,
    scrapeMethod: scrapeResult.method,
    scrapeNotice: scrapeResult.note
  };
};

export const generateScriptFromReport = async (
  reportText: string,
  scriptLength: ScriptLength,
  scriptTone: ScriptTone,
  scriptType: ScriptType,
  targetLanguage: 'Burmese' | 'English' = 'Burmese'
): Promise<GeneratedScriptResponse> => {
  const lengthInstruction = getScriptLengthInstruction(scriptLength);
  const toneInstruction = getScriptToneInstruction(scriptTone);
  const typeInstruction = getScriptTypeInstruction(scriptType);

  const systemInstruction = targetLanguage === 'English'
    ? `You are an elite senior editor for esteemed international news agencies covering Myanmar (such as Reuters, BBC News, and AP). Your core competency is examining dense organizational data, research papers, human rights briefings, and UN publications, and translating them into clear, compelling, objective, and premium news copy in English.
Always format into logical paragraph structures separated by double line-breaks. Adopt a formal, balanced broadcast or print journalistic tone. Strictly avoid any Markdown tags (such as **, *, or # for headings) or text labels like 'Lead:', 'Body:', 'Conclusion:', or 'Headline:'.`
    : SYSTEM_INSTRUCTION_REPORT_WRITER;

  const prompt = `The following is an official news report, census data, research journal, UN report, human rights briefing, or institutional press release.
Based on this raw content, generate an elite, premium news story written cleanly in ${targetLanguage === 'English' ? 'English' : LANGUAGE_BURMESE}.

User Report/Document Text:
\"\"\"
${reportText}
\"\"\"

Instructions and Style Guides:
1. ${lengthInstruction}
2. ${toneInstruction}
3. ${typeInstruction}
4. Write a compelling, objective title at the start of the script.
5. Identify the source institution (UNHCR, WHO, UNOCHA, etc.) in the lead.
6. Extract key metrics, rates, comparisons, or dates to represent in the 'statistics' and 'chartData' JSON structures. Translate any chart labels or titles to the output language (${targetLanguage === 'English' ? 'English' : LANGUAGE_BURMESE}).
   - Locate and prioritize extracting from any structured blocks labeled "### [TABLE_DATA:...]", "### [CHART_DATA:...]" or "### [STATISTICS_DATA]". Keep values accurate and map tables or visual charts with absolute fidelity to the original data points.
   - For 'chartData', ensure the 'value' property is STRICTLY a standard Arabic float or integer (no ranges, no strings, no Burmese numerals like ၁,၂,၃). Put units like '%' or 'millions' strictly in the 'unit' property.
7. Maintain absolute, uncompromising factual conformity with the original document. Do not extrapolate, assume, or insert external facts.`;

  const cachePayload = { prompt, purpose: 'report-news-v2', targetLanguage, scriptLength, scriptTone, scriptType };
  const cacheKey = await generateCacheKey(cachePayload);
  const cached = getFromCache<GeneratedScriptResponse>(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const response = await fetch('/api/generate-report-news', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ prompt, systemInstruction })
  });
  
  if (!response.ok) {
      await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_GENERATING_SCRIPT);
  }

  const result = await safeParseJson(response, UI_STRINGS_MY.ERROR_GENERATING_SCRIPT);
  setInCache(cacheKey, result);
  return result;
};

const translateToBurmese = async (englishText: string): Promise<string> => {
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ text: englishText, systemInstruction: SYSTEM_INSTRUCTION_TRANSLATOR_EN_TO_MY })
    });
    if (!response.ok) {
        await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    }
    const data = await safeParseJson(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    return data.translatedText;
};

const translateToEnglish = async (burmeseText: string): Promise<string> => {
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ text: burmeseText, systemInstruction: SYSTEM_INSTRUCTION_TRANSLATOR_MY_TO_EN })
    });
    if (!response.ok) {
        await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    }
    const data = await safeParseJson(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    return data.translatedText;
};

export const translatePastedText = async (text: string): Promise<GeneratedScriptResponse> => {
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ text, systemInstruction: SYSTEM_INSTRUCTION_AUTO_TRANSLATOR })
    });
    if (!response.ok) {
        await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    }
    const data = await safeParseJson(response, UI_STRINGS_MY.ERROR_TRANSLATING_CONTENT);
    return { script: data.translatedText };
};


export const extractKeywords = async (scriptText: string): Promise<string[]> => {
  const prompt = `Based on the following news script in ${LANGUAGE_BURMESE}, generate exactly 3 relevant keywords in ${LANGUAGE_BURMESE}. List only the keywords, separated by commas.

News Script:
"""
${scriptText}
"""

Keywords:`;
  
  const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ prompt, systemInstruction: `You are an AI assistant that extracts relevant keywords from text. Respond only with the keywords.` })
  });
  
  if (!response.ok) return [];
  const data = await safeParseJson(response, "Extracting keywords failed");
  const keywordsText = data.script;
  if (!keywordsText) return [];
  return keywordsText.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw.length > 0).slice(0, 3);
}

export const performEnToMyTranslationAndScriptGeneration = async (
  englishUrl: string,
  scriptLength: ScriptLength,
  scriptTone: ScriptTone,
  scriptType: ScriptType
): Promise<GeneratedScriptResponse> => {
  const scrapeResult = await fetchAndCleanUrlContent(englishUrl);
  const combinedText = (scrapeResult.title ? scrapeResult.title + "\n\n" : "") + scrapeResult.content;
  const translatedContent = await translateToBurmese(combinedText);

  const lengthInstruction = getScriptLengthInstruction(scriptLength);
  const toneInstruction = getScriptToneInstruction(scriptTone);
  const typeInstruction = getScriptTypeInstruction(scriptType);

  const promptForScript = `The following ${LANGUAGE_BURMESE} text is a translation from an English news source. Based *only* on this translated information, **restructure and format it into a professional news script** in ${LANGUAGE_BURMESE}.
${lengthInstruction} ${toneInstruction} ${typeInstruction}
The script must strictly summarize and adapt the provided translated text into a news format. Do not invent new facts.
Focus on producing the news script body and titles with a professional Burmese news writing style.

Translated ${LANGUAGE_BURMESE} Content:
"""
${translatedContent}
"""`;

  const scriptResponse = await generateScriptInternal(promptForScript, false, SYSTEM_INSTRUCTION_SCRIPT_WRITER_BURMESE);
  
  let finalScriptText = scriptResponse.script;
  let mediaName = scrapeResult.sourceAgency || "Unknown Source";
  try {
      const urlObj = new URL(englishUrl);
      if (!scrapeResult.sourceAgency) {
        mediaName = urlObj.hostname.replace(/^www\./, '');
      }
  } catch (e) {
      console.warn("Could not parse English URL for media name:", englishUrl);
  }
  
  const keywords = await extractKeywords(scriptResponse.script.substring(0, 1500)); 

  const additionalInfo = [
    `${UI_STRINGS_MY.ORIGINAL_SOURCE_LABEL}: ${mediaName}`,
    ...(keywords.length > 0 ? [`${UI_STRINGS_MY.KEYWORDS_LABEL}: ${keywords.join(', ')}`] : [])
  ];
  
  finalScriptText += `\n\n---\n${additionalInfo.join('\n')}`;

  const allSources: GroundingChunk[] = [...(scriptResponse.sources || [])];
  if (scrapeResult.sources && scrapeResult.sources.length > 0) {
    for (const src of scrapeResult.sources) {
      if (src.web?.uri && !allSources.some(s => s.web?.uri === src.web?.uri)) {
        allSources.push(src);
      }
    }
  }

  return {
    script: finalScriptText,
    intermediateTranslation: translatedContent,
    sources: allSources.length > 0 ? allSources : undefined,
    fromCache: scriptResponse.fromCache,
    scrapeMethod: scrapeResult.method,
    scrapeNotice: scrapeResult.note
  };
};

export const performMyToEnTranslationAndScriptGeneration = async (
  burmeseUrl: string,
  scriptLength: ScriptLength,
  scriptTone: ScriptTone,
  scriptType: ScriptType 
): Promise<GeneratedScriptResponse> => {
  const scrapeResult = await fetchAndCleanUrlContent(burmeseUrl);
  const combinedText = (scrapeResult.title ? scrapeResult.title + "\n\n" : "") + scrapeResult.content;
  const translatedContent = await translateToEnglish(combinedText);

  const lengthInstruction = getScriptLengthInstruction(scriptLength);
  const toneInstruction = getScriptToneInstruction(scriptTone);
  
  const promptForScript = `The following ${LANGUAGE_ENGLISH} text is a translation from a Burmese news source. Based *only* on this translated information, **restructure and format it into a professional news script** in ${LANGUAGE_ENGLISH}.
${lengthInstruction} ${toneInstruction}
The script must strictly summarize and adapt the provided translated text into a news format. Do not invent new facts.

Translated ${LANGUAGE_ENGLISH} Content:
"""
${translatedContent}
"""`;

  const scriptResponse = await generateScriptInternal(promptForScript, false, SYSTEM_INSTRUCTION_SCRIPT_WRITER_ENGLISH);
  
  let finalScriptText = scriptResponse.script;
  let mediaName = scrapeResult.sourceAgency || "Unknown Source";
  try {
      const urlObj = new URL(burmeseUrl);
      if (!scrapeResult.sourceAgency) {
        mediaName = urlObj.hostname.replace(/^www\./, '');
      }
  } catch (e) {
      console.warn("Could not parse Burmese URL for media name:", burmeseUrl);
  }
  
  const additionalInfo = `Original Source: ${mediaName}`;
  finalScriptText += `\n\n---\n${additionalInfo}`;

  const allSources: GroundingChunk[] = [...(scriptResponse.sources || [])];
  if (scrapeResult.sources && scrapeResult.sources.length > 0) {
    for (const src of scrapeResult.sources) {
      if (src.web?.uri && !allSources.some(s => s.web?.uri === src.web?.uri)) {
        allSources.push(src);
      }
    }
  }

  return {
    script: finalScriptText,
    intermediateTranslation: translatedContent,
    sources: allSources.length > 0 ? allSources : undefined,
    fromCache: scriptResponse.fromCache,
    scrapeMethod: scrapeResult.method,
    scrapeNotice: scrapeResult.note
  };
};


export const proofreadScript = async (originalScript: string): Promise<string> => { 
  const cachePayload = { originalScript, purpose: 'proofread' };
  const cacheKey = await generateCacheKey(cachePayload);
  const cached = getFromCache<string>(cacheKey);
  if (cached) {
      return cached;
  }

  const response = await fetch('/api/proofread', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ script: originalScript })
  });

  if (!response.ok) {
      await handleUnsuccessfulResponse(response, UI_STRINGS_MY.ERROR_PROOFREADING_SCRIPT);
  }

  const data = await safeParseJson(response, UI_STRINGS_MY.ERROR_PROOFREADING_SCRIPT);
  setInCache(cacheKey, data.editedScript);
  return data.editedScript;
};

export const generateSEOMetadata = async (scriptText: string): Promise<GeneratedScriptResponse['seoData']> => {
  const cachePayload = { scriptText, purpose: 'seo' };
  const cacheKey = await generateCacheKey(cachePayload);
  const cached = getFromCache<GeneratedScriptResponse['seoData']>(cacheKey);
  if (cached) {
      return cached;
  }

  const response = await fetch('/api/generate-seo', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ script: scriptText })
  });

  if (!response.ok) {
      await handleUnsuccessfulResponse(response, "SEO generation failed");
  }

  const data = await safeParseJson(response, "SEO generation failed");
  setInCache(cacheKey, data.seoData);
  return data.seoData;
};

export const categorizeNews = async (scriptText: string): Promise<string> => {
    const cachePayload = { scriptText, purpose: 'categorization' };
    const cacheKey = await generateCacheKey(cachePayload);
    const cached = getFromCache<string>(cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch('/api/categorize-news', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ script: scriptText })
    });

    if (!response.ok) {
        await handleUnsuccessfulResponse(response, "Categorization failed");
    }

    const data = await safeParseJson(response, "Categorization failed");
    setInCache(cacheKey, data.category);
    return data.category;
};
