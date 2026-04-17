export interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
  is_active: boolean
  staff_ids: string[]
  max_bookings_per_slot: number
}

export interface Staff {
  id: string
  name: string
  role: string | null
  is_active: boolean
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

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed'
export type PaymentMethod = 'cash_on_arrival' | 'paid_cash' | 'paid_online'

export interface CalendarAppointment {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  service: { id: string; name: string } | null
  staff: { id: string; name: string } | null
  slot_start: string
  slot_end: string
  payment_method: PaymentMethod
  status: AppointmentStatus
  appointment_date: string
  notes?: string | null
}

export interface CalendarResponse {
  month: string
  days: Record<string, { count: number; appointments: CalendarAppointment[] }>
}
