/*
# Fix user_preferences.id missing DEFAULT auth.uid()

## Problem
The `user_preferences` table was created with `id uuid PRIMARY KEY REFERENCES auth.users(id)`
but WITHOUT a `DEFAULT auth.uid()` clause. Every other owner-scoped table in this project
(contacts, deals, notes, workspace_settings, workflow_columns, workflow_cards, invoices) has
`DEFAULT auth.uid()` so that inserts from the frontend that omit the owner column still satisfy
the RLS INSERT policy (`WITH CHECK (auth.uid() = id)`).

Without the default, `INSERT INTO user_preferences DEFAULT VALUES` fails with:
  code 42501 — "security policy for table user_preferences"
because the column is null and `auth.uid() = null` is never true.

## Changes
1. `user_preferences.id` — adds `DEFAULT auth.uid()` so the app can call
   `.insert({})` (omitting `id`) and the row is correctly owned by the signed-in user.
   PostgreSQL `ALTER COLUMN ... SET DEFAULT` is non-destructive and safe on existing rows.

## Security
- No policy changes — existing RLS policies are already correct.
- The default only fires when `id` is omitted from an INSERT; explicit values still override it.
- No data is modified or dropped.
*/

ALTER TABLE user_preferences ALTER COLUMN id SET DEFAULT auth.uid();
