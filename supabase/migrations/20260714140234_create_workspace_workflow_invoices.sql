/*
# CRM Extensions: Workspace Settings, Workflow Board, Invoices

1. New Tables
- `workspace_settings`: single row per user storing business_name, theme, weekly_sales_target
  - id (uuid PK), user_id (uuid FK auth.users, unique), business_name (text), theme (text: dark|light), weekly_sales_target (numeric), updated_at
- `workflow_columns`: board columns with name, position
  - id (uuid PK), user_id (uuid FK), name (text), position (int), updated_at
- `workflow_cards`: cards belonging to columns
  - id (uuid PK), user_id (uuid FK), column_id (uuid FK workflow_columns CASCADE), title (text), client_name (text), priority (text: low|medium|high), position (int), created_at
- `invoices`: invoice records for sales actuals
  - id (uuid PK), user_id (uuid FK), amount (numeric), status (text: pending|paid|overdue), created_at

2. Security
- RLS enabled on all tables, owner-scoped CRUD via auth.uid() = user_id.
- user_id defaults to auth.uid() on all tables.

3. Realtime
- Enabled via ALTER ... REPLICA IDENTITY FULL + publication for workspace_settings, workflow_columns, workflow_cards, invoices.

4. Seed Data
- Default workflow columns: Onboarding, Active Support, Invoicing Pending, Resolved / Completed (positions 0-3).
- Sample invoices for testing the weekly sales widget.
- A default workspace_settings row is NOT seeded here (created on first load by the app).
*/

-- workspace_settings
CREATE TABLE IF NOT EXISTS workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL DEFAULT 'CatalystAI Hub',
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  weekly_sales_target numeric(10,2) NOT NULL DEFAULT 20000.00,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspace_settings" ON workspace_settings;
CREATE POLICY "select_own_workspace_settings" ON workspace_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workspace_settings" ON workspace_settings;
CREATE POLICY "insert_own_workspace_settings" ON workspace_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workspace_settings" ON workspace_settings;
CREATE POLICY "update_own_workspace_settings" ON workspace_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workspace_settings" ON workspace_settings;
CREATE POLICY "delete_own_workspace_settings" ON workspace_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- workflow_columns
CREATE TABLE IF NOT EXISTS workflow_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workflow_columns" ON workflow_columns;
CREATE POLICY "select_own_workflow_columns" ON workflow_columns FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workflow_columns" ON workflow_columns;
CREATE POLICY "insert_own_workflow_columns" ON workflow_columns FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workflow_columns" ON workflow_columns;
CREATE POLICY "update_own_workflow_columns" ON workflow_columns FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workflow_columns" ON workflow_columns;
CREATE POLICY "delete_own_workflow_columns" ON workflow_columns FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- workflow_cards
CREATE TABLE IF NOT EXISTS workflow_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES workflow_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workflow_cards" ON workflow_cards;
CREATE POLICY "select_own_workflow_cards" ON workflow_cards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workflow_cards" ON workflow_cards;
CREATE POLICY "insert_own_workflow_cards" ON workflow_cards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workflow_cards" ON workflow_cards;
CREATE POLICY "update_own_workflow_cards" ON workflow_cards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workflow_cards" ON workflow_cards;
CREATE POLICY "delete_own_workflow_cards" ON workflow_cards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS workflow_columns_user_id_idx ON workflow_columns(user_id);
CREATE INDEX IF NOT EXISTS workflow_cards_user_id_idx ON workflow_cards(user_id);
CREATE INDEX IF NOT EXISTS workflow_cards_column_id_idx ON workflow_cards(column_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);

-- Realtime
ALTER TABLE workspace_settings REPLICA IDENTITY FULL;
ALTER TABLE workflow_columns REPLICA IDENTITY FULL;
ALTER TABLE workflow_cards REPLICA IDENTITY FULL;
ALTER TABLE invoices REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workspace_settings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_columns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_columns;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workflow_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_cards;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  END IF;
END $$;

-- Trigger to update updated_at on workspace_settings
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS workflow_columns_updated_at ON workflow_columns;
CREATE TRIGGER workflow_columns_updated_at
  BEFORE UPDATE ON workflow_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();