import express from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// These would normally be imported from constants.ts, but to ensure 
// server-side execution without potential browser-only code in constants,
// we define the core ones here or use them directly if possible.
// For now, I'll import from constants.ts since it looks safe (no DOM dependecies).
import { 
    GEMINI_MODEL_TEXT, 
} from './constants.js';
import { GenerationQueue } from './src/services/generationQueue.ts';
import { createDataRouter } from './src/server/routes/dataRoutes.ts';
import { createContentRouter } from './src/server/routes/contentRoutes.ts';
import { createAiRouter } from './src/server/routes/aiRoutes.ts';
import { createAiProvider } from './src/server/services/aiProvider.ts';

const generationQueue = new GenerationQueue();
const aiProvider = createAiProvider(generationQueue);

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    const logFilePath = path.join(process.cwd(), 'server_requests.log');
    const requestId = randomUUID();
    const startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);

    // Log only safe request metadata. Never serialize authorization headers,
    // custom provider keys, cookies, request bodies, or response bodies.
    try {
      res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const line = JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
        });
        fs.appendFileSync(logFilePath, `${line}\n`);
      });
    } catch (e) {}
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', createDataRouter(generationQueue));
  app.use('/api', createContentRouter({
    ...aiProvider,
  }));
  app.use('/api', createAiRouter(aiProvider));

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
      const ai = aiProvider.getAiClient(req);

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

      const searchResponse = await aiProvider.generateContentWithRetry(ai, {
        model: GEMINI_MODEL_TEXT || 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
        }
      }, req);

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

  return app;
}
