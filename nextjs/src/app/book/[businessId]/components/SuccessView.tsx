import { BookingSummary } from './BookingSummary'
import type { Service, Slot, StaffMember } from './types'

interface SuccessViewProps {
  service: Service
  staff: StaffMember
  date: string
  slot: Slot
  paymentMethod: 'cash_on_arrival'
  customerName: string
}

export function SuccessView({
  service,
  staff,
  date,
  slot,
  paymentMethod,
  customerName,
}: SuccessViewProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-9 w-9 animate-[pulse_1.5s_ease-in-out_1] text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mb-1 text-2xl font-semibold text-gray-900">Booking Confirmed!</h2>
      <p className="mb-6 text-sm text-gray-600">
        Thanks {customerName.split(' ')[0] || ''}, we&apos;ve booked your appointment.
      </p>
      <div className="text-left">
        <BookingSummary
          service={service}
          staff={staff}
          date={date}
          slot={slot}
          paymentMethod={paymentMethod}
        />
      </div>
    </div>
  )
}
