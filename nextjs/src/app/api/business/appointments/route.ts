import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

const VALID_PAYMENT_METHODS = ['cash_on_arrival', 'paid_cash', 'paid_online'] as const
type PaymentMethod = typeof VALID_PAYMENT_METHODS[number]

const ALLOWED_METHODS: Record<string, PaymentMethod[]> = {
  cash: ['cash_on_arrival', 'paid_cash'],
  online: ['paid_online'],
  both: ['cash_on_arrival', 'paid_cash', 'paid_online'],
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
  const status = searchParams.get('status')
  const serviceId = searchParams.get('serviceId')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')

  if (fromDate && isNaN(Date.parse(fromDate))) {
    return NextResponse.json({ error: 'fromDate must be a valid ISO date string' }, { status: 400 })
  }
  if (toDate && isNaN(Date.parse(toDate))) {
    return NextResponse.json({ error: 'toDate must be a valid ISO date string' }, { status: 400 })
  }

  let query = supabase
    .from('appointments')
    .select('*, services(name)')
    .eq('business_id', business.id)

  if (search) {
    query = query.ilike('customer_name', `%${search}%`)
  }
  if (status) {
    query = query.eq('payment_method', status)
  }
  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }
  if (fromDate) {
    query = query.gte('appointment_date', fromDate)
  }
  if (toDate) {
    query = query.lte('appointment_date', toDate)
  }

  const { data: appointments, error } = await query.order('appointment_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  const { customer_name, service_id, appointment_date, payment_method, notes } = body

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

  // Fetch business payment settings to validate compatibility
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

  if (service_id) {
    insertData.service_id = service_id
  }

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
