import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Look up the user's business and redirect to the new UUID-based dashboard
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (business) {
    redirect(`/${business.id}/dashboard`)
  }

  // No business yet — render children (the old page will show a fallback)
  return <>{children}</>
}
