import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

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
  const { hours } = body

  if (!Array.isArray(hours) || hours.length !== 7) {
    return NextResponse.json(
      { error: 'Must provide exactly 7 day entries (0=Sunday through 6=Saturday)' },
      { status: 400 }
    )
  }

  // Validate each entry
  for (const entry of hours) {
    if (entry.day_of_week == null || entry.day_of_week < 0 || entry.day_of_week > 6) {
      return NextResponse.json(
        { error: 'Each entry must have a valid day_of_week (0-6)' },
        { status: 400 }
      )
    }
  }

  // Upsert all 7 days
  const upsertData = hours.map((entry: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }) => ({
    business_id: business.id,
    day_of_week: entry.day_of_week,
    open_time: entry.is_closed ? null : entry.open_time,
    close_time: entry.is_closed ? null : entry.close_time,
    is_closed: entry.is_closed,
    updated_at: new Date().toISOString(),
  }))

  const { data: updated, error } = await supabase
    .from('business_hours')
    .upsert(upsertData, { onConflict: 'business_id,day_of_week' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
