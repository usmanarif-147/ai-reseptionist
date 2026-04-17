import type { SupabaseClient } from '@supabase/supabase-js'
import type { AvailabilityWindow, DaySlots, Slot } from './types'
import {
  addDaysLocal,
  formatLocalDate,
  getDayLabel,
  minutesToTime,
  normalizeTime,
  slotsOverlap,
  timeToMinutes,
  todayDateString,
} from './validation'

function generateWindowSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []
  let current = timeToMinutes(openTime)
  const end = timeToMinutes(closeTime)
  while (current + durationMinutes <= end) {
    slots.push({
      start: minutesToTime(current),
      end: minutesToTime(current + durationMinutes),
    })
    current += durationMinutes
  }
  return slots
}

export async function getAvailabilityWindows(
  supabase: SupabaseClient,
  businessId: string,
  staffId: string,
  dateStr: string,
  dayOfWeek: number
): Promise<{ windows: AvailabilityWindow[]; blocked: boolean }> {
  const { data: holiday } = await supabase
    .from('business_holidays')
    .select('id')
    .eq('business_id', businessId)
    .eq('holiday_date', dateStr)
    .maybeSingle()

  if (holiday) return { windows: [], blocked: true }

  const { data: overrides } = await supabase
    .from('staff_schedule_overrides')
    .select('is_unavailable, open_time, close_time')
    .eq('staff_id', staffId)
    .eq('override_date', dateStr)

  if (overrides && overrides.length > 0) {
    if (overrides.some((o) => o.is_unavailable)) {
      return { windows: [], blocked: true }
    }
    const windows = overrides
      .filter((o) => o.open_time && o.close_time)
      .map((o) => ({
        open_time: normalizeTime(o.open_time as string),
        close_time: normalizeTime(o.close_time as string),
      }))
    return { windows, blocked: false }
  }

  const { data: staffHours } = await supabase
    .from('staff_hours')
    .select('open_time, close_time, is_closed')
    .eq('staff_id', staffId)
    .eq('day_of_week', dayOfWeek)

  if (staffHours && staffHours.length > 0) {
    if (staffHours.every((sh) => sh.is_closed)) {
      return { windows: [], blocked: false }
    }
    const windows = staffHours
      .filter((sh) => !sh.is_closed && sh.open_time && sh.close_time)
      .map((sh) => ({
        open_time: normalizeTime(sh.open_time as string),
        close_time: normalizeTime(sh.close_time as string),
      }))
    return { windows, blocked: false }
  }

  const { data: bizHours } = await supabase
    .from('business_hours')
    .select('open_time, close_time, is_closed')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)

  if (bizHours && bizHours.length > 0) {
    const windows = bizHours
      .filter((bh) => !bh.is_closed && bh.open_time && bh.close_time)
      .map((bh) => ({
        open_time: normalizeTime(bh.open_time as string),
        close_time: normalizeTime(bh.close_time as string),
      }))
    return { windows, blocked: false }
  }

  return { windows: [], blocked: false }
}

async function fetchConfirmedAppointments(
  supabase: SupabaseClient,
  staffId: string,
  dateStr: string
): Promise<{ slot_start: string; slot_end: string }[]> {
  const nextDay = formatLocalDate(addDaysLocal(new Date(dateStr + 'T00:00:00'), 1))
  const { data } = await supabase
    .from('appointments')
    .select('slot_start, slot_end')
    .eq('staff_id', staffId)
    .eq('status', 'confirmed')
    .gte('appointment_date', dateStr)
    .lt('appointment_date', nextDay)

  return (data ?? []).map((a) => ({
    slot_start: normalizeTime(a.slot_start as string),
    slot_end: normalizeTime(a.slot_end as string),
  }))
}

export async function generateAvailableSlots(
  supabase: SupabaseClient,
  params: {
    businessId: string
    staffId: string
    durationMinutes: number
    maxBookingsPerSlot: number
    startDate?: Date
  }
): Promise<DaySlots[]> {
  const { businessId, staffId, durationMinutes, maxBookingsPerSlot } = params
  const start = params.startDate
    ? new Date(params.startDate.getFullYear(), params.startDate.getMonth(), params.startDate.getDate())
    : new Date()

  const todayStr = todayDateString()
  const nowMinutes = (() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })()

  const result: DaySlots[] = []

  for (let i = 0; i < 7; i++) {
    const date = addDaysLocal(start, i)
    const dateStr = formatLocalDate(date)
    const dayOfWeek = date.getDay()
    const dayObj: DaySlots = {
      date: dateStr,
      dayOfWeek,
      dayLabel: getDayLabel(dayOfWeek),
      slots: [],
    }

    const { windows } = await getAvailabilityWindows(
      supabase,
      businessId,
      staffId,
      dateStr,
      dayOfWeek
    )

    if (windows.length === 0) {
      result.push(dayObj)
      continue
    }

    const generated: { start: string; end: string }[] = []
    for (const w of windows) {
      generated.push(...generateWindowSlots(w.open_time, w.close_time, durationMinutes))
    }

    const booked = await fetchConfirmedAppointments(supabase, staffId, dateStr)

    const availableSlots: Slot[] = []
    for (const s of generated) {
      const overlapCount = booked.filter((b) =>
        slotsOverlap(s.start, s.end, b.slot_start, b.slot_end)
      ).length
      if (overlapCount >= maxBookingsPerSlot) continue
      availableSlots.push({
        start: s.start,
        end: s.end,
        remainingSpots: maxBookingsPerSlot - overlapCount,
      })
    }

    if (dateStr === todayStr) {
      dayObj.slots = availableSlots.filter((s) => timeToMinutes(s.start) > nowMinutes)
    } else {
      dayObj.slots = availableSlots
    }

    result.push(dayObj)
  }

  return result
}

export async function isSlotAvailable(
  supabase: SupabaseClient,
  params: {
    businessId: string
    staffId: string
    dateStr: string
    slotStart: string
    slotEnd: string
    maxBookingsPerSlot: number
  }
): Promise<{ ok: true } | { ok: false; reason: 'holiday' | 'outside_hours' | 'full' }> {
  const { businessId, staffId, dateStr, slotStart, slotEnd, maxBookingsPerSlot } = params
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay()

  const { windows, blocked } = await getAvailabilityWindows(
    supabase,
    businessId,
    staffId,
    dateStr,
    dayOfWeek
  )

  if (blocked) return { ok: false, reason: 'holiday' }
  if (windows.length === 0) return { ok: false, reason: 'outside_hours' }

  const start = normalizeTime(slotStart)
  const end = normalizeTime(slotEnd)
  const withinWindow = windows.some(
    (w) => w.open_time <= start && end <= w.close_time
  )
  if (!withinWindow) return { ok: false, reason: 'outside_hours' }

  const booked = await fetchConfirmedAppointments(supabase, staffId, dateStr)
  const overlapCount = booked.filter((b) =>
    slotsOverlap(start, end, b.slot_start, b.slot_end)
  ).length

  if (overlapCount >= maxBookingsPerSlot) return { ok: false, reason: 'full' }

  return { ok: true }
}
