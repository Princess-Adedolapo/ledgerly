DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload invoice PDFs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read invoice PDFs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;