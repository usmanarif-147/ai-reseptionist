import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Look up this user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (business) {
    redirect(`/${business.id}/dashboard`)
  }

  // No business yet — create a placeholder so the user can set it up
  const adminSupabase = createAdminClient()
  const emailName = (user.email ?? 'My Business').split('@')[0]

  const { data: newBusiness, error } = await adminSupabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: emailName,
      type: 'other',
    })
    .select('id')
    .single()

  if (!error && newBusiness) {
    // Also seed widget + payment defaults
    await Promise.all([
      adminSupabase.from('widget_settings').insert({ business_id: newBusiness.id }),
      adminSupabase.from('payment_settings').insert({ business_id: newBusiness.id, payment_type: 'cash' }),
      adminSupabase.from('business_hours').insert(
        Array.from({ length: 7 }, (_, i) => ({
          business_id: newBusiness.id,
          day_of_week: i,
          open_time: null,
          close_time: null,
          is_closed: true,
        }))
      ),
    ])
    redirect(`/${newBusiness.id}/dashboard`)
  }

  // Fallback: show error
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Unable to load your dashboard. Please try again.</p>
    </div>
  )
}
