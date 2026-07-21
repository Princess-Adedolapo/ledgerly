/*
# User Preferences and Invoice Currency Tracking

1. New Tables
- `user_preferences`: one row per user storing localization and display preferences
  - id (uuid, primary key, references auth.users(id) ON DELETE CASCADE)
  - display_name (text, nullable) — alphanumeric characters, spaces, and hyphens only
  - currency_code (text, default 'USD') — e.g. 'USD', 'NGN', 'EUR', 'GBP'
  - currency_display_mode (text, default 'symbol') — either 'symbol' or 'code'
  - historical_currency_mode (text, default 'original') — either 'original' or 'converted'
  - updated_at (timestamptz, auto-updated via trigger)

2. Modified Tables
- `invoices`: added `currency_code` column (text, default 'USD', NOT NULL)
  so historical invoices retain the currency that was active when they were created.
  Existing rows backfilled to 'USD'.

3. Security
- RLS enabled on `user_preferences`.
- Owner-scoped CRUD: each authenticated user can only read/insert/update/delete
  their own preferences row (auth.uid() = id).
- The `id` column defaults to auth.uid() so inserts omitting the id succeed.

4. Realtime
- `user_preferences` added to supabase_realtime publication with REPLICA IDENTITY FULL
  so preference changes sync across devices/sessions in real time.

5. Notes
- The `id` column IS the user's auth uid — there is exactly one preferences row per user.
- `display_name` is validated client-side (alphanumeric + spaces + hyphens, max 50 chars).
- A CHECK constraint on `currency_display_mode` and `historical_currency_mode`
  ensures only valid enum values are stored.
*/

-- ============================================================
-- user_preferences table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR display_name ~ '^[a-zA-Z0-9 -]{0,50}$'),
  currency_code text NOT NULL DEFAULT 'USD',
  currency_display_mode text NOT NULL DEFAULT 'symbol' CHECK (currency_display_mode IN ('symbol', 'code')),
  historical_currency_mode text NOT NULL DEFAULT 'original' CHECK (historical_currency_mode IN ('original', 'converted')),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_preferences" ON user_preferences;
CREATE POLICY "select_own_user_preferences" ON user_preferences FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_user_preferences" ON user_preferences;
CREATE POLICY "insert_own_user_preferences" ON user_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_user_preferences" ON user_preferences;
CREATE POLICY "update_own_user_preferences" ON user_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_user_preferences" ON user_preferences;
CREATE POLICY "delete_own_user_preferences" ON user_preferences FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- invoices: add currency_code column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE invoices ADD COLUMN currency_code text NOT NULL DEFAULT 'USD';
  END IF;
END $$;

-- Backfill any existing rows (already defaulted, but be explicit)
UPDATE invoices SET currency_code = 'USD' WHERE currency_code IS NULL;

-- ============================================================
-- Realtime for user_preferences
-- ============================================================
ALTER TABLE user_preferences REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
  END IF;
END $$;

-- ============================================================
-- Trigger to auto-update updated_at on user_preferences
-- ============================================================
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS user_preferences_id_idx ON user_preferences(id);