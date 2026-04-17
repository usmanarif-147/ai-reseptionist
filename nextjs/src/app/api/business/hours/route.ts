import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { validateDaySlots } from '@/lib/schedule-validation'

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: hours, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week', { ascending: true })
    .order('open_time', { ascending: true, nullsFirst: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(hours)
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const result = validateDaySlots(body?.slots, { requireAllDays: true })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const now = new Date().toISOString()
  const insertData = result.slots.map((slot) => ({
    business_id: business.id,
    day_of_week: slot.day_of_week,
    open_time: slot.is_closed ? null : slot.open_time,
    close_time: slot.is_closed ? null : slot.close_time,
    is_closed: slot.is_closed,
    updated_at: now,
  }))

  const { error: delError } = await supabase
    .from('business_hours')
    .delete()
    .eq('business_id', business.id)

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  const { data: updated, error } = await supabase
    .from('business_hours')
    .insert(insertData)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
