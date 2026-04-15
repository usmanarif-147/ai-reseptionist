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
