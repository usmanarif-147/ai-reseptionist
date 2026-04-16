/**
 * Domain types for the appointment module.
 * Mirrors public.appointments, public.business_holidays,
 * public.staff_schedule_overrides and public.business_hours / staff_hours
 * after migration imp-05-appointment-module.sql.
 */

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed'

export type PaymentMethod = 'cash_on_arrival' | 'paid_cash' | 'paid_online'

/** Day-of-week slot (recurring weekly). Multiple rows per day allowed after imp-05. */
export interface DayHoursRow {
  id?: string
  business_id: string
  day_of_week: number // 0 = Sunday .. 6 = Saturday
  is_closed: boolean
  open_time: string | null // 'HH:MM' or 'HH:MM:SS'
  close_time: string | null
}

export interface StaffHoursRow extends DayHoursRow {
  staff_id: string
}

export interface Appointment {
  id: string
  business_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  service_id: string | null
  staff_id: string | null
  appointment_date: string // ISO timestamp (date + time of booking record)
  slot_start: string // 'HH:MM[:SS]'
  slot_end: string
  status: AppointmentStatus
  payment_method: PaymentMethod
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BusinessHoliday {
  id: string
  business_id: string
  holiday_date: string // 'YYYY-MM-DD'
  label: string | null
  created_at: string
}

export interface StaffScheduleOverride {
  id: string
  business_id: string
  staff_id: string
  override_date: string // 'YYYY-MM-DD'
  is_unavailable: boolean
  open_time: string | null
  close_time: string | null
  label: string | null
  created_at: string
  updated_at: string
}

export interface ServiceBookingLimit {
  service_id: string
  max_bookings_per_slot: number
}

/** A candidate appointment slot for a given date. */
export interface Slot {
  slot_start: string // 'HH:MM'
  slot_end: string // 'HH:MM'
}

/** Result of availability check for a single slot. */
export interface SlotAvailability {
  slot_start: string
  slot_end: string
  available: boolean
  /** Bookings already placed for this slot (0 if none). */
  booked_count: number
  /** Capacity for the slot (services.max_bookings_per_slot). */
  capacity: number
  /** Human-readable reason when not available. */
  reason?: 'holiday' | 'staff_unavailable' | 'outside_hours' | 'full'
}

/** Input for availability queries. */
export interface AvailabilityQuery {
  business_id: string
  service_id: string
  staff_id?: string | null
  /** Date to check. 'YYYY-MM-DD'. */
  date: string
  /** Optional specific slot to validate. */
  slot_start?: string
  slot_end?: string
}
