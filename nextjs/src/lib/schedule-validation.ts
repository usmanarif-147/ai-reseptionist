export interface DaySlotInput {
  day_of_week: number
  is_closed: boolean
  open_time?: string | null
  close_time?: string | null
}

export interface TimeSlotInput {
  open_time: string
  close_time: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value)
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH_RE.test(value)
}

export function monthRange(month: string): { start: string; end: string } | null {
  if (!isValidMonth(month)) return null
  const [yStr, mStr] = month.split('-')
  const year = parseInt(yStr, 10)
  const mIdx = parseInt(mStr, 10) - 1
  const start = new Date(Date.UTC(year, mIdx, 1))
  const end = new Date(Date.UTC(year, mIdx + 1, 1))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function checkNoOverlap(slots: { start: number; end: number }[]): boolean {
  const sorted = [...slots].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return false
  }
  return true
}

function checkSequential(slots: { start: number; end: number }[]): boolean {
  const sorted = [...slots].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end) return false
  }
  return true
}

export const MAX_SLOTS_PER_DAY = 5

/**
 * Validates a weekly-schedule `slots` array (business_hours / staff_hours).
 * When `requireAllDays` is true, every day 0-6 must appear (business hours).
 * When false, days may be omitted — missing days = unavailable (staff hours).
 */
export function validateDaySlots(
  slots: unknown,
  { requireAllDays }: { requireAllDays: boolean },
): { error: string } | { slots: DaySlotInput[] } {
  if (!Array.isArray(slots)) {
    return { error: 'slots must be an array' }
  }

  const byDay = new Map<number, DaySlotInput[]>()

  for (const raw of slots) {
    if (!raw || typeof raw !== 'object') {
      return { error: 'Each slot must be an object' }
    }
    const slot = raw as DaySlotInput

    if (!Number.isInteger(slot.day_of_week) || slot.day_of_week < 0 || slot.day_of_week > 6) {
      return { error: 'day_of_week must be an integer between 0 and 6' }
    }
    if (typeof slot.is_closed !== 'boolean') {
      return { error: 'is_closed must be a boolean' }
    }

    if (!slot.is_closed) {
      if (!slot.open_time || !slot.close_time) {
        return { error: 'Non-closed slots require open_time and close_time' }
      }
      if (!isValidTime(slot.open_time) || !isValidTime(slot.close_time)) {
        return { error: 'open_time and close_time must be in HH:MM or HH:MM:SS format' }
      }
      if (toMinutes(slot.open_time) >= toMinutes(slot.close_time)) {
        return { error: 'open_time must be before close_time' }
      }
    }

    const existing = byDay.get(slot.day_of_week) ?? []
    existing.push(slot)
    byDay.set(slot.day_of_week, existing)
  }

  if (requireAllDays) {
    for (let day = 0; day < 7; day++) {
      if (!byDay.has(day)) {
        return { error: `Day ${day} is missing — all 7 days (0-6) must be represented` }
      }
    }
  }

  for (const [day, daySlots] of Array.from(byDay.entries())) {
    const open = daySlots.filter((s) => !s.is_closed)
    if (open.length > MAX_SLOTS_PER_DAY) {
      return { error: `Max ${MAX_SLOTS_PER_DAY} slots per day on day ${day}` }
    }
    if (open.length < 2) continue

    const ranges = open.map((s) => ({
      start: toMinutes(s.open_time!),
      end: toMinutes(s.close_time!),
    }))
    if (!checkNoOverlap(ranges)) {
      return { error: `Overlapping time slots on day ${day}` }
    }
    if (!checkSequential(ranges)) {
      return { error: `Slot must start after previous slot ends on day ${day}` }
    }
  }

  return { slots: slots as DaySlotInput[] }
}

/**
 * Validates a date-override `slots` array ({ open_time, close_time }[]).
 * Used for staff_schedule_overrides when is_unavailable is false.
 */
export function validateTimeSlots(
  slots: unknown,
): { error: string } | { slots: TimeSlotInput[] } {
  if (!Array.isArray(slots) || slots.length === 0) {
    return { error: 'slots must be a non-empty array' }
  }

  const ranges: { start: number; end: number }[] = []

  for (const raw of slots) {
    if (!raw || typeof raw !== 'object') {
      return { error: 'Each slot must be an object' }
    }
    const slot = raw as TimeSlotInput
    if (!isValidTime(slot.open_time) || !isValidTime(slot.close_time)) {
      return { error: 'open_time and close_time must be in HH:MM or HH:MM:SS format' }
    }
    if (toMinutes(slot.open_time) >= toMinutes(slot.close_time)) {
      return { error: 'open_time must be before close_time' }
    }
    ranges.push({
      start: toMinutes(slot.open_time),
      end: toMinutes(slot.close_time),
    })
  }

  if (!checkNoOverlap(ranges)) {
    return { error: 'Overlapping time slots' }
  }

  return { slots: slots as TimeSlotInput[] }
}
