'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const PRESET_COLORS = [
  '#2563EB', // blue-600
  '#7C3AED', // violet-600
  '#DB2777', // pink-600
  '#DC2626', // red-600
  '#EA580C', // orange-600
  '#16A34A', // green-600
  '#0D9488', // teal-600
  '#1F2937', // gray-800
]

type VisibilityMode = 'active_only' | 'all' | 'hide_specific'

function Modal({ title, subtitle, onClose, children }: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{subtitle}</p>
        {children}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WidgetPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [color, setColor] = useState('#2563EB')
  const [welcomeMessage, setWelcomeMessage] = useState('Hi there! How can I help you today?')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  // Visibility settings — all off by default (mirrors DEFAULT_VISIBILITY_SETTINGS in build-system-prompt.ts)
  const [showBusinessName, setShowBusinessName] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [showBusinessType, setShowBusinessType] = useState(false)
  const [showBusinessHours, setShowBusinessHours] = useState(false)
  const [servicesVisibility, setServicesVisibility] = useState<VisibilityMode>('active_only')
  const [hiddenServiceIds, setHiddenServiceIds] = useState<string[]>([])
  const [staffVisibility, setStaffVisibility] = useState<VisibilityMode>('active_only')
  const [hiddenStaffIds, setHiddenStaffIds] = useState<string[]>([])
  const [showAppointmentService, setShowAppointmentService] = useState(false)
  const [showAppointmentStaff, setShowAppointmentStaff] = useState(false)
  const [showAppointmentDatetime, setShowAppointmentDatetime] = useState(false)
  const [showAppointmentDuration, setShowAppointmentDuration] = useState(false)
  const [showAppointmentPaymentType, setShowAppointmentPaymentType] = useState(false)
  const [showAppointmentPaymentStatus, setShowAppointmentPaymentStatus] = useState(false)
  const [showAppointmentNotes, setShowAppointmentNotes] = useState(false)

  // Modal state
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [serviceSearch, setServiceSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')

  // Data for hide-specific lists
  const [allServices, setAllServices] = useState<Array<{id: string, name: string, is_active: boolean}>>([])
  const [allStaff, setAllStaff] = useState<Array<{id: string, name: string, is_active: boolean}>>([])

  useEffect(() => { loadWidget() }, [businessId])

  async function loadWidget() {
    setLoading(true)
    const [widgetRes, servicesRes, staffRes] = await Promise.all([
      fetch('/api/business/widget'),
      fetch('/api/business/services'),
      fetch('/api/business/staff'),
    ])

    if (widgetRes.ok) {
      const data = await widgetRes.json()
      if (data) {
        setColor(data.color || '#2563EB')
        setWelcomeMessage(data.welcome_message || 'Hi there! How can I help you today?')
        setShowBusinessName(data.show_business_name ?? false)
        setShowContact(data.show_contact ?? false)
        setShowAddress(data.show_address ?? false)
        setShowBusinessType(data.show_business_type ?? false)
        setShowBusinessHours(data.show_business_hours ?? false)
        setServicesVisibility(data.services_visibility ?? 'active_only')
        setHiddenServiceIds(data.hidden_service_ids ?? [])
        setStaffVisibility(data.staff_visibility ?? 'active_only')
        setHiddenStaffIds(data.hidden_staff_ids ?? [])
        setShowAppointmentService(data.show_appointment_service ?? false)
        setShowAppointmentStaff(data.show_appointment_staff ?? false)
        setShowAppointmentDatetime(data.show_appointment_datetime ?? false)
        setShowAppointmentDuration(data.show_appointment_duration ?? false)
        setShowAppointmentPaymentType(data.show_appointment_payment_type ?? false)
        setShowAppointmentPaymentStatus(data.show_appointment_payment_status ?? false)
        setShowAppointmentNotes(data.show_appointment_notes ?? false)
      }
    }

    if (servicesRes.ok) {
      const data = await servicesRes.json()
      setAllServices(data.map((s: { id: string; name: string; is_active: boolean }) => ({
        id: s.id, name: s.name, is_active: s.is_active,
      })))
    }

    if (staffRes.ok) {
      const data = await staffRes.json()
      setAllStaff(data.map((s: { id: string; name: string; is_active: boolean }) => ({
        id: s.id, name: s.name, is_active: s.is_active,
      })))
    }

    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/widget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        color,
        welcome_message: welcomeMessage,
        show_business_name: showBusinessName,
        show_contact: showContact,
        show_address: showAddress,
        show_business_type: showBusinessType,
        show_business_hours: showBusinessHours,
        services_visibility: servicesVisibility,
        hidden_service_ids: hiddenServiceIds,
        staff_visibility: staffVisibility,
        hidden_staff_ids: hiddenStaffIds,
        show_appointment_service: showAppointmentService,
        show_appointment_staff: showAppointmentStaff,
        show_appointment_datetime: showAppointmentDatetime,
        show_appointment_duration: showAppointmentDuration,
        show_appointment_payment_type: showAppointmentPaymentType,
        show_appointment_payment_status: showAppointmentPaymentStatus,
        show_appointment_notes: showAppointmentNotes,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save widget settings')
      setSaving(false)
      return
    }

    setSuccess('Widget settings saved successfully')
    setSaving(false)
  }

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-business-id="${businessId}"></script>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const businessDetailsCount = [showBusinessName, showContact, showAddress, showBusinessType].filter(Boolean).length
  const appointmentCount = [
    showAppointmentService, showAppointmentStaff, showAppointmentDatetime,
    showAppointmentDuration, showAppointmentPaymentType, showAppointmentPaymentStatus,
    showAppointmentNotes,
  ].filter(Boolean).length

  function servicesStatusLabel(): string {
    if (servicesVisibility === 'all') return 'All'
    if (servicesVisibility === 'hide_specific') return `${hiddenServiceIds.length} hidden`
    return 'Active only'
  }

  function staffStatusLabel(): string {
    if (staffVisibility === 'all') return 'All'
    if (staffVisibility === 'hide_specific') return `${hiddenStaffIds.length} hidden`
    return 'Active only'
  }

  const filteredServices = allServices.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  )
  const filteredStaff = allStaff.filter((s) =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase())
  )

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Widget Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Customize how the chat widget looks on your website</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Appearance</h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Widget Color</label>
              <div className="flex items-center gap-3 mb-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First message your customers will see"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Preview</h2>

          <div className="bg-gray-50 rounded-lg p-6 flex items-end justify-end min-h-[300px]">
            <div className="w-72">
              {/* Chat window preview */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                <div className="px-4 py-3 text-white text-sm font-medium" style={{ backgroundColor: color }}>
                  AI Receptionist
                </div>
                <div className="p-4 min-h-[120px]">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 inline-block max-w-[220px]">
                    {welcomeMessage}
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400">
                    Type a message...
                  </div>
                </div>
              </div>

              {/* Bubble */}
              <div className="flex justify-end mt-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Control */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6 max-w-4xl">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Information Control</h2>
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
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{servicesStatusLabel()}</span>
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
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{staffStatusLabel()}</span>
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
          <div className="flex items-center justify-between py-3.5 last:pb-0">
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
      </div>

      {/* Embed Code */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6 max-w-4xl">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Embed Code</h2>
        <p className="text-sm text-gray-500 mb-4">
          Copy this code and paste it before the closing <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on your website.
        </p>

        <div className="relative">
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbed}
            className="absolute top-3 right-3 bg-gray-700 text-gray-200 px-3 py-1.5 rounded text-xs hover:bg-gray-600 font-medium"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Business Details Modal */}
      {activeModal === 'business-details' && (
        <Modal
          title="Business Details Visibility"
          subtitle="Choose which business information the AI can share with customers."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-3">
            {([
              ['Show Business Name', showBusinessName, setShowBusinessName],
              ['Show Contact Information (phone, email)', showContact, setShowContact],
              ['Show Address', showAddress, setShowAddress],
              ['Show Business Type', showBusinessType, setShowBusinessType],
            ] as const).map(([label, value, setter]) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}

      {/* Services Modal */}
      {activeModal === 'services' && (
        <Modal
          title="Services Visibility"
          subtitle="Control which services the AI can discuss with customers."
          onClose={() => { setActiveModal(null); setServiceSearch('') }}
        >
          <div className="space-y-3">
            {([
              ['active_only', 'Active services only (default)'],
              ['all', 'All services (including inactive)'],
              ['hide_specific', 'Hide specific services'],
            ] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="services_visibility"
                  checked={servicesVisibility === val}
                  onChange={() => setServicesVisibility(val)}
                  className="w-4 h-4 border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {servicesVisibility === 'hide_specific' && (
            <div className="mt-4">
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              {filteredServices.length === 0 ? (
                <p className="text-sm text-gray-400">No services found.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredServices.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hiddenServiceIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setHiddenServiceIds([...hiddenServiceIds, s.id])
                          else setHiddenServiceIds(hiddenServiceIds.filter((id) => id !== s.id))
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {s.name}
                        {!s.is_active && (
                          <span className="ml-1.5 text-xs text-gray-400">(inactive)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Staff Modal */}
      {activeModal === 'staff' && (
        <Modal
          title="Staff Visibility"
          subtitle="Control which staff members the AI can mention to customers."
          onClose={() => { setActiveModal(null); setStaffSearch('') }}
        >
          <div className="space-y-3">
            {([
              ['active_only', 'Active staff only (default)'],
              ['all', 'All staff (including inactive)'],
              ['hide_specific', 'Hide specific staff members'],
            ] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="staff_visibility"
                  checked={staffVisibility === val}
                  onChange={() => setStaffVisibility(val)}
                  className="w-4 h-4 border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {staffVisibility === 'hide_specific' && (
            <div className="mt-4">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              {filteredStaff.length === 0 ? (
                <p className="text-sm text-gray-400">No staff found.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredStaff.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hiddenStaffIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setHiddenStaffIds([...hiddenStaffIds, s.id])
                          else setHiddenStaffIds(hiddenStaffIds.filter((id) => id !== s.id))
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {s.name}
                        {!s.is_active && (
                          <span className="ml-1.5 text-xs text-gray-400">(inactive)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Appointments Modal */}
      {activeModal === 'appointments' && (
        <Modal
          title="Appointment Details Visibility"
          subtitle="When a customer looks up their appointment, choose what details the AI can share."
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-3">
            {([
              ['Service name', showAppointmentService, setShowAppointmentService],
              ['Staff member', showAppointmentStaff, setShowAppointmentStaff],
              ['Date & time', showAppointmentDatetime, setShowAppointmentDatetime],
              ['Duration', showAppointmentDuration, setShowAppointmentDuration],
              ['Payment type', showAppointmentPaymentType, setShowAppointmentPaymentType],
              ['Payment status', showAppointmentPaymentStatus, setShowAppointmentPaymentStatus],
              ['Notes', showAppointmentNotes, setShowAppointmentNotes],
            ] as const).map(([label, value, setter]) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-72 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-full" />
            <div className="h-20 bg-gray-200 rounded w-full" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-20 mb-4" />
          <div className="bg-gray-100 rounded-lg h-[300px]" />
        </div>
      </div>
    </div>
  )
}
