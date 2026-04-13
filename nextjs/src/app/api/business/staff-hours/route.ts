import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

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

  const body = await request.json()
  const { hours } = body

  if (!Array.isArray(hours) || hours.length !== 7) {
    return NextResponse.json(
      { error: 'Must provide exactly 7 day entries (0=Sunday through 6=Saturday)' },
      { status: 400 }
    )
  }

  for (const entry of hours) {
    if (entry.day_of_week == null || entry.day_of_week < 0 || entry.day_of_week > 6) {
      return NextResponse.json(
        { error: 'Each entry must have a valid day_of_week (0-6)' },
        { status: 400 }
      )
    }
  }

  const upsertData = hours.map((entry: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }) => ({
    business_id: business.id,
    staff_id: staffId,
    day_of_week: entry.day_of_week,
    open_time: entry.is_closed ? null : entry.open_time,
    close_time: entry.is_closed ? null : entry.close_time,
    is_closed: entry.is_closed,
    updated_at: new Date().toISOString(),
  }))

  const { data: updated, error } = await supabase
    .from('staff_hours')
    .upsert(upsertData, { onConflict: 'staff_id,day_of_week' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
