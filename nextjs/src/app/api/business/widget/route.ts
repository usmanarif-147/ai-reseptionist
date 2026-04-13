import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

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
      show_business_name: show_business_name ?? true,
      show_contact: show_contact ?? true,
      show_address: show_address ?? true,
      show_business_type: show_business_type ?? true,
      show_business_hours: show_business_hours ?? true,
      services_visibility: services_visibility ?? 'active_only',
      hidden_service_ids: hidden_service_ids ?? [],
      staff_visibility: staff_visibility ?? 'active_only',
      hidden_staff_ids: hidden_staff_ids ?? [],
      show_appointment_service: show_appointment_service ?? true,
      show_appointment_staff: show_appointment_staff ?? true,
      show_appointment_datetime: show_appointment_datetime ?? true,
      show_appointment_duration: show_appointment_duration ?? true,
      show_appointment_payment_type: show_appointment_payment_type ?? false,
      show_appointment_payment_status: show_appointment_payment_status ?? false,
      show_appointment_notes: show_appointment_notes ?? true,
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
