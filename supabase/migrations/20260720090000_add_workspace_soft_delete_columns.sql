-- Add soft-delete columns to workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT null;
