'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { confirmDialog } from '@/components/confirmDialog'

interface Holiday {
  id: string
  holiday_date: string
  label: string | null
}

interface HolidaysModalProps {
  isOpen: boolean
  onClose: () => void
}

function toDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function HolidaysModal({ isOpen, onClose }: HolidaysModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadHolidays()
      setPendingDate(null)
      setLabel('')
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  async function loadHolidays() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/business/holidays')
    if (res.ok) {
      const data = await res.json()
      setHolidays(Array.isArray(data) ? data : [])
    } else {
      setError('Failed to load holidays')
    }
    setLoading(false)
  }

  const holidayDates = useMemo(() => holidays.map((h) => toDate(h.holiday_date)), [holidays])
  const holidayByIso = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const h of holidays) map.set(h.holiday_date, h)
    return map
  }, [holidays])

  async function handleDayClick(day: Date) {
    if (saving || deletingId) return
    const iso = toIsoDate(day)
    const existing = holidayByIso.get(iso)

    if (existing) {
      const confirmed = await confirmDialog({
        title: 'Remove Holiday?',
        message: existing.label
          ? `Remove holiday "${existing.label}" on ${iso}?`
          : `Remove holiday on ${iso}?`,
        confirmLabel: 'Yes, Remove',
        isDanger: true,
      })
      if (!confirmed) return
      setDeletingId(existing.id)
      setError('')
      const res = await fetch(`/api/business/holidays?id=${existing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to remove holiday')
      } else {
        await loadHolidays()
      }
      setDeletingId(null)
    } else {
      setPendingDate(iso)
      setLabel('')
      setError('')
    }
  }

  async function confirmAdd() {
    if (!pendingDate) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/business/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holiday_date: pendingDate, label: label.trim() || null }),
    })
    if (res.status === 409) {
      setError('A holiday already exists on that date.')
      setSaving(false)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to add holiday')
      setSaving(false)
      return
    }
    setPendingDate(null)
    setLabel('')
    await loadHolidays()
    setSaving(false)
  }

  function cancelAdd() {
    setPendingDate(null)
    setLabel('')
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Manage Holidays</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a date to add a holiday, or click an existing holiday to remove it.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading holidays...</div>
          ) : (
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                onDayClick={handleDayClick}
                modifiers={{ holiday: holidayDates }}
                modifiersClassNames={{
                  holiday: 'bg-red-500 text-white rounded-full hover:bg-red-600',
                  today: 'ring-2 ring-blue-500 rounded-full',
                }}
                classNames={{
                  root: 'rdp text-sm',
                  months: 'flex flex-col gap-4',
                  month: 'space-y-3',
                  month_caption: 'flex justify-center items-center h-10 font-semibold text-gray-900',
                  caption_label: 'text-sm font-semibold',
                  nav: 'flex items-center justify-between absolute w-full px-2',
                  button_previous:
                    'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40',
                  button_next:
                    'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40',
                  month_grid: 'w-full border-collapse',
                  weekdays: 'flex',
                  weekday: 'text-xs font-medium text-gray-400 w-9 h-9 flex items-center justify-center',
                  week: 'flex',
                  day: 'w-9 h-9 text-sm',
                  day_button:
                    'w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400',
                  outside: 'text-gray-300',
                  disabled: 'text-gray-300 cursor-not-allowed',
                }}
              />
            </div>
          )}

          {pendingDate && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Add holiday on <span className="text-blue-600">{pendingDate}</span>
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Optional label (e.g. Public Holiday)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmAdd()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={confirmAdd}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={cancelAdd}
                  disabled={saving}
                  className="text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {holidays.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Upcoming Holidays ({holidays.length})
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {holidays
                  .slice()
                  .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
                  .map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium text-gray-900">{h.holiday_date}</span>
                        {h.label && <span className="text-gray-500 ml-2">— {h.label}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDayClick(toDate(h.holiday_date))}
                        disabled={deletingId === h.id}
                        className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                        aria-label="Remove holiday"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
