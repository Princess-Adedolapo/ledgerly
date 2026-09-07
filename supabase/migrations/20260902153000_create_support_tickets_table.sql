-- Create support_tickets table for user problem reports and inquiries
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'normal',
  contact_email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow users (authenticated and anonymous sessions) to submit support tickets
CREATE POLICY "Allow users to submit support tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to view only their own submitted support tickets
CREATE POLICY "Allow users to read own support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = contact_email
  );
