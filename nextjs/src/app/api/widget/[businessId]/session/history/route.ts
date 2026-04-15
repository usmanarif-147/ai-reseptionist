import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: 'Valid session_id query parameter is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  // Verify session belongs to this business and is active
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, status')
    .eq('id', sessionId)
    .eq('business_id', businessId)
    .single()

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  if (session.status !== 'active') {
    return NextResponse.json(
      { error: 'Session is no longer active' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(messages ?? [], { headers: CORS_HEADERS })
}
