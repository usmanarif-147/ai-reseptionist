import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PREVIEW_SENTINEL = '00000000-0000-0000-0000-000000000000'
const MAX_VISITOR_ID_LENGTH = 128

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function recordOpen(businessId: string, visitorId: string) {
  if (businessId === PREVIEW_SENTINEL) return

  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .single()

  if (!business) return

  await supabase.from('widget_opens').insert({
    business_id: businessId,
    visitor_id: visitorId,
  })
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

  if (!visitorId || visitorId.length === 0 || visitorId.length > MAX_VISITOR_ID_LENGTH) {
    return NextResponse.json(
      { error: 'visitor_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  await recordOpen(businessId, visitorId)

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
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

  let body: { visitor_id?: string; intent?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const visitorId = body.visitor_id?.trim()

  if (!visitorId || visitorId.length === 0 || visitorId.length > MAX_VISITOR_ID_LENGTH) {
    return NextResponse.json(
      { error: 'visitor_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  await recordOpen(businessId, visitorId)

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
}
