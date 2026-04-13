-- Improvement 04: Widget Information Control
-- Run after phase3-schema.sql (and imp-02/imp-03 if they exist)

DO $$ BEGIN
  CREATE TYPE services_visibility_type AS ENUM ('active_only', 'all', 'hide_specific');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_visibility_type AS ENUM ('active_only', 'all', 'hide_specific');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS show_business_name boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_contact boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_address boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_business_type boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_business_hours boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS services_visibility services_visibility_type DEFAULT 'active_only',
  ADD COLUMN IF NOT EXISTS hidden_service_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS staff_visibility staff_visibility_type DEFAULT 'active_only',
  ADD COLUMN IF NOT EXISTS hidden_staff_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_appointment_service boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_appointment_staff boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_appointment_datetime boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_appointment_duration boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_appointment_payment_type boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_appointment_payment_status boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_appointment_notes boolean DEFAULT true;
