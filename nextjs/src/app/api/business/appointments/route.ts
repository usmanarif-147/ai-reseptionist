import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import type { AppointmentStatus, PaymentMethod } from '@/lib/types/appointments'

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash_on_arrival', 'paid_cash', 'paid_online']
const VALID_STATUSES: AppointmentStatus[] = ['confirmed', 'cancelled', 'completed']

const ALLOWED_METHODS: Record<string, PaymentMethod[]> = {
  cash: ['cash_on_arrival', 'paid_cash'],
  online: ['paid_online'],
  both: ['cash_on_arrival', 'paid_cash', 'paid_online'],
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && TIME_RE.test(v)
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

  const body = await request.json()
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
  } = body

  if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
    return NextResponse.json({ error: 'customer_name is required' }, { status: 400 })
  }

  if (!appointment_date) {
    return NextResponse.json({ error: 'appointment_date is required' }, { status: 400 })
  }

  if (!payment_method || !VALID_PAYMENT_METHODS.includes(payment_method)) {
    return NextResponse.json(
      { error: 'payment_method must be one of: cash_on_arrival, paid_cash, paid_online' },
      { status: 400 }
    )
  }

  if (slot_start != null && !isValidTime(slot_start)) {
    return NextResponse.json({ error: 'slot_start must be HH:MM or HH:MM:SS' }, { status: 400 })
  }
  if (slot_end != null && !isValidTime(slot_end)) {
    return NextResponse.json({ error: 'slot_end must be HH:MM or HH:MM:SS' }, { status: 400 })
  }
  if (slot_start && slot_end && slot_start >= slot_end) {
    return NextResponse.json({ error: 'slot_end must be after slot_start' }, { status: 400 })
  }

  if (status != null && !VALID_STATUSES.includes(status)) {
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
  if (!allowed || !allowed.includes(payment_method)) {
    return NextResponse.json(
      { error: `Payment method "${payment_method}" is not compatible with business payment type "${paymentSettings.payment_type}"` },
      { status: 400 }
    )
  }

  const insertData: Record<string, unknown> = {
    business_id: business.id,
    customer_name: customer_name.trim(),
    appointment_date,
    payment_method,
  }

  if (service_id) insertData.service_id = service_id
  if (staff_id) insertData.staff_id = staff_id
  if (customer_email && typeof customer_email === 'string' && customer_email.trim()) {
    insertData.customer_email = customer_email.trim()
  }
  if (customer_phone && typeof customer_phone === 'string' && customer_phone.trim()) {
    insertData.customer_phone = customer_phone.trim()
  }
  if (slot_start) insertData.slot_start = slot_start
  if (slot_end) insertData.slot_end = slot_end
  if (status) insertData.status = status
  if (notes && typeof notes === 'string' && notes.trim()) {
    insertData.notes = notes.trim()
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(insertData)
    .select('*, services(name)')
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

  const body = await request.json()
  const { id, status, notes, staff_id, slot_start, slot_end } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Appointment id is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (status != null) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
    updates.status = status
  }

  if (notes !== undefined) updates.notes = notes
  if (staff_id !== undefined) updates.staff_id = staff_id

  if (slot_start !== undefined) {
    if (slot_start !== null && !isValidTime(slot_start)) {
      return NextResponse.json({ error: 'slot_start must be HH:MM or HH:MM:SS' }, { status: 400 })
    }
    updates.slot_start = slot_start
  }
  if (slot_end !== undefined) {
    if (slot_end !== null && !isValidTime(slot_end)) {
      return NextResponse.json({ error: 'slot_end must be HH:MM or HH:MM:SS' }, { status: 400 })
    }
    updates.slot_end = slot_end
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('business_id', business.id)
    .select('*, services(name)')
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
    .select('*, services(name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, appointment })
}
