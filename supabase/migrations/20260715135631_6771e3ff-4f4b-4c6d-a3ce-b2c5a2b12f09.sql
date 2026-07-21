
-- ============ update_updated_at helper ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ contacts ============
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text NOT NULL DEFAULT 'Lead',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_contacts" ON public.contacts;
CREATE POLICY "select_own_contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_contacts" ON public.contacts;
CREATE POLICY "insert_own_contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_contacts" ON public.contacts;
CREATE POLICY "update_own_contacts" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_contacts" ON public.contacts;
CREATE POLICY "delete_own_contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ deals ============
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  value numeric(12,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_deals" ON public.deals;
CREATE POLICY "select_own_deals" ON public.deals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_deals" ON public.deals;
CREATE POLICY "insert_own_deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_deals" ON public.deals;
CREATE POLICY "update_own_deals" ON public.deals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_deals" ON public.deals;
CREATE POLICY "delete_own_deals" ON public.deals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ notes ============
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notes" ON public.notes;
CREATE POLICY "select_own_notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notes" ON public.notes;
CREATE POLICY "insert_own_notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notes" ON public.notes;
CREATE POLICY "update_own_notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notes" ON public.notes;
CREATE POLICY "delete_own_notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS deals_user_id_idx ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS deals_contact_id_idx ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_contact_id_idx ON public.notes(contact_id);

-- ============ workspace_settings ============
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL DEFAULT 'CatalystAI Hub',
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  weekly_sales_target numeric(10,2) NOT NULL DEFAULT 20000.00,
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_workspace_settings" ON public.workspace_settings;
CREATE POLICY "select_own_workspace_settings" ON public.workspace_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workspace_settings" ON public.workspace_settings;
CREATE POLICY "insert_own_workspace_settings" ON public.workspace_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workspace_settings" ON public.workspace_settings;
CREATE POLICY "update_own_workspace_settings" ON public.workspace_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workspace_settings" ON public.workspace_settings;
CREATE POLICY "delete_own_workspace_settings" ON public.workspace_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ workflow_columns ============
CREATE TABLE IF NOT EXISTS public.workflow_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_columns TO authenticated;
GRANT ALL ON public.workflow_columns TO service_role;
ALTER TABLE public.workflow_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_workflow_columns" ON public.workflow_columns;
CREATE POLICY "select_own_workflow_columns" ON public.workflow_columns FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workflow_columns" ON public.workflow_columns;
CREATE POLICY "insert_own_workflow_columns" ON public.workflow_columns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workflow_columns" ON public.workflow_columns;
CREATE POLICY "update_own_workflow_columns" ON public.workflow_columns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workflow_columns" ON public.workflow_columns;
CREATE POLICY "delete_own_workflow_columns" ON public.workflow_columns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ workflow_cards ============
CREATE TABLE IF NOT EXISTS public.workflow_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.workflow_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  position integer NOT NULL DEFAULT 0,
  description text,
  moved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_cards TO authenticated;
GRANT ALL ON public.workflow_cards TO service_role;
ALTER TABLE public.workflow_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_workflow_cards" ON public.workflow_cards;
CREATE POLICY "select_own_workflow_cards" ON public.workflow_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workflow_cards" ON public.workflow_cards;
CREATE POLICY "insert_own_workflow_cards" ON public.workflow_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workflow_cards" ON public.workflow_cards;
CREATE POLICY "update_own_workflow_cards" ON public.workflow_cards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workflow_cards" ON public.workflow_cards;
CREATE POLICY "delete_own_workflow_cards" ON public.workflow_cards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ invoices ============
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  customer_name text,
  due_date date,
  notes text,
  invoice_number text,
  currency_code text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_invoices" ON public.invoices;
CREATE POLICY "select_own_invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON public.invoices;
CREATE POLICY "insert_own_invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON public.invoices;
CREATE POLICY "update_own_invoices" ON public.invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON public.invoices;
CREATE POLICY "delete_own_invoices" ON public.invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS workflow_columns_user_id_idx ON public.workflow_columns(user_id);
CREATE INDEX IF NOT EXISTS workflow_cards_user_id_idx ON public.workflow_cards(user_id);
CREATE INDEX IF NOT EXISTS workflow_cards_column_id_idx ON public.workflow_cards(column_id);
CREATE INDEX IF NOT EXISTS workflow_cards_contact_id_idx ON public.workflow_cards(contact_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);

-- ============ user_preferences ============
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR display_name ~ '^[a-zA-Z0-9 -]{0,50}$'),
  currency_code text NOT NULL DEFAULT 'USD',
  currency_display_mode text NOT NULL DEFAULT 'symbol' CHECK (currency_display_mode IN ('symbol', 'code')),
  historical_currency_mode text NOT NULL DEFAULT 'original' CHECK (historical_currency_mode IN ('original', 'converted')),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_user_preferences" ON public.user_preferences;
CREATE POLICY "select_own_user_preferences" ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_user_preferences" ON public.user_preferences;
CREATE POLICY "insert_own_user_preferences" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_user_preferences" ON public.user_preferences;
CREATE POLICY "update_own_user_preferences" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_user_preferences" ON public.user_preferences;
CREATE POLICY "delete_own_user_preferences" ON public.user_preferences FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS user_preferences_id_idx ON public.user_preferences(id);

-- ============ triggers ============
DROP TRIGGER IF EXISTS workspace_settings_updated_at ON public.workspace_settings;
CREATE TRIGGER workspace_settings_updated_at BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS workflow_columns_updated_at ON public.workflow_columns;
CREATE TRIGGER workflow_columns_updated_at BEFORE UPDATE ON public.workflow_columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ realtime ============
ALTER TABLE public.workspace_settings REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_columns REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_cards REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='workspace_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_settings; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='workflow_columns') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_columns; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='workflow_cards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_cards; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='invoices') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_preferences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences; END IF;
END $$;
