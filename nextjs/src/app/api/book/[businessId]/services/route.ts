import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isValidUUID } from '@/lib/booking/validation'

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

  if (!isValidUUID(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle()

  if (bizError || !business) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, description, price, duration_minutes, category, staff_ids, max_bookings_per_slot')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load services' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(services ?? [], { headers: CORS_HEADERS })
}
