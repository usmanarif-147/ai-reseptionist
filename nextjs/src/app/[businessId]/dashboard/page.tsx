'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Business {
  name: string
  type: string | null
  contact: string | null
  address: string | null
}

interface SetupStatus {
  hasServices: boolean
  hasHours: boolean
  hasStaff: boolean
  hasWidget: boolean
  hasPayments: boolean
}

export default function OverviewPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: '', contact: '', address: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [businessId])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    const { data: biz } = await supabase
      .from('businesses')
      .select('name, type, contact, address')
      .eq('id', businessId)
      .single()

    if (biz) {
      setBusiness(biz)
      setForm({
        name: biz.name || '',
        type: biz.type || '',
        contact: biz.contact || '',
        address: biz.address || '',
      })
    }

    // Check setup status
    const [services, hours, staff, widget, payments] = await Promise.all([
      supabase.from('services').select('id').eq('business_id', businessId).limit(1),
      supabase.from('business_hours').select('id').eq('business_id', businessId).eq('is_closed', false).limit(1),
      supabase.from('staff').select('id').eq('business_id', businessId).limit(1),
      supabase.from('widget_settings').select('id').eq('business_id', businessId).limit(1),
      supabase.from('payment_settings').select('id').eq('business_id', businessId).limit(1),
    ])

    setSetup({
      hasServices: (services.data?.length ?? 0) > 0,
      hasHours: (hours.data?.length ?? 0) > 0,
      hasStaff: (staff.data?.length ?? 0) > 0,
      hasWidget: (widget.data?.length ?? 0) > 0,
      hasPayments: (payments.data?.length ?? 0) > 0,
    })

    setLoading(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to update profile')
      setSaving(false)
      return
    }

    const data = await res.json()
    setBusiness(data)
    setSuccess('Profile updated successfully')
    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  const dashboardPath = `/${businessId}/dashboard`
  const businessBasePath = `/${businessId}`

  const checklist = [
    { done: !!business?.name && !!business?.type, label: 'Complete your business profile', href: '' },
    { done: setup?.hasServices ?? false, label: 'Add your services and pricing', href: '/services' },
    { done: setup?.hasHours ?? false, label: 'Set your business hours', href: '/business-hours' },
    { done: setup?.hasStaff ?? false, label: 'Add your staff members', href: '/staff' },
    { done: setup?.hasPayments ?? false, label: 'Configure payment settings', href: '/payments' },
    { done: setup?.hasWidget ?? false, label: 'Customize and copy your widget settings', href: '/widget-settings' },
  ]

  const completedCount = checklist.filter((c) => c.done).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
      <p className="text-gray-500 text-sm mb-8">Welcome to your business dashboard</p>

      {/* Business Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Business Profile</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {success}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a type</option>
                <option value="salon">Salon</option>
                <option value="clinic">Clinic</option>
                <option value="spa">Spa</option>
                <option value="barbershop">Barbershop</option>
                <option value="dental">Dental Office</option>
                <option value="fitness">Fitness Studio</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="tel"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main St, City, State"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setError('')
                  setForm({
                    name: business?.name || '',
                    type: business?.type || '',
                    contact: business?.contact || '',
                    address: business?.address || '',
                  })
                }}
                className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{business?.name || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900 capitalize">{business?.type || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Contact</span>
              <span className="font-medium text-gray-900">{business?.contact || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-gray-900">{business?.address || '---'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Setup Checklist */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-blue-900">Setup Checklist</h2>
          <span className="text-sm text-blue-600 font-medium">{completedCount}/{checklist.length} complete</span>
        </div>
        <ul className="space-y-3 text-sm text-blue-800">
          {checklist.map((item, i) => (
            <li key={i}>
              <Link href={item.href === '' ? dashboardPath : `${businessBasePath}${item.href}`} className="flex items-center gap-3 hover:text-blue-900">
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
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 max-w-2xl">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
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
