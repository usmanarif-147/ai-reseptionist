-- imp-05-appointment-module.sql
-- Schema changes for the appointment module.
-- Implements plan/appointment-module-plan/01-schema-changes.md sections 1-7.
-- All statements are idempotent; safe to run multiple times.

-- ============================================================
-- 1. business_hours — drop unique(business_id, day_of_week)
--    Constraint is named `unique_business_day` in phase3-schema.sql.
-- ============================================================
ALTER TABLE public.business_hours
  DROP CONSTRAINT IF EXISTS unique_business_day;

-- ============================================================
-- 2. business_holidays — specific dates the business is closed
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, holiday_date)
);

ALTER TABLE public.business_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_access" ON public.business_holidays;
CREATE POLICY "owner_access" ON public.business_holidays
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- ============================================================
-- 3. staff_hours — drop unique(staff_id, day_of_week)
--    Auto-generated constraint name is `staff_hours_staff_id_day_of_week_key`.
-- ============================================================
ALTER TABLE public.staff_hours
  DROP CONSTRAINT IF EXISTS staff_hours_staff_id_day_of_week_key;

-- ============================================================
-- 4. staff_schedule_overrides — date-specific availability overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  is_unavailable boolean NOT NULL DEFAULT false,
  open_time time,
  close_time time,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_schedule_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_access" ON public.staff_schedule_overrides;
CREATE POLICY "owner_access" ON public.staff_schedule_overrides
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- ============================================================
-- 5. services — max_bookings_per_slot
-- ============================================================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS max_bookings_per_slot integer NOT NULL DEFAULT 1;

-- ============================================================
-- 6. appointments — extended booking columns
--    status CHECK is added separately so it is idempotent even if
--    ADD COLUMN IF NOT EXISTS skips the column on re-runs.
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS slot_start time NOT NULL DEFAULT '00:00',
  ADD COLUMN IF NOT EXISTS slot_end time NOT NULL DEFAULT '00:00',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('confirmed', 'cancelled', 'completed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_business_date
  ON public.appointments (business_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_staff_date
  ON public.appointments (staff_id, appointment_date, status);

CREATE INDEX IF NOT EXISTS idx_business_holidays_lookup
  ON public.business_holidays (business_id, holiday_date);

CREATE INDEX IF NOT EXISTS idx_staff_overrides_lookup
  ON public.staff_schedule_overrides (staff_id, override_date);
