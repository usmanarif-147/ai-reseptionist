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

  const visitorId = request.nextUrl.searchParams.get('visitor_id')?.trim()
  if (!visitorId || visitorId.length === 0 || visitorId.length > 128) {
    return NextResponse.json(
      { error: 'visitor_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  // Guard: session must belong to this business AND this visitor, and be ended.
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, business_id, visitor_id, status, ended_at, created_at')
    .eq('id', sessionId)
    .eq('business_id', businessId)
    .single()

  if (!session || session.visitor_id !== visitorId || session.status !== 'ended') {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(
    {
      session_id: session.id,
      status: session.status,
      ended_at: session.ended_at,
      created_at: session.created_at,
      messages: messages ?? [],
    },
    { headers: CORS_HEADERS }
  )
}
