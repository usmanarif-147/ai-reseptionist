import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  return NextResponse.json(business)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already has a business
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json(existing)
  }

  const body = await request.json()
  const { name, type } = body

  if (!name || !type) {
    return NextResponse.json(
      { error: 'Business name and type are required' },
      { status: 400 }
    )
  }

  // Use admin client to bypass RLS for initial creation
  const adminSupabase = createAdminClient()
  const { data: business, error } = await adminSupabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name,
      type,
      contact: body.contact || null,
      address: body.address || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create default widget settings and payment settings
  await Promise.all([
    adminSupabase.from('widget_settings').insert({ business_id: business.id }),
    adminSupabase.from('widget_appearance').insert({ business_id: business.id }),
    adminSupabase.from('payment_settings').insert({
      business_id: business.id,
      payment_type: 'cash',
    }),
    // Create default business hours (Mon-Fri 9-17, Sat-Sun closed)
    adminSupabase.from('business_hours').insert(
      Array.from({ length: 7 }, (_, i) => ({
        business_id: business.id,
        day_of_week: i,
        open_time: i >= 1 && i <= 5 ? '09:00' : null,
        close_time: i >= 1 && i <= 5 ? '17:00' : null,
        is_closed: i === 0 || i === 6,
      }))
    ),
  ])

  return NextResponse.json(business, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, type, contact, address } = body

  if (!name || !type) {
    return NextResponse.json(
      { error: 'Business name and type are required' },
      { status: 400 }
    )
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .update({
      name,
      type,
      contact: contact || null,
      address: address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  return NextResponse.json(business)
}
