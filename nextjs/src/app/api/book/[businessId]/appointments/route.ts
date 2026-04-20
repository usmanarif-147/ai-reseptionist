import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  isValidUUID,
  isValidDateString,
  isDateInPast,
  isValidTimeString,
  normalizeTime,
} from '@/lib/booking/validation'
import { isSlotAvailable } from '@/lib/booking/slot-generator'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { businessId } = await params

  if (!isValidUUID(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const {
    service_id,
    staff_id,
    appointment_date,
    slot_start,
    slot_end,
    payment_method,
    customer_name,
    customer_email,
    customer_phone,
    chat_session_id,
    visitor_id,
    widget_customer_id,
  } = body as Record<string, string | undefined>

  if (!isValidUUID(service_id)) {
    return NextResponse.json(
      { error: 'service_id is required and must be a valid UUID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!isValidUUID(staff_id)) {
    return NextResponse.json(
      { error: 'staff_id is required and must be a valid UUID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!appointment_date || !isValidDateString(appointment_date)) {
    return NextResponse.json(
      { error: 'appointment_date is required and must be YYYY-MM-DD' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (isDateInPast(appointment_date)) {
    return NextResponse.json(
      { error: 'appointment_date cannot be in the past' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!isValidTimeString(slot_start)) {
    return NextResponse.json(
      { error: 'slot_start is required and must be HH:MM (24-hour)' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!isValidTimeString(slot_end)) {
    return NextResponse.json(
      { error: 'slot_end is required and must be HH:MM (24-hour)' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (slot_start! >= slot_end!) {
    return NextResponse.json(
      { error: 'slot_end must be after slot_start' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (payment_method !== 'cash_on_arrival') {
    return NextResponse.json(
      { error: 'payment_method must be cash_on_arrival' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return NextResponse.json(
      { error: 'customer_name is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const email = customer_email && typeof customer_email === 'string' ? customer_email.trim() : ''
  const phone = customer_phone && typeof customer_phone === 'string' ? customer_phone.trim() : ''
  if (!email && !phone) {
    return NextResponse.json(
      { error: 'At least one of customer_email or customer_phone is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (chat_session_id !== undefined && !isValidUUID(chat_session_id)) {
    return NextResponse.json(
      { error: 'chat_session_id must be a valid UUID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (widget_customer_id !== undefined && !isValidUUID(widget_customer_id)) {
    return NextResponse.json(
      { error: 'widget_customer_id must be a valid UUID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  const visitorIdTrimmed =
    typeof visitor_id === 'string' ? visitor_id.trim() : ''
  if (visitorIdTrimmed.length > 128) {
    return NextResponse.json(
      { error: 'visitor_id is too long' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle()

  if (!business) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { data: service } = await supabase
    .from('services')
    .select('id, duration_minutes, max_bookings_per_slot, staff_ids, is_active')
    .eq('id', service_id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!service || !service.is_active) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('id', staff_id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return NextResponse.json(
      { error: 'Staff not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []
  if (!staffIds.includes(staff_id!)) {
    return NextResponse.json(
      { error: 'Staff is not linked to this service' },
      { status: 409, headers: CORS_HEADERS }
    )
  }

  const availability = await isSlotAvailable(supabase, {
    businessId,
    staffId: staff_id!,
    dateStr: appointment_date!,
    slotStart: slot_start!,
    slotEnd: slot_end!,
    maxBookingsPerSlot: (service.max_bookings_per_slot as number) ?? 1,
  })

  if (!availability.ok) {
    const messages: Record<string, string> = {
      holiday: 'Business is closed on this date',
      outside_hours: 'Slot is outside staff availability',
      full: 'Slot is fully booked',
    }
    return NextResponse.json(
      { error: messages[availability.reason] },
      { status: 409, headers: CORS_HEADERS }
    )
  }

  const insertData: Record<string, unknown> = {
    business_id: businessId,
    service_id,
    staff_id,
    appointment_date,
    slot_start: normalizeTime(slot_start!),
    slot_end: normalizeTime(slot_end!),
    payment_method: 'cash_on_arrival',
    customer_name: customer_name.trim(),
    status: 'confirmed',
  }
  if (email) insertData.customer_email = email
  if (phone) insertData.customer_phone = phone
  if (chat_session_id) insertData.chat_session_id = chat_session_id
  if (visitorIdTrimmed) insertData.visitor_id = visitorIdTrimmed
  if (widget_customer_id) insertData.widget_customer_id = widget_customer_id

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(insertData)
    .select('*')
    .single()

  if (error || !appointment) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create appointment' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(appointment, { status: 201, headers: CORS_HEADERS })
}
