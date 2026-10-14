import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { globalVocabulary, userCorrections } from '../../db/schema.ts';
import { AuthRequest } from '../../middleware/auth.ts';
import { GenerationQueue } from '../../services/generationQueue.ts';

export type AiProvider = ReturnType<typeof createAiProvider>;

export function createAiProvider(generationQueue: GenerationQueue) {
  const getAiClient = (req: Request) => {
    const customKey = req.headers['x-custom-gemini-key'];
    const apiKey = (typeof customKey === 'string' && customKey.trim()) ? customKey.trim() : process.env.GEMINI_API_KEY;
    const preferredModel = req.headers['x-preferred-model'];
    if (preferredModel === 'openai' && !apiKey) {
      return null as any;
    }
    if (!apiKey) {
      throw new Error('No Gemini API key supplied. Please verify you are logged in, have daily free credits, or enter your personal Gemini API Key under Settings.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  };

  const formatGeminiError = (error: unknown): string => {
    if (!error) return 'ခေတ္တချို့ယွင်းချက်ရှိနေပါသည်။ ကျေးဇူးပြု၍ ခဏကြာမှ ထပ်မံကြိုးစားပေးပါ။ (Unknown Error)';
    let msg = typeof error === 'string' ? error : ((error as any).message || String(error));
    const lowerMsg = msg.toLowerCase();
    const trimmedMsg = msg.trim();

    if (trimmedMsg.startsWith('{') || trimmedMsg.includes('"error"')) {
      try {
        const startIdx = trimmedMsg.indexOf('{');
        const endIdx = trimmedMsg.lastIndexOf('}');
        if (startIdx !== -1 && endIdx > startIdx) {
          const parsed = JSON.parse(trimmedMsg.substring(startIdx, endIdx + 1));
          if (parsed.error) {
            const errCode = parsed.error.code;
            const errStatus = parsed.error.status;
            const errMessage = parsed.error.message;
            if (errCode === 429 || errStatus === 'RESOURCE_EXHAUSTED' || errMessage?.toLowerCase().includes('quota')) {
              return 'ခေတ္တတောင်းဆိုမှုထူထပ်နေပါသည်။ (Gemini API Speed Limit/Quota Exceeded - 429). ကျေးဇူးပြု၍ စက္ကန့် (၃၀-၆၀) ခန့် စောင့်ပြီးမှ ထပ်မံကြိုးစားပေးပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
            }
            if (errCode === 503 || errStatus === 'UNAVAILABLE' || errMessage?.toLowerCase().includes('high demand') || errMessage?.toLowerCase().includes('temporary') || errMessage?.toLowerCase().includes('unavailable')) {
              return 'လက်ရှိတွင် အသုံးပြုသူ များပြားနေသဖြင့် စနစ်ခေတ္တမအားလပ်ပါ (Gemini API High Demand/Unavailable - 503)။ ကျေးဇူးပြု၍ စက္ကန့်အနည်းငယ်စောင့်ပြီးမှ ထပ်မံကြိုးစားပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
            }
            if (errMessage) msg = errMessage;
          }
        }
      } catch {
        // Keep the original provider message when structured parsing fails.
      }
    }

    if (lowerMsg.includes('429') || lowerMsg.includes('quota') || lowerMsg.includes('exhausted') || lowerMsg.includes('rate limit')) {
      return 'ခေတ္တတောင်းဆိုမှုထူထပ်နေပါသည်။ (Gemini API Speed Limit/Quota Exceeded - 429). ကျေးဇူးပြု၍ စက္ကန့် (၃၀-၆၀) ခန့် စောင့်ပြီးမှ ထပ်မံကြိုးစားပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
    }
    if (lowerMsg.includes('503') || lowerMsg.includes('unavailable') || lowerMsg.includes('high demand') || lowerMsg.includes('temporary spikes')) {
      return 'လက်ရှိတွင် အသုံးပြုသူ များပြားနေသဖြင့် စနစ်ခေတ္တမအားလပ်ပါ (Gemini API High Demand/Unavailable - 503)။ ကျေးဇူးပြု၍ စက္ကန့်အနည်းငယ်စောင့်ပြီးမှ ထပ်မံကြိုးစားပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
    }
    return msg;
  };

  const generateContentWithRetry = async (aiClient: any, params: any, req?: Request, maxRetries = 3, initialDelayMs = 1500) => {
    let lastError: any = null;
    let delay = initialDelayMs;
    const preferredModel = req?.headers['x-preferred-model'];

    if (preferredModel === 'openai') {
      const customOpenAiKey = req?.headers['x-custom-openai-key'];
      const apiKey = (typeof customOpenAiKey === 'string' && customOpenAiKey.trim()) ? customOpenAiKey.trim() : process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('No OpenAI API Key supplied. Please enter your personal OpenAI API Key under Settings to use OpenAI models.');
      const openai = new OpenAI({ apiKey });
      const systemInstruction = params.config?.systemInstruction || '';
      const promptText = params.contents?.[0]?.parts?.[0]?.text || '';
      const messages: any[] = systemInstruction ? [{ role: 'system', content: systemInstruction }] : [];
      messages.push({ role: 'user', content: promptText });
      const responseFormat = params.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[OpenAI SDK] Attempt ${attempt}/${maxRetries} running with model gpt-5-nano.`);
          const completion = await openai.chat.completions.create({ model: 'gpt-5-nano', messages, response_format: responseFormat as any });
          return { text: completion.choices?.[0]?.message?.content || '', candidates: [] };
        } catch (error: any) {
          lastError = error;
          console.warn(`[OpenAI Error] Attempt ${attempt} failed: ${error.message || String(error)}`);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2.5;
          }
        }
      }
      throw lastError;
    }

    params.model = preferredModel === 'gemini-2.5-flash' ? 'gemini-2.5-flash' : 'gemini-3.5-flash';
    console.log(`[Model Router] Using Gemini model: ${params.model}`);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Attempt ${attempt}/${maxRetries} running with model ${params.model}.`);
        return await aiClient.models.generateContent(params);
      } catch (error: any) {
        lastError = error;
        const msg = typeof error === 'string' ? error : (error.message || String(error));
        const lowerMsg = msg.toLowerCase();
        const isTransient = ['503', 'unavailable', 'high demand', '429', 'quota', 'exhausted', 'rate limit'].some((term) => lowerMsg.includes(term));
        if (!isTransient) throw error;
        if (attempt < maxRetries) {
          console.warn(`[Gemini Retry] Attempt ${attempt} failed with transient error: "${msg}". Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2.5;
        }
      }
    }
    throw lastError;
  };

  const withQueueLock = async (req: Request, res: Response, action: () => Promise<any>) => {
    const requestWithAuth = req as AuthRequest;
    const userKey = requestWithAuth.dbUser?.email || requestWithAuth.user?.email || req.ip || 'Anonymous User';
    let isCancelled = false;
    let cancelQueueRegistration = () => { isCancelled = true; };
    const handleDisconnect = () => {
      if (res.writableEnded) return;
      isCancelled = true;
      cancelQueueRegistration();
    };
    req.on('aborted', handleDisconnect);
    res.on('close', handleDisconnect);

    try {
      const { release } = await generationQueue.enqueue(userKey, (cancel) => {
        cancelQueueRegistration = () => {
          isCancelled = true;
          cancel();
        };
      });
      if (isCancelled) {
        release();
        return;
      }
      try {
        await action();
      } finally {
        release();
      }
    } catch (error: any) {
      if (error.message === 'Request cancelled by client disconnection') {
        console.log(`[Queue] Request for ${userKey} cancelled on client disconnect.`);
        return;
      }
      console.error(`[Queue] Error running action for ${userKey}:`, error);
      if (!res.headersSent) res.status(500).json({ error: formatGeminiError(error) });
    }
  };

  const getDictionaryInstructions = async (userId?: number) => {
    let instructions = '';
    const baseInstructions = '\nLinguistic Neural Processing Instructions (Minimizing tokens & NLP Optimization):\n- Prioritize syllable/word grouping and standard Unicode alignment.\n- Use direct, highly concise active verbs in Burmese which save 35% syllable/token overhead compared to passive/verbose clauses.\n- Output pure Burmese literary news standard with zero conversational text, zero introductory greetings, and zero concluding remarks. Use compact, high-speed, and token-saving translations.';
    if (!process.env.SQL_HOST || !process.env.SQL_USER || !process.env.SQL_DB_NAME) {
      return baseInstructions;
    }
    try {
      if (userId) {
        const corrections = await db.select().from(userCorrections).where(and(eq(userCorrections.userId, userId), eq(userCorrections.isEnabled, true)));
        if (corrections.length > 0) {
          instructions += '\nCRITICAL WORD CORRECTIONS (Personal overrides defined by user):\n';
          corrections.forEach((correction) => {
            instructions += `- In Burmese news writing, always replace/write "${correction.originalWord}" as "${correction.correctedWord}". Do NOT write "${correction.originalWord}".\n`;
          });
        }
      }
      const globals = await db.select().from(globalVocabulary);
      if (globals.length > 0) {
        instructions += '\nCRITICAL GLOBAL JOURNALISM TRANSLATION GLOSSARY:\n';
        globals.forEach((globalWord) => {
          instructions += `- For English term "${globalWord.englishWord}" (Part of speech: ${globalWord.partOfSpeech || 'General'}), always use standard Burmese translation: "${globalWord.burmeseTranslation}".\n`;
        });
      }
      instructions += baseInstructions;
    } catch (error) {
      console.error('Error building dictionary instructions:', error);
    }
    return instructions;
  };

  return { getAiClient, formatGeminiError, generateContentWithRetry, withQueueLock, getDictionaryInstructions };
}
