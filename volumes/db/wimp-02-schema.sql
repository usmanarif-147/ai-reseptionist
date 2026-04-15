-- WIMP-02: Widget Prominence and Intent Selection
-- Safe to run multiple times (idempotent).

ALTER TABLE widget_settings
  ADD COLUMN IF NOT EXISTS tooltip_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tooltip_text TEXT NOT NULL DEFAULT 'Ask us anything — we reply instantly 24/7';
