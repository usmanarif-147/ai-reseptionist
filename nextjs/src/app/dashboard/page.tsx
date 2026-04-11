import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-8">{user?.email}</p>

      {/* Setup checklist */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl">
        <h2 className="text-base font-semibold text-blue-900 mb-4">Complete your setup</h2>
        <ul className="space-y-3 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs">1</span>
            Add your services and pricing
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs">2</span>
            Set your business hours
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs">3</span>
            Configure payment settings
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs">4</span>
            Copy your widget code and add it to your website
          </li>
        </ul>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Appointments Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total This Month</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Chat Sessions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
      </div>
    </div>
  )
}
