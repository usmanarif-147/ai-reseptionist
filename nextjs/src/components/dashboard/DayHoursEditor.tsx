'use client'

// Matches DB convention: 0=Sunday, 1=Monday, ..., 6=Saturday
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface DaySlots {
  day_of_week: number
  is_closed: boolean
  slots: Array<{ open_time: string; close_time: string }>
}

interface DayHoursEditorProps {
  /** Hours state; must have exactly 7 entries indexed by day_of_week. */
  hours: DaySlots[]
  onChange: (next: DaySlots[]) => void
  /** Label for the "closed/unavailable" checkbox. Default "Closed". */
  closedLabel?: string
  /** Label for the "open/available" state. Default "Open". */
  openLabel?: string
  /** Default open/close when adding a new slot. */
  defaultOpen?: string
  defaultClose?: string
  /** Show a hint above the list. */
  hint?: string
  /** Compact styling for use inside modals. */
  compact?: boolean
}

export default function DayHoursEditor({
  hours,
  onChange,
  closedLabel = 'Closed',
  openLabel = 'Open',
  defaultOpen = '09:00',
  defaultClose = '17:00',
  hint,
  compact = false,
}: DayHoursEditorProps) {
  function updateDay(dayIndex: number, mutate: (day: DaySlots) => DaySlots) {
    onChange(hours.map((d) => (d.day_of_week === dayIndex ? mutate(d) : d)))
  }

  function toggleClosed(dayIndex: number, isClosed: boolean) {
    updateDay(dayIndex, (day) => ({
      ...day,
      is_closed: isClosed,
      slots: isClosed
        ? []
        : day.slots.length > 0
          ? day.slots
          : [{ open_time: defaultOpen, close_time: defaultClose }],
    }))
  }

  function addSlot(dayIndex: number) {
    updateDay(dayIndex, (day) => ({
      ...day,
      slots: [...day.slots, { open_time: defaultOpen, close_time: defaultClose }],
    }))
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    updateDay(dayIndex, (day) => ({
      ...day,
      slots: day.slots.filter((_, i) => i !== slotIndex),
    }))
  }

  function updateSlot(dayIndex: number, slotIndex: number, field: 'open_time' | 'close_time', value: string) {
    updateDay(dayIndex, (day) => ({
      ...day,
      slots: day.slots.map((s, i) => (i === slotIndex ? { ...s, [field]: value } : s)),
    }))
  }

  const cardClass = compact
    ? 'border border-gray-200 rounded-lg p-3'
    : 'bg-white rounded-xl border border-gray-100 px-6 py-4'

  return (
    <div className={compact ? 'space-y-3' : 'space-y-2'}>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      {hours.map((day) => (
        <div key={day.day_of_week} className={cardClass}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 w-28">{DAY_NAMES[day.day_of_week]}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!day.is_closed}
                onChange={(e) => toggleClosed(day.day_of_week, !e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{day.is_closed ? closedLabel : openLabel}</span>
            </label>
          </div>

          {day.is_closed ? (
            <p className="text-sm text-gray-400">---</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                {day.slots.map((slot, i) => {
                  const prevClose = i > 0 ? day.slots[i - 1].close_time || undefined : undefined
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.open_time || ''}
                        min={prevClose}
                        onChange={(e) => updateSlot(day.day_of_week, i, 'open_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="time"
                        value={slot.close_time || ''}
                        min={slot.open_time || undefined}
                        onChange={(e) => updateSlot(day.day_of_week, i, 'close_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {day.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(day.day_of_week, i)}
                          aria-label="Remove slot"
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {day.slots.length < 5 && (
                <button
                  type="button"
                  onClick={() => addSlot(day.day_of_week)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add another slot
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** Build 7 empty day entries (all closed), used when no data yet. */
export function emptyDaySlots(options?: { defaultOpenDays?: number[]; defaultOpen?: string; defaultClose?: string }): DaySlots[] {
  const openDays = options?.defaultOpenDays
  const defaultOpen = options?.defaultOpen ?? '09:00'
  const defaultClose = options?.defaultClose ?? '17:00'
  return Array.from({ length: 7 }, (_, i) => {
    const isOpen = openDays ? openDays.includes(i) : false
    return {
      day_of_week: i,
      is_closed: !isOpen,
      slots: isOpen ? [{ open_time: defaultOpen, close_time: defaultClose }] : [],
    }
  })
}

export interface HoursRow {
  day_of_week: number
  is_closed: boolean
  open_time: string | null
  close_time: string | null
}

/**
 * Flatten DaySlots (UI shape) to a flat row array (API shape).
 * - Closed day → single row with nulls.
 * - Open day with N slots → N rows with is_closed=false.
 * - Open day with zero slots → emitted as a single closed row to be explicit.
 */
export function flattenDaysToRows(days: DaySlots[]): HoursRow[] {
  const rows: HoursRow[] = []
  for (const day of days) {
    if (day.is_closed || day.slots.length === 0) {
      rows.push({ day_of_week: day.day_of_week, is_closed: true, open_time: null, close_time: null })
      continue
    }
    for (const slot of day.slots) {
      rows.push({
        day_of_week: day.day_of_week,
        is_closed: false,
        open_time: slot.open_time,
        close_time: slot.close_time,
      })
    }
  }
  return rows
}

/** Group raw row list (one row per slot) into DaySlots[] of length 7. */
export function groupRowsByDay(
  rows: Array<{ day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }>,
  fallback: DaySlots[],
): DaySlots[] {
  const byDay = new Map<number, DaySlots>()
  for (let i = 0; i < 7; i++) {
    byDay.set(i, { day_of_week: i, is_closed: true, slots: [] })
  }
  for (const row of rows) {
    const entry = byDay.get(row.day_of_week)
    if (!entry) continue
    if (row.is_closed) {
      entry.is_closed = true
      entry.slots = []
    } else if (row.open_time && row.close_time) {
      entry.is_closed = false
      entry.slots.push({ open_time: row.open_time.slice(0, 5), close_time: row.close_time.slice(0, 5) })
    }
  }
  const result: DaySlots[] = []
  for (let i = 0; i < 7; i++) {
    const entry = byDay.get(i)!
    // If no rows came back for this day at all, use the fallback entry.
    const hasRows = rows.some((r) => r.day_of_week === i)
    if (!hasRows) {
      result.push(fallback[i])
    } else {
      result.push(entry)
    }
  }
  return result
}
