import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>
  searchParams: Promise<{ scheduled?: string }>
}) {
  const { businessId } = await params
  const { scheduled } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  async function scheduleCancel() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!sub) redirect(`/${businessId}/settings/subscription`)

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    redirect(`/${businessId}/settings/subscription?scheduled=1`)
  }

  const statusColor: Record<string, string> = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    past_due: 'bg-red-100 text-red-700',
    canceled: 'bg-gray-100 text-gray-700',
  }

  const statusLabel: Record<string, string> = {
    trialing: 'Free Trial',
    active: 'Active',
    past_due: 'Payment Failed',
    canceled: 'Cancelled',
  }

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Manage your billing and plan" />

      {scheduled === '1' && (
        <div className="max-w-lg bg-green-50 border border-green-100 rounded-xl p-4 mb-6 text-sm text-green-700">
          Your subscription has been scheduled for cancellation. You will retain access until the end of your current billing period.
        </div>
      )}

      {sub ? (
        <div className="max-w-lg bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-lg font-semibold text-gray-900 mt-0.5">AI Receptionist — $29/month</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor[sub.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {statusLabel[sub.status] ?? sub.status}
            </span>
          </div>

          <div className="space-y-3 text-sm text-gray-600 border-t border-gray-100 pt-4">
            {sub.status === 'trialing' && sub.trial_ends_at && (
              <div className="flex justify-between">
                <span>Trial ends</span>
                <span className="font-medium">{new Date(sub.trial_ends_at).toLocaleDateString()}</span>
              </div>
            )}
            {sub.current_period_end && (
              <div className="flex justify-between">
                <span>Next billing date</span>
                <span className="font-medium">{new Date(sub.current_period_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {sub.status === 'past_due' && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
              Your last payment failed. Please update your payment method to avoid losing access.
            </div>
          )}

          {(sub.status === 'active' || sub.status === 'trialing') && scheduled !== '1' && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <form action={scheduleCancel}>
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700 hover:underline"
                >
                  Cancel subscription
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-1">
                You will keep access until the end of your current billing period.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-lg bg-white rounded-xl border border-gray-100 p-6 text-center">
          <p className="text-gray-500 mb-4">No active subscription found.</p>
          <a href="/onboarding" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
            Set Up Subscription
          </a>
        </div>
      )}
    </div>
  )
}
