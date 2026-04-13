-- Improvement 02: Flexible Staff Form
-- Run this after imp-01-schema.sql

-- Extend staff table
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS contact jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';

-- staff_custom_fields table (mirror of service_custom_fields)
CREATE TABLE IF NOT EXISTS staff_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_key text NOT NULL,
  input_type text NOT NULL CHECK (input_type IN ('text','number','dropdown','checkbox')),
  options jsonb NOT NULL DEFAULT '[]',
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, field_key)
);

ALTER TABLE staff_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_access" ON staff_custom_fields;
CREATE POLICY "owner_access" ON staff_custom_fields
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- staff_hours table (per-staff mirror of business_hours)
CREATE TABLE IF NOT EXISTS staff_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT false,
  open_time time,
  close_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, day_of_week)
);

ALTER TABLE staff_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_access" ON staff_hours;
CREATE POLICY "owner_access" ON staff_hours
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
