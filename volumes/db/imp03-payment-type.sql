-- imp03: Allow 'both' as a payment_type option
-- Drop old CHECK constraint and add new one allowing 'both'
ALTER TABLE public.payment_settings
  DROP CONSTRAINT IF EXISTS payment_settings_payment_type_check;

ALTER TABLE public.payment_settings
  ADD CONSTRAINT payment_settings_payment_type_check
  CHECK (payment_type IN ('cash', 'online', 'both'));
