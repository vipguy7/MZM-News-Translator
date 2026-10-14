import { Router } from 'express';
import { Type } from '@google/genai';
import {
  GEMINI_MODEL_TEXT,
  SYSTEM_INSTRUCTION_CATEGORIZER,
  SYSTEM_INSTRUCTION_PROOFREADER,
  SYSTEM_INSTRUCTION_SEO_OPTIMIZER,
} from '../../../constants.js';
import { optionalAuth, AuthRequest } from '../../middleware/auth.ts';
import type { AiProvider } from '../services/aiProvider.ts';

export function createAiRouter(provider: AiProvider) {
  const router = Router();

  router.post('/generate-script', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { prompt, useSearchGrounding, systemInstruction } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const tools: any[] = useSearchGrounding ? [{ googleSearch: {} }] : [];
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { systemInstruction: (systemInstruction || '') + '\n' + dictInstructions, tools: tools.length ? tools : undefined },
        }, req);
        const candidate = (response as any).candidates?.[0];
        const sources = candidate?.groundingMetadata?.groundingChunks;
        res.json({ script: response.text || '', sources });
      } catch (error) {
        console.error('Error in /api/generate-script:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/generate-report-news', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { prompt, systemInstruction } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            script: {
              type: Type.STRING,
              description: 'The main news script or article text. Divide into professional paragraphs with double line-breaks. Ensure there are no Markdown symbols, headers, or labels.',
            },
            statistics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING, description: 'Short descriptive name or metric label.' },
                  value: { type: Type.STRING, description: 'The precise statistic or number including units.' },
                  detail: { type: Type.STRING, description: 'Detailed explanation or citation context.' },
                },
                required: ['metric', 'value', 'detail'],
              },
              description: 'A comprehensive list of key numerical statistics or core metrics.',
            },
            chartData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'A short visual category label.' },
                  value: { type: Type.NUMBER, description: 'A standard Arabic numeric value for plotting.' },
                  unit: { type: Type.STRING, description: 'Unit of the value.' },
                },
                required: ['label', 'value'],
              },
              description: 'Structured numeric data points suitable for drawing a visual chart.',
            },
            chartTitle: { type: Type.STRING, description: 'A short descriptive chart title.' },
            chartType: { type: Type.STRING, description: "The ideal visualization type: 'bar', 'line', or 'pie'." },
          },
          required: ['script'],
        };
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: (systemInstruction || '') + '\n' + dictInstructions + '\nYou MUST return a JSON matching the requested schema. Extracted statistics, charts, and metrics must correspond accurately to the data present in the report.',
            responseMimeType: 'application/json',
            responseSchema,
          },
        }, req);
        res.json(JSON.parse(response.text || '{}'));
      } catch (error) {
        console.error('Error in /api/generate-report-news:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/summarize-report', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { text, targetLanguage } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const prompt = `You are a professional research analyst and investigative editor.
Analyze the following document/report and provide an incredibly concise, high-fidelity, and well-structured factual summary.
Output the summary in bullet points using ${targetLanguage === 'English' ? 'English' : 'Burmese'}.
Do not extrapolate, insert external facts, or use subjective filler. Just output a clean, bulleted list of 5-8 major factual takeaways and key statistics. Ensure absolutely no Markdown headings or bold titles are used other than simple list bullets.

Report Document Content:
"""
${text}
"""`;
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { systemInstruction: 'You are an expert report summarizer. Output 5-8 bullet points of high-fidelity factual key findings. Do not add intro or outro conversational text.\n' + dictInstructions },
        }, req);
        res.json({ summary: response.text || '' });
      } catch (error) {
        console.error('Error in /api/summarize-report:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/translate', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { text, systemInstruction } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text }] }],
          config: { systemInstruction: (systemInstruction || '') + '\n' + dictInstructions },
        }, req);
        res.json({ translatedText: response.text || '' });
      } catch (error) {
        console.error('Error in /api/translate:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/proofread', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: script }] }],
          config: { systemInstruction: SYSTEM_INSTRUCTION_PROOFREADER + '\n' + dictInstructions },
        }, req);
        res.json({ editedScript: response.text || '' });
      } catch (error) {
        console.error('Error in /api/proofread:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/generate-seo', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: `Generate SEO metadata for this script: ${script.substring(0, 5000)}` }] }],
          config: { systemInstruction: SYSTEM_INSTRUCTION_SEO_OPTIMIZER + '\n' + dictInstructions, responseMimeType: 'application/json' },
        }, req);
        res.json({ seoData: JSON.parse(response.text || '{}') });
      } catch (error) {
        console.error('Error in /api/generate-seo:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  router.post('/categorize-news', optionalAuth, async (req: AuthRequest, res) => {
    await provider.withQueueLock(req, res, async () => {
      try {
        const { script } = req.body;
        const ai = provider.getAiClient(req);
        const dictInstructions = await provider.getDictionaryInstructions(req.dbUser?.id);
        const response = await provider.generateContentWithRetry(ai, {
          model: GEMINI_MODEL_TEXT,
          contents: [{ role: 'user', parts: [{ text: `Categorize this news script: ${script.substring(0, 5000)}` }] }],
          config: { systemInstruction: SYSTEM_INSTRUCTION_CATEGORIZER + '\n' + dictInstructions },
        }, req);
        res.json({ category: response.text?.trim() || 'သတင်းဖော်ပြချက် (General News)' });
      } catch (error) {
        console.error('Error in /api/categorize-news:', error);
        res.status(500).json({ error: provider.formatGeminiError(error) });
      }
    });
  });

  return router;
}
