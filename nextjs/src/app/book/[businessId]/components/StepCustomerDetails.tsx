import type { CustomerInfo } from './types'

interface StepCustomerDetailsProps {
  value: CustomerInfo
  onChange: (info: CustomerInfo) => void
  validationError: string | null
}

export function StepCustomerDetails({
  value,
  onChange,
  validationError,
}: StepCustomerDetailsProps) {
  function update<K extends keyof CustomerInfo>(key: K, next: CustomerInfo[K]) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Your details</h2>
      <p className="mb-5 text-sm text-gray-500">
        We&apos;ll use this to confirm your appointment.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="customer-details-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="customer-details-name"
            type="text"
            required
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="Your full name"
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="customer-details-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="customer-details-email"
            type="email"
            required
            value={value.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="customer-details-phone"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Phone
          </label>
          <input
            id="customer-details-phone"
            type="tel"
            value={value.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
          />
        </div>

        {validationError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationError}</p>
        )}
      </div>
    </div>
  )
}
