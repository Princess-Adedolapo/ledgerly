/*
# Workflow Cards: add contact_id, moved_at, description

1. Modified Tables
- `workflow_cards`
  - ADD `contact_id` (uuid, nullable, FK -> contacts ON DELETE SET NULL)
    - Links a card to a contact record, replacing the free-text client_name input
  - ADD `moved_at` (timestamptz, default now())
    - Timestamp of when the card was last moved to a new column; used for days-in-column display
  - ADD `description` (text, nullable)
    - Optional longer description for the card, editable in the edit modal
  - ALTER `client_name` DROP NOT NULL
    - No longer required since cards are now linked via contact_id; kept for backward-compatible display

2. Security
- No RLS policy changes (existing owner-scoped CRUD policies on workflow_cards still apply).

3. Indexes
- Added index on workflow_cards(contact_id) for FK lookup performance.
*/

ALTER TABLE workflow_cards
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moved_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE workflow_cards ALTER COLUMN client_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS workflow_cards_contact_id_idx ON workflow_cards(contact_id);
