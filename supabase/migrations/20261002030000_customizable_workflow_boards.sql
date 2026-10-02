-- ============================================================================
-- Ledgerly Customizable Workflow Boards Migration
-- ============================================================================

-- 1. Create table `boards`
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT board_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 40)
);

-- 2. Create table `board_columns`
CREATE TABLE IF NOT EXISTS board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT 'violet',
  position integer NOT NULL DEFAULT 0,
  column_type text NOT NULL DEFAULT 'open' CHECK (column_type IN ('open', 'won', 'lost')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT column_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 40)
);

-- 3. Add column_id and board_id to existing deals table and workflow_cards
ALTER TABLE deals ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES boards(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS column_id uuid REFERENCES board_columns(id) ON DELETE SET NULL;

ALTER TABLE workflow_cards ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES boards(id) ON DELETE CASCADE;

-- Relax foreign key on workflow_cards.column_id if pointing exclusively to legacy workflow_columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workflow_cards_column_id_fkey' AND table_name = 'workflow_cards'
  ) THEN
    ALTER TABLE workflow_cards DROP CONSTRAINT workflow_cards_column_id_fkey;
  END IF;
END $$;

-- 4. Enable Row Level Security & Policies
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_boards" ON boards;
CREATE POLICY "select_own_boards" ON boards FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_boards" ON boards;
CREATE POLICY "insert_own_boards" ON boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_boards" ON boards;
CREATE POLICY "update_own_boards" ON boards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_boards" ON boards;
CREATE POLICY "delete_own_boards" ON boards FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_board_columns" ON board_columns;
CREATE POLICY "select_own_board_columns" ON board_columns FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_board_columns" ON board_columns;
CREATE POLICY "insert_own_board_columns" ON board_columns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_board_columns" ON board_columns;
CREATE POLICY "update_own_board_columns" ON board_columns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_board_columns" ON board_columns;
CREATE POLICY "delete_own_board_columns" ON board_columns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Migration for existing data: for every existing user who has deals or workflow_cards,
-- create one board named 'Main Pipeline' with the 4 default columns matching today's stages.
DO $$
DECLARE
  u RECORD;
  new_board_id uuid;
  col_lead_id uuid;
  col_prop_id uuid;
  col_prog_id uuid;
  col_paid_id uuid;
BEGIN
  FOR u IN (
    SELECT DISTINCT user_id FROM deals WHERE user_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id FROM workflow_cards WHERE user_id IS NOT NULL
    UNION
    SELECT id AS user_id FROM auth.users
  ) LOOP
    -- Check if user already has a board
    SELECT id INTO new_board_id FROM boards WHERE user_id = u.user_id ORDER BY position ASC, created_at ASC LIMIT 1;
    
    IF new_board_id IS NULL THEN
      INSERT INTO boards (user_id, name, template, position)
      VALUES (u.user_id, 'Main Pipeline', 'default', 0)
      RETURNING id INTO new_board_id;

      INSERT INTO board_columns (board_id, user_id, name, description, color, position, column_type)
      VALUES (new_board_id, u.user_id, 'Lead Inflow', 'New leads & inquiries', 'amber', 0, 'open')
      RETURNING id INTO col_lead_id;

      INSERT INTO board_columns (board_id, user_id, name, description, color, position, column_type)
      VALUES (new_board_id, u.user_id, 'Proposal Sent', 'Quoted / Pending review', 'violet', 1, 'open')
      RETURNING id INTO col_prop_id;

      INSERT INTO board_columns (board_id, user_id, name, description, color, position, column_type)
      VALUES (new_board_id, u.user_id, 'In Progress', 'Active deliverables & ongoing work', 'blue', 2, 'open')
      RETURNING id INTO col_prog_id;

      INSERT INTO board_columns (board_id, user_id, name, description, color, position, column_type)
      VALUES (new_board_id, u.user_id, 'Paid & Closed', 'Settled invoices & completed projects', 'emerald', 3, 'won')
      RETURNING id INTO col_paid_id;
    ELSE
      SELECT id INTO col_lead_id FROM board_columns WHERE board_id = new_board_id AND (name ILIKE '%lead%' OR position = 0) LIMIT 1;
      SELECT id INTO col_prop_id FROM board_columns WHERE board_id = new_board_id AND (name ILIKE '%proposal%' OR position = 1) LIMIT 1;
      SELECT id INTO col_prog_id FROM board_columns WHERE board_id = new_board_id AND (name ILIKE '%progress%' OR position = 2) LIMIT 1;
      SELECT id INTO col_paid_id FROM board_columns WHERE board_id = new_board_id AND (column_type = 'won' OR name ILIKE '%paid%' OR position = 3) LIMIT 1;
    END IF;

    -- Update existing deals for this user
    UPDATE deals
    SET board_id = new_board_id,
        column_id = CASE
          WHEN lower(stage) LIKE '%lead%' OR lower(stage) = 'new' THEN col_lead_id
          WHEN lower(stage) LIKE '%proposal%' OR lower(stage) LIKE '%quote%' THEN col_prop_id
          WHEN lower(stage) LIKE '%progress%' OR lower(stage) LIKE '%active%' THEN col_prog_id
          WHEN lower(stage) LIKE '%paid%' OR lower(stage) LIKE '%closed%' OR lower(stage) = 'won' THEN col_paid_id
          ELSE col_lead_id
        END
    WHERE user_id = u.user_id AND (board_id IS NULL OR column_id IS NULL);

    -- Also link existing workflow_cards to new_board_id
    UPDATE workflow_cards
    SET board_id = new_board_id
    WHERE user_id = u.user_id AND board_id IS NULL;
  END LOOP;
END $$;
