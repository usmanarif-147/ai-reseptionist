'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SetupStatus {
  hasProfile: boolean
  hasServices: boolean
  hasHours: boolean
  hasStaff: boolean
  hasWidget: boolean
  hasPayments: boolean
}

export default function OverviewPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [businessId])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    const { data: biz } = await supabase
      .from('businesses')
      .select('name, type')
      .eq('id', businessId)
      .single()

    const [services, hours, staff, widget, payments] = await Promise.all([
      supabase.from('services').select('id').eq('business_id', businessId).limit(1),
      supabase.from('business_hours').select('id').eq('business_id', businessId).eq('is_closed', false).limit(1),
      supabase.from('staff').select('id').eq('business_id', businessId).limit(1),
      supabase.from('widget_settings').select('id').eq('business_id', businessId).limit(1),
      supabase.from('payment_settings').select('id').eq('business_id', businessId).limit(1),
    ])

    setSetup({
      hasProfile: !!biz?.name && !!biz?.type,
      hasServices: (services.data?.length ?? 0) > 0,
      hasHours: (hours.data?.length ?? 0) > 0,
      hasStaff: (staff.data?.length ?? 0) > 0,
      hasWidget: (widget.data?.length ?? 0) > 0,
      hasPayments: (payments.data?.length ?? 0) > 0,
    })

    setLoading(false)
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  const businessBasePath = `/${businessId}`

  const checklist = [
    { done: setup?.hasProfile ?? false, label: 'Complete your business profile', href: '/settings/business-profile' },
    { done: setup?.hasServices ?? false, label: 'Add your services and pricing', href: '/services' },
    { done: setup?.hasHours ?? false, label: 'Set your business hours', href: '/settings/business-hours' },
    { done: setup?.hasStaff ?? false, label: 'Add your staff members', href: '/staff' },
    { done: setup?.hasPayments ?? false, label: 'Configure payment settings', href: '/settings/payments' },
    { done: setup?.hasWidget ?? false, label: 'Customize and copy your widget settings', href: '/widget-settings' },
  ]

  const completedCount = checklist.filter((c) => c.done).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
      <p className="text-gray-500 text-sm mb-8">Welcome to your business dashboard</p>

      {/* Setup Checklist */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-blue-900">Setup Checklist</h2>
          <span className="text-sm text-blue-600 font-medium">{completedCount}/{checklist.length} complete</span>
        </div>
        <ul className="space-y-3 text-sm text-blue-800">
          {checklist.map((item, i) => (
            <li key={i}>
              <Link href={`${businessBasePath}${item.href}`} className="flex items-center gap-3 hover:text-blue-900">
                {item.done ? (
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                )}
                <span className={item.done ? 'line-through opacity-60' : ''}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Appointments Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">---</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total This Month</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">---</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Chat Sessions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">---</p>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl">
        <div className="h-5 bg-blue-200/60 rounded w-40 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-blue-200/60 rounded w-full" />
          <div className="h-4 bg-blue-200/60 rounded w-full" />
          <div className="h-4 bg-blue-200/60 rounded w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
