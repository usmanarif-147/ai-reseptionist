import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  const { name, role, photo_url } = body

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
  const { id, name, role, photo_url } = body

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
