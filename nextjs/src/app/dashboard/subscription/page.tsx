import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your billing and plan</p>

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
