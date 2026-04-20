import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const PREVIEW_MAX_LENGTH = 100

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
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

  const visitorId = request.nextUrl.searchParams.get('visitor_id')?.trim()
  if (!visitorId || visitorId.length === 0 || visitorId.length > 128) {
    return NextResponse.json(
      { error: 'visitor_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('id, status, ended_at, created_at')
    .eq('business_id', businessId)
    .eq('visitor_id', visitorId)
    .eq('status', 'ended')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  const sessionRows = sessions ?? []

  if (sessionRows.length === 0) {
    return NextResponse.json({ sessions: [] }, { headers: CORS_HEADERS })
  }

  const sessionIds = sessionRows.map((s) => s.id)

  // Pull the latest message per session for the preview. We fetch ordered by
  // created_at DESC and dedupe on the client side — small N per visitor, fine.
  const { data: latestMessages } = await supabase
    .from('chat_messages')
    .select('session_id, content, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })

  const previewBySession = new Map<string, { content: string; created_at: string }>()
  for (const m of latestMessages ?? []) {
    if (!previewBySession.has(m.session_id as string)) {
      previewBySession.set(m.session_id as string, {
        content: m.content as string,
        created_at: m.created_at as string,
      })
    }
  }

  const result = sessionRows.map((s) => {
    const preview = previewBySession.get(s.id)
    const previewText = preview?.content ?? ''
    return {
      session_id: s.id,
      last_message_preview:
        previewText.length > PREVIEW_MAX_LENGTH
          ? previewText.slice(0, PREVIEW_MAX_LENGTH) + '…'
          : previewText,
      last_message_at: preview?.created_at ?? null,
      ended_at: s.ended_at,
      status: s.status,
    }
  })

  return NextResponse.json({ sessions: result }, { headers: CORS_HEADERS })
}
