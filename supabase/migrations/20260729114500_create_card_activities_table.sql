/*
  # Create card_activities Table
  
  1. New Tables
    - `card_activities`: Activity log entries for cards, contacts, invoices, and payment events.
      - `id` (text, primary key)
      - `user_id` (uuid, references auth.users, optional)
      - `workspace_id` (uuid, optional)
      - `card_id` (text, optional)
      - `contact_id` (text, optional)
      - `invoice_id` (text, optional)
      - `type` (text, default 'note')
      - `activity_type` (text, optional)
      - `content` (text, default '')
      - `details` (text, optional)
      - `created_by` (text, optional)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `public.card_activities`
    - Grant read/write policies for workspace operations and payment activity logging.
*/

CREATE TABLE IF NOT EXISTS public.card_activities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  workspace_id uuid,
  card_id text,
  contact_id text,
  invoice_id text,
  type text NOT NULL DEFAULT 'note',
  activity_type text,
  content text NOT NULL DEFAULT '',
  details text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by card_id, contact_id, invoice_id, and workspace_id
CREATE INDEX IF NOT EXISTS idx_card_activities_card_id ON public.card_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activities_contact_id ON public.card_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_card_activities_invoice_id ON public.card_activities(invoice_id);
CREATE INDEX IF NOT EXISTS idx_card_activities_workspace_id ON public.card_activities(workspace_id);

ALTER TABLE public.card_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to card_activities" ON public.card_activities;
CREATE POLICY "Allow read access to card_activities" ON public.card_activities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to card_activities" ON public.card_activities;
CREATE POLICY "Allow insert access to card_activities" ON public.card_activities
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to card_activities" ON public.card_activities;
CREATE POLICY "Allow update access to card_activities" ON public.card_activities
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete access to card_activities" ON public.card_activities;
CREATE POLICY "Allow delete access to card_activities" ON public.card_activities
  FOR DELETE USING (true);
