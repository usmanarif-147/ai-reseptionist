import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; sessionId: string }> }
) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { businessId, sessionId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid session ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select(
      'appointment_date, slot_start, slot_end, payment_method, service:services(name), staff:staff(name)'
    )
    .eq('business_id', businessId)
    .eq('chat_session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json({ booked: false }, { headers: CORS_HEADERS })
  }

  const service = appointment.service as { name: string | null } | null
  const staff = appointment.staff as { name: string | null } | null

  return NextResponse.json(
    {
      booked: true,
      appointment: {
        service_name: service?.name ?? null,
        staff_name: staff?.name ?? null,
        appointment_date: appointment.appointment_date,
        slot_start: appointment.slot_start,
        slot_end: appointment.slot_end,
        payment_method: appointment.payment_method,
      },
    },
    { headers: CORS_HEADERS }
  )
}
