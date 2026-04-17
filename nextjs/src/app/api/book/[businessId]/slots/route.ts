import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isValidUUID } from '@/lib/booking/validation'
import { generateAvailableSlots } from '@/lib/booking/slot-generator'

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
  const staffId = request.nextUrl.searchParams.get('staffId')
  const serviceId = request.nextUrl.searchParams.get('serviceId')

  if (!isValidUUID(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!staffId || !isValidUUID(staffId)) {
    return NextResponse.json(
      { error: 'staffId query parameter is required and must be a valid UUID' },
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
    .select('id, duration_minutes, max_bookings_per_slot, staff_ids, is_active')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (serviceError || !service || !service.is_active) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('id', staffId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (staffError || !staff || !staff.is_active) {
    return NextResponse.json(
      { error: 'Staff not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []
  if (!staffIds.includes(staffId)) {
    return NextResponse.json(
      { error: 'Staff is not linked to this service' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const daySlots = await generateAvailableSlots(supabase, {
    businessId,
    staffId,
    durationMinutes: service.duration_minutes as number,
    maxBookingsPerSlot: (service.max_bookings_per_slot as number) ?? 1,
  })

  return NextResponse.json(daySlots, { headers: CORS_HEADERS })
}
