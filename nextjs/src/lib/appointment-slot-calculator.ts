/**
 * Appointment slot availability calculation.
 *
 * Pipeline for a given (business, service, [staff], date):
 *   1. Business closed on that weekday or date is a business_holidays entry -> no slots.
 *   2. If staff_id provided:
 *        - Use staff_schedule_overrides for that date if present (is_unavailable or custom hours).
 *        - Otherwise fall back to staff_hours rows for that weekday.
 *      Else use business_hours rows for that weekday.
 *   3. Generate candidate slots by stepping through each available window
 *      in increments of service.duration_minutes.
 *   4. For each candidate, count existing confirmed/completed appointments
 *      that overlap. Slot is available when booked_count < max_bookings_per_slot.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Slot,
  SlotAvailability,
  DayHoursRow,
  StaffHoursRow,
  StaffScheduleOverride,
  AvailabilityQuery,
} from './types/appointments'

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10))
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function dayOfWeekFromDate(date: string): number {
  // 'YYYY-MM-DD' -> 0..6 (Sun..Sat)
  const d = new Date(`${date}T00:00:00Z`)
  return d.getUTCDay()
}

interface Window {
  open: number // minutes since 00:00
  close: number
}

function rowsToWindows(rows: Array<{ is_closed: boolean; open_time: string | null; close_time: string | null }>): Window[] {
  const windows: Window[] = []
  for (const r of rows) {
    if (r.is_closed) continue
    if (!r.open_time || !r.close_time) continue
    const open = timeToMinutes(r.open_time)
    const close = timeToMinutes(r.close_time)
    if (close <= open) continue
    windows.push({ open, close })
  }
  return windows
}

function generateCandidates(windows: Window[], durationMin: number): Slot[] {
  const out: Slot[] = []
  for (const w of windows) {
    for (let t = w.open; t + durationMin <= w.close; t += durationMin) {
      out.push({
        slot_start: minutesToTime(t),
        slot_end: minutesToTime(t + durationMin),
      })
    }
  }
  return out
}

/**
 * Compute availability for a given date.
 * Returns one SlotAvailability per candidate slot (empty array if day is closed).
 */
export async function getAvailabilityForDate(
  supabase: SupabaseClient,
  q: AvailabilityQuery
): Promise<SlotAvailability[]> {
  const { business_id, service_id, staff_id, date } = q

  // 1. Load service (duration + capacity).
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id, duration_minutes, max_bookings_per_slot')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .single()

  if (svcErr || !service) return []

  const duration = Number(service.duration_minutes)
  const capacity = Number(service.max_bookings_per_slot ?? 1)
  if (!duration || duration <= 0) return []

  // 2. Business holiday check.
  const { data: holidays } = await supabase
    .from('business_holidays')
    .select('id')
    .eq('business_id', business_id)
    .eq('holiday_date', date)
    .limit(1)

  if (holidays && holidays.length > 0) return []

  const dow = dayOfWeekFromDate(date)

  // 3. Determine which rows govern the day.
  let windows: Window[] = []

  if (staff_id) {
    const { data: overrides } = await supabase
      .from('staff_schedule_overrides')
      .select('*')
      .eq('business_id', business_id)
      .eq('staff_id', staff_id)
      .eq('override_date', date)

    const overrideRows = (overrides ?? []) as StaffScheduleOverride[]
    if (overrideRows.some((r) => r.is_unavailable)) return []

    if (overrideRows.length > 0) {
      windows = rowsToWindows(
        overrideRows.map((r) => ({
          is_closed: r.is_unavailable,
          open_time: r.open_time,
          close_time: r.close_time,
        }))
      )
    } else {
      const { data: sh } = await supabase
        .from('staff_hours')
        .select('*')
        .eq('business_id', business_id)
        .eq('staff_id', staff_id)
        .eq('day_of_week', dow)
      windows = rowsToWindows((sh ?? []) as StaffHoursRow[])
    }
  } else {
    const { data: bh } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', business_id)
      .eq('day_of_week', dow)
    windows = rowsToWindows((bh ?? []) as DayHoursRow[])
  }

  if (windows.length === 0) return []

  // 4. Candidates + booking counts.
  const candidates = generateCandidates(windows, duration)
  if (candidates.length === 0) return []

  const bookingsQuery = supabase
    .from('appointments')
    .select('slot_start, slot_end, staff_id, service_id, status')
    .eq('business_id', business_id)
    .eq('service_id', service_id)
    .gte('appointment_date', `${date}T00:00:00`)
    .lte('appointment_date', `${date}T23:59:59`)
    .in('status', ['confirmed', 'completed'])

  const { data: bookings } = staff_id
    ? await bookingsQuery.eq('staff_id', staff_id)
    : await bookingsQuery

  const bookedRanges = (bookings ?? []).map((b) => ({
    start: timeToMinutes(String(b.slot_start).slice(0, 5)),
    end: timeToMinutes(String(b.slot_end).slice(0, 5)),
  }))

  return candidates.map((c) => {
    const cs = timeToMinutes(c.slot_start)
    const ce = timeToMinutes(c.slot_end)
    const overlapping = bookedRanges.filter((b) => b.start < ce && b.end > cs).length
    const available = overlapping < capacity
    const base: SlotAvailability = {
      slot_start: c.slot_start,
      slot_end: c.slot_end,
      available,
      booked_count: overlapping,
      capacity,
    }
    if (!available) base.reason = 'full'
    return base
  })
}

/**
 * Validate a specific slot. Returns the matching SlotAvailability or null
 * if the slot is not a valid candidate for the day.
 */
export async function validateSlot(
  supabase: SupabaseClient,
  q: Required<Pick<AvailabilityQuery, 'business_id' | 'service_id' | 'date' | 'slot_start' | 'slot_end'>> &
    Pick<AvailabilityQuery, 'staff_id'>
): Promise<SlotAvailability | null> {
  const all = await getAvailabilityForDate(supabase, q)
  return (
    all.find(
      (s) =>
        s.slot_start.slice(0, 5) === q.slot_start.slice(0, 5) &&
        s.slot_end.slice(0, 5) === q.slot_end.slice(0, 5)
    ) ?? null
  )
}
