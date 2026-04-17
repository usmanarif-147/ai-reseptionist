import { BookingSummary } from './BookingSummary'
import type { CustomerInfo, Service, Slot, StaffMember } from './types'

interface StepConfirmProps {
  service: Service
  staff: StaffMember
  date: string
  slot: Slot
  paymentMethod: 'cash_on_arrival'
  customerInfo: CustomerInfo
  onChange: (info: CustomerInfo) => void
  validationError: string | null
}

export function StepConfirm({
  service,
  staff,
  date,
  slot,
  paymentMethod,
  customerInfo,
  onChange,
  validationError,
}: StepConfirmProps) {
  function update<K extends keyof CustomerInfo>(key: K, value: CustomerInfo[K]) {
    onChange({ ...customerInfo, [key]: value })
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Your details</h2>
      <p className="mb-5 text-sm text-gray-500">
        We&apos;ll use this to confirm your appointment.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="customer-name" className="mb-1 block text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="customer-name"
            type="text"
            required
            value={customerInfo.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="Your full name"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="customer-email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="customer-email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="customer-phone" className="mb-1 block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="customer-phone"
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
          />
        </div>

        <p className="text-xs text-gray-500">Provide at least an email or phone number.</p>

        {validationError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationError}</p>
        )}
      </div>

      <div className="mt-6">
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
