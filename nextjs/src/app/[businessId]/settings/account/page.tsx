import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div>
      <PageHeader title="Account" subtitle="Your sign-in email and password" />

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="text-sm text-gray-900">{user.email}</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <p className="text-xs text-gray-500 mb-3">Update the password used to sign in.</p>
          <button
            type="button"
            disabled
            className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Change password (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}
