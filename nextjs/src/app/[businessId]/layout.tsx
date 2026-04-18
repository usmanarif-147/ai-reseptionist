import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    redirect('/dashboard')
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (sub && ['past_due', 'canceled', 'incomplete'].includes(sub.status)) {
    redirect('/subscribe')
  }

  return (
    <DashboardShell
      businessId={businessId}
      businessName={business.name}
      userEmail={user.email ?? ''}
    >
      {children}
    </DashboardShell>
  )
}
