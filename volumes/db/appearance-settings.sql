-- WS-02: Widget Appearance Settings
-- Adds all appearance customization columns to widget_settings.
-- Safe to run multiple times (idempotent).

-- ============================================================
-- B. Tooltip appearance
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS tooltip_bg_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS tooltip_text_color TEXT NOT NULL DEFAULT '#1F2937',
  ADD COLUMN IF NOT EXISTS tooltip_position TEXT NOT NULL DEFAULT 'side';

-- ============================================================
-- C. Intent selection screen
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS intent_title TEXT NOT NULL DEFAULT 'How can we help you?',
  ADD COLUMN IF NOT EXISTS intent_description TEXT NOT NULL DEFAULT 'Select an option to get started',
  ADD COLUMN IF NOT EXISTS intent_color_1 TEXT NOT NULL DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS intent_color_2 TEXT NOT NULL DEFAULT '#10B981',
  ADD COLUMN IF NOT EXISTS intent_color_3 TEXT NOT NULL DEFAULT '#F59E0B',
  ADD COLUMN IF NOT EXISTS intent_border_radius TEXT NOT NULL DEFAULT 'rounded';

-- ============================================================
-- D. Chat conversation — avatar
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS avatar_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_selection TEXT NOT NULL DEFAULT 'robot';

-- ============================================================
-- E. Widget header
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS header_show_status BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS header_title TEXT NOT NULL DEFAULT 'Chat with us',
  ADD COLUMN IF NOT EXISTS header_subtitle TEXT NOT NULL DEFAULT 'We reply instantly';

-- ============================================================
-- F. Typing indicator
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS typing_indicator_style TEXT NOT NULL DEFAULT 'animated_dots';

-- ============================================================
-- G. Session ended screen
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS session_ended_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS session_ended_icon TEXT NOT NULL DEFAULT '👋',
  ADD COLUMN IF NOT EXISTS session_ended_title TEXT NOT NULL DEFAULT 'Chat Ended',
  ADD COLUMN IF NOT EXISTS session_ended_message TEXT NOT NULL DEFAULT 'Thank you for reaching out! We hope we answered all your questions.';

-- ============================================================
-- H. Session expired screen
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS session_expired_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS session_expired_icon TEXT NOT NULL DEFAULT '⏰',
  ADD COLUMN IF NOT EXISTS session_expired_title TEXT NOT NULL DEFAULT 'Session Expired',
  ADD COLUMN IF NOT EXISTS session_expired_message TEXT NOT NULL DEFAULT 'Your session ended due to inactivity. Start a new chat anytime.';

-- ============================================================
-- I. Feedback / review
-- ============================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feedback_prompt_title TEXT NOT NULL DEFAULT 'How was your experience?',
  ADD COLUMN IF NOT EXISTS feedback_note_placeholder TEXT NOT NULL DEFAULT 'Leave a message for the business (optional)';
