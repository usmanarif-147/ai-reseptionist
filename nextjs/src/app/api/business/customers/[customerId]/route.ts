import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

function deriveCustomerType(totalSessions: number, totalAppointments: number): string {
  if (totalAppointments >= 3) return 'regular_customer'
  if (totalAppointments >= 1) return 'booked_customer'
  if (totalSessions >= 3 && totalAppointments === 0) return 'interested_prospect'
  if (totalSessions > 1 && totalAppointments === 0) return 'returning_visitor'
  return 'new_visitor'
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { customerId } = await params

  if (!UUID_REGEX.test(customerId)) {
    return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
  }

  const { data: customer, error } = await supabase
    .from('widget_customers')
    .select('id, email, name, phone, visitor_id, first_seen_at, last_seen_at, total_sessions')
    .eq('id', customerId)
    .eq('business_id', business.id)
    .single()

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Count appointments by matching customer name
  let totalAppointments = 0
  if (customer.name) {
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .ilike('customer_name', customer.name.trim())

    totalAppointments = count ?? 0
  }

  // Fetch recent chat sessions (last 10)
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, created_at, intent')
    .eq('customer_id', customerId)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const type = deriveCustomerType(customer.total_sessions, totalAppointments)

  return NextResponse.json({
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    visitor_id: customer.visitor_id,
    type,
    first_seen_at: customer.first_seen_at,
    last_seen_at: customer.last_seen_at,
    total_sessions: customer.total_sessions,
    total_appointments: totalAppointments,
    recent_sessions: sessions ?? [],
  })
}
