import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

interface HoursEntry {
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

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
  const { hours } = body

  if (!Array.isArray(hours)) {
    return NextResponse.json({ error: 'hours must be an array' }, { status: 400 })
  }

  for (const entry of hours as HoursEntry[]) {
    if (entry.day_of_week == null || entry.day_of_week < 0 || entry.day_of_week > 6) {
      return NextResponse.json(
        { error: 'Each entry must have a valid day_of_week (0-6)' },
        { status: 400 }
      )
    }
  }

  const insertData = (hours as HoursEntry[]).map((entry) => ({
    business_id: business.id,
    day_of_week: entry.day_of_week,
    open_time: entry.is_closed ? null : entry.open_time,
    close_time: entry.is_closed ? null : entry.close_time,
    is_closed: entry.is_closed,
    updated_at: new Date().toISOString(),
  }))

  // Replace-all semantics: with unique(business_id, day_of_week) dropped to
  // allow multi-slot days, upsert on that key is no longer valid. Delete the
  // full set for this business, then re-insert what the client sent.
  const { error: delError } = await supabase
    .from('business_hours')
    .delete()
    .eq('business_id', business.id)

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  if (insertData.length === 0) {
    return NextResponse.json([])
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
