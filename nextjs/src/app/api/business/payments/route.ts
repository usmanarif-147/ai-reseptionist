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
    .from('payment_settings')
    .select('*')
    .eq('business_id', business.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Never return stripe_secret_key in full — mask it
  if (settings && settings.stripe_secret_key) {
    settings.stripe_secret_key = settings.stripe_secret_key.slice(0, 8) + '...' + settings.stripe_secret_key.slice(-4)
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
  const { payment_type, stripe_publishable_key, stripe_secret_key } = body

  if (!payment_type || !['cash', 'online', 'both'].includes(payment_type)) {
    return NextResponse.json(
      { error: 'payment_type must be "cash", "online", or "both"' },
      { status: 400 }
    )
  }

  if (payment_type === 'online' || payment_type === 'both') {
    if (!stripe_publishable_key || !stripe_secret_key) {
      return NextResponse.json(
        { error: 'Stripe keys are required for online payments' },
        { status: 400 }
      )
    }
  }

  const updateData: Record<string, unknown> = {
    payment_type,
    updated_at: new Date().toISOString(),
  }

  if (payment_type === 'online' || payment_type === 'both') {
    updateData.stripe_publishable_key = stripe_publishable_key
    updateData.stripe_secret_key = stripe_secret_key
  } else {
    updateData.stripe_publishable_key = null
    updateData.stripe_secret_key = null
  }

  const { data: settings, error } = await supabase
    .from('payment_settings')
    .update(updateData)
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mask the secret key in the response
  if (settings && settings.stripe_secret_key) {
    settings.stripe_secret_key = settings.stripe_secret_key.slice(0, 8) + '...' + settings.stripe_secret_key.slice(-4)
  }

  return NextResponse.json(settings)
}
