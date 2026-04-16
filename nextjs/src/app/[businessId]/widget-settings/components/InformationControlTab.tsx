'use client'

export default function InformationControlTab({
  businessDetailsCount, showBusinessHours, setShowBusinessHours,
  servicesStatusLabel, staffStatusLabel, appointmentCount,
  setActiveModal, saving, onSave,
}: {
  businessDetailsCount: number
  showBusinessHours: boolean
  setShowBusinessHours: (v: boolean) => void
  servicesStatusLabel: string
  staffStatusLabel: string
  appointmentCount: number
  setActiveModal: (v: string | null) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">Control what the AI chatbot can share with customers.</p>

      <div className="divide-y divide-gray-100">
        {/* Business Details */}
        <div className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">Business Details</span>
            <span className="text-xs text-gray-400">{businessDetailsCount} of 4 fields visible</span>
          </div>
          <button
            onClick={() => setActiveModal('business-details')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Configure
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Business Hours */}
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm font-medium text-gray-900">Business Hours</span>
          <button
            type="button"
            role="switch"
            aria-checked={showBusinessHours}
            onClick={() => setShowBusinessHours(!showBusinessHours)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showBusinessHours ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showBusinessHours ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Services */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">Services</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{servicesStatusLabel}</span>
          </div>
          <button
            onClick={() => setActiveModal('services')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Configure
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Staff */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">Staff</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{staffStatusLabel}</span>
          </div>
          <button
            onClick={() => setActiveModal('staff')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Configure
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Appointments */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">Appointments</span>
            <span className="text-xs text-gray-400">{appointmentCount} of 7 fields visible</span>
          </div>
          <button
            onClick={() => setActiveModal('appointments')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Configure
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
