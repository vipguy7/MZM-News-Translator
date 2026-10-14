import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from 'openai';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import pdfParse from 'pdf-parse-fork';
import mammoth from 'mammoth';

// These would normally be imported from constants.ts, but to ensure 
// server-side execution without potential browser-only code in constants,
// we define the core ones here or use them directly if possible.
// For now, I'll import from constants.ts since it looks safe (no DOM dependecies).
import { 
    GEMINI_MODEL_TEXT, 
    SYSTEM_INSTRUCTION_PROOFREADER,
    SYSTEM_INSTRUCTION_SEO_OPTIMIZER,
    SYSTEM_INSTRUCTION_CATEGORIZER,
} from './constants.js';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { newsScripts, newsFeedbacks, userCorrections, globalVocabulary } from './src/db/schema.ts';
import { eq, desc, and, lt, gte } from 'drizzle-orm';

class GenerationQueue {
  private queue: Array<{ id: string; resolve: () => void; reject: (err: any) => void; email: string; timestamp: number }> = [];
  private activeTask: { id: string; email: string; timestamp: number } | null = null;
  private lastActiveUser: string | null = null;

  public async enqueue(email: string, onDisconnect: (cancel: () => void) => void): Promise<{ release: () => void }> {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Line Rule: Limit maximum pending queued requests per user to 3 to prevent malicious or accidental queue spam.
    const userQueuedCount = this.queue.filter(t => t.email === email).length;
    if (userQueuedCount >= 3) {
      throw new Error('တောင်းဆိုမှုများလွန်းနေပါသည်။ (Too Many Requests in Queue). ကျေးဇူးပြု၍ သင်၏ ယခင်တောင်းဆိုမှုများ ပြီးဆုံးသည်အထိ ခဏစောင့်ဆိုင်းပေးပါ။');
    }
    
    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({ id, resolve, reject, email, timestamp: Date.now() });
    });

    onDisconnect(() => {
      const index = this.queue.findIndex(t => t.id === id);
      if (index >= 0) {
        const removed = this.queue.splice(index, 1)[0];
        removed.reject(new Error('Request cancelled by client disconnection'));
      }
    });

    this.processNext();

    await promise;

    const release = () => {
      this.activeTask = null;
      this.processNext();
    };

    return { release };
  }

  public getStatus(email: string) {
    const positionInQueue = this.queue.findIndex(t => t.email === email);
    const selfIsActive = this.activeTask ? this.activeTask.email === email : false;
    return {
      isBusy: this.activeTask !== null,
      activeUser: this.activeTask ? this.activeTask.email : null,
      queueLength: this.queue.length,
      position: positionInQueue >= 0 ? positionInQueue + 1 : 0,
      selfIsActive,
      activeTaskStartTime: this.activeTask ? this.activeTask.timestamp : null
    };
  }

  private processNext() {
    if (this.activeTask !== null || this.queue.length === 0) {
      return;
    }

    // Fair-Share Selection Rule:
    // If the person at the head of the queue was the previous active user, and there are other users waiting,
    // we prioritize serving another waiting user first (round-robin) to make sure one user cannot hog the system.
    let selectedIndex = 0;
    if (this.lastActiveUser && this.queue.length > 1) {
      const firstTask = this.queue[0];
      if (firstTask.email === this.lastActiveUser) {
        const alternativeIndex = this.queue.findIndex(t => t.email !== this.lastActiveUser);
        if (alternativeIndex !== -1) {
          selectedIndex = alternativeIndex;
          console.log(`[Queue Fair-Share] Prioritizing task of user ${this.queue[alternativeIndex].email} over consecutive request from ${this.lastActiveUser}`);
        }
      }
    }

    const nextTask = this.queue.splice(selectedIndex, 1)[0];
    if (nextTask) {
      this.activeTask = {
        id: nextTask.id,
        email: nextTask.email,
        timestamp: Date.now()
      };
      this.lastActiveUser = nextTask.email;
      nextTask.resolve();
    }
  }
}

