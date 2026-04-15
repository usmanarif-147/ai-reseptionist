-- Phase 5: Customer Capture via Chat Widget
-- Safe to run multiple times (idempotent).

-- ============================================================
-- TABLE: widget_customers
-- ============================================================

CREATE TABLE IF NOT EXISTS widget_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  visitor_id TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_business_email UNIQUE(business_id, email)
);

CREATE INDEX IF NOT EXISTS idx_widget_customers_business_id ON widget_customers(business_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE widget_customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "owner_select" ON widget_customers
    FOR SELECT USING (
      business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- COLUMNS: chat_sessions additions
-- ============================================================

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES widget_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intent TEXT;

-- ============================================================
-- FUNCTION: Atomic customer upsert with session increment
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_widget_customer(
  p_business_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_visitor_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO widget_customers (business_id, email, name, phone, visitor_id, total_sessions)
  VALUES (p_business_id, p_email, p_name, p_phone, p_visitor_id, 1)
  ON CONFLICT (business_id, email) DO UPDATE SET
    last_seen_at = NOW(),
    total_sessions = widget_customers.total_sessions + 1,
    updated_at = NOW(),
    visitor_id = COALESCE(widget_customers.visitor_id, EXCLUDED.visitor_id),
    name = COALESCE(EXCLUDED.name, widget_customers.name),
    phone = COALESCE(EXCLUDED.phone, widget_customers.phone)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
