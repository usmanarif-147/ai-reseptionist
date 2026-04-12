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

  const supabase = createAdminClient()

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .select('color, welcome_message')
    .eq('business_id', businessId)
    .single()

  if (error || !settings) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(settings, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=60',
    },
  })
}