const generationQueue = new GenerationQueue();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    const logFilePath = path.join(process.cwd(), 'server_requests.log');
    const timestamp = new Date().toISOString();
    
    // Log incoming request
    const reqLog = `[${timestamp}] REQ: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}\n`;
    try {
      fs.appendFileSync(logFilePath, reqLog);
    } catch (e) {}

    const originalJson = res.json;
    res.json = function(body) {
      const respLog = `[${new Date().toISOString()}] RESP JSON: ${req.method} ${req.url} - Status: ${res.statusCode} - Body: ${JSON.stringify(body).substring(0, 1000)}\n`;
      try {
        fs.appendFileSync(logFilePath, respLog);
      } catch (e) {}
      return originalJson.call(this, body);
    };

    const originalSend = res.send;
    res.send = function(body) {
      if (res.get('Content-Type')?.includes('text/html')) {
        const snippet = (typeof body === 'string') ? body.substring(0, 500) : 'Non-string body';
        const respLog = `[${new Date().toISOString()}] RESP HTML: ${req.method} ${req.url} - Status: ${res.statusCode} - Snippet: ${snippet}\n`;
        try {
          fs.appendFileSync(logFilePath, respLog);
        } catch (e) {}
      } else {
        const stringBody = (typeof body === 'string' || Buffer.isBuffer(body)) ? body.toString().substring(0, 500) : 'Non-string / non-buffer body';
        const respLog = `[${new Date().toISOString()}] RESP OTHER: ${req.method} ${req.url} - Status: ${res.statusCode} - Type: ${res.get('Content-Type')} - Body snippet: ${stringBody}\n`;
        try {
          fs.appendFileSync(logFilePath, respLog);
        } catch (e) {}
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // Helper for Gemini API
  const getAiClient = (req: express.Request) => {
    const customKey = req.headers['x-custom-gemini-key'];
    const apiKey = (typeof customKey === 'string' && customKey.trim()) ? customKey.trim() : process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No Gemini API key supplied. Please verify you are logged in, have daily free credits, or enter your personal Gemini API Key under Settings.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  const formatGeminiError = (error: any): string => {
    if (!error) return 'ခေတ္တချို့ယွင်းချက်ရှိနေပါသည်။ ကျေးဇူးပြု၍ ခဏကြာမှ ထပ်မံကြိုးစားပေးပါ။ (Unknown Error)';
    
    let msg = typeof error === 'string' ? error : (error.message || String(error));
    const lowerMsg = msg.toLowerCase();

    // Try to parse JSON from message if it is a JSON string (typical for google genai sdk errors)
    const trimmedMsg = msg.trim();
    if (trimmedMsg.startsWith('{') || trimmedMsg.includes('"error"')) {
      try {
        const startIdx = trimmedMsg.indexOf('{');
        const endIdx = trimmedMsg.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonStr = trimmedMsg.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            const errCode = parsed.error.code;
            const errStatus = parsed.error.status;
            const errMessage = parsed.error.message;
            
            if (errCode === 429 || errStatus === 'RESOURCE_EXHAUSTED' || (errMessage && errMessage.toLowerCase().includes('quota'))) {
              return 'ခေတ္တတောင်းဆိုမှုထူထပ်နေပါသည်။ (Gemini API Speed Limit/Quota Exceeded - 429). ကျေးဇူးပြု၍ စက္ကန့် (၃၀-၆၀) ခန့် စောင့်ပြီးမှ ထပ်မံကြိုးစားပေးပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
            }
            if (errCode === 503 || errStatus === 'UNAVAILABLE' || (errMessage && (errMessage.toLowerCase().includes('high demand') || errMessage.toLowerCase().includes('temporary') || errMessage.toLowerCase().includes('unavailable')))) {
              return 'လက်ရှိတွင် အသုံးပြုသူ များပြားနေသဖြင့် စနစ်ခေတ္တမအားလပ်ပါ (Gemini API High Demand/Unavailable - 503)။ ကျေးဇူးပြု၍ စက္ကန့်အနည်းငယ်စောင့်ပြီးမှ ထပ်မံကြိုးစားပေးပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
            }
            if (errMessage) {
              msg = errMessage;
            }
          }
        }
      } catch (e) {
        // ignore parsing error
      }
    }

    if (lowerMsg.includes('429') || lowerMsg.includes('quota') || lowerMsg.includes('exhausted') || lowerMsg.includes('rate limit')) {
      return 'ခေတ္တတောင်းဆိုမှုထူထပ်နေပါသည်။ (Gemini API Speed Limit/Quota Exceeded - 429). ကျေးဇူးပြု၍ စက္ကန့် (၃၀-၆၀) ခန့် စောင့်ပြီးမှ ထပ်မံကြိုးစားပေးပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
    }
    if (lowerMsg.includes('503') || lowerMsg.includes('unavailable') || lowerMsg.includes('high demand') || lowerMsg.includes('temporary spikes')) {
      return 'လက်ရှိတွင် အသုံးပြုသူ များပြားနေသဖြင့် စနစ်ခေတ္တမအားလပ်ပါ (Gemini API High Demand/Unavailable - 503)။ ကျေးဇူးပြု၍ စက္ကန့်အနည်းငယ်စောင့်ပြီးမှ ထပ်မံကြိုးစားပေးပါ။ သို့မဟုတ် Settings တွင် သင်၏ကိုယ်ပိုင် Gemini API Key အခမဲ့ထည့်သွင်း၍ အကန့်အသတ်မရှိ ဆက်လက်သုံးစွဲနိုင်ပါသည်။';
    }

    return msg;
  };

  // Helper with automatic retry for transient errors (503 and 429)
  const generateContentWithRetry = async (aiClient: any, params: any, req?: express.Request, maxRetries = 3, initialDelayMs = 1500) => {
    let lastError: any = null;
    let delay = initialDelayMs;

    const preferredModel = req?.headers['x-preferred-model'];

    // Decide which model to run:
    if (preferredModel === 'openai') {
      // Use OpenAI (gpt-4o-mini free/low-cost model as default)
      const customOpenAiKey = req?.headers['x-custom-openai-key'];
      const apiKey = (typeof customOpenAiKey === 'string' && customOpenAiKey.trim()) 
        ? customOpenAiKey.trim() 
        : process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('No OpenAI API Key supplied. Please enter your personal OpenAI API Key under Settings to use OpenAI models.');
      }

      const openai = new OpenAI({ apiKey });
      
      const systemInstruction = params.config?.systemInstruction || '';
      const promptText = params.contents?.[0]?.parts?.[0]?.text || '';
      
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: promptText });

      const responseMimeType = params.config?.responseMimeType;
      const responseFormat = responseMimeType === 'application/json' ? { type: 'json_object' } : undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[OpenAI SDK] Attempt ${attempt}/${maxRetries} running with model gpt-4o-mini.`);
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            response_format: responseFormat as any,
          });

          const content = completion.choices?.[0]?.message?.content || '';
          return {
            text: content,
            candidates: []
          };
        } catch (error: any) {
          lastError = error;
          const msg = typeof error === 'string' ? error : (error.message || String(error));
          console.warn(`[OpenAI Error] Attempt ${attempt} failed: ${msg}`);
          if (attempt === maxRetries) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2.5;
        }
      }
      throw lastError;
    }

    // Otherwise, use Google Gemini
    if (preferredModel === 'gemini-2.5-flash') {
      params.model = 'gemini-2.5-flash';
    } else {
      // Always use the free, high-performance 'gemini-3.5-flash' model for text generation,
      // as it is the most capable model on the free tier without token or request bans.
      params.model = 'gemini-3.5-flash';
    }
    console.log(`[Model Router] Using Gemini model: ${params.model}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Attempt ${attempt}/${maxRetries} running with model ${params.model}.`);
        return await aiClient.models.generateContent(params);
      } catch (error: any) {
        lastError = error;
        const msg = typeof error === 'string' ? error : (error.message || String(error));
        const lowerMsg = msg.toLowerCase();
        
        const isTransient = 
          lowerMsg.includes('503') || 
          lowerMsg.includes('unavailable') || 
          lowerMsg.includes('high demand') || 
          lowerMsg.includes('429') || 
          lowerMsg.includes('quota') || 
          lowerMsg.includes('exhausted') || 
          lowerMsg.includes('rate limit');

        // Fail fast on non-transient errors (e.g. invalid API key, etc.)
        if (!isTransient) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        console.warn(`[Gemini Retry] Attempt ${attempt} failed with transient error: "${msg}". Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2.5; // exponential backoff with higher factor for resilience
      }
    }

    throw lastError;
  };

  const withQueueLock = async (req: express.Request, res: express.Response, action: () => Promise<any>) => {
    const requestWithAuth = req as AuthRequest;
    const email = requestWithAuth.dbUser?.email || requestWithAuth.user?.email || req.ip || 'Anonymous User';
    
    let isCancelled = false;
    let cancelQueueRegistration = () => { isCancelled = true; };

    req.on('close', () => {
      isCancelled = true;
      cancelQueueRegistration();
    });

    try {
      const { release } = await generationQueue.enqueue(email, (cancel) => {
        cancelQueueRegistration = () => {
          isCancelled = true;
          cancel();
        };
      });

      if (isCancelled) {
        return;
      }

      try {
        await action();
      } finally {
        release();
      }
    } catch (err: any) {
      if (err.message === 'Request cancelled by client disconnection') {
        console.log(`[Queue] Request for ${email} cancelled on client disconnect.`);
        return;
      }
      console.error(`[Queue] Error running action for ${email}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: formatGeminiError(err) });
      }
    }
  };

  const getDictionaryInstructions = async (userId?: number) => {
    let instructions = '';
    try {
      // 1. Fetch enabled personal corrections
      if (userId) {
        const corrections = await db.select()
          .from(userCorrections)
          .where(and(eq(userCorrections.userId, userId), eq(userCorrections.isEnabled, true)));
        
        if (corrections.length > 0) {
          instructions += "\nCRITICAL WORD CORRECTIONS (Personal overrides defined by user):\n";
          corrections.forEach(c => {
            instructions += `- In Burmese news writing, always replace/write "${c.originalWord}" as "${c.correctedWord}". Do NOT write "${c.originalWord}".\n`;
          });
        }
      }

      // 2. Fetch all global vocabularies added by admin
      const globals = await db.select().from(globalVocabulary);
      if (globals.length > 0) {
        instructions += "\nCRITICAL GLOBAL JOURNALISM TRANSLATION GLOSSARY:\n";
        globals.forEach(g => {
          instructions += `- For English term "${g.englishWord}" (Part of speech: ${g.partOfSpeech || 'General'}), always use standard Burmese translation: "${g.burmeseTranslation}".\n`;
        });
      }

      // 3. Burmese optimization for token savings
      instructions += `\nLinguistic Neural Processing Instructions (Minimizing tokens & NLP Optimization):
- Prioritize syllable/word grouping and standard Unicode alignment.
- Use direct, highly concise active verbs in Burmese which save 35% syllable/token overhead compared to passive/verbose clauses.
- Output pure Burmese literary news standard with zero conversational text, zero introductory greetings, and zero concluding remarks. Use compact, high-speed, and token-saving translations.`;
    } catch (e) {
      console.error("Error building dictionary instructions:", e);
    }
    return instructions;
  };

  // API Routes
  app.get('/api/news-scripts', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const scripts = await db.select()
        .from(newsScripts)
        .where(eq(newsScripts.userId, req.dbUser.id))
        .orderBy(desc(newsScripts.createdAt));
      res.json(scripts);
    } catch (error: any) {
      console.error('Failed to fetch news-scripts:', error);
      res.status(500).json({ error: 'Database query failed. Please try again later.' });
    }
  });

  app.post('/api/news-scripts', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const { title, content, category, originalInput, scriptType } = req.body;
      if (!title || !content || !scriptType) {
        return res.status(400).json({ error: 'Missing required fields (title, content, scriptType)' });
      }

      const [newScript] = await db.insert(newsScripts)
        .values({
          userId: req.dbUser.id,
          title,
          content,
          category,
          originalInput,
          scriptType,
        })
        .returning();

      res.status(201).json(newScript);
    } catch (error: any) {
      console.error('Failed to create news script:', error);
      res.status(500).json({ error: 'Database insert failed. Please try again later.' });
    }
  });

  app.delete('/api/news-scripts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idStr || '', 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid script ID' });
      }

      const deleted = await db.delete(newsScripts)
        .where(eq(newsScripts.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'News script not found or already deleted' });
      }

      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error('Failed to delete news script:', error);
      res.status(500).json({ error: 'Database delete failed. Please try again later.' });
    }
  });

  // User Profile & Usage Endpoint
  app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const isAdmin = req.dbUser.email === 'axiom.data7@gmail.com';

      // Auto-prune saved scripts older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await db.delete(newsScripts)
        .where(and(eq(newsScripts.userId, req.dbUser.id), lt(newsScripts.createdAt, thirtyDaysAgo)));

      // Count scripts created today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const scriptsGeneratedToday = await db.select()
        .from(newsScripts)
        .where(and(eq(newsScripts.userId, req.dbUser.id), gte(newsScripts.createdAt, todayStart)));

      res.json({
        user: {
          id: req.dbUser.id,
          email: req.dbUser.email,
          uid: req.dbUser.uid,
          createdAt: req.dbUser.createdAt,
          isAdmin,
        },
        usageToday: scriptsGeneratedToday.length,
        limit: 30,
      });
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // User Corrections Endpoints
  app.get('/api/user-corrections', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const corrections = await db.select()
        .from(userCorrections)
        .where(eq(userCorrections.userId, req.dbUser.id))
        .orderBy(desc(userCorrections.createdAt));
      res.json(corrections);
    } catch (error: any) {
      console.error('Failed to fetch user corrections:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/user-corrections', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const { originalWord, correctedWord } = req.body;
      if (!originalWord?.trim() || !correctedWord?.trim()) {
        return res.status(400).json({ error: 'Both original word and corrected word are required' });
      }

      const [newCorrection] = await db.insert(userCorrections)
        .values({
          userId: req.dbUser.id,
          originalWord: originalWord.trim(),
          correctedWord: correctedWord.trim(),
          isEnabled: true,
        })
        .returning();

      res.status(201).json(newCorrection);
    } catch (error: any) {
      console.error('Failed to add correction:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.put('/api/user-corrections/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idStr || '', 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      const { isEnabled } = req.body;

      const [updated] = await db.update(userCorrections)
        .set({ isEnabled: !!isEnabled })
        .where(and(eq(userCorrections.id, id), eq(userCorrections.userId, req.dbUser.id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Correction not found' });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update correction:', error);
      res.status(500).json({ error: 'Database update failed' });
    }
  });

  app.delete('/api/user-corrections/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idStr || '', 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const deleted = await db.delete(userCorrections)
        .where(and(eq(userCorrections.id, id), eq(userCorrections.userId, req.dbUser.id)))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Correction not found' });
      }

      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error('Failed to delete correction:', error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  // News Feedbacks Endpoint
  app.post('/api/news-feedbacks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      const { rating, originalText, comment, wrongWord, correctedWord } = req.body;
      if (!rating) {
        return res.status(400).json({ error: 'Rating is required' });
      }

      const [newFeedback] = await db.insert(newsFeedbacks)
        .values({
          userId: req.dbUser.id,
          rating,
          originalText,
          comment,
          wrongWord,
          correctedWord,
        })
        .returning();

      // If correction details are provided, automatically insert into user's personal corrections!
      if (wrongWord?.trim() && correctedWord?.trim()) {
        try {
          await db.insert(userCorrections)
            .values({
              userId: req.dbUser.id,
              originalWord: wrongWord.trim(),
              correctedWord: correctedWord.trim(),
              isEnabled: true,
            });
        } catch (dictionaryError) {
          console.warn('Auto dictionary insert on feedback failed (e.g., duplicated):', dictionaryError);
        }
      }

      res.status(201).json(newFeedback);
    } catch (error: any) {
      console.error('Failed to submit news feedback:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  // Global Vocabulary Endpoints (Restricted to axiom.data7@gmail.com Super Admin)
  app.get('/api/global-vocabulary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const vocabList = await db.select()
        .from(globalVocabulary)
        .orderBy(desc(globalVocabulary.createdAt));
      res.json(vocabList);
    } catch (error: any) {
      console.error('Failed to fetch global vocabulary:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/global-vocabulary', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      // Super Admin protection
      if (req.dbUser.email !== 'axiom.data7@gmail.com') {
        return res.status(403).json({ error: 'Access denied: Only the Super Admin (axiom.data7@gmail.com) is allowed to add global vocabulary terms.' });
      }

      const { englishWord, burmeseTranslation, partOfSpeech, notes } = req.body;
      if (!englishWord?.trim() || !burmeseTranslation?.trim()) {
        return res.status(400).json({ error: 'English word and Burmese translation are required' });
      }

      const [newWord] = await db.insert(globalVocabulary)
        .values({
          englishWord: englishWord.trim(),
          burmeseTranslation: burmeseTranslation.trim(),
          partOfSpeech: partOfSpeech || 'General',
          notes,
          addedBy: req.dbUser.id,
        })
        .returning();

      res.status(201).json(newWord);
    } catch (error: any) {
      console.error('Failed to add global vocabulary word:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.delete('/api/global-vocabulary/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({ error: 'User registration not found in DB' });
      }
      // Super Admin protection
      if (req.dbUser.email !== 'axiom.data7@gmail.com') {
        return res.status(403).json({ error: 'Access denied: Only the Super Admin is allowed to delete global vocabulary terms.' });
      }

      const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idStr || '', 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const deleted = await db.delete(globalVocabulary)
        .where(eq(globalVocabulary.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Vocabulary term not found' });
      }

      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error('Failed to delete global vocabulary term:', error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  app.get('/api/queue-status', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const email = req.dbUser?.email || req.user?.email || req.ip || 'Anonymous User';
      const status = generationQueue.getStatus(email);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/parse-file', async (req, res) => {
    try {
      const { fileData, fileType, fileName, enhanced } = req.body;
      const buffer = Buffer.from(fileData, 'base64');
      let text = '';
      let isOcrUsed = false;
      let ocrError = '';

      if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        let localText = '';
        try {
          const data = await pdfParse(buffer);
          localText = data.text || '';
        } catch (e: any) {
          console.warn('Local pdfParse failed, will rely on enhanced parsing if available:', e);
        }

        // Auto-detect if standard PDF parser extracted almost nothing (e.g. Scanned Document)
        const isExtremelyShort = localText.trim().replace(/\s/g, '').length < 150;
        const shouldRunEnhanced = enhanced === true || (enhanced !== false && isExtremelyShort);

        if (shouldRunEnhanced) {
          await withQueueLock(req, res, async () => {
            try {
              console.log(`Running high-accuracy Gemini OCR & layout parsing for PDF: ${fileName} (Is Auto fallback: ${isExtremelyShort && enhanced !== true})`);
              const ai = getAiClient(req);
              
              const prompt = `Analyze the attached PDF document and extract all text, data, and information with extremely high fidelity. Follow these strict directives to handle data visualization, statistics, and tables with superior accuracy:

1. Maintain the natural reading order for multi-column layouts.
2. [STRUCTURED TABLES & VISIONS EXTRACTION] 
     - For ANY table in the PDF, transcribe it with absolute perfection as a valid Markdown table. Precede the table with a strict marker line: "### [TABLE_DATA: Table Title/Description]" to help downstream analysis models capture the structured columns.
     - For ANY visual charts, graphs, or infographics (e.g. bar charts, line trends, pie slices, geographic data distributions): extract the complete plotted dataset (including categories, values, ticks, legends) and structure it as a clean Markdown data matrix or table. Precede it with a strict marker line: "### [CHART_DATA: Chart Title | Chart Type (e.g., bar/line/pie)]".
3. Transcribe all text, numbers, dates, and names exactly. 
     - If pages are scanned images (OCR), perform precise OCR text extraction supporting both Burmese and English.
     - If values contain Burmese numerals (၁, ၂, ၃, ...), transcribe them as is (for compliance/verifiability), but also provide their standard Arabic numeral equivalents in parentheses right next to them, e.g., "၄၅ (45)" or "၃.၅ သန်း (3.5 million)", to prevent downstream parsing failures.
4. [STATISTICS DIGEST]
     - Identify all numerical statistics, rates, and indicators (e.g., GDP figures, inflation percentages, displaced persons counts, test scores) and compile them under a clear tag "### [STATISTICS_DATA]". Detail their metric name, specific unit, value, temporal scope, and the exact citation sentence.
5. Preserve bullet points, lists, and headings so the structural hierarchy is clear.
6. Output ONLY the raw extracted transcript/text of the document. Do not summarize, translate, comment, or add any preamble. Just output the clean extracted document content containing the structured markers.`;

              const geminiResponse = await generateContentWithRetry(ai, {
                model: GEMINI_MODEL_TEXT,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          data: fileData,
                          mimeType: 'application/pdf'
                        }
                      },
                      {
                        text: prompt
                      }
                    ]
                  }
                ]
              }, req);

              const extractedText = geminiResponse.text || '';
              if (extractedText.trim()) {
                text = extractedText;
                isOcrUsed = true;
              } else {
                text = localText;
              }
            } catch (geminiError: any) {
              console.error('Gemini enhanced parsing failed:', geminiError);
              ocrError = formatGeminiError(geminiError);
              text = localText; // fallback to basic text
            }
          });
        } else {
          text = localText;
        }
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        res.status(400).json({ error: 'Unsupported file type' });
        return;
      }

      res.json({ text, isOcrUsed, ocrError: ocrError || undefined });
    } catch (error: any) {
      console.error('Error in /api/parse-file:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  app.post('/api/generate-script', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { prompt, useSearchGrounding, systemInstruction } = req.body;
        const ai = getAiClient(req);
        const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

        const tools: any[] = [];
        if (useSearchGrounding) {
          tools.push({ googleSearch: {} });
        }

        const response = await generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: (systemInstruction || '') + '\n' + dictInstructions,
            tools: tools.length > 0 ? tools : undefined,
          }
        }, req);

        const text = response.text || '';
        
        let sources = undefined;
        // Extract grounding sources if available
        const candidate = (response as any).candidates?.[0];
        if (candidate?.groundingMetadata?.groundingChunks) {
          sources = candidate.groundingMetadata.groundingChunks;
        }

        res.json({ script: text, sources });
      } catch (error: any) {
        console.error('Error in /api/generate-script:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/generate-report-news', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { prompt, systemInstruction } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          script: {
            type: Type.STRING,
            description: "The main news script or article text. Divide into professional paragraphs with double line-breaks. Ensure there are no Markdown symbols (** or # or *), headers, or labels like 'နိဒါန်း', 'နိဂုံး', etc."
          },
          statistics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                metric: { type: Type.STRING, description: "Short descriptive name or metric label in the output target language (e.g. 'လူဦးရေတိုးနှုန်း', 'Displaced Persons')." },
                value: { type: Type.STRING, description: "The precise statistic or number including units in the output language (e.g. '၃၅%', '၈၂,၅၀၀ ဦး', 'USD 2.5B'). Match the numerals of the output script." },
                detail: { type: Type.STRING, description: "Detailed explanation or citation context for this statistic in standard news language. Must specify the reporting organization, exact timeframe, and explicit comparison where possible." }
              },
              required: ["metric", "value", "detail"]
            },
            description: "A comprehensive list of key numerical statistics or core metrics parsed with high fidelity from the tables, figures, or body of the report."
          },
          chartData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "A very short visual category label (1-2 words, e.g., '25-34', 'မြန်မာ', '2023') representing the bar, line, or pie slice of the chart." },
                value: { type: Type.NUMBER, description: "Numerical value for plotting. MUST be a valid, standard Arabic real number or integer, e.g., 30, 45.2, 1200000. NEVER use Burmese numerals like ၁,၂,၃, or ranges, or strings. Convert Burmese numerals to standard digits (1, 2, 3)." },
                unit: { type: Type.STRING, description: "Unit of the value (e.g. '%', 'millions', '$', 'ဦး')." }
              },
              required: ["label", "value"]
            },
            description: "Structured numeric data points suitable for drawing a visual chart (Bar, Line, or Pie). Prioritize extracting from pre-structured [CHART_DATA] and [TABLE_DATA] sections."
          },
          chartTitle: {
            type: Type.STRING,
            description: "An appropriate, highly descriptive and short title for the graphical chart in the target translation language."
          },
          chartType: {
            type: Type.STRING,
            description: "The ideal visualization chart type: 'bar' (categories/regions), 'line' (time series/temporal trends), or 'pie' (percentage distribution of a total)."
          }
        },
        required: ["script"]
      };

      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: (systemInstruction || '') + '\n' + dictInstructions + "\nYou MUST return a JSON matching the requested schema. Extracted statistics, charts, and metrics must correspond accurately to the data present in the report.",
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }, req);

      const responseText = response.text || '{}';
      const output = JSON.parse(responseText);

        res.json(output);
      } catch (error: any) {
        console.error('Error in /api/generate-report-news:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/summarize-report', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { text, targetLanguage } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const prompt = `You are a professional research analyst and investigative editor.
Analyze the following document/report and provide an incredibly concise, high-fidelity, and well-structured factual summary.
Output the summary in bullet points using ${targetLanguage === 'English' ? 'English' : 'Burmese'}.
Do not extrapolate, insert external facts, or use subjective filler. Just output a clean, bulleted list of 5-8 major factual takeaways and key statistics. Ensure absolutely no Markdown headings or bold titles are used other than simple list bullets.

Report Document Content:
"""
${text}
"""`;

      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are an expert report summarizer. Output 5-8 bullet points of high-fidelity factual key findings. Do not add intro or outro conversational text.\n" + dictInstructions
        }
      }, req);

        res.json({ summary: response.text || '' });
      } catch (error: any) {
        console.error('Error in /api/summarize-report:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/translate', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { text, systemInstruction } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const response = await generateContentWithRetry(ai, { 
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction: (systemInstruction || '') + '\n' + dictInstructions
        }
      }, req);

        res.json({ translatedText: response.text || '' });
      } catch (error: any) {
        console.error('Error in /api/translate:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/proofread', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const response = await generateContentWithRetry(ai, { 
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: script }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PROOFREADER + '\n' + dictInstructions
        }
      }, req);

        res.json({ editedScript: response.text || '' });
      } catch (error: any) {
        console.error('Error in /api/proofread:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/generate-seo', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const response = await generateContentWithRetry(ai, { 
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: `Generate SEO metadata for this script: ${script.substring(0, 5000)}` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_SEO_OPTIMIZER + '\n' + dictInstructions,
          responseMimeType: 'application/json'
        }
      }, req);

        const text = response.text || '{}';
        const seoData = JSON.parse(text);
        res.json({ seoData });
      } catch (error: any) {
        console.error('Error in /api/generate-seo:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  app.post('/api/categorize-news', optionalAuth, async (req: AuthRequest, res) => {
    await withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
      const ai = getAiClient(req);
      const dictInstructions = await getDictionaryInstructions(req.dbUser?.id);

      const response = await generateContentWithRetry(ai, { 
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: `Categorize this news script: ${script.substring(0, 5000)}` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_CATEGORIZER + '\n' + dictInstructions
        }
      }, req);

        const category = response.text?.trim() || 'သတင်းဖော်ပြချက် (General News)';
        res.json({ category });
      } catch (error: any) {
        console.error('Error in /api/categorize-news:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    });
  });

  // Helper to extract clean article content from raw HTML with Readability + targeted newsroom selectors
  const extractArticleFromHtml = (html: string, pageUrl: string) => {
    try {
      const dom = new JSDOM(html, { url: pageUrl });
      const doc = dom.window.document;
      
      // Strategy A: Mozilla Readability
      try {
        const reader = new Readability(doc);
        const article = reader.parse();
        if (article && article.textContent && article.textContent.trim().length > 180) {
          return {
            title: article.title || '',
            content: article.textContent.trim(),
            excerpt: article.excerpt || ''
          };
        }
      } catch (readabilityErr) {
        // Fall through to targeted selector extraction
      }

      // Strategy B: News agency specific selectors (Reuters, BBC, AP, CNN, Al Jazeera, etc.)
      const titleEl = doc.querySelector('h1') || 
                      doc.querySelector('meta[property="og:title"]') || 
                      doc.querySelector('meta[name="twitter:title"]');
      const title = titleEl ? (titleEl.getAttribute('content') || titleEl.textContent || '').trim() : '';

      const articleContainers = [
        'article',
        '[data-testid="ArticleBody"]',
        '.article-body',
        '.article__content',
        '.article-body__content',
        '.RichTextStoryBody',
        '.StoryBody',
        '.story-body',
        'div[itemprop="articleBody"]',
        'main[role="main"]',
        '.story-content'
      ];

      for (const selector of articleContainers) {
        const container = doc.querySelector(selector);
        if (container) {
          const paragraphs = Array.from(container.querySelectorAll('p'))
            .map(p => p.textContent?.trim() || '')
            .filter(t => t.length > 25 && !t.toLowerCase().includes('subscribe') && !t.toLowerCase().includes('cookie') && !t.toLowerCase().includes('all rights reserved'));
          
          if (paragraphs.length >= 2) {
            const joinedContent = paragraphs.join('\n\n');
            if (joinedContent.length > 180) {
              return {
                title,
                content: joinedContent,
                excerpt: paragraphs[0].substring(0, 200)
              };
            }
          }
        }
      }

      // Strategy C: Generic body paragraph extraction
      const bodyParagraphs = Array.from(doc.querySelectorAll('p'))
        .map(p => p.textContent?.trim() || '')
        .filter(t => t.length > 30 && !t.toLowerCase().includes('cookie') && !t.toLowerCase().includes('terms of use'));

      if (bodyParagraphs.length >= 3) {
        const joined = bodyParagraphs.join('\n\n');
        if (joined.length > 200) {
          return {
            title,
            content: joined,
            excerpt: bodyParagraphs[0].substring(0, 200)
          };
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  app.post('/api/scrape-url', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'သတင်းလင့်ခ် ထည့်သွင်းပေးပါရန် (URL is required).' });
    }

    const targetUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return res.status(400).json({ error: 'ဝဘ်လင့်ခ်ပုံစံ လွဲမှားနေပါသည် (Invalid URL format).' });
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');
    let browser: any = null;

    // --- TIER 1: Enhanced Stealth Puppeteer ---
    try {
      const puppeteer = await import('puppeteer').then(m => m.default);
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080'
        ],
        headless: true
      });

      const page = await browser.newPage();
      
      // Anti-fingerprinting stealth overrides
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1440, height: 900 });

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
      });

      // Selectively block only media and images, DO NOT block stylesheets (blocking CSS triggers bot-detection challenges)
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const resourceType = request.resourceType();
        if (['image', 'media', 'font'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      const navResponse = await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 25000 
      });

      const httpStatus = navResponse ? navResponse.status() : 200;
      if ([401, 403, 503].includes(httpStatus)) {
        throw new Error(`Bot protection or access restriction encountered with status ${httpStatus}`);
      }

      // Small dynamic wait for hydrated text
      await new Promise(resolve => setTimeout(resolve, 1500));

      const html = await page.content();
      const extracted = extractArticleFromHtml(html, targetUrl);

      if (extracted && extracted.content.length > 150) {
        console.log(`[Tier 1 Stealth Scraper] Successfully extracted article for: ${targetUrl}`);
        return res.json({ 
          title: extracted.title,
          content: extracted.content,
          excerpt: extracted.excerpt,
          method: 'stealth_puppeteer'
        });
      }

      throw new Error('Puppeteer did not find readable article content; site might be protected or paywalled.');
    } catch (tier1Error: any) {
      console.warn(`[Tier 1 Stealth Scraper Failed] for ${targetUrl}: ${tier1Error.message || tier1Error}. Proceeding to Tier 2...`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
    }

    // --- TIER 2: Resilient Direct HTTP GET with Chrome Headers ---
    try {
      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!fetchRes.ok) {
        throw new Error(`Direct HTTP fetch failed with status ${fetchRes.status}`);
      }

      const html = await fetchRes.text();
      const extracted = extractArticleFromHtml(html, targetUrl);

      if (extracted && extracted.content.length > 150) {
        console.log(`[Tier 2 HTTP Scraper] Successfully extracted article for: ${targetUrl}`);
        return res.json({ 
          title: extracted.title,
          content: extracted.content,
          excerpt: extracted.excerpt,
          method: 'direct_http'
        });
      }

      throw new Error('Direct HTTP response did not contain sufficient readable article content.');
    } catch (tier2Error: any) {
      console.warn(`[Tier 2 HTTP Scraper Failed] for ${targetUrl}: ${tier2Error.message || tier2Error}. Proceeding to Tier 3 (Gemini Google Search Grounding Fallback)...`);
    }

    // --- TIER 3: Automated Gemini Google Search Grounding Retrieval ---
    try {
      console.log(`[Tier 3 Search Grounding] Activating Gemini Search Grounding for protected URL: ${targetUrl}`);
      const ai = getAiClient(req);

      const pathTokens = parsedUrl.pathname
        .replace(/[-_/]/g, ' ')
        .replace(/\.html?$/i, '')
        .replace(/\d+/g, '')
        .trim();

      const searchPrompt = `A journalist needs the full news report corresponding to this protected or paywalled URL:
URL: ${targetUrl}
Domain: ${domain}
Keywords/Slug: ${pathTokens}

The website returned a 401 Unauthorized or anti-bot challenge block.
Please use Google Search grounding to find the published news article corresponding to this exact story and headline.
Retrieve and reconstruct:
1. Exact headline/title of the article.
2. Reporting news organization (e.g., Reuters, BBC, Associated Press, etc.).
3. The comprehensive, factual news article body covering all key facts, numbers, dates, official quotes, who/what/where/when/why, and essential context.
Do not summarize briefly; provide the full, rich factual reporting from the source so that a journalist can draft a comprehensive news script based on it.

Output format:
TITLE: <Exact Headline>
SOURCE: <News Organization>
CONTENT:
<Full comprehensive article body paragraphs with double line-break spacing between paragraphs>`;

      const searchResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT || 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = searchResponse.text?.trim() || '';

      // Parse structured fields
      let extractedTitle = '';
      let extractedSource = domain;
      let extractedContent = '';

      const titleMatch = responseText.match(/TITLE:\s*(.+)/i);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
      }

      const sourceMatch = responseText.match(/SOURCE:\s*(.+)/i);
      if (sourceMatch) {
        extractedSource = sourceMatch[1].trim();
      }

      const contentMatch = responseText.match(/CONTENT:\s*([\s\S]+)/i);
      if (contentMatch) {
        extractedContent = contentMatch[1].trim();
      } else {
        // Fallback: If no explicit CONTENT: marker, use full response
        extractedContent = responseText.replace(/TITLE:[^\n]*\n?/i, '').replace(/SOURCE:[^\n]*\n?/i, '').trim();
      }

      // Extract web sources from grounding chunks
      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter((c: any) => c.web && c.web.uri)
        .map((c: any) => ({
          web: {
            title: c.web.title || extractedSource,
            uri: c.web.uri
          }
        }));

      // Ensure the original URL is included if not present
      if (!sources.some((s: any) => s.web?.uri === targetUrl)) {
        sources.unshift({
          web: {
            title: `${extractedSource} (Target Story)`,
            uri: targetUrl
          }
        });
      }

      if (extractedContent && extractedContent.length > 120) {
        console.log(`[Tier 3 Search Grounding] Successfully retrieved article content (${extractedContent.length} chars) for: ${targetUrl}`);
        return res.json({
          title: extractedTitle || `သတင်းအချက်အလက် (${extractedSource})`,
          content: extractedContent,
          excerpt: extractedContent.substring(0, 200) + '...',
          method: 'gemini_search_grounding',
          sourceAgency: extractedSource,
          sources: sources,
          note: 'Bot protection/401 detected: Story retrieved seamlessly via Gemini Google Search Grounding.'
        });
      }

      throw new Error('Gemini Google Search Grounding did not return adequate story content for this URL.');
    } catch (tier3Error: any) {
      const errDetail = tier3Error.message || String(tier3Error);
      console.error(`[Tier 3 Search Grounding Failed] for ${targetUrl}:`, errDetail);
      try {
        fs.appendFileSync(path.join(process.cwd(), 'server_requests.log'), `[Tier 3 Error] ${errDetail}\n`);
      } catch (e) {}
      return res.status(422).json({
        error: `URL မှ သတင်းအချက်အလက်ကို မရယူနိုင်ပါ (Protected URL: 401/Anti-Bot Block). ဝဘ်ဆိုဒ်တွင် ပိတ်ဆို့မှုရှိနေသဖြင့် စာသားများကို ကူးယူပြီး 'တိုက်ရိုက်ကူးထည့်ရန် (Paste Text)' ခလုတ်ဖြင့် စက္ကန့်ပိုင်းအတွင်း ထည့်သွင်းပေးနိုင်ပါသည်။ (${errDetail})`,
        canPasteDirectly: true,
        url: targetUrl
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      console.log(`Catch-all route hit for path: ${req.path}`);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global catch-all error handling middleware to ensure unhandled backend errors return valid JSON rather than HTML pages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server-side route error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'An unexpected server-side error occurred.' 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
