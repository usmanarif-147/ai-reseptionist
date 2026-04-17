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
  const serviceId = request.nextUrl.searchParams.get('serviceId')

  if (!isValidUUID(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!serviceId || !isValidUUID(serviceId)) {
    return NextResponse.json(
      { error: 'serviceId query parameter is required and must be a valid UUID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, staff_ids, is_active')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (serviceError || !service) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []

  if (staffIds.length === 0) {
    return NextResponse.json([], { headers: CORS_HEADERS })
  }

  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, role, photo_url, bio')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .in('id', staffIds)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load staff' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(staff ?? [], { headers: CORS_HEADERS })
}
