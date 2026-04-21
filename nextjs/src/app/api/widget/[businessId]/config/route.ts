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

  const [settingsResult, appearanceResult] = await Promise.all([
    supabase.from('widget_settings').select('welcome_message').eq('business_id', businessId).single(),
    supabase.from('widget_appearance').select('*').eq('business_id', businessId).single(),
  ])

  if (settingsResult.error || !settingsResult.data || appearanceResult.error || !appearanceResult.data) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const appearance = appearanceResult.data

  // Explicitly shape the public response — never expose all columns directly.
  // Return primary_color as "color" for backward compatibility with widget.js.
  const response = {
    color: appearance.primary_color,
    welcome_message: settingsResult.data.welcome_message,
    tooltip_enabled: appearance.tooltip_enabled ?? true,
    tooltip_text: appearance.tooltip_text ?? 'Ask us anything — we reply instantly 24/7',
    tooltip_bg_color: appearance.tooltip_bg_color ?? '#FFFFFF',
    tooltip_text_color: appearance.tooltip_text_color ?? '#1F2937',
    tooltip_position: appearance.tooltip_position ?? 'side',
    avatar_enabled: appearance.avatar_enabled ?? true,
    avatar_selection: appearance.avatar_selection ?? 'robot',
    header_show_status: appearance.header_show_status ?? true,
    header_title: appearance.header_title ?? 'Chat with us',
    header_subtitle: appearance.header_subtitle ?? 'We reply instantly',
    typing_indicator_style: appearance.typing_indicator_style ?? 'animated_dots',
    session_ended_enabled: appearance.session_ended_enabled ?? true,
    session_ended_icon: appearance.session_ended_icon ?? '👋',
    session_ended_title: appearance.session_ended_title ?? 'Chat Ended',
    session_ended_message: appearance.session_ended_message ?? 'Thank you for reaching out! We hope we answered all your questions.',
    session_expired_enabled: appearance.session_expired_enabled ?? true,
    session_expired_icon: appearance.session_expired_icon ?? '⏰',
    session_expired_title: appearance.session_expired_title ?? 'Session Expired',
    session_expired_message: appearance.session_expired_message ?? 'Your session ended due to inactivity. Start a new chat anytime.',
    feedback_enabled: appearance.feedback_enabled ?? true,
    feedback_prompt_title: appearance.feedback_prompt_title ?? 'How was your experience?',
    feedback_note_placeholder: appearance.feedback_note_placeholder ?? 'Leave a message for the business (optional)',
  }

  return NextResponse.json(response, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=60',
    },
  })
}
