import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { DEFAULT_VISIBILITY_SETTINGS } from '@/lib/build-system-prompt'

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .select('*')
    .eq('business_id', business.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    color,
    welcome_message,
    tooltip_enabled,
    tooltip_text,
    show_business_name,
    show_contact,
    show_address,
    show_business_type,
    show_business_hours,
    services_visibility,
    hidden_service_ids,
    staff_visibility,
    hidden_staff_ids,
    show_appointment_service,
    show_appointment_staff,
    show_appointment_datetime,
    show_appointment_duration,
    show_appointment_payment_type,
    show_appointment_payment_status,
    show_appointment_notes,
    // WS-02: Appearance settings
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
    feedback_note_placeholder,
  } = body

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .update({
      color: color || '#2563eb',
      welcome_message: welcome_message || 'How can we help you today?',
      tooltip_enabled: tooltip_enabled ?? true,
      tooltip_text: tooltip_text || 'Ask us anything — we reply instantly 24/7',
      show_business_name: show_business_name ?? DEFAULT_VISIBILITY_SETTINGS.show_business_name,
      show_contact: show_contact ?? DEFAULT_VISIBILITY_SETTINGS.show_contact,
      show_address: show_address ?? DEFAULT_VISIBILITY_SETTINGS.show_address,
      show_business_type: show_business_type ?? DEFAULT_VISIBILITY_SETTINGS.show_business_type,
      show_business_hours: show_business_hours ?? DEFAULT_VISIBILITY_SETTINGS.show_business_hours,
      services_visibility: services_visibility ?? DEFAULT_VISIBILITY_SETTINGS.services_visibility,
      hidden_service_ids: hidden_service_ids ?? DEFAULT_VISIBILITY_SETTINGS.hidden_service_ids,
      staff_visibility: staff_visibility ?? DEFAULT_VISIBILITY_SETTINGS.staff_visibility,
      hidden_staff_ids: hidden_staff_ids ?? DEFAULT_VISIBILITY_SETTINGS.hidden_staff_ids,
      show_appointment_service: show_appointment_service ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_service,
      show_appointment_staff: show_appointment_staff ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_staff,
      show_appointment_datetime: show_appointment_datetime ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_datetime,
      show_appointment_duration: show_appointment_duration ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_duration,
      show_appointment_payment_type: show_appointment_payment_type ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_payment_type,
      show_appointment_payment_status: show_appointment_payment_status ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_payment_status,
      show_appointment_notes: show_appointment_notes ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_notes,
      // WS-02: Appearance settings
      tooltip_bg_color: tooltip_bg_color || '#FFFFFF',
      tooltip_text_color: tooltip_text_color || '#1F2937',
      tooltip_position: tooltip_position || 'side',
      intent_title: intent_title || 'How can we help you?',
      intent_description: intent_description || 'Select an option to get started',
      intent_color_1: intent_color_1 || '#3B82F6',
      intent_color_2: intent_color_2 || '#10B981',
      intent_color_3: intent_color_3 || '#F59E0B',
      intent_border_radius: intent_border_radius || 'rounded',
      avatar_enabled: avatar_enabled ?? true,
      avatar_selection: avatar_selection || 'robot',
      header_show_status: header_show_status ?? true,
      header_title: header_title || 'Chat with us',
      header_subtitle: header_subtitle || 'We reply instantly',
      typing_indicator_style: typing_indicator_style || 'animated_dots',
      session_ended_enabled: session_ended_enabled ?? true,
      session_ended_icon: session_ended_icon || '👋',
      session_ended_title: session_ended_title || 'Chat Ended',
      session_ended_message: session_ended_message || 'Thank you for reaching out! We hope we answered all your questions.',
      session_expired_enabled: session_expired_enabled ?? true,
      session_expired_icon: session_expired_icon || '⏰',
      session_expired_title: session_expired_title || 'Session Expired',
      session_expired_message: session_expired_message || 'Your session ended due to inactivity. Start a new chat anytime.',
      feedback_enabled: feedback_enabled ?? true,
      feedback_prompt_title: feedback_prompt_title || 'How was your experience?',
      feedback_note_placeholder: feedback_note_placeholder || 'Leave a message for the business (optional)',
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}
