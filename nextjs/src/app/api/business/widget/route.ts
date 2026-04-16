import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { DEFAULT_VISIBILITY_SETTINGS } from '@/lib/build-system-prompt'

// Fields that belong in widget_appearance table
const APPEARANCE_FIELDS = new Set([
  'primary_color',
  'color', // legacy alias for primary_color
  'tooltip_enabled',
  'tooltip_text',
  'tooltip_bg_color',
  'tooltip_text_color',
  'tooltip_position',
  'intent_title',
  'intent_description',
  'intent_color_1',
  'intent_color_2',
  'intent_color_3',
  'intent_border_radius',
  'avatar_enabled',
  'avatar_selection',
  'header_show_status',
  'header_title',
  'header_subtitle',
  'typing_indicator_style',
  'session_ended_enabled',
  'session_ended_icon',
  'session_ended_title',
  'session_ended_message',
  'session_expired_enabled',
  'session_expired_icon',
  'session_expired_title',
  'session_expired_message',
  'feedback_enabled',
  'feedback_prompt_title',
  'feedback_note_placeholder',
])

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const [settingsResult, appearanceResult] = await Promise.all([
    supabase.from('widget_settings').select('*').eq('business_id', business.id).single(),
    supabase.from('widget_appearance').select('*').eq('business_id', business.id).single(),
  ])

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 })
  }

  // Merge both tables into a single response.
  // Map primary_color back to "color" for frontend compatibility.
  const appearance = appearanceResult.data ?? {}
  const { primary_color, ...restAppearance } = appearance as Record<string, unknown>

  return NextResponse.json({
    ...settingsResult.data,
    ...restAppearance,
    color: primary_color ?? '#2563EB',
    primary_color,
  })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()

  // Split incoming fields into appearance vs settings
  const appearanceUpdate: Record<string, unknown> = {}
  const settingsUpdate: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body)) {
    if (key === 'color') {
      // Legacy name -> map to primary_color in widget_appearance
      appearanceUpdate.primary_color = value || '#2563EB'
    } else if (key === 'primary_color') {
      appearanceUpdate.primary_color = value || '#2563EB'
    } else if (APPEARANCE_FIELDS.has(key)) {
      appearanceUpdate[key] = value
    } else {
      settingsUpdate[key] = value
    }
  }

  // Apply defaults for info-control fields in settingsUpdate
  if ('welcome_message' in settingsUpdate) {
    settingsUpdate.welcome_message = settingsUpdate.welcome_message || 'How can we help you today?'
  }
  if ('show_business_name' in settingsUpdate) settingsUpdate.show_business_name = settingsUpdate.show_business_name ?? DEFAULT_VISIBILITY_SETTINGS.show_business_name
  if ('show_contact' in settingsUpdate) settingsUpdate.show_contact = settingsUpdate.show_contact ?? DEFAULT_VISIBILITY_SETTINGS.show_contact
  if ('show_address' in settingsUpdate) settingsUpdate.show_address = settingsUpdate.show_address ?? DEFAULT_VISIBILITY_SETTINGS.show_address
  if ('show_business_type' in settingsUpdate) settingsUpdate.show_business_type = settingsUpdate.show_business_type ?? DEFAULT_VISIBILITY_SETTINGS.show_business_type
  if ('show_business_hours' in settingsUpdate) settingsUpdate.show_business_hours = settingsUpdate.show_business_hours ?? DEFAULT_VISIBILITY_SETTINGS.show_business_hours
  if ('services_visibility' in settingsUpdate) settingsUpdate.services_visibility = settingsUpdate.services_visibility ?? DEFAULT_VISIBILITY_SETTINGS.services_visibility
  if ('hidden_service_ids' in settingsUpdate) settingsUpdate.hidden_service_ids = settingsUpdate.hidden_service_ids ?? DEFAULT_VISIBILITY_SETTINGS.hidden_service_ids
  if ('staff_visibility' in settingsUpdate) settingsUpdate.staff_visibility = settingsUpdate.staff_visibility ?? DEFAULT_VISIBILITY_SETTINGS.staff_visibility
  if ('hidden_staff_ids' in settingsUpdate) settingsUpdate.hidden_staff_ids = settingsUpdate.hidden_staff_ids ?? DEFAULT_VISIBILITY_SETTINGS.hidden_staff_ids
  if ('show_appointment_service' in settingsUpdate) settingsUpdate.show_appointment_service = settingsUpdate.show_appointment_service ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_service
  if ('show_appointment_staff' in settingsUpdate) settingsUpdate.show_appointment_staff = settingsUpdate.show_appointment_staff ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_staff
  if ('show_appointment_datetime' in settingsUpdate) settingsUpdate.show_appointment_datetime = settingsUpdate.show_appointment_datetime ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_datetime
  if ('show_appointment_duration' in settingsUpdate) settingsUpdate.show_appointment_duration = settingsUpdate.show_appointment_duration ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_duration
  if ('show_appointment_payment_type' in settingsUpdate) settingsUpdate.show_appointment_payment_type = settingsUpdate.show_appointment_payment_type ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_payment_type
  if ('show_appointment_payment_status' in settingsUpdate) settingsUpdate.show_appointment_payment_status = settingsUpdate.show_appointment_payment_status ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_payment_status
  if ('show_appointment_notes' in settingsUpdate) settingsUpdate.show_appointment_notes = settingsUpdate.show_appointment_notes ?? DEFAULT_VISIBILITY_SETTINGS.show_appointment_notes

  const now = new Date().toISOString()

  if (Object.keys(appearanceUpdate).length > 0) {
    appearanceUpdate.updated_at = now
  }
  if (Object.keys(settingsUpdate).length > 0) {
    settingsUpdate.updated_at = now
  }

  await Promise.all([
    Object.keys(appearanceUpdate).length > 0
      ? supabase.from('widget_appearance').update(appearanceUpdate).eq('business_id', business.id)
      : null,
    Object.keys(settingsUpdate).length > 0
      ? supabase.from('widget_settings').update(settingsUpdate).eq('business_id', business.id)
      : null,
  ])

  // Re-fetch merged data to return
  const [settingsResult, appearanceResult] = await Promise.all([
    supabase.from('widget_settings').select('*').eq('business_id', business.id).single(),
    supabase.from('widget_appearance').select('*').eq('business_id', business.id).single(),
  ])

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 })
  }

  const appearance = appearanceResult.data ?? {}
  const { primary_color, ...restAppearance } = appearance as Record<string, unknown>

  return NextResponse.json({
    ...settingsResult.data,
    ...restAppearance,
    color: primary_color ?? '#2563EB',
    primary_color,
  })
}
