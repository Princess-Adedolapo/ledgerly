/*
# Invoices: add customer_name, due_date, notes, invoice_number

1. Modified Tables
- `invoices`
  - ADD `customer_name` (text, nullable) — customer name for the invoice
  - ADD `due_date` (date, nullable) — invoice due date
  - ADD `notes` (text, nullable) — optional notes
  - ADD `invoice_number` (text, nullable) — human-readable invoice number like INV-1234567890

2. Security
- No RLS policy changes (existing owner-scoped CRUD policies on invoices still apply).
*/

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS invoice_number text;
