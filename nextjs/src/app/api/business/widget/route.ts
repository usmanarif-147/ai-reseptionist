import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .select('*')
    .eq('business_id', business.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { color, welcome_message } = body

  const { data: settings, error } = await supabase
    .from('widget_settings')
    .update({
      color: color || '#2563eb',
      welcome_message: welcome_message || 'How can we help you today?',
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}
