import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

interface SlotInput {
  day_of_week: number
  is_closed: boolean
  open_time?: string | null
  close_time?: string | null
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

function toMinutes(time: string): number {
  const [h, m] = time.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function validateSlots(slots: unknown): { error: string } | { slots: SlotInput[] } {
  if (!Array.isArray(slots)) {
    return { error: 'slots must be an array' }
  }

  const byDay = new Map<number, SlotInput[]>()

  for (const raw of slots) {
    if (!raw || typeof raw !== 'object') {
      return { error: 'Each slot must be an object' }
    }
    const slot = raw as SlotInput

    if (!Number.isInteger(slot.day_of_week) || slot.day_of_week < 0 || slot.day_of_week > 6) {
      return { error: 'day_of_week must be an integer between 0 and 6' }
    }
    if (typeof slot.is_closed !== 'boolean') {
      return { error: 'is_closed must be a boolean' }
    }

    if (!slot.is_closed) {
      if (!slot.open_time || !slot.close_time) {
        return { error: 'Non-closed slots require open_time and close_time' }
      }
      if (!TIME_RE.test(slot.open_time) || !TIME_RE.test(slot.close_time)) {
        return { error: 'open_time and close_time must be in HH:MM or HH:MM:SS format' }
      }
      if (toMinutes(slot.open_time) >= toMinutes(slot.close_time)) {
        return { error: 'open_time must be before close_time' }
      }
    }

    const existing = byDay.get(slot.day_of_week) ?? []
    existing.push(slot)
    byDay.set(slot.day_of_week, existing)
  }

  for (let day = 0; day < 7; day++) {
    if (!byDay.has(day)) {
      return { error: `Day ${day} is missing — all 7 days (0-6) must be represented` }
    }
  }

  for (let day = 0; day < 7; day++) {
    const daySlots = byDay.get(day) ?? []
    const open = daySlots.filter((s: SlotInput) => !s.is_closed)
    if (open.length === 0) continue

    const ranges = open
      .map((s: SlotInput) => ({
        start: toMinutes(s.open_time!),
        end: toMinutes(s.close_time!),
      }))
      .sort((a: { start: number }, b: { start: number }) => a.start - b.start)

    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start < ranges[i - 1].end) {
        return { error: `Overlapping time slots on day ${day}` }
      }
    }
  }

  return { slots: slots as SlotInput[] }
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
  const result = validateSlots(body?.slots)
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
