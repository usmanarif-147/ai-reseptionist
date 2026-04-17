import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import type { AppointmentStatus, PaymentMethod } from '@/lib/types/appointments'
import {
  isValidDateString,
  isDateInPast,
  normalizeTime,
} from '@/lib/booking/validation'
import { isSlotAvailable } from '@/lib/booking/slot-generator'

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash_on_arrival', 'paid_cash', 'paid_online']
const VALID_STATUSES: AppointmentStatus[] = ['confirmed', 'cancelled', 'completed']

const ALLOWED_METHODS: Record<string, PaymentMethod[]> = {
  cash: ['cash_on_arrival', 'paid_cash'],
  online: ['paid_online'],
  both: ['cash_on_arrival', 'paid_cash', 'paid_online'],
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

const AVAILABILITY_MESSAGES: Record<'holiday' | 'outside_hours' | 'full', string> = {
  holiday: 'Business is closed on this date',
  outside_hours: 'Slot is outside staff availability',
  full: 'Slot is fully booked',
}

function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && TIME_RE.test(v)
}

function isSelfSameSlot(
  existing: Record<string, unknown>,
  nextStaff: string,
  nextDate: string,
  nextStart: string,
  nextEnd: string
): boolean {
  if ((existing.status as string) !== 'confirmed') return false
  if ((existing.staff_id as string | null) !== nextStaff) return false
  const existingDate = (existing.appointment_date as string).slice(0, 10)
  if (existingDate !== nextDate) return false
  return (
    normalizeTime(existing.slot_start as string) === normalizeTime(nextStart) &&
    normalizeTime(existing.slot_end as string) === normalizeTime(nextEnd)
  )
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')
  const paymentStatus = searchParams.get('status')
  const appointmentStatus = searchParams.get('appointmentStatus')
  const serviceId = searchParams.get('serviceId')
  const staffId = searchParams.get('staffId')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')

  if (fromDate && isNaN(Date.parse(fromDate))) {
    return NextResponse.json({ error: 'fromDate must be a valid ISO date string' }, { status: 400 })
  }
  if (toDate && isNaN(Date.parse(toDate))) {
    return NextResponse.json({ error: 'toDate must be a valid ISO date string' }, { status: 400 })
  }
  if (appointmentStatus && !VALID_STATUSES.includes(appointmentStatus as AppointmentStatus)) {
    return NextResponse.json(
      { error: `appointmentStatus must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')

  let query = supabase
    .from('appointments')
    .select('*, services(name)', { count: 'exact' })
    .eq('business_id', business.id)

  if (search) {
    query = query.ilike('customer_name', `%${search}%`)
  }
  if (paymentStatus) {
    query = query.eq('payment_method', paymentStatus)
  }
  if (appointmentStatus) {
    query = query.eq('status', appointmentStatus)
  }
  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }
  if (staffId) {
    query = query.eq('staff_id', staffId)
  }
  if (fromDate) {
    query = query.gte('appointment_date', fromDate)
  }
  if (toDate) {
    query = query.lte('appointment_date', toDate)
  }

  query = query.order('appointment_date', { ascending: false })

  if (pageParam) {
    const page = Math.max(parseInt(pageParam, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(pageSizeParam || '10', 10) || 10, 1), 100)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)
  }

  const { data: appointments, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (pageParam) {
    return NextResponse.json({ data: appointments, total: count ?? 0 })
  }

  return NextResponse.json(appointments)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    customer_name,
    customer_email,
    customer_phone,
    service_id,
    staff_id,
    appointment_date,
    slot_start,
    slot_end,
    payment_method,
    status,
    notes,
  } = body as Record<string, string | undefined>

  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return NextResponse.json({ error: 'customer_name is required' }, { status: 400 })
  }
  if (!service_id || typeof service_id !== 'string') {
    return NextResponse.json({ error: 'service_id is required' }, { status: 400 })
  }
  if (!staff_id || typeof staff_id !== 'string') {
    return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
  }
  if (!appointment_date || !isValidDateString(appointment_date)) {
    return NextResponse.json(
      { error: 'appointment_date is required and must be YYYY-MM-DD' },
      { status: 400 }
    )
  }
  if (isDateInPast(appointment_date)) {
    return NextResponse.json({ error: 'appointment_date cannot be in the past' }, { status: 400 })
  }
  if (!isValidTime(slot_start)) {
    return NextResponse.json({ error: 'slot_start must be HH:MM or HH:MM:SS' }, { status: 400 })
  }
  if (!isValidTime(slot_end)) {
    return NextResponse.json({ error: 'slot_end must be HH:MM or HH:MM:SS' }, { status: 400 })
  }
  if (normalizeTime(slot_start) >= normalizeTime(slot_end)) {
    return NextResponse.json({ error: 'slot_end must be after slot_start' }, { status: 400 })
  }
  if (!payment_method || !VALID_PAYMENT_METHODS.includes(payment_method as PaymentMethod)) {
    return NextResponse.json(
      { error: 'payment_method must be one of: cash_on_arrival, paid_cash, paid_online' },
      { status: 400 }
    )
  }
  if (status != null && !VALID_STATUSES.includes(status as AppointmentStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const { data: paymentSettings, error: psError } = await supabase
    .from('payment_settings')
    .select('payment_type')
    .eq('business_id', business.id)
    .single()

  if (psError || !paymentSettings) {
    return NextResponse.json(
      { error: 'Could not retrieve payment settings' },
      { status: 500 }
    )
  }

  const allowed = ALLOWED_METHODS[paymentSettings.payment_type]
  if (!allowed || !allowed.includes(payment_method as PaymentMethod)) {
    return NextResponse.json(
      {
        error: `Payment method "${payment_method}" is not compatible with business payment type "${paymentSettings.payment_type}"`,
      },
      { status: 400 }
    )
  }

  const { data: service } = await supabase
    .from('services')
    .select('id, duration_minutes, max_bookings_per_slot, staff_ids, is_active')
    .eq('id', service_id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!service || !service.is_active) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('id', staff_id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []
  if (!staffIds.includes(staff_id)) {
    return NextResponse.json(
      { error: 'Staff is not linked to this service' },
      { status: 409 }
    )
  }

  const availability = await isSlotAvailable(supabase, {
    businessId: business.id,
    staffId: staff_id,
    dateStr: appointment_date,
    slotStart: slot_start,
    slotEnd: slot_end,
    maxBookingsPerSlot: (service.max_bookings_per_slot as number) ?? 1,
  })

  if (!availability.ok) {
    return NextResponse.json(
      { error: AVAILABILITY_MESSAGES[availability.reason] },
      { status: 409 }
    )
  }

  const insertData: Record<string, unknown> = {
    business_id: business.id,
    service_id,
    staff_id,
    customer_name: customer_name.trim(),
    appointment_date,
    slot_start: normalizeTime(slot_start),
    slot_end: normalizeTime(slot_end),
    payment_method,
    status: status ?? 'confirmed',
  }
  if (customer_email && typeof customer_email === 'string' && customer_email.trim()) {
    insertData.customer_email = customer_email.trim()
  }
  if (customer_phone && typeof customer_phone === 'string' && customer_phone.trim()) {
    insertData.customer_phone = customer_phone.trim()
  }
  if (notes && typeof notes === 'string' && notes.trim()) {
    insertData.notes = notes.trim()
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(insertData)
    .select('*, services(id, name), staff(id, name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(appointment, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    id,
    status,
    notes,
    staff_id,
    service_id,
    appointment_date,
    slot_start,
    slot_end,
    customer_name,
    customer_email,
    customer_phone,
  } = body as Record<string, string | undefined>

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Appointment id is required' }, { status: 400 })
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (status != null) {
    if (!VALID_STATUSES.includes(status as AppointmentStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
    updates.status = status
  }

  if (notes !== undefined) updates.notes = notes
  if (customer_name !== undefined && typeof customer_name === 'string' && customer_name.trim()) {
    updates.customer_name = customer_name.trim()
  }
  if (customer_email !== undefined) updates.customer_email = customer_email
  if (customer_phone !== undefined) updates.customer_phone = customer_phone

  const isRescheduling =
    appointment_date !== undefined ||
    slot_start !== undefined ||
    slot_end !== undefined ||
    staff_id !== undefined ||
    service_id !== undefined

  if (isRescheduling) {
    const nextDate = appointment_date ?? (existing.appointment_date as string).slice(0, 10)
    const nextStart = slot_start ?? (existing.slot_start as string)
    const nextEnd = slot_end ?? (existing.slot_end as string)
    const nextStaff = staff_id ?? (existing.staff_id as string | null)
    const nextService = service_id ?? (existing.service_id as string | null)

    if (!isValidDateString(nextDate)) {
      return NextResponse.json({ error: 'appointment_date must be YYYY-MM-DD' }, { status: 400 })
    }
    if (isDateInPast(nextDate)) {
      return NextResponse.json(
        { error: 'appointment_date cannot be in the past' },
        { status: 400 }
      )
    }
    if (!isValidTime(nextStart)) {
      return NextResponse.json(
        { error: 'slot_start must be HH:MM or HH:MM:SS' },
        { status: 400 }
      )
    }
    if (!isValidTime(nextEnd)) {
      return NextResponse.json(
        { error: 'slot_end must be HH:MM or HH:MM:SS' },
        { status: 400 }
      )
    }
    if (normalizeTime(nextStart) >= normalizeTime(nextEnd)) {
      return NextResponse.json(
        { error: 'slot_end must be after slot_start' },
        { status: 400 }
      )
    }
    if (!nextStaff) {
      return NextResponse.json(
        { error: 'staff_id is required when rescheduling' },
        { status: 400 }
      )
    }
    if (!nextService) {
      return NextResponse.json(
        { error: 'service_id is required when rescheduling' },
        { status: 400 }
      )
    }

    const { data: service } = await supabase
      .from('services')
      .select('id, max_bookings_per_slot, staff_ids, is_active')
      .eq('id', nextService)
      .eq('business_id', business.id)
      .maybeSingle()

    if (!service || !service.is_active) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id, is_active')
      .eq('id', nextStaff)
      .eq('business_id', business.id)
      .maybeSingle()

    if (!staff || !staff.is_active) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []
    if (!staffIds.includes(nextStaff)) {
      return NextResponse.json(
        { error: 'Staff is not linked to this service' },
        { status: 409 }
      )
    }

    // isSlotAvailable treats the currently-booked slot as occupying capacity, so when
    // the reschedule targets the same staff/date/slot we already hold, bump the cap by 1
    // to avoid a false "full" conflict against ourselves.
    const selfOccupies = isSelfSameSlot(
      existing as Record<string, unknown>,
      nextStaff,
      nextDate,
      nextStart,
      nextEnd
    )

    const availability = await isSlotAvailable(supabase, {
      businessId: business.id,
      staffId: nextStaff,
      dateStr: nextDate,
      slotStart: nextStart,
      slotEnd: nextEnd,
      maxBookingsPerSlot:
        ((service.max_bookings_per_slot as number) ?? 1) + (selfOccupies ? 1 : 0),
    })

    if (!availability.ok) {
      return NextResponse.json(
        { error: AVAILABILITY_MESSAGES[availability.reason] },
        { status: 409 }
      )
    }

    if (appointment_date !== undefined) updates.appointment_date = nextDate
    if (slot_start !== undefined) updates.slot_start = normalizeTime(nextStart)
    if (slot_end !== undefined) updates.slot_end = normalizeTime(nextEnd)
    if (staff_id !== undefined) updates.staff_id = nextStaff
    if (service_id !== undefined) updates.service_id = nextService
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('business_id', business.id)
    .select('*, services(id, name), staff(id, name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(appointment)
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Appointment id is required' }, { status: 400 })
  }

  // Soft-cancel by default (preserves history); caller can pass ?hard=true for permanent delete.
  const hard = searchParams.get('hard') === 'true'

  if (hard) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, deleted: true })
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', business.id)
    .select('*, services(id, name), staff(id, name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, appointment })
}
