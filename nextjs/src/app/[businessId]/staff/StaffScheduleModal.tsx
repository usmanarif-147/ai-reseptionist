'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DayHoursEditor,
  emptyDaySlots,
  groupRowsByDay,
  flattenDaysToRows,
  MonthCalendar,
} from '@/components/dashboard'
import type { DaySlots, MonthCalendarEvent } from '@/components/dashboard'
import { confirmDialog } from '@/components/confirmDialog'

interface StaffScheduleModalProps {
  staffId: string
  staffName: string
  isOpen: boolean
  onClose: () => void
}

interface Override {
  id: string
  override_date: string
  is_unavailable: boolean
  open_time: string | null
  close_time: string | null
  label: string | null
}

interface Holiday {
  id: string
  holiday_date: string
  label: string | null
}

type OverrideMode = 'unavailable' | 'custom'

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toMonthParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function hasAnySlots(hours: DaySlots[]): boolean {
  return hours.some((d) => !d.is_closed && d.slots.length > 0)
}

export default function StaffScheduleModal({
  staffId,
  staffName,
  isOpen,
  onClose,
}: StaffScheduleModalProps) {
  // Weekly schedule state
  const [weeklyHours, setWeeklyHours] = useState<DaySlots[]>(() => emptyDaySlots())
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklyError, setWeeklyError] = useState('')
  const [weeklySuccess, setWeeklySuccess] = useState('')

  // Overrides + holidays + calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date())
  const [overrides, setOverrides] = useState<Override[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loadingOverrides, setLoadingOverrides] = useState(false)

  // Override editor state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [overrideMode, setOverrideMode] = useState<OverrideMode>('unavailable')
  const [overrideSlots, setOverrideSlots] = useState<
    Array<{ open_time: string; close_time: string }>
  >([{ open_time: '09:00', close_time: '17:00' }])
  const [overrideLabel, setOverrideLabel] = useState('')
  const [savingOverride, setSavingOverride] = useState(false)
  const [deletingOverride, setDeletingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState('')

  // Load weekly + first month overrides when opened / staff changes
  useEffect(() => {
    if (!isOpen || !staffId) return
    loadWeekly()
    loadOverridesForMonth(currentMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, staffId])

  // Reload overrides when navigating months
  useEffect(() => {
    if (!isOpen || !staffId) return
    loadOverridesForMonth(currentMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Esc to close + body scroll lock
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

  async function loadWeekly() {
    setLoadingWeekly(true)
    setWeeklyError('')
    const res = await fetch(`/api/business/staff-hours?staffId=${staffId}`)
    if (res.ok) {
      const rows = await res.json()
      setWeeklyHours(
        Array.isArray(rows) && rows.length > 0
          ? groupRowsByDay(rows, emptyDaySlots())
          : emptyDaySlots(),
      )
    } else {
      setWeeklyError('Failed to load weekly schedule')
    }
    setLoadingWeekly(false)
  }

  async function loadOverridesForMonth(month: Date) {
    setLoadingOverrides(true)
    const monthParam = toMonthParam(month)
    const [overridesRes, holidaysRes] = await Promise.all([
      fetch(
        `/api/business/staff-schedule-overrides?staffId=${staffId}&month=${monthParam}`,
      ),
      fetch(`/api/business/holidays?month=${monthParam}`),
    ])
    if (overridesRes.ok) {
      const data = await overridesRes.json()
      setOverrides(Array.isArray(data) ? data : [])
    }
    if (holidaysRes.ok) {
      const data = await holidaysRes.json()
      setHolidays(Array.isArray(data) ? data : [])
    }
    setLoadingOverrides(false)
  }

  async function handleSaveWeekly() {
    setWeeklyError('')
    setWeeklySuccess('')

    for (const day of weeklyHours) {
      if (day.is_closed) continue
      for (const slot of day.slots) {
        if (!slot.open_time || !slot.close_time) {
          setWeeklyError('Each working slot must have both an open and close time.')
          return
        }
        if (slot.open_time >= slot.close_time) {
          setWeeklyError('Each slot\u2019s open time must be before its close time.')
          return
        }
      }
    }

    setSavingWeekly(true)

    const allEmpty = !hasAnySlots(weeklyHours)
    const payload = allEmpty ? [] : flattenDaysToRows(weeklyHours)

    const res = await fetch(`/api/business/staff-hours?staffId=${staffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: payload }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setWeeklyError(data.error || 'Failed to save weekly schedule')
      setSavingWeekly(false)
      return
    }

    setWeeklySuccess('Weekly schedule saved')
    setSavingWeekly(false)
  }

  // --- Derived sets for calendar coloring ---
  // day_of_week indices where staff has at least one weekly slot
  const availableDaysOfWeek = useMemo(() => {
    const set = new Set<number>()
    for (const day of weeklyHours) {
      if (!day.is_closed && day.slots.length > 0) set.add(day.day_of_week)
    }
    return set
  }, [weeklyHours])

  const overrideByIso = useMemo(() => {
    const map = new Map<string, Override[]>()
    for (const o of overrides) {
      const arr = map.get(o.override_date) || []
      arr.push(o)
      map.set(o.override_date, arr)
    }
    return map
  }, [overrides])

  const holidayIsoSet = useMemo(
    () => new Set(holidays.map((h) => h.holiday_date)),
    [holidays],
  )

  // Build FullCalendar events for the visible month: one background event per day
  // tinted by category (holiday > override > available > unavailable), plus a
  // small chip on override days so they stand out.
  const calendarEvents = useMemo<MonthCalendarEvent[]>(() => {
    const year = currentMonth.getFullYear()
    const monthIdx = currentMonth.getMonth()
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
    const list: MonthCalendarEvent[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, monthIdx, d)
      const iso = toIsoDate(date)

      if (holidayIsoSet.has(iso)) {
        list.push({
          id: `holiday-${iso}`,
          start: iso,
          allDay: true,
          display: 'background',
          backgroundColor: '#ef4444',
        })
        continue
      }

      if (overrideByIso.has(iso)) {
        list.push({
          id: `override-bg-${iso}`,
          start: iso,
          allDay: true,
          display: 'background',
          backgroundColor: '#fff7ed',
        })
        list.push({
          id: `override-chip-${iso}`,
          title: 'Override',
          start: iso,
          allDay: true,
          backgroundColor: '#fb923c',
          borderColor: '#fb923c',
        })
        continue
      }

      if (availableDaysOfWeek.has(date.getDay())) {
        list.push({
          id: `available-${iso}`,
          start: iso,
          allDay: true,
          display: 'background',
          backgroundColor: '#dcfce7',
        })
      } else {
        list.push({
          id: `unavailable-${iso}`,
          start: iso,
          allDay: true,
          display: 'background',
          backgroundColor: '#f3f4f6',
        })
      }
    }
    return list
  }, [currentMonth, availableDaysOfWeek, overrideByIso, holidayIsoSet])

  function resetOverrideForm() {
    setSelectedDate(null)
    setOverrideMode('unavailable')
    setOverrideSlots([{ open_time: '09:00', close_time: '17:00' }])
    setOverrideLabel('')
    setOverrideError('')
  }

  function handleDayClick(iso: string) {
    if (savingOverride || deletingOverride) return

    if (holidayIsoSet.has(iso)) {
      setSelectedDate(null)
      setOverrideError('This date is a business holiday and cannot be overridden.')
      return
    }

    setOverrideError('')
    setSelectedDate(iso)

    const existing = overrideByIso.get(iso) || []
    if (existing.length > 0) {
      const unavailable = existing.some((o) => o.is_unavailable)
      if (unavailable) {
        setOverrideMode('unavailable')
        setOverrideSlots([{ open_time: '09:00', close_time: '17:00' }])
      } else {
        setOverrideMode('custom')
        setOverrideSlots(
          existing
            .filter((o) => o.open_time && o.close_time)
            .map((o) => ({
              open_time: (o.open_time || '09:00').slice(0, 5),
              close_time: (o.close_time || '17:00').slice(0, 5),
            })),
        )
      }
      setOverrideLabel(existing[0].label || '')
    } else {
      setOverrideMode('unavailable')
      setOverrideSlots([{ open_time: '09:00', close_time: '17:00' }])
      setOverrideLabel('')
    }
  }

  function addOverrideSlot() {
    setOverrideSlots([...overrideSlots, { open_time: '09:00', close_time: '17:00' }])
  }

  function removeOverrideSlot(i: number) {
    setOverrideSlots(overrideSlots.filter((_, idx) => idx !== i))
  }

  function updateOverrideSlot(
    i: number,
    field: 'open_time' | 'close_time',
    value: string,
  ) {
    setOverrideSlots(
      overrideSlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    )
  }

  async function handleSaveOverride() {
    if (!selectedDate) return
    setOverrideError('')

    if (overrideMode === 'custom') {
      if (overrideSlots.length === 0) {
        setOverrideError('Add at least one time slot, or choose "Mark as unavailable".')
        return
      }
      for (const slot of overrideSlots) {
        if (!slot.open_time || !slot.close_time) {
          setOverrideError('Each slot must have both an open and close time.')
          return
        }
        if (slot.open_time >= slot.close_time) {
          setOverrideError('Each slot\u2019s open time must be before its close time.')
          return
        }
      }
    }

    setSavingOverride(true)

    const body =
      overrideMode === 'unavailable'
        ? {
            staffId,
            override_date: selectedDate,
            is_unavailable: true,
            label: overrideLabel.trim() || null,
          }
        : {
            staffId,
            override_date: selectedDate,
            is_unavailable: false,
            slots: overrideSlots,
            label: overrideLabel.trim() || null,
          }

    const res = await fetch('/api/business/staff-schedule-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setOverrideError(data.error || 'Failed to save override')
      setSavingOverride(false)
      return
    }

    await loadOverridesForMonth(currentMonth)
    resetOverrideForm()
    setSavingOverride(false)
  }

  async function handleRemoveOverride() {
    if (!selectedDate) return
    const confirmed = await confirmDialog({
      title: 'Remove Override?',
      message: `Remove the override for ${selectedDate}? The staff member will follow their weekly schedule on that date.`,
      confirmLabel: 'Yes, Remove',
      isDanger: true,
    })
    if (!confirmed) return
    setDeletingOverride(true)
    setOverrideError('')
    const res = await fetch(
      `/api/business/staff-schedule-overrides?staffId=${staffId}&date=${selectedDate}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setOverrideError(data.error || 'Failed to remove override')
      setDeletingOverride(false)
      return
    }
    await loadOverridesForMonth(currentMonth)
    resetOverrideForm()
    setDeletingOverride(false)
  }

  if (!isOpen) return null

  const existingOverrideForSelected = selectedDate
    ? overrideByIso.get(selectedDate) || []
    : []
  const hasExistingOverride = existingOverrideForSelected.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Schedule — {staffName}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set a recurring weekly schedule and add date-specific overrides.
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-0 md:divide-x md:divide-gray-100">
            {/* Section 1: Weekly schedule */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Weekly Schedule</h3>
              </div>

              {weeklyError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">
                  {weeklyError}
                </div>
              )}
              {weeklySuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-3">
                  {weeklySuccess}
                </div>
              )}

              {loadingWeekly ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Loading schedule...
                </div>
              ) : (
                <DayHoursEditor
                  hours={weeklyHours}
                  onChange={setWeeklyHours}
                  closedLabel="Unavailable"
                  openLabel="Available"
                  hint="Leave all days unavailable to follow business hours. Add multiple slots for split shifts or breaks."
                  compact
                />
              )}

              <button
                type="button"
                onClick={handleSaveWeekly}
                disabled={savingWeekly || loadingWeekly}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingWeekly ? 'Saving...' : 'Save Weekly Schedule'}
              </button>
            </div>

            {/* Section 2: Overrides calendar */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Date-Specific Overrides
                </h3>
              </div>

              <MonthCalendar
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                events={calendarEvents}
                onDayClick={handleDayClick}
                selectedIso={selectedDate}
              />

              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                  Available
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-gray-200 border border-gray-300" />
                  Unavailable
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-orange-50 border-2 border-orange-400" />
                  Override
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-red-500" />
                  Business holiday
                </div>
              </div>

              {loadingOverrides && (
                <p className="text-xs text-gray-400 mt-2">Loading overrides...</p>
              )}

              {overrideError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mt-3">
                  {overrideError}
                </div>
              )}

              {/* Override form */}
              {selectedDate && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-900">
                      {hasExistingOverride ? 'Edit override for' : 'New override for'}{' '}
                      <span className="text-blue-600">{selectedDate}</span>
                    </p>
                    <button
                      type="button"
                      onClick={resetOverrideForm}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={overrideMode === 'unavailable'}
                        onChange={() => setOverrideMode('unavailable')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Mark as unavailable</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={overrideMode === 'custom'}
                        onChange={() => setOverrideMode('custom')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Set custom hours</span>
                    </label>
                  </div>

                  {overrideMode === 'custom' && (
                    <div className="space-y-2 mb-3">
                      {overrideSlots.map((slot, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.open_time}
                            onChange={(e) =>
                              updateOverrideSlot(i, 'open_time', e.target.value)
                            }
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-400 text-sm">to</span>
                          <input
                            type="time"
                            value={slot.close_time}
                            onChange={(e) =>
                              updateOverrideSlot(i, 'close_time', e.target.value)
                            }
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {overrideSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOverrideSlot(i)}
                              aria-label="Remove slot"
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOverrideSlot}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add another slot
                      </button>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      value={overrideLabel}
                      onChange={(e) => setOverrideLabel(e.target.value)}
                      placeholder="e.g. Personal leave, Extra shift"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveOverride}
                      disabled={savingOverride || deletingOverride}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingOverride ? 'Saving...' : 'Save Override'}
                    </button>
                    {hasExistingOverride && (
                      <button
                        type="button"
                        onClick={handleRemoveOverride}
                        disabled={savingOverride || deletingOverride}
                        className="text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingOverride ? 'Removing...' : 'Remove Override'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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
