import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { normalizeTime } from '@/lib/booking/validation'

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

interface AppointmentRow {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  slot_start: string
  slot_end: string
  payment_method: string
  status: string
  appointment_date: string
  services: { id: string; name: string } | null
  staff: { id: string; name: string } | null
}

interface CalendarAppointment {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  service: { id: string; name: string } | null
  staff: { id: string; name: string } | null
  slot_start: string
  slot_end: string
  payment_method: string
  status: string
  appointment_date: string
}

function lastDayOfMonth(year: number, month: number): number {
  // month is 1-12; use JS Date trick: day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate()
}

function toDateOnly(value: string): string {
  // appointment_date is stored as timestamptz; normalize to YYYY-MM-DD using the ISO prefix.
  return value.length >= 10 ? value.slice(0, 10) : value
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const month = request.nextUrl.searchParams.get('month')
  if (!month || !MONTH_REGEX.test(month)) {
    return NextResponse.json(
      { error: 'month query parameter is required and must be YYYY-MM' },
      { status: 400 }
    )
  }

  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthNum = Number(monthStr)
  const lastDay = lastDayOfMonth(year, monthNum)

  const startDate = `${month}-01`
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, customer_name, customer_email, customer_phone, slot_start, slot_end, payment_method, status, appointment_date, services(id, name), staff(id, name)'
    )
    .eq('business_id', business.id)
    .gte('appointment_date', startDate)
    .lte('appointment_date', `${endDate}T23:59:59.999Z`)
    .order('appointment_date', { ascending: true })
    .order('slot_start', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as AppointmentRow[]
  const days: Record<string, { count: number; appointments: CalendarAppointment[] }> = {}

  for (const row of rows) {
    const dateKey = toDateOnly(row.appointment_date)
    if (!days[dateKey]) {
      days[dateKey] = { count: 0, appointments: [] }
    }
    days[dateKey].appointments.push({
      id: row.id,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      customer_phone: row.customer_phone,
      service: row.services ? { id: row.services.id, name: row.services.name } : null,
      staff: row.staff ? { id: row.staff.id, name: row.staff.name } : null,
      slot_start: normalizeTime(row.slot_start),
      slot_end: normalizeTime(row.slot_end),
      payment_method: row.payment_method,
      status: row.status,
      appointment_date: dateKey,
    })
    days[dateKey].count += 1
  }

  return NextResponse.json({ month, days })
}
