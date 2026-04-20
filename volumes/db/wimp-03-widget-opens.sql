-- WIMP-03: Widget Opens & Anonymous Session Grouping
-- Persists launcher-click telemetry and adds visitor_id to chat_sessions
-- so anonymous chat sessions can be grouped by the widget's visitor_id.
-- Safe to run multiple times (idempotent).

-- ============================================================
-- TABLE: widget_opens
-- One row per widget load on a visitor's browser.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.widget_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widget_opens_business_id ON public.widget_opens(business_id);
CREATE INDEX IF NOT EXISTS idx_widget_opens_opened_at ON public.widget_opens(opened_at);
CREATE INDEX IF NOT EXISTS idx_widget_opens_business_visitor ON public.widget_opens(business_id, visitor_id);

ALTER TABLE public.widget_opens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select" ON public.widget_opens;
CREATE POLICY "owner_select" ON public.widget_opens
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- ============================================================
-- COLUMNS: chat_sessions.visitor_id
-- The widget already sends visitor_id on chat requests; persisting it
-- lets the dashboard distinguish frequent vs one-time anonymous chatters.
-- ============================================================

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS visitor_id TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_business_visitor
  ON public.chat_sessions(business_id, visitor_id);
