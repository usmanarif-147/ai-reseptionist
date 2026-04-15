-- WIMP-03: Conversation Scope Guard and Session Ending
-- Safe to run multiple times (idempotent).

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS off_topic_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'expired')),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_note TEXT;
