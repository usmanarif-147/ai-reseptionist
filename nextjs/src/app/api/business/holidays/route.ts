import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function monthRange(month: string): { start: string; end: string } | null {
  if (!MONTH_RE.test(month)) return null
  const [yStr, mStr] = month.split('-')
  const year = parseInt(yStr, 10)
  const mIdx = parseInt(mStr, 10) - 1
  const start = new Date(Date.UTC(year, mIdx, 1))
  const end = new Date(Date.UTC(year, mIdx + 1, 1))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const month = request.nextUrl.searchParams.get('month')

  let query = supabase
    .from('business_holidays')
    .select('id, holiday_date, label')
    .eq('business_id', business.id)
    .order('holiday_date', { ascending: true })

  if (month) {
    const range = monthRange(month)
    if (!range) {
      return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
    }
    query = query.gte('holiday_date', range.start).lt('holiday_date', range.end)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { holiday_date, label } = body ?? {}

  if (!holiday_date || typeof holiday_date !== 'string' || !DATE_RE.test(holiday_date)) {
    return NextResponse.json(
      { error: 'holiday_date is required in YYYY-MM-DD format' },
      { status: 400 }
    )
  }
  if (label != null && typeof label !== 'string') {
    return NextResponse.json({ error: 'label must be a string' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('business_holidays')
    .insert({
      business_id: business.id,
      holiday_date,
      label: label || null,
    })
    .select('id, holiday_date, label')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A holiday already exists for this date' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Holiday id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('business_holidays')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
