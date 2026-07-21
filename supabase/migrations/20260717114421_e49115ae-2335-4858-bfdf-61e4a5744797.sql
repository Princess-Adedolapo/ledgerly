ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark'
    CHECK (theme IN ('dark', 'light'));