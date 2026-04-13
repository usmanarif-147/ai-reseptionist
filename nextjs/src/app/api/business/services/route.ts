import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  const { name, description, price, duration_minutes, category, is_active, staff_ids, meta } = body

  if (!name || price == null || !duration_minutes) {
    return NextResponse.json(
      { error: 'Name, price, and duration are required' },
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
  const { id, name, description, price, duration_minutes, category, is_active, staff_ids, meta } = body

  if (!id) {
    return NextResponse.json({ error: 'Service id is required' }, { status: 400 })
  }

  if (!name || price == null || !duration_minutes) {
    return NextResponse.json(
      { error: 'Name, price, and duration are required' },
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
