import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * XSS Sanitizer Helper
 * Strips dangerous HTML tags, inline event handlers, script blocks, and javascript: URIs.
 * Works safely in both browser DOM environment and Node.js server environment.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
  }

  // Server-side / Node fallback sanitization
  return trimmed
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .trim();
}

/** Custom Zod transformer that trims and sanitizes string fields for XSS protection */
export const sanitizedString = (maxLen = 1000) =>
  z.string().transform((val) => sanitizeText(val)).refine((val) => val.length <= maxLen, {
    message: `Text length must not exceed ${maxLen} characters.`,
  });

export const sanitizedOptionalString = (maxLen = 1000) =>
  z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? sanitizeText(val) : null))
    .refine((val) => !val || val.length <= maxLen, {
      message: `Text length must not exceed ${maxLen} characters.`,
    });

/** Sanitized Email Schema */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((val) => sanitizeText(val))
  .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Please provide a valid email address.',
  });

export const optionalEmailSchema = z
  .string()
  .nullable()
  .optional()
  .transform((val) => (val ? sanitizeText(val) : null))
  .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Please provide a valid email address.',
  });

/** Non-negative Currency / Amount Schema */
export const nonNegativeAmountSchema = z
  .number({ invalid_type_error: 'Amount must be a valid number' })
  .min(0, 'Amount cannot be negative')
  .transform((val) => Math.round(val * 100) / 100);

export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, 'Currency code must be a 3-letter ISO code (e.g. USD, NGN, EUR)');

// ==========================================
// 1. CONTACT VALIDATION SCHEMA
// ==========================================
export const ContactSchema = z.object({
  name: z
    .string({ required_error: 'Contact name is required' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 150, {
      message: 'Contact name must be between 1 and 150 characters.',
    }),
  company: sanitizedOptionalString(150),
  email: optionalEmailSchema,
  phone: sanitizedOptionalString(35),
  status: z.enum(['Lead', 'Customer', 'Prospect', 'Archived', 'Partner']).default('Lead'),
}).strict();

// ==========================================
// 2. INVOICE & LINE ITEM VALIDATION SCHEMA
// ==========================================
export const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z
    .string({ required_error: 'Line item description is required' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 250, {
      message: 'Description must be between 1 and 250 characters.',
    }),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity exceeds maximum allowed'),
  unitPrice: nonNegativeAmountSchema,
}).strict();

export const InvoiceInputSchema = z.object({
  invoice_number: z
    .string()
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 50, {
      message: 'Invoice number must be between 1 and 50 characters.',
    }),
  customer_name: z
    .string({ required_error: 'Client name is required' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 150, {
      message: 'Client name must be between 1 and 150 characters.',
    }),
  customer_email: optionalEmailSchema,
  customer_phone: sanitizedOptionalString(35),
  amount: nonNegativeAmountSchema,
  currency_code: currencyCodeSchema.default('USD'),
  status: z.enum(['pending', 'paid', 'overdue', 'approved']).default('pending'),
  document_type: z.enum(['invoice', 'proposal', 'quote']).default('invoice'),
  due_date: z.string().nullable().optional(),
  notes: sanitizedOptionalString(5000),
  tax_rate: z.number().min(0).max(100).default(0),
  discount_rate: z.number().min(0).max(100).default(0),
  line_items: z.array(LineItemSchema).optional(),
}).strict();

// ==========================================
// 3. WORKFLOW CARD / DEAL VALIDATION SCHEMA
// ==========================================
export const WorkflowCardSchema = z.object({
  title: z
    .string({ required_error: 'Deal title is required' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 200, {
      message: 'Title must be between 1 and 200 characters.',
    }),
  contact_id: z.string().uuid({ message: 'Invalid contact ID format' }).or(z.string().min(1)),
  column_id: z.string({ required_error: 'Workflow stage is required' }),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status_note: sanitizedOptionalString(2000),
  due_date: z.string().nullable().optional(),
  assignee_name: sanitizedOptionalString(100),
  value: nonNegativeAmountSchema.optional(),
}).strict();

// ==========================================
// 4. NOTE VALIDATION SCHEMA
// ==========================================
export const NoteSchema = z.object({
  contact_id: z.string().optional().nullable(),
  body: z
    .string({ required_error: 'Note content cannot be empty' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 5000, {
      message: 'Note must be between 1 and 5000 characters.',
    }),
}).strict();

// ==========================================
// 5. WORKSPACE SETTINGS SCHEMA
// ==========================================
export const WorkspaceSettingsSchema = z.object({
  name: z
    .string()
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 100, {
      message: 'Workspace name must be between 1 and 100 characters.',
    }),
  business_tagline: sanitizedOptionalString(200),
  weekly_sales_target: nonNegativeAmountSchema.optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
}).strict();

// ==========================================
// 6. MEMBER INVITE SCHEMA
// ==========================================
export const MemberInviteSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .transform((val) => sanitizeText(val).toLowerCase()),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
}).strict();

// ==========================================
// 7. AI BACKEND API ENDPOINT SCHEMAS
// ==========================================
export const AIMeetingSummaryRequestSchema = z.object({
  notes: z
    .string({ required_error: 'Notes are required' })
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 2 && val.length <= 10000, {
      message: 'Meeting notes must be between 2 and 10,000 characters.',
    }),
  contactName: sanitizedOptionalString(150),
}).strict();

export const AIDealInsightsRequestSchema = z.object({
  dealName: z
    .string()
    .transform((val) => sanitizeText(val))
    .refine((val) => val.length >= 1 && val.length <= 200, {
      message: 'Deal name must be between 1 and 200 characters.',
    }),
  stage: z.string().transform((val) => sanitizeText(val)),
  ageDays: z.number().min(0, 'Age in days cannot be negative').default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  winProbability: z.number().min(0).max(100).default(50),
  notes: sanitizedOptionalString(3000),
}).strict();
