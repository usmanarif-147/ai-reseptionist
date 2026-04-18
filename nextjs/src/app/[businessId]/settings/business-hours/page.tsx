'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DayHoursEditor, emptyDaySlots, groupRowsByDay, flattenDaysToRows } from '@/components/dashboard'
import type { DaySlots } from '@/components/dashboard'
import PageHeader from '@/components/dashboard/PageHeader'
import BulkSlotsModal from './BulkSlotsModal'

function defaultHours(): DaySlots[] {
  return emptyDaySlots()
}

export default function HoursPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [hours, setHours] = useState<DaySlots[]>(defaultHours())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => { loadHours() }, [businessId])

  async function loadHours() {
    setLoading(true)
    const res = await fetch('/api/business/hours')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setHours(groupRowsByDay(data, defaultHours()))
      }
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    for (const day of hours) {
      if (day.is_closed) continue
      if (day.slots.length === 0) {
        setError('Each open day must have at least one time slot.')
        return
      }
      if (day.slots.length > 5) {
        setError('A day can have at most 5 time slots.')
        return
      }
      for (let i = 0; i < day.slots.length; i++) {
        const slot = day.slots[i]
        if (!slot.open_time || !slot.close_time) {
          setError('Each slot must have both an open and close time.')
          return
        }
        if (slot.open_time >= slot.close_time) {
          setError('Each slot\u2019s open time must be before its close time.')
          return
        }
        if (i > 0 && slot.open_time <= day.slots[i - 1].close_time) {
          setError('Each slot must start after the previous slot\u2019s close time.')
          return
        }
      }
    }

    setSaving(true)
    const res = await fetch('/api/business/hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: flattenDaysToRows(hours) }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save hours')
      setSaving(false)
      return
    }

    setSuccess('Business hours saved successfully')
    setSaving(false)
  }

  if (loading) return <LoadingSkeleton />

  const bulkButton = (
    <button
      type="button"
      onClick={() => setBulkOpen(true)}
      className="flex-shrink-0 inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
      </svg>
      Bulk Time Slots
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Business Hours"
        subtitle="Set when your business is open. Add multiple slots per day to represent breaks (e.g., lunch)."
        actions={bulkButton}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="max-w-2xl">
          <DayHoursEditor hours={hours} onChange={setHours} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Hours'}
        </button>
      </form>

      <BulkSlotsModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        hours={hours}
        onChange={setHours}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-72 mb-8" />
      <div className="bg-white rounded-xl border border-gray-100 max-w-2xl">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
