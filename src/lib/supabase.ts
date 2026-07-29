export { supabase } from '../integrations/supabase/client';

export type Contact = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  description_type: string | null;
  description_note: string | null;
  created_at: string | null;
};

export type Deal = {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  contact_id: string | null;
  value: number | null;
  stage: string;
  created_at: string | null;
};

export type Note = {
  id: string;
  user_id: string;
  workspace_id: string;
  contact_id: string;
  body: string;
  created_at: string | null;
};

export const CONTACT_STATUSES = ['Lead', 'Active', 'Inactive'] as const;
export const DEAL_STAGES = ['New', 'In Progress', 'Won', 'Lost'] as const;

export type ThemeMode = 'dark' | 'light';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  business_tagline: string | null;
  theme: ThemeMode;
  weekly_sales_target: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
};

export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type WorkspaceMemberStatus = 'active' | 'pending';

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  invite_token: string | null;
  created_at: string;
};

export type WorkflowColumn = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  position: number;
  updated_at: string;
};

export type WorkflowCard = {
  id: string;
  user_id: string;
  workspace_id: string;
  column_id: string;
  title: string;
  client_name: string | null;
  contact_id: string | null;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  position: number;
  created_at: string;
  moved_at: string | null;
  status_note: string | null;
  due_date: string | null;
  assignee_name: string | null;
};


export type CurrencyCode = 'USD' | 'NGN' | 'EUR' | 'GBP';
export type CurrencyDisplayMode = 'symbol' | 'code';
export type HistoricalCurrencyMode = 'original' | 'converted';

export type UserPreferences = {
  id: string;
  display_name: string | null;
  currency_code: CurrencyCode;
  currency_display_mode: CurrencyDisplayMode;
  historical_currency_mode: HistoricalCurrencyMode;
  theme: ThemeMode;
  updated_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  workspace_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'draft' | 'proposal' | 'approved';
  currency_code: string;
  created_at: string;
  customer_name: string | null;
  due_date: string | null;
  notes: string | null;
  invoice_number: string | null;
  tax_rate: number;
  discount: number;
  total_label_override: 'due' | 'paid' | null;
  document_type?: 'invoice' | 'proposal' | 'quote';
  sender_info?: {
    name?: string;
    tagline?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  signature_data?: string | null;
  signed_at?: string | null;
  signer_name?: string | null;
  signer_email?: string | null;
};


export const DEFAULT_WORKFLOW_COLUMNS = [
  'Onboarding',
  'Active Support',
  'Invoicing Pending',
  'Resolved / Completed',
] as const;

export const CARD_PRIORITIES = ['low', 'medium', 'high'] as const;
