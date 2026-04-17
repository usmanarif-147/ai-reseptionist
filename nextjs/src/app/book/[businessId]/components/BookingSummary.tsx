import type { Service, StaffMember, Slot } from './types'

interface BookingSummaryProps {
  service: Service
  staff: StaffMember
  date: string
  slot: Slot
  paymentMethod: 'cash_on_arrival'
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function BookingSummary({ service, staff, date, slot, paymentMethod }: BookingSummaryProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Booking summary
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Service</dt>
          <dd className="text-right font-medium text-gray-900">
            {service.name} <span className="text-blue-600">${service.price}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Staff</dt>
          <dd className="text-right font-medium text-gray-900">{staff.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Date</dt>
          <dd className="text-right font-medium text-gray-900">{formatDate(date)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Time</dt>
          <dd className="text-right font-medium text-gray-900">
            {formatTime(slot.start)} – {formatTime(slot.end)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">Payment</dt>
          <dd className="text-right font-medium text-gray-900">
            {paymentMethod === 'cash_on_arrival' ? 'Cash on Arrival' : paymentMethod}
          </dd>
        </div>
      </dl>
    </div>
  )
}
