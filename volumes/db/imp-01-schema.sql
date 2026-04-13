-- Improvement 01: Flexible Service Form
-- Run this after phase3-schema.sql and phase4-schema.sql

-- Add new columns to services table
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS staff_ids jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';

-- Create service_custom_fields table for per-business custom field definitions
CREATE TABLE IF NOT EXISTS service_custom_fields (
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

-- RLS: each business owner only sees their own custom field definitions
ALTER TABLE service_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access" ON service_custom_fields
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
