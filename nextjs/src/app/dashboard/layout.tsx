import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: '🏠' },
  { label: 'Services', href: '/dashboard/services', icon: '📋' },
  { label: 'Business Hours', href: '/dashboard/hours', icon: '🕐' },
  { label: 'Staff', href: '/dashboard/staff', icon: '👥' },
  { label: 'Appointments', href: '/dashboard/appointments', icon: '📅' },
  { label: 'Payment Settings', href: '/dashboard/payments', icon: '💳' },
  { label: 'Widget', href: '/dashboard/widget', icon: '🔌' },
  { label: 'Subscription', href: '/dashboard/subscription', icon: '⭐' },
]

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

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (sub && ['past_due', 'canceled', 'incomplete'].includes(sub.status)) {
    redirect('/subscribe')
  }

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-blue-600">AI Receptionist</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 px-3 mb-2 truncate">{user.email}</p>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  )
}
