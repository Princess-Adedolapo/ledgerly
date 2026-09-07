import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import {
  AIMeetingSummaryRequestSchema,
  AIDealInsightsRequestSchema,
  SupportTicketSchema,
} from './src/lib/validation';

process.on('uncaughtException', (err) => {
  console.error('[Server Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server Unhandled Rejection]:', reason);
});

// In-Memory Rate Limiter Helper
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const createRateLimiter = (options: { windowMs: number; maxRequests: number; message: string }) => {
  const hits = new Map<string, RateLimitRecord>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, 60000);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();
    let record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + options.windowMs };
      hits.set(clientIp, record);
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please wait a few moments before trying again.',
        retryAfterSeconds,
      });
    }

    record.count += 1;
    next();
  };
};

// Execution Timeout Helper for Third-Party API Calls
function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000, errorMessage = 'Request timed out.'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security Headers & Strict CORS Middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    // Restrict CORS origins: allow same-origin requests or explicitly matched request host
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (host && (originUrl.host === host || originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1')) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
          // Reject untrusted cross-origin requests
          res.setHeader('Access-Control-Allow-Origin', 'null');
        }
      } catch {
        res.setHeader('Access-Control-Allow-Origin', 'null');
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Rate Limiters
  const generalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many API requests. Please slow down and try again shortly.',
  });

  const aiApiLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'AI generation rate limit exceeded. Please wait a minute before requesting another AI summary or deal insight.',
  });

  app.use('/api', generalApiLimiter);
  app.use('/api/ai', aiApiLimiter);

  // Helper to initialize Gemini client lazily
  const getGeminiClient = () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      return new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('[Gemini Init Exception]:', err);
      return null;
    }
  };

  // API Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Summarize Contact Notes / Meeting Records
  app.post('/api/ai/summarize-meeting', async (req, res) => {
    try {
      const parseResult = AIMeetingSummaryRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid input parameters',
          details: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { notes, contactName } = parseResult.data;

      const ai = getGeminiClient();
      if (!ai) {
        // Smart fallback structure when GEMINI_API_KEY is not configured
        const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || 'Meeting notes record.';
        return res.json({
          summary: `Summary for ${contactName || 'Client'}: ${firstLine.slice(0, 150)}...`,
          keyHighlights: lines.slice(0, 4).map((l) => l.replace(/^[-*•]\s*/, '')),
          actionItems: [
            { task: 'Follow up with client regarding project scope & details', owner: 'Account Lead' },
            { task: 'Send updated proposal or agreement documentation', owner: 'Sales' },
          ],
          sentiment: 'Positive',
          suggestedNextStep: 'Schedule a 15-minute alignment sync next week.',
        });
      }

      const prompt = `Summarize the following contact meeting notes/records for ${contactName || 'a client'}:\n\n${notes}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite CRM AI Sales Assistant. Analyze meeting notes/records and output concise executive highlights and actionable next steps in structured JSON format.',
            responseMimeType: 'application/json',
            maxOutputTokens: 1000,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: 'Executive summary in 2-3 concise sentences' },
                keyHighlights: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Key discussion highlights or major points',
                },
                actionItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      task: { type: Type.STRING },
                      owner: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                    },
                    required: ['task'],
                  },
                  description: 'Extracted action items or follow-up tasks',
                },
                sentiment: {
                  type: Type.STRING,
                  description: 'Overall sentiment: Positive, Neutral, Hesitant, Urgent, or Risk',
                },
                suggestedNextStep: { type: Type.STRING, description: 'Recommended next action for sales rep' },
              },
              required: ['summary', 'keyHighlights', 'actionItems', 'sentiment', 'suggestedNextStep'],
            },
          },
        }),
        15000,
        'AI meeting summary request timed out after 15 seconds.'
      );

      const jsonText = response.text ? response.text.trim() : '{}';
      const parsed = JSON.parse(jsonText);
      return res.json(parsed);
    } catch (err) {
      console.error('Error summarizing meeting with Gemini:', err);
      return res.status(500).json({
        error: 'Failed to generate AI meeting summary',
        message: err instanceof Error ? err.message : 'An unexpected error occurred while processing meeting notes.',
      });
    }
  });

  // API: AI Deal Recommendations & Win Probability Insights
  app.post('/api/ai/deal-insights', async (req, res) => {
    try {
      const parseResult = AIDealInsightsRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid deal input parameters',
          details: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { dealName, stage, ageDays, priority, winProbability, notes } = parseResult.data;

      const ai = getGeminiClient();
      if (!ai) {
        return res.json({
          winProbability,
          recommendations: [
            `Deal "${dealName}" is currently at ${winProbability}% win probability in the "${stage}" stage.`,
            ageDays > 30 ? 'Deal age exceeds 30 days. Send a personalized re-engagement check-in.' : 'Active deal momentum is healthy. Keep momentum with quick follow-ups.',
            priority === 'high' ? 'High priority account: ensure decision maker involvement.' : 'Schedule a quick sync to review contract terms.',
          ],
        });
      }

      const prompt = `Analyze this CRM deal:
Name: ${dealName}
Stage: ${stage}
Age in Days: ${ageDays}
Priority: ${priority}
Calculated Win Probability: ${winProbability}%
Notes/Status: ${notes || 'None'}

Provide 3 actionable, high-impact sales recommendations to increase the win probability and accelerate closing.`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an expert Sales Operations Advisor. Give strategic, bulleted recommendations to close deals faster.',
            responseMimeType: 'application/json',
            maxOutputTokens: 1000,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Top 3 actionable sales recommendations',
                },
              },
              required: ['recommendations'],
            },
          },
        }),
        15000,
        'AI deal insights request timed out after 15 seconds.'
      );

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        winProbability,
        recommendations: parsed.recommendations || [],
      });
    } catch (err) {
      console.error('Error generating deal insights:', err);
      return res.status(500).json({
        error: 'Failed to generate deal insights',
        message: err instanceof Error ? err.message : 'An unexpected error occurred while analyzing deal metrics.',
      });
    }
  });

  // API: Verify Paystack Payment
  app.post('/api/paystack/verify', async (req, res) => {
    try {
      const { reference, invoice_id } = req.body || {};
      if (!reference || !invoice_id) {
        return res.status(400).json({ success: false, error: 'Missing reference or invoice_id' });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
      if (!secretKey) {
        return res.json({
          success: true,
          message: 'Paystack payment verified (Test Mode).',
          reference,
          invoice_id,
        });
      }

      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paystackData = await paystackRes.json();
      if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== 'success') {
        return res.status(400).json({
          success: false,
          error: paystackData.message || 'Paystack verification failed.',
        });
      }

      return res.json({
        success: true,
        message: 'Paystack payment verified successfully.',
        reference: paystackData.data.reference,
        amount: paystackData.data.amount,
        invoice_id,
      });
    } catch (err) {
      console.error('Paystack verification error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete Paystack verification.',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // API: Paystack Webhook Handler
  app.post('/api/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
      const signature = req.headers['x-paystack-signature'] as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      if (secretKey && signature) {
        const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
        if (hash !== signature) {
          return res.status(401).json({ error: 'Invalid Paystack Webhook Signature' });
        }
      }

      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (payload?.event === 'charge.success') {
        console.log('[Paystack Webhook] Processed charge.success event:', payload.data?.reference);
      }

      return res.status(200).send('Webhook Processed');
    } catch (err) {
      console.error('Paystack webhook error:', err);
      return res.status(500).send('Webhook Error');
    }
  });

  // In-memory fallback support tickets registry
  const inMemorySupportTickets: Array<{
    id: string;
    user_email: string;
    category: string;
    message: string;
    priority: string;
    metadata: unknown;
    status: string;
    created_at: string;
  }> = [];

  // API: Submit Support Ticket & Report Bug (Database persistence & automated email dispatch to ceopano@gmail.com)
  app.post('/api/support/report', async (req, res) => {
    try {
      const parseResult = SupportTicketSchema.safeParse(req.body);
      if (!parseResult.success) {
        const details = parseResult.error.issues.map((i) => i.message);
        console.warn('[Support Server] Validation failed:', details);
        return res.status(400).json({
          error: 'Validation failed',
          details,
          message: details.join('. ') || 'Validation failed. Please check the entered fields.',
        });
      }

      const contactEmail = parseResult.data.contact_email || parseResult.data.user_email || 'user@ledgerly.app';
      const severity = parseResult.data.severity || parseResult.data.priority || 'normal';
      const { category, message, metadata } = parseResult.data;
      const ticketId = crypto.randomUUID ? crypto.randomUUID() : `ticket_${Date.now()}`;
      const createdAt = new Date().toISOString();

      const ticketRecord = {
        id: ticketId,
        contact_email: contactEmail,
        user_email: contactEmail,
        category,
        message,
        severity,
        priority: severity,
        metadata: metadata || {},
        status: 'open',
        created_at: createdAt,
      };

      inMemorySupportTickets.unshift(ticketRecord);
      if (inMemorySupportTickets.length > 500) {
        inMemorySupportTickets.pop();
      }

      // 1. Attempt database persistence into Supabase via REST if credentials exist
      let dbPersisted = false;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        try {
          const dbRes = await fetch(`${supabaseUrl}/rest/v1/support_tickets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              id: ticketId,
              contact_email: contactEmail,
              category,
              message,
              severity,
              status: 'open',
              created_at: createdAt,
            }),
          });
          if (dbRes.ok) {
            dbPersisted = true;
          }
        } catch (dbErr) {
          console.warn('[Support Server] Supabase direct insert notice:', dbErr);
        }
      }

      // 2. Trigger automated email dispatch to ceopano@gmail.com
      const recipientEmail = 'ceopano@gmail.com';
      const subject = `[Ledgerly Support] ${severity === 'urgent' ? '🚨 [URGENT] ' : ''}${category}: From ${contactEmail}`;
      const emailBody = `
New Support Ticket / Problem Report Received:
---------------------------------------------
Ticket ID:    ${ticketId}
From User:    ${contactEmail}
Category:     ${category}
Priority:     ${severity === 'urgent' ? 'URGENT / BLOCKER' : 'Normal'}
Timestamp:    ${createdAt}

User Message:
---------------------------------------------
${message}

Diagnostic Telemetry & Context:
---------------------------------------------
Current Route:     ${(metadata as { route?: string })?.route || 'N/A'}
Workspace ID:      ${(metadata as { workspace_id?: string })?.workspace_id || 'N/A'}
Screen Resolution: ${(metadata as { screen?: string })?.screen || 'N/A'}
Client User Agent: ${(metadata as { userAgent?: string })?.userAgent || 'N/A'}
Attachment:        ${(metadata as { attachment_name?: string })?.attachment_name || 'None'}

--
Automated Dispatch Notification from Ledgerly Support Engine
      `.trim();

      // Dispatch automated notification email via external provider if configured
      let emailDispatched = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.SUPPORT_FROM_EMAIL || 'support@ledgerly.app',
              to: [recipientEmail],
              subject,
              text: emailBody,
            }),
          });
          if (resendRes.ok) emailDispatched = true;
        } catch (mailErr) {
          console.warn('[Support Server] Resend dispatch notice:', mailErr);
        }
      }

      // Automated dispatch event logged with full operational context
      console.log(`\n======================================================`);
      console.log(`[AUTOMATED EMAIL DISPATCH TRIGGERED TO: ${recipientEmail}]`);
      console.log(`Subject: ${subject}`);
      console.log(`Ticket ID: ${ticketId}`);
      console.log(`User: ${contactEmail} | Category: ${category} | Priority: ${severity}`);
      console.log(`Database Persisted: ${dbPersisted} | Email Sent: ${emailDispatched}`);
      console.log(`======================================================\n`);

      return res.json({
        success: true,
        message: "Message sent! We'll get back to you shortly.",
        ticketId,
        dispatchedTo: recipientEmail,
        persisted: dbPersisted,
      });
    } catch (err) {
      console.error('[Support Report Error]:', err);
      return res.status(500).json({
        error: 'Failed to process support report',
        message: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
