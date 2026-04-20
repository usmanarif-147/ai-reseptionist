-- WIMP-05: Conversation History & Natural End
-- Adds review_action to chat_sessions so we can distinguish how visitors leave
-- the feedback screen (rating given, skipped, widget closed, tab closed, pending).
-- Also adds an index that powers the visitor-scoped history list query.
-- Safe to run multiple times (idempotent).

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS review_action TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_sessions_review_action_check'
  ) THEN
    ALTER TABLE public.chat_sessions
      ADD CONSTRAINT chat_sessions_review_action_check
      CHECK (review_action IN ('given', 'skipped', 'closed_widget', 'closed_tab', 'pending'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_business_visitor_created
  ON public.chat_sessions(business_id, visitor_id, created_at DESC);
