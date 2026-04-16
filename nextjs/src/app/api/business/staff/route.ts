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
  const role = searchParams.get('role')
  const status = searchParams.get('status')

  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')

  let query = supabase
    .from('staff')
    .select('*', { count: 'exact' })
    .eq('business_id', business.id)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (role) {
    query = query.eq('role', role)
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

  const { data: staff, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (pageParam) {
    return NextResponse.json({ data: staff, total: count ?? 0 })
  }

  return NextResponse.json(staff)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, role, photo_url, bio, contact, is_active, meta } = body

  if (!name || !role) {
    return NextResponse.json(
      { error: 'Name and role are required' },
      { status: 400 }
    )
  }

  const { data: member, error } = await supabase
    .from('staff')
    .insert({
      business_id: business.id,
      name,
      role,
      photo_url: photo_url || null,
      bio: bio || null,
      contact: contact ?? {},
      is_active: is_active ?? true,
      meta: meta ?? {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(member, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { id, name, role, photo_url, bio, contact, is_active, meta } = body

  if (!id) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 })
  }

  if (!name || !role) {
    return NextResponse.json(
      { error: 'Name and role are required' },
      { status: 400 }
    )
  }

  const { data: member, error } = await supabase
    .from('staff')
    .update({
      name,
      role,
      photo_url: photo_url || null,
      bio: bio ?? null,
      contact: contact ?? {},
      is_active: is_active ?? true,
      meta: meta ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(member)
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
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
