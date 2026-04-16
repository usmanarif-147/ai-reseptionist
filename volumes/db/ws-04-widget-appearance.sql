-- WS-04: Split widget appearance into its own table
-- Migrates appearance columns from widget_settings to widget_appearance.
-- Safe to run multiple times (idempotent).

-- ============================================================
-- 1. CREATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.widget_appearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- A. General
  primary_color TEXT NOT NULL DEFAULT '#2563EB',

  -- B. Tooltip
  tooltip_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  tooltip_text TEXT NOT NULL DEFAULT 'Ask us anything — we reply instantly 24/7',
  tooltip_bg_color TEXT NOT NULL DEFAULT '#FFFFFF',
  tooltip_text_color TEXT NOT NULL DEFAULT '#1F2937',
  tooltip_position TEXT NOT NULL DEFAULT 'side',

  -- C. Intent Selection
  intent_title TEXT NOT NULL DEFAULT 'How can we help you?',
  intent_description TEXT NOT NULL DEFAULT 'Select an option to get started',
  intent_color_1 TEXT NOT NULL DEFAULT '#3B82F6',
  intent_color_2 TEXT NOT NULL DEFAULT '#10B981',
  intent_color_3 TEXT NOT NULL DEFAULT '#F59E0B',
  intent_border_radius TEXT NOT NULL DEFAULT 'rounded',

  -- D. Avatar
  avatar_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_selection TEXT NOT NULL DEFAULT 'robot',

  -- E. Header
  header_show_status BOOLEAN NOT NULL DEFAULT TRUE,
  header_title TEXT NOT NULL DEFAULT 'Chat with us',
  header_subtitle TEXT NOT NULL DEFAULT 'We reply instantly',

  -- F. Typing Indicator
  typing_indicator_style TEXT NOT NULL DEFAULT 'animated_dots',

  -- G. Session Ended
  session_ended_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  session_ended_icon TEXT NOT NULL DEFAULT '👋',
  session_ended_title TEXT NOT NULL DEFAULT 'Chat Ended',
  session_ended_message TEXT NOT NULL DEFAULT 'Thank you for reaching out! We hope we answered all your questions.',

  -- H. Session Expired
  session_expired_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  session_expired_icon TEXT NOT NULL DEFAULT '⏰',
  session_expired_title TEXT NOT NULL DEFAULT 'Session Expired',
  session_expired_message TEXT NOT NULL DEFAULT 'Your session ended due to inactivity. Start a new chat anytime.',

  -- I. Feedback
  feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  feedback_prompt_title TEXT NOT NULL DEFAULT 'How was your experience?',
  feedback_note_placeholder TEXT NOT NULL DEFAULT 'Leave a message for the business (optional)',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.widget_appearance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own widget appearance"
    ON public.widget_appearance FOR SELECT
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own widget appearance"
    ON public.widget_appearance FOR INSERT
    WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own widget appearance"
    ON public.widget_appearance FOR UPDATE
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. MIGRATE DATA from widget_settings (if columns exist)
-- ============================================================

DO $$
BEGIN
  -- Only attempt migration if the old columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'widget_settings' AND column_name = 'color'
  ) THEN
    INSERT INTO public.widget_appearance (
      business_id,
      primary_color,
      tooltip_enabled,
      tooltip_text,
      tooltip_bg_color,
      tooltip_text_color,
      tooltip_position,
      intent_title,
      intent_description,
      intent_color_1,
      intent_color_2,
      intent_color_3,
      intent_border_radius,
      avatar_enabled,
      avatar_selection,
      header_show_status,
      header_title,
      header_subtitle,
      typing_indicator_style,
      session_ended_enabled,
      session_ended_icon,
      session_ended_title,
      session_ended_message,
      session_expired_enabled,
      session_expired_icon,
      session_expired_title,
      session_expired_message,
      feedback_enabled,
      feedback_prompt_title,
      feedback_note_placeholder
    )
    SELECT
      business_id,
      color,
      tooltip_enabled,
      tooltip_text,
      tooltip_bg_color,
      tooltip_text_color,
      tooltip_position,
      intent_title,
      intent_description,
      intent_color_1,
      intent_color_2,
      intent_color_3,
      intent_border_radius,
      avatar_enabled,
      avatar_selection,
      header_show_status,
      header_title,
      header_subtitle,
      typing_indicator_style,
      session_ended_enabled,
      session_ended_icon,
      session_ended_title,
      session_ended_message,
      session_expired_enabled,
      session_expired_icon,
      session_expired_title,
      session_expired_message,
      feedback_enabled,
      feedback_prompt_title,
      feedback_note_placeholder
    FROM public.widget_settings
    ON CONFLICT (business_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 4. DROP appearance columns from widget_settings
-- ============================================================

ALTER TABLE public.widget_settings
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS tooltip_enabled,
  DROP COLUMN IF EXISTS tooltip_text,
  DROP COLUMN IF EXISTS tooltip_bg_color,
  DROP COLUMN IF EXISTS tooltip_text_color,
  DROP COLUMN IF EXISTS tooltip_position,
  DROP COLUMN IF EXISTS intent_title,
  DROP COLUMN IF EXISTS intent_description,
  DROP COLUMN IF EXISTS intent_color_1,
  DROP COLUMN IF EXISTS intent_color_2,
  DROP COLUMN IF EXISTS intent_color_3,
  DROP COLUMN IF EXISTS intent_border_radius,
  DROP COLUMN IF EXISTS avatar_enabled,
  DROP COLUMN IF EXISTS avatar_selection,
  DROP COLUMN IF EXISTS header_show_status,
  DROP COLUMN IF EXISTS header_title,
  DROP COLUMN IF EXISTS header_subtitle,
  DROP COLUMN IF EXISTS typing_indicator_style,
  DROP COLUMN IF EXISTS session_ended_enabled,
  DROP COLUMN IF EXISTS session_ended_icon,
  DROP COLUMN IF EXISTS session_ended_title,
  DROP COLUMN IF EXISTS session_ended_message,
  DROP COLUMN IF EXISTS session_expired_enabled,
  DROP COLUMN IF EXISTS session_expired_icon,
  DROP COLUMN IF EXISTS session_expired_title,
  DROP COLUMN IF EXISTS session_expired_message,
  DROP COLUMN IF EXISTS feedback_enabled,
  DROP COLUMN IF EXISTS feedback_prompt_title,
  DROP COLUMN IF EXISTS feedback_note_placeholder;
