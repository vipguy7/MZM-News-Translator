import { Router, Request, Response } from 'express';
import pdfParse from 'pdf-parse-fork';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL_TEXT } from '../../../constants.js';

type ContentRouteContext = {
  getAiClient: (req: Request) => GoogleGenAI;
  formatGeminiError: (error: unknown) => string;
  generateContentWithRetry: (aiClient: any, params: any, req?: Request) => Promise<any>;
  withQueueLock: (req: Request, res: Response, action: () => Promise<any>) => Promise<void>;
};

export function createContentRouter(context: ContentRouteContext) {
  const router = Router();

  router.post('/parse-file', async (req, res) => {
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
        } catch (error) {
          console.warn('Local pdfParse failed, will rely on enhanced parsing if available:', error);
        }

        const isExtremelyShort = localText.trim().replace(/\s/g, '').length < 150;
        const shouldRunEnhanced = enhanced === true || (enhanced !== false && isExtremelyShort);

        if (shouldRunEnhanced) {
          await context.withQueueLock(req, res, async () => {
            try {
              console.log(`Running high-accuracy Gemini OCR & layout parsing for PDF: ${fileName} (Is Auto fallback: ${isExtremelyShort && enhanced !== true})`);
              const ai = context.getAiClient(req);
              const prompt = `Analyze the attached PDF document and extract all text, data, and information with extremely high fidelity. Follow these strict directives to handle data visualization, statistics, and tables with superior accuracy:

1. Maintain the natural reading order for multi-column layouts.
2. [STRUCTURED TABLES & VISIONS EXTRACTION]
   - For ANY table in the PDF, transcribe it with absolute perfection as a valid Markdown table. Precede the table with a strict marker line: "### [TABLE_DATA: Table Title/Description]".
   - For ANY visual charts, graphs, or infographics, extract the complete plotted dataset and structure it as a clean Markdown data matrix or table. Precede it with a strict marker line: "### [CHART_DATA: Chart Title | Chart Type]".
3. Transcribe all text, numbers, dates, and names exactly. If pages are scanned images, perform precise OCR text extraction supporting both Burmese and English.
4. [STATISTICS DIGEST] Identify numerical statistics and compile them under "### [STATISTICS_DATA]".
5. Preserve bullet points, lists, and headings.
6. Output ONLY the raw extracted transcript/text of the document.`;

              const response = await context.generateContentWithRetry(ai, {
                model: GEMINI_MODEL_TEXT,
                contents: [{
                  role: 'user',
                  parts: [
                    { inlineData: { data: fileData, mimeType: 'application/pdf' } },
                    { text: prompt },
                  ],
                }],
              }, req);

              const extractedText = response.text || '';
              if (extractedText.trim()) {
                text = extractedText;
                isOcrUsed = true;
              } else {
                text = localText;
              }
            } catch (error: any) {
              console.error('Gemini enhanced parsing failed:', error);
              ocrError = context.formatGeminiError(error);
              text = localText;
            }
          });
        } else {
          text = localText;
        }
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.toLowerCase().endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        res.status(400).json({ error: 'Unsupported file type' });
        return;
      }

      res.json({ text, isOcrUsed, ocrError: ocrError || undefined });
    } catch (error) {
      console.error('Error in /api/parse-file:', error);
      res.status(500).json({ error: context.formatGeminiError(error) });
    }
  });

  return router;
}
