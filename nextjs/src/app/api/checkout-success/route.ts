import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // Verify the logged-in user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Retrieve the checkout session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  })

  if (session.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = session.subscription as import('stripe').Stripe.Subscription

  // Use admin client to bypass RLS when writing subscription data
  const adminSupabase = createAdminClient()

  // Upsert subscription record
  await adminSupabase.from('subscriptions').upsert({
    user_id: user.id,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Ensure a business record exists for this user
  const { data: existingBusiness } = await adminSupabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  let businessId = existingBusiness?.id

  if (!businessId) {
    const emailName = (user.email ?? 'My Business').split('@')[0]
    const { data: newBusiness } = await adminSupabase
      .from('businesses')
      .insert({ owner_id: user.id, name: emailName, type: 'other' })
      .select('id')
      .single()

    if (newBusiness) {
      businessId = newBusiness.id
      await Promise.all([
        adminSupabase.from('widget_settings').insert({ business_id: businessId }),
        adminSupabase.from('widget_appearance').insert({ business_id: businessId }),
        adminSupabase.from('payment_settings').insert({ business_id: businessId, payment_type: 'cash' }),
        adminSupabase.from('business_hours').insert(
          Array.from({ length: 7 }, (_, i) => ({
            business_id: businessId,
            day_of_week: i,
            open_time: null,
            close_time: null,
            is_closed: true,
          }))
        ),
      ])
    }
  }

  return NextResponse.json({ success: true, businessId })
}
