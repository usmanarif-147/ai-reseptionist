import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { isValidDateString, isValidUUID } from '@/lib/booking/validation'
import { generateAvailableSlots } from '@/lib/booking/slot-generator'

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = request.nextUrl
  const staffId = searchParams.get('staffId')
  const serviceId = searchParams.get('serviceId')
  const startDateParam = searchParams.get('startDate')

  if (!staffId || !isValidUUID(staffId)) {
    return NextResponse.json(
      { error: 'staffId query parameter is required and must be a valid UUID' },
      { status: 400 }
    )
  }
  if (!serviceId || !isValidUUID(serviceId)) {
    return NextResponse.json(
      { error: 'serviceId query parameter is required and must be a valid UUID' },
      { status: 400 }
    )
  }

  let startDate: Date | undefined
  if (startDateParam) {
    if (!isValidDateString(startDateParam)) {
      return NextResponse.json(
        { error: 'startDate must be YYYY-MM-DD' },
        { status: 400 }
      )
    }
    // Build a Date at local midnight so generateAvailableSlots iterates the right calendar days.
    const [y, m, d] = startDateParam.split('-').map(Number)
    startDate = new Date(y, m - 1, d)
  }

  const { data: service } = await supabase
    .from('services')
    .select('id, duration_minutes, max_bookings_per_slot, staff_ids, is_active')
    .eq('id', serviceId)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!service || !service.is_active) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, is_active')
    .eq('id', staffId)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  const staffIds: string[] = Array.isArray(service.staff_ids) ? service.staff_ids : []
  if (!staffIds.includes(staffId)) {
    return NextResponse.json(
      { error: 'Staff is not linked to this service' },
      { status: 409 }
    )
  }

  const daySlots = await generateAvailableSlots(supabase, {
    businessId: business.id,
    staffId,
    durationMinutes: service.duration_minutes as number,
    maxBookingsPerSlot: (service.max_bookings_per_slot as number) ?? 1,
    startDate,
  })

  return NextResponse.json(daySlots)
}
