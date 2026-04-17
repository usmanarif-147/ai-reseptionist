import type { AppointmentStatus, PaymentMethod } from './types'

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash_on_arrival: 'Cash on Arrival',
  paid_cash: 'Paid (Cash)',
  paid_online: 'Paid (Online)',
}

const PAYMENT_CLASSES: Record<PaymentMethod, string> = {
  cash_on_arrival: 'bg-yellow-50 text-yellow-700',
  paid_cash: 'bg-green-50 text-green-700',
  paid_online: 'bg-green-50 text-green-700',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PaymentBadge({ method }: { method: PaymentMethod }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_CLASSES[method]}`}
    >
      {PAYMENT_LABELS[method]}
    </span>
  )
}
