import type { PaymentMethod } from './types'

interface StepPaymentProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

export function StepPayment({ value, onChange }: StepPaymentProps) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Payment method</h2>
      <p className="mb-5 text-sm text-gray-500">How would you like to pay?</p>

      <div className="space-y-3">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition-colors ${
            value === 'cash_on_arrival' ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={value === 'cash_on_arrival'}
            onChange={() => onChange('cash_on_arrival')}
            className="mt-1 h-4 w-4 text-blue-600"
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Cash on Arrival</p>
            <p className="text-sm text-gray-600">Pay in person at the time of your appointment.</p>
          </div>
        </label>

        <label
          className="flex cursor-not-allowed items-start gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 opacity-75"
          aria-disabled="true"
        >
          <input
            type="radio"
            name="paymentMethod"
            disabled
            className="mt-1 h-4 w-4"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-700">Online Transaction</p>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-500">Pay securely with card online.</p>
          </div>
        </label>
      </div>
    </div>
  )
}
