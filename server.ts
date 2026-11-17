import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

type DocumentId = 'agreement' | 'wages';

interface DocumentConfig {
  id: DocumentId;
  title: string;
  relativePath: string;
  publicUrl: string;
  totalPages: number;
}

const DOCUMENTS_CONFIG: Record<DocumentId, DocumentConfig> = {
  agreement: {
    id: 'agreement',
    title: 'Georgia Statewide Outside Construction Line Agreement (2025–2028)',
    relativePath:
      'public/assets/aistudio/Georgia_Statewide_Outside_Line_Agreement_2025-2028_8c525d21.pdf',
    publicUrl:
      '/assets/aistudio/Georgia_Statewide_Outside_Line_Agreement_2025-2028_8c525d21.pdf',
    totalPages: 38,
  },
  wages: {
    id: 'wages',
    title: '2025–2028 GA LU84 Updated GA Wages',
    relativePath:
      'public/assets/aistudio/2025-2028_GA_LU84_UPDATED_GA_Wages_a576ad84.pdf',
    publicUrl:
      '/assets/aistudio/2025-2028_GA_LU84_UPDATED_GA_Wages_a576ad84.pdf',
    totalPages: 4,
  },
};

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface CitationItem {
  documentId: DocumentId;
  documentTitle: string;
  section: string;
  pageNumber: number;
  pageLabel: string;
  quote: string;
}

interface BotResponsePayload {
  grounded: boolean;
  answer: string;
  citations: CitationItem[];
}

type PdfPart =
  | { fileData: { fileUri: string; mimeType: string } }
  | { inlineData: { mimeType: string; data: string } };

const cachedPdfBase64: Partial<Record<DocumentId, string>> = {};
const cachedUploadedFile: Partial<
  Record<DocumentId, { uri: string; mimeType: string; expiresAt: number }>
> = {};
const uploadInFlight: Partial<Record<DocumentId, Promise<PdfPart>>> = {};

function getPdfBase64(docId: DocumentId): string {
  const cached = cachedPdfBase64[docId];
  if (cached) {
    return cached;
  }
  const doc = DOCUMENTS_CONFIG[docId];
  const absolutePdfPath = path.resolve(process.cwd(), doc.relativePath);
  if (!fs.existsSync(absolutePdfPath)) {
    throw new Error(`PDF not found at ${absolutePdfPath}`);
  }
  const buffer = fs.readFileSync(absolutePdfPath);
  const b64 = buffer.toString('base64');
  cachedPdfBase64[docId] = b64;
  return b64;
}

