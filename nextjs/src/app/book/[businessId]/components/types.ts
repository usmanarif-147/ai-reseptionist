export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  staff_ids: string[]
  max_bookings_per_slot: number
}

export interface StaffMember {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  bio: string | null
}

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

export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export type PaymentMethod = 'cash_on_arrival'

export interface Appointment {
  id: string
  business_id: string
  service_id: string
  staff_id: string
  appointment_date: string
  slot_start: string
  slot_end: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  payment_method: PaymentMethod
  status: string
  created_at: string
}
