import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { businessId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .select('*')
    .eq('business_id', businessId)
    .single()

  if (error || !settings) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  // Explicitly shape the public response — never expose all columns directly.
  // Defaults for new columns guard against pre-migration state.
  const response = {
    color: settings.color,
    welcome_message: settings.welcome_message,
    tooltip_enabled: settings.tooltip_enabled ?? true,
    tooltip_text: settings.tooltip_text ?? 'Ask us anything — we reply instantly 24/7',
    // WS-02: Appearance settings
    tooltip_bg_color: settings.tooltip_bg_color ?? '#FFFFFF',
    tooltip_text_color: settings.tooltip_text_color ?? '#1F2937',
    tooltip_position: settings.tooltip_position ?? 'side',
    intent_title: settings.intent_title ?? 'How can we help you?',
    intent_description: settings.intent_description ?? 'Select an option to get started',
    intent_color_1: settings.intent_color_1 ?? '#3B82F6',
    intent_color_2: settings.intent_color_2 ?? '#10B981',
    intent_color_3: settings.intent_color_3 ?? '#F59E0B',
    intent_border_radius: settings.intent_border_radius ?? 'rounded',
    avatar_enabled: settings.avatar_enabled ?? true,
    avatar_selection: settings.avatar_selection ?? 'robot',
    header_show_status: settings.header_show_status ?? true,
    header_title: settings.header_title ?? 'Chat with us',
    header_subtitle: settings.header_subtitle ?? 'We reply instantly',
    typing_indicator_style: settings.typing_indicator_style ?? 'animated_dots',
    session_ended_enabled: settings.session_ended_enabled ?? true,
    session_ended_icon: settings.session_ended_icon ?? '👋',
    session_ended_title: settings.session_ended_title ?? 'Chat Ended',
    session_ended_message: settings.session_ended_message ?? 'Thank you for reaching out! We hope we answered all your questions.',
    session_expired_enabled: settings.session_expired_enabled ?? true,
    session_expired_icon: settings.session_expired_icon ?? '⏰',
    session_expired_title: settings.session_expired_title ?? 'Session Expired',
    session_expired_message: settings.session_expired_message ?? 'Your session ended due to inactivity. Start a new chat anytime.',
    feedback_enabled: settings.feedback_enabled ?? true,
    feedback_prompt_title: settings.feedback_prompt_title ?? 'How was your experience?',
    feedback_note_placeholder: settings.feedback_note_placeholder ?? 'Leave a message for the business (optional)',
  }

  return NextResponse.json(response, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=60',
    },
  })
}
