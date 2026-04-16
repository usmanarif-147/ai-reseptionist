'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ListView } from '@/components/dashboard'

// Matches DB convention: 0=Sunday, 1=Monday, ..., 6=Saturday
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DayHours {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

function defaultHours(): DayHours[] {
  return DAYS.map((_, i) => ({
    day_of_week: i,
    open_time: '09:00',
    close_time: '17:00',
    is_closed: i === 0 || i === 6, // Sunday and Saturday closed by default
  }))
}

export default function HoursPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [hours, setHours] = useState<DayHours[]>(defaultHours())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadHours() }, [businessId])

  async function loadHours() {
    setLoading(true)
    const res = await fetch('/api/business/hours')
    if (res.ok) {
      const data: DayHours[] = await res.json()
      if (data.length > 0) {
        const merged = defaultHours().map((def) => {
          const found = data.find((d) => d.day_of_week === def.day_of_week)
          return found || def
        })
        setHours(merged)
      }
    }
    setLoading(false)
  }

  function updateDay(dayIndex: number, field: keyof DayHours, value: string | boolean) {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, [field]: value } : h))
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save hours')
      setSaving(false)
      return
    }

    setSuccess('Business hours saved successfully')
    setSaving(false)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Business Hours</h1>
      <p className="text-gray-500 text-sm mb-8">Set when your business is open for appointments</p>

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
          <ListView<DayHours>
            data={hours}
            keyExtractor={(day) => String(day.day_of_week)}
            renderCard={(day) => (
              <div className="bg-white rounded-xl border border-gray-100 flex items-center gap-4 px-6 py-4">
                <div className="w-28">
                  <span className="text-sm font-medium text-gray-900">{DAYS[day.day_of_week]}</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!day.is_closed}
                    onChange={(e) => updateDay(day.day_of_week, 'is_closed', !e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">{day.is_closed ? 'Closed' : 'Open'}</span>
                </label>

                {!day.is_closed && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={day.open_time}
                      onChange={(e) => updateDay(day.day_of_week, 'open_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time"
                      value={day.close_time}
                      onChange={(e) => updateDay(day.day_of_week, 'close_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {day.is_closed && (
                  <span className="ml-auto text-sm text-gray-400">---</span>
                )}
              </div>
            )}
            emptyMessage="No business hours configured."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Hours'}
        </button>
      </form>
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
