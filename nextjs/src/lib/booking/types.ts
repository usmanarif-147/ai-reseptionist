export interface Slot {
  start: string
  end: string
  remainingSpots: number
}

export interface DaySlots {
  date: string
  dayOfWeek: number
  dayLabel: string
  slots: Slot[]
}

export interface AvailabilityWindow {
  open_time: string
  close_time: string
}

export interface BookingService {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  staff_ids: string[]
  max_bookings_per_slot: number
}

export interface BookingStaff {
  id: string
  name: string
  role: string
  photo_url: string | null
  bio: string | null
}

export interface BookingPayload {
  service_id: string
  staff_id: string
  appointment_date: string
  slot_start: string
  slot_end: string
  payment_method: 'cash_on_arrival'
  customer_name: string
  customer_email?: string
  customer_phone?: string
}

export interface Appointment {
  id: string
  business_id: string
  service_id: string
  staff_id: string | null
  appointment_date: string
  slot_start: string
  slot_end: string
  payment_method: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  status: string
  created_at: string
}