async function getPdfPart(ai: GoogleGenAI, docId: DocumentId): Promise<PdfPart> {
  const existing = cachedUploadedFile[docId];
  if (existing && Date.now() < existing.expiresAt) {
    return {
      fileData: {
        fileUri: existing.uri,
        mimeType: existing.mimeType,
      },
    };
  }

  const inFlight = uploadInFlight[docId];
  if (inFlight) {
    return inFlight;
  }

  const doc = DOCUMENTS_CONFIG[docId];
  const promise = (async (): Promise<PdfPart> => {
    try {
      const absolutePdfPath = path.resolve(process.cwd(), doc.relativePath);
      const uploaded = await ai.files.upload({
        file: absolutePdfPath,
        config: {
          mimeType: 'application/pdf',
          displayName: doc.title,
        },
      });

      if (uploaded.uri) {
        const entry = {
          uri: uploaded.uri,
          mimeType: uploaded.mimeType || 'application/pdf',
          expiresAt: Date.now() + 40 * 60 * 60 * 1000,
        };
        cachedUploadedFile[docId] = entry;
        return {
          fileData: {
            fileUri: entry.uri,
            mimeType: entry.mimeType,
          },
        };
      }
    } catch (uploadErr) {
      console.warn(`Gemini Files API upload failed for ${docId}, falling back to inlineData:`, uploadErr);
    } finally {
      delete uploadInFlight[docId];
    }

    return {
      inlineData: {
        mimeType: 'application/pdf',
        data: getPdfBase64(docId),
      },
    };
  })();

  uploadInFlight[docId] = promise;
  return promise;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const STRICT_SYSTEM_INSTRUCTION = `You are the strictly grounded Contract & Wage Reference Assistant for TWO attached PDF documents ONLY:
1. Document ID "agreement": "Georgia Statewide Outside Construction Line Agreement (2025–2028)" between Southeastern Line Constructors Chapter, NECA and Local Union 84, IBEW (38 pages: Articles I–XIV + Underground, Substation, and Underground Ductline/Network MOUs).
2. Document ID "wages": "2025–2028 GA LU84 Updated GA Wages" (4 pages: Page 1 = Overhead Wage & Benefit Schedules, Page 2 = Substation Wages/Benefits Schedules, Page 3 = Ductline & NUG Cable Splicer Wage & Benefit Schedules, Page 4 = URD Wages/Benefits Schedules).

MANDATORY GROUNDING RULES — NO EXCEPTIONS:
1. SOURCE EXCLUSIVITY: Answer ONLY using information explicitly stated in these two attached PDF documents. Do NOT use outside knowledge, general electrical trade conventions, external federal/state laws not written in the PDFs, coding knowledge, math/trivia unrelated to the PDFs, or assumptions.
2. STRICT REFUSAL FOR OUT-OF-SCOPE QUESTIONS: If the user asks ANY question whose answer is not contained in either attached PDF (for example: general knowledge, weather, sports, coding, personal advice, OSHA rules not in the PDFs, or agreements for other locals/states), you MUST set "grounded" to false, set "citations" to an empty array [], and reply politely that this assistant only answers questions based on the Georgia Statewide Outside Construction Line Agreement (2025–2028) and the 2025–2028 GA LU84 Updated GA Wages PDFs, and that the requested topic is not covered in these documents.
3. PARTIAL QUESTIONS: If part of a question is covered in the PDFs and another part is not, answer ONLY the part supported by the PDFs and explicitly state which part is not covered.
4. WAGE & BENEFIT ACCURACY: When answering wage/benefit questions, check the "wages" PDF (pages 1–4) as the primary updated wage schedule reference alongside the "agreement" PDF. Always specify the exact schedule (Overhead, Substation, Ductline/NUG Cable Splicer, or URD), the exact effective period (06/01/2025–05/31/2026, 06/01/2026–05/31/2027, or 06/01/2027–05/31/2028), and exact rates. Note that starting January 1, 2027, the Total Package is subject to modification based on LINECO adjustments, and 06/01/2027–05/31/2028 LINECO and Total Package are listed as "TBA".
5. CITATIONS REQUIRED WHEN GROUNDED: Whenever "grounded" is true, include at least one accurate entry in "citations" with:
   - "documentId": either "wages" or "agreement"
   - "documentTitle": "2025–2028 GA LU84 Updated GA Wages" or "Georgia Statewide Outside Line Agreement (2025–2028)"
   - "section": exact Article/Section or Schedule name
   - "pageNumber": 1-indexed integer (1–4 for "wages", 1–38 for "agreement")
   - "pageLabel": e.g. "Wages PDF · Page 1" or "Agreement · Page 11"
   - "quote": brief accurate verbatim quote or rate row from that page.
6. CLEAR FORMATTING: Use clean markdown (bullet points, bold key numbers/terms, or compact markdown tables when comparing multiple classifications or years). Never fabricate data.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grounded: {
      type: Type.BOOLEAN,
      description:
        'True ONLY if the answer is directly supported by one or both attached PDFs. False if outside the PDFs.',
    },
    answer: {
      type: Type.STRING,
      description:
        'Clean markdown response grounded in the PDFs, or polite refusal if grounded is false.',
    },
    citations: {
      type: Type.ARRAY,
      description: 'Document citations supporting the answer. Empty when grounded is false.',
      items: {
        type: Type.OBJECT,
        properties: {
          documentId: {
            type: Type.STRING,
            description: 'Must be either "wages" or "agreement".',
          },
          documentTitle: {
            type: Type.STRING,
            description: 'Human-readable title of the cited PDF.',
          },
          section: {
            type: Type.STRING,
            description: 'Article/Section, MOU, or Wage Schedule name.',
          },
          pageNumber: {
            type: Type.INTEGER,
            description: '1-indexed PDF page number (1-4 for wages, 1-38 for agreement).',
          },
          pageLabel: {
            type: Type.STRING,
            description: 'Label such as "Wages PDF · Page 2" or "Agreement · Page 9".',
          },
          quote: {
            type: Type.STRING,
            description: 'Short verbatim quote or rate row from that page.',
          },
        },
        required: [
          'documentId',
          'documentTitle',
          'section',
          'pageNumber',
          'pageLabel',
          'quote',
        ],
      },
    },
  },
  required: ['grounded', 'answer', 'citations'],
};

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }>,
  retries = 2
): Promise<BotResponsePayload> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: STRICT_SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response received from Gemini model.');
      }

      const parsed = JSON.parse(rawText) as Partial<BotResponsePayload>;
      const grounded = Boolean(parsed.grounded);
      const citations = Array.isArray(parsed.citations)
        ? parsed.citations
            .filter(
              (c): c is CitationItem =>
                Boolean(c) &&
                typeof c.section === 'string' &&
                typeof c.pageNumber === 'number' &&
                typeof c.pageLabel === 'string' &&
                typeof c.quote === 'string'
            )
            .map((c) => {
              const docId: DocumentId = c.documentId === 'wages' ? 'wages' : 'agreement';
              const maxPage = DOCUMENTS_CONFIG[docId].totalPages;
              return {
                documentId: docId,
                documentTitle:
                  typeof c.documentTitle === 'string' && c.documentTitle.trim()
                    ? c.documentTitle
                    : DOCUMENTS_CONFIG[docId].title,
                section: c.section,
                pageNumber: Math.max(1, Math.min(maxPage, Math.round(c.pageNumber))),
                pageLabel: c.pageLabel,
                quote: c.quote,
              };
            })
        : [];

      return {
        grounded,
        answer:
          typeof parsed.answer === 'string' && parsed.answer.trim().length > 0
            ? parsed.answer
            : 'I could not find a supported answer in the attached documents.',
        citations: grounded ? citations : [],
      };
    } catch (error) {
      lastError = error;
      const errMessage = error instanceof Error ? error.message : String(error);
      if (errMessage.includes('FILE') || errMessage.includes('file')) {
        delete cachedUploadedFile.agreement;
        delete cachedUploadedFile.wages;
      }
      const isTransient =
        errMessage.includes('429') ||
        errMessage.includes('503') ||
        errMessage.includes('UNAVAILABLE') ||
        errMessage.includes('RESOURCE_EXHAUSTED');

      if (!isTransient || attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/document-info', (_req: Request, res: Response) => {
    res.json({
      documents: [
        {
          id: DOCUMENTS_CONFIG.wages.id,
          title: DOCUMENTS_CONFIG.wages.title,
          totalPages: DOCUMENTS_CONFIG.wages.totalPages,
          pdfUrl: DOCUMENTS_CONFIG.wages.publicUrl,
        },
        {
          id: DOCUMENTS_CONFIG.agreement.id,
          title: DOCUMENTS_CONFIG.agreement.title,
          totalPages: DOCUMENTS_CONFIG.agreement.totalPages,
          pdfUrl: DOCUMENTS_CONFIG.agreement.publicUrl,
        },
      ],
    });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        message?: unknown;
        history?: unknown;
      };

      if (typeof body.message !== 'string' || body.message.trim().length === 0) {
        res.status(400).json({ error: 'Please enter a question about the agreement or wage schedules.' });
        return;
      }

      const userMessage = body.message.trim();
      const rawHistory = Array.isArray(body.history) ? body.history : [];
      const cleanHistory: HistoryTurn[] = rawHistory
        .filter(
          (item): item is HistoryTurn =>
            Boolean(item) &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string' &&
            item.content.trim().length > 0
        )
        .slice(-12);

      const ai = getGenAIClient();
      const [agreementPart, wagesPart] = await Promise.all([
        getPdfPart(ai, 'agreement'),
        getPdfPart(ai, 'wages'),
      ]);

      const docParts: Array<Record<string, unknown>> = [
        { text: 'Attached Document 1 (documentId: "agreement") — Georgia Statewide Outside Construction Line Agreement (2025–2028), 38 pages:' },
        agreementPart,
        { text: 'Attached Document 2 (documentId: "wages") — 2025–2028 GA LU84 Updated GA Wages, 4 pages:' },
        wagesPart,
      ];

      const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> =
        [];

      if (cleanHistory.length === 0) {
        contents.push({
          role: 'user',
          parts: [...docParts, { text: `User Question: ${userMessage}` }],
        });
      } else {
        cleanHistory.forEach((turn, idx) => {
          const role = turn.role === 'assistant' ? 'model' : 'user';
          if (idx === 0) {
            if (role === 'user') {
              contents.push({
                role: 'user',
                parts: [...docParts, { text: `User Question: ${turn.content}` }],
              });
            } else {
              contents.push({
                role: 'user',
                parts: [...docParts, { text: 'Reference documents attached.' }],
              });
              contents.push({
                role: 'model',
                parts: [{ text: turn.content }],
              });
            }
          } else {
            contents.push({
              role,
              parts: [{ text: turn.content }],
            });
          }
        });
        contents.push({
          role: 'user',
          parts: [{ text: userMessage }],
        });
      }

      const result = await callGeminiWithRetry(ai, contents);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error in /api/chat:', msg);

      if (msg === 'MISSING_API_KEY' || msg.includes('API_KEY_INVALID') || msg.includes('403')) {
        res.status(500).json({
          error:
            'Gemini API key is missing or invalid. Please check GEMINI_API_KEY in the Settings > Secrets panel.',
        });
        return;
      }

      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'Rate limit reached while querying the document assistant. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: 'Unable to process your question right now. Please try again.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Local 84 Agreement Bot server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
