import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { validateDaySlots } from '@/lib/schedule-validation'

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staffId')

  if (!staffId) {
    return NextResponse.json({ error: 'staffId query parameter is required' }, { status: 400 })
  }

  const { data: hours, error } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('business_id', business.id)
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true })
    .order('open_time', { ascending: true, nullsFirst: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(hours ?? [])
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staffId')

  if (!staffId) {
    return NextResponse.json({ error: 'staffId query parameter is required' }, { status: 400 })
  }

  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('business_id', business.id)
    .maybeSingle()

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 })
  }
  if (!staffRow) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const body = await request.json()
  // Accept both { hours: [...] } (existing clients) and { slots: [...] } (per spec).
  const rawSlots = Array.isArray(body?.hours) ? body.hours : body?.slots
  const result = validateDaySlots(rawSlots, { requireAllDays: false })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const now = new Date().toISOString()
  const insertData = result.slots.map((slot) => ({
    business_id: business.id,
    staff_id: staffId,
    day_of_week: slot.day_of_week,
    open_time: slot.is_closed ? null : slot.open_time,
    close_time: slot.is_closed ? null : slot.close_time,
    is_closed: slot.is_closed,
    updated_at: now,
  }))

  const { error: delError } = await supabase
    .from('staff_hours')
    .delete()
    .eq('business_id', business.id)
    .eq('staff_id', staffId)

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  if (insertData.length === 0) {
    return NextResponse.json([])
  }

  const { data: updated, error } = await supabase
    .from('staff_hours')
    .insert(insertData)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
