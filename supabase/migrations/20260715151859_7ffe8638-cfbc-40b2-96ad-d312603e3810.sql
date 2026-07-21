
ALTER TABLE public.workflow_cards
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS assignee_name text;
