import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const status = searchParams.get('status')

  if (minPrice && isNaN(Number(minPrice))) {
    return NextResponse.json({ error: 'minPrice must be a valid number' }, { status: 400 })
  }
  if (maxPrice && isNaN(Number(maxPrice))) {
    return NextResponse.json({ error: 'maxPrice must be a valid number' }, { status: 400 })
  }

  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')

  let query = supabase
    .from('services')
    .select('*', { count: 'exact' })
    .eq('business_id', business.id)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (minPrice) {
    query = query.gte('price', Number(minPrice))
  }
  if (maxPrice) {
    query = query.lte('price', Number(maxPrice))
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  query = query.order('created_at', { ascending: true })

  if (pageParam) {
    const page = Math.max(parseInt(pageParam, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(pageSizeParam || '10', 10) || 10, 1), 100)
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)
  }

  const { data: services, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (pageParam) {
    return NextResponse.json({ data: services, total: count ?? 0 })
  }

  return NextResponse.json(services)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, price, duration_minutes, category, is_active, staff_ids, meta, max_bookings_per_slot } = body

  if (!name || price == null || !duration_minutes) {
    return NextResponse.json(
      { error: 'Name, price, and duration are required' },
      { status: 400 }
    )
  }

  if (max_bookings_per_slot != null && (!Number.isInteger(max_bookings_per_slot) || max_bookings_per_slot < 1 || max_bookings_per_slot > 10)) {
    return NextResponse.json(
      { error: 'max_bookings_per_slot must be an integer between 1 and 10' },
      { status: 400 }
    )
  }

  const { data: service, error } = await supabase
    .from('services')
    .insert({
      business_id: business.id,
      name,
      description: description || null,
      price,
      duration_minutes,
      category: category || null,
      is_active: is_active ?? true,
      staff_ids: staff_ids ?? [],
      meta: meta ?? {},
      ...(max_bookings_per_slot != null ? { max_bookings_per_slot } : {}),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(service, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { id, name, description, price, duration_minutes, category, is_active, staff_ids, meta, max_bookings_per_slot } = body

  if (!id) {
    return NextResponse.json({ error: 'Service id is required' }, { status: 400 })
  }

  if (!name || price == null || !duration_minutes) {
    return NextResponse.json(
      { error: 'Name, price, and duration are required' },
      { status: 400 }
    )
  }

  if (max_bookings_per_slot != null && (!Number.isInteger(max_bookings_per_slot) || max_bookings_per_slot < 1 || max_bookings_per_slot > 10)) {
    return NextResponse.json(
      { error: 'max_bookings_per_slot must be an integer between 1 and 10' },
      { status: 400 }
    )
  }

  const { data: service, error } = await supabase
    .from('services')
    .update({
      name,
      description: description || null,
      price,
      duration_minutes,
      category: category || null,
      is_active: is_active ?? true,
      staff_ids: staff_ids ?? [],
      meta: meta ?? {},
      ...(max_bookings_per_slot != null ? { max_bookings_per_slot } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(service)
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Service id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
