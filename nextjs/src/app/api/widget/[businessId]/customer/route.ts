import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let body: {
    email?: string
    name?: string
    phone?: string
    visitor_id?: string
    intent?: string
    session_id?: string
    appointment_number?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { email, name, phone, visitor_id, intent, session_id } = body

  if (!visitor_id || visitor_id.trim().length === 0) {
    return NextResponse.json(
      { error: 'visitor_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json(
      { error: 'A valid email is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (session_id && !UUID_REGEX.test(session_id)) {
    return NextResponse.json(
      { error: 'Invalid session ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  // Verify business exists
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  // Atomic upsert via DB function
  const { data: customerId, error: upsertError } = await supabase.rpc(
    'upsert_widget_customer',
    {
      p_business_id: businessId,
      p_email: email.toLowerCase().trim(),
      p_name: name?.trim() || null,
      p_phone: phone?.trim() || null,
      p_visitor_id: visitor_id.trim(),
    }
  )

  if (upsertError) {
    console.error('Customer upsert error:', upsertError)
    return NextResponse.json(
      { error: 'Failed to save customer' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  // Link session to customer if provided
  if (session_id && customerId) {
    await supabase
      .from('chat_sessions')
      .update({
        customer_id: customerId,
        intent: intent || null,
      })
      .eq('id', session_id)
      .eq('business_id', businessId)
  }

  // Fetch the full customer record to return
  const { data: customer, error: fetchError } = await supabase
    .from('widget_customers')
    .select('id, business_id, email, name, phone, visitor_id, first_seen_at, last_seen_at, total_sessions')
    .eq('id', customerId)
    .single()

  if (fetchError || !customer) {
    return NextResponse.json(
      { customer_id: customerId },
      { headers: CORS_HEADERS }
    )
  }

  return NextResponse.json({ ...customer, customer_id: customer.id }, { headers: CORS_HEADERS })
}
