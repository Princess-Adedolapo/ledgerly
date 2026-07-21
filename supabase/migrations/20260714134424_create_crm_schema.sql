/*
# CRM Schema - Contacts, Deals, Notes

1. New Tables
- `contacts`: customer/lead records
  - id (uuid PK)
  - user_id (uuid, owner, defaults to auth.uid())
  - name (text, not null)
  - email (text)
  - phone (text)
  - company (text)
  - status (text: Lead, Active, Inactive)
  - created_at (timestamptz)
- `deals`: pipeline deals
  - id (uuid PK)
  - user_id (uuid, owner, defaults to auth.uid())
  - title (text, not null)
  - contact_id (uuid FK -> contacts, nullable)
  - value (numeric)
  - stage (text: New, In Progress, Won, Lost)
  - created_at (timestamptz)
- `notes`: notes/activity log per contact
  - id (uuid PK)
  - user_id (uuid, owner, defaults to auth.uid())
  - contact_id (uuid FK -> contacts)
  - body (text, not null)
  - created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- Owner-scoped CRUD: each authenticated user only accesses rows they own.
- user_id defaults to auth.uid() so inserts omitting user_id succeed.
- Foreign keys cascade on delete for child tables.
*/

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text NOT NULL DEFAULT 'Lead',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  value numeric(12,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_deals" ON deals;
CREATE POLICY "select_own_deals" ON deals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_deals" ON deals;
CREATE POLICY "insert_own_deals" ON deals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_deals" ON deals;
CREATE POLICY "update_own_deals" ON deals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_deals" ON deals;
CREATE POLICY "delete_own_deals" ON deals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);
CREATE INDEX IF NOT EXISTS deals_user_id_idx ON deals(user_id);
CREATE INDEX IF NOT EXISTS deals_contact_id_idx ON deals(contact_id);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_contact_id_idx ON notes(contact_id);