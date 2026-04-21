-- wimp-07: Dashboard & Schema Cleanup
-- See plan/widget-improvements/07-dashboard-and-schema-cleanup.md
--
-- Drops the six orphaned intent_* columns from widget_appearance.
-- The Intent Selection screen was removed in wimp-02 (frictionless chat);
-- these columns no longer back any UI the visitor sees.
-- Safe to re-run (each DROP is guarded by IF EXISTS).

ALTER TABLE widget_appearance
  DROP COLUMN IF EXISTS intent_title,
  DROP COLUMN IF EXISTS intent_description,
  DROP COLUMN IF EXISTS intent_color_1,
  DROP COLUMN IF EXISTS intent_color_2,
  DROP COLUMN IF EXISTS intent_color_3,
  DROP COLUMN IF EXISTS intent_border_radius;
