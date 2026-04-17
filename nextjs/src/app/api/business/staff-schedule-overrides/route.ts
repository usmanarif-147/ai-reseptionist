import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import {
  isValidDate,
  monthRange,
  validateTimeSlots,
} from '@/lib/schedule-validation'

const OVERRIDE_COLUMNS = 'id, override_date, is_unavailable, open_time, close_time, label'

async function verifyStaffOwnership(
  supabase: Awaited<ReturnType<typeof authenticateAndGetBusiness>>['supabase'],
  staffId: string,
  businessId: string,
): Promise<{ error: NextResponse } | { ok: true }> {
  if (!supabase) {
    return { error: NextResponse.json({ error: 'Server error' }, { status: 500 }) }
  }
  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
  }
  if (!data) {
    return { error: NextResponse.json({ error: 'Staff member not found' }, { status: 404 }) }
  }
  return { ok: true }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const staffId = request.nextUrl.searchParams.get('staffId')
  const month = request.nextUrl.searchParams.get('month')

  if (!staffId) {
    return NextResponse.json({ error: 'staffId query parameter is required' }, { status: 400 })
  }

  const ownership = await verifyStaffOwnership(supabase, staffId, business.id)
  if ('error' in ownership) return ownership.error

  let query = supabase
    .from('staff_schedule_overrides')
    .select(OVERRIDE_COLUMNS)
    .eq('business_id', business.id)
    .eq('staff_id', staffId)
    .order('override_date', { ascending: true })
    .order('open_time', { ascending: true, nullsFirst: true })

  if (month) {
    const range = monthRange(month)
    if (!range) {
      return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
    }
    query = query.gte('override_date', range.start).lt('override_date', range.end)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { staffId, override_date, is_unavailable, slots, label } = body as {
    staffId?: string
    override_date?: string
    is_unavailable?: boolean
    slots?: unknown
    label?: string | null
  }

  if (!staffId || typeof staffId !== 'string') {
    return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
  }
  if (!isValidDate(override_date)) {
    return NextResponse.json(
      { error: 'override_date is required in YYYY-MM-DD format' },
      { status: 400 }
    )
  }
  if (typeof is_unavailable !== 'boolean') {
    return NextResponse.json({ error: 'is_unavailable must be a boolean' }, { status: 400 })
  }
  if (label != null && typeof label !== 'string') {
    return NextResponse.json({ error: 'label must be a string or null' }, { status: 400 })
  }

  const ownership = await verifyStaffOwnership(supabase, staffId, business.id)
  if ('error' in ownership) return ownership.error

  const { error: delError } = await supabase
    .from('staff_schedule_overrides')
    .delete()
    .eq('business_id', business.id)
    .eq('staff_id', staffId)
    .eq('override_date', override_date)

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  const cleanLabel = label ? label.trim() || null : null

  let rowsToInsert: Array<Record<string, unknown>>

  if (is_unavailable) {
    rowsToInsert = [
      {
        business_id: business.id,
        staff_id: staffId,
        override_date,
        is_unavailable: true,
        open_time: null,
        close_time: null,
        label: cleanLabel,
        updated_at: now,
      },
    ]
  } else {
    const slotResult = validateTimeSlots(slots)
    if ('error' in slotResult) {
      return NextResponse.json({ error: slotResult.error }, { status: 400 })
    }
    rowsToInsert = slotResult.slots.map((slot) => ({
      business_id: business.id,
      staff_id: staffId,
      override_date,
      is_unavailable: false,
      open_time: slot.open_time,
      close_time: slot.close_time,
      label: cleanLabel,
      updated_at: now,
    }))
  }

  const { data, error } = await supabase
    .from('staff_schedule_overrides')
    .insert(rowsToInsert)
    .select(OVERRIDE_COLUMNS)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [], { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const staffId = request.nextUrl.searchParams.get('staffId')
  const date = request.nextUrl.searchParams.get('date')

  if (!staffId) {
    return NextResponse.json({ error: 'staffId query parameter is required' }, { status: 400 })
  }
  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: 'date query parameter is required in YYYY-MM-DD format' },
      { status: 400 }
    )
  }

  const ownership = await verifyStaffOwnership(supabase, staffId, business.id)
  if ('error' in ownership) return ownership.error

  const { error } = await supabase
    .from('staff_schedule_overrides')
    .delete()
    .eq('business_id', business.id)
    .eq('staff_id', staffId)
    .eq('override_date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
