import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

function deriveCustomerType(totalSessions: number, totalAppointments: number): string {
  if (totalAppointments >= 3) return 'regular_customer'
  if (totalAppointments >= 1) return 'booked_customer'
  if (totalSessions >= 3 && totalAppointments === 0) return 'interested_prospect'
  if (totalSessions > 1 && totalAppointments === 0) return 'returning_visitor'
  return 'new_visitor'
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const typeFilter = request.nextUrl.searchParams.get('type')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const offsetParam = request.nextUrl.searchParams.get('offset')

  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 500)
  const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0)

  const { data: customers, error } = await supabase
    .from('widget_customers')
    .select('id, email, name, phone, visitor_id, first_seen_at, last_seen_at, total_sessions')
    .eq('business_id', business.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count appointments per customer email from the appointments table.
  // The appointments table uses customer_name, not email, so we match by name
  // when the customer has a name set.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('customer_name')
    .eq('business_id', business.id)

  const appointmentCountByName = new Map<string, number>()
  for (const appt of appointments ?? []) {
    const name = appt.customer_name?.toLowerCase()?.trim()
    if (name) {
      appointmentCountByName.set(name, (appointmentCountByName.get(name) || 0) + 1)
    }
  }

  const allResults = (customers ?? []).map((c) => {
    const customerName = c.name?.toLowerCase()?.trim()
    const totalAppointments = customerName ? (appointmentCountByName.get(customerName) || 0) : 0
    const type = deriveCustomerType(c.total_sessions, totalAppointments)
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      type,
      first_seen_at: c.first_seen_at,
      last_seen_at: c.last_seen_at,
      total_sessions: c.total_sessions,
      total_appointments: totalAppointments,
    }
  })

  const filtered = typeFilter
    ? allResults.filter((c) => c.type === typeFilter)
    : allResults

  const total = filtered.length
  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({ total, customers: paginated })
}
