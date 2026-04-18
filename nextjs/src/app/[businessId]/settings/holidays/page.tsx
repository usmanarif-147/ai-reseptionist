'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import PageHeader from '@/components/dashboard/PageHeader'
import Pagination from '@/components/dashboard/Pagination'
import { dayPickerClassNames } from '@/components/dashboard/dayPickerClassNames'
import { confirmDialog } from '@/components/confirmDialog'

interface Holiday {
  id: string
  holiday_date: string
  label: string | null
}

const PAGE_SIZE = 5

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10))
  return new Date(y, m - 1, d)
}

function formatDisplayDate(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function HolidaysPage() {
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([])
  const [pageItems, setPageItems] = useState<Holiday[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [month, setMonth] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formLabel, setFormLabel] = useState('')

  const loadPage = useCallback(async (targetPage: number) => {
    const res = await fetch(
      `/api/business/holidays?page=${targetPage}&page_size=${PAGE_SIZE}`,
    )
    if (!res.ok) {
      setError('Failed to load holidays')
      return
    }
    const data = await res.json()
    setPageItems(Array.isArray(data.items) ? data.items : [])
    setTotal(typeof data.total === 'number' ? data.total : 0)
  }, [])

  const loadAll = useCallback(async () => {
    const res = await fetch('/api/business/holidays')
    if (!res.ok) return
    const data: Holiday[] = await res.json()
    setAllHolidays(Array.isArray(data) ? data : [])
  }, [])

  const refresh = useCallback(
    async (targetPage: number) => {
      await Promise.all([loadPage(targetPage), loadAll()])
    },
    [loadPage, loadAll],
  )

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await refresh(1)
      setLoading(false)
    })()
  }, [refresh])

  const holidayDates = useMemo(
    () => allHolidays.map((h) => fromIsoDate(h.holiday_date)),
    [allHolidays],
  )

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formDate || !/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      setError('Please select a valid date.')
      return
    }
    if (formLabel.length > 50) {
      setError('Label must be 50 characters or less.')
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/business/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holiday_date: formDate,
        label: formLabel.trim() || null,
      }),
    })
    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to add holiday')
      return
    }

    setFormDate('')
    setFormLabel('')
    setSuccess('Holiday added.')
    setPage(1)
    await refresh(1)
  }

  async function handleDelete(holiday: Holiday) {
    const confirmed = await confirmDialog({
      title: 'Delete Holiday?',
      message: `Remove ${formatDisplayDate(holiday.holiday_date)}${holiday.label ? ` (${holiday.label})` : ''}?`,
      confirmLabel: 'Delete',
      isDanger: true,
    })
    if (!confirmed) return

    setError('')
    setSuccess('')

    const res = await fetch(
      `/api/business/holidays?id=${encodeURIComponent(holiday.id)}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to delete holiday')
      return
    }

    const remaining = total - 1
    const maxPage = Math.max(1, Math.ceil(remaining / PAGE_SIZE))
    const nextPage = Math.min(page, maxPage)
    setPage(nextPage)
    setSuccess('Holiday deleted.')
    await refresh(nextPage)
  }

  function handleDayClick(date: Date) {
    const iso = toIsoDate(date)
    setFormDate(iso)
    setError('')
    setSuccess('')
  }

  function handlePageChange(next: number) {
    setPage(next)
    loadPage(next)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <PageHeader
        title="Holidays"
        subtitle="Mark one-off closed days. The widget and booking flow will skip these dates."
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Holiday</h2>

          <div className="flex justify-center overflow-hidden">
            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={formDate ? fromIsoDate(formDate) : undefined}
              onDayClick={handleDayClick}
              modifiers={{ holiday: holidayDates }}
              modifiersClassNames={{
                holiday: 'bg-red-500 text-white hover:bg-red-600',
                today: 'ring-2 ring-blue-500',
              }}
              classNames={{
                ...dayPickerClassNames,
                month_caption:
                  'relative flex justify-center items-center h-10 font-semibold text-gray-900',
                nav: 'absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none',
                button_previous:
                  'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40 pointer-events-auto',
                button_next:
                  'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40 pointer-events-auto',
              }}
            />
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-red-500" />
              Holiday
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded ring-2 ring-blue-500" />
              Today
            </div>
          </div>

          <form onSubmit={handleAdd} className="mt-5 border-t border-gray-100 pt-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label <span className="text-gray-400">(optional, max 50 chars)</span>
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                maxLength={50}
                placeholder="e.g., Christmas Day"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Holiday'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">All Holidays</h2>

          {total === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">
              No holidays yet. Click a date on the calendar to add one.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Label</th>
                      <th className="py-2 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((h) => (
                      <tr key={h.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4 text-gray-900">
                          {formatDisplayDate(h.holiday_date)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {h.label || <span className="text-gray-300">&mdash;</span>}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(h)}
                            aria-label={`Delete holiday on ${h.holiday_date}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={1.75}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={handlePageChange}
              />

              {totalPages <= 1 && (
                <p className="mt-3 text-xs text-gray-400 text-right">
                  {total} {total === 1 ? 'holiday' : 'holidays'} total
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-72 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-96" />
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-96" />
      </div>
    </div>
  )
}
