-- Add description_type and description_note to contacts table for detailed categorization
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS description_type text,
ADD COLUMN IF NOT EXISTS description_note text;
