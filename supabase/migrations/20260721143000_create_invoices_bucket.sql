-- Create the invoices storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  FALSE,
  10485760, -- 10MB limit (or NULL for unlimited)
  ARRAY['application/pdf']::text[] -- Only allow PDF files
)
ON CONFLICT (id) DO NOTHING;
