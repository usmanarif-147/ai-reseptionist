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

const AVATAR_OPTIONS = [
  { id: 'robot', label: 'Robot', emoji: '\uD83E\uDD16' },
  { id: 'wave', label: 'Wave', emoji: '\uD83D\uDC4B' },
  { id: 'sparkles', label: 'Sparkles', emoji: '\u2728' },
  { id: 'headset', label: 'Headset', emoji: '\uD83C\uDFA7' },
  { id: 'star', label: 'Star', emoji: '\u2B50' },
  { id: 'heart', label: 'Heart', emoji: '\u2764\uFE0F' },
  { id: 'lightning', label: 'Lightning', emoji: '\u26A1' },
  { id: 'speech', label: 'Speech', emoji: '\uD83D\uDCAC' },
  { id: 'bulb', label: 'Bulb', emoji: '\uD83D\uDCA1' },
  { id: 'check', label: 'Check', emoji: '\u2705' },
  { id: 'smile', label: 'Smile', emoji: '\uD83D\uDE0A' },
  { id: 'rocket', label: 'Rocket', emoji: '\uD83D\uDE80' },
]

const BORDER_RADIUS_OPTIONS = [
  { id: 'sharp', label: 'Sharp', value: '4px' },
  { id: 'rounded', label: 'Rounded', value: '14px' },
  { id: 'pill', label: 'Pill', value: '28px' },
]

type VisibilityMode = 'active_only' | 'all' | 'hide_specific'
type TooltipPosition = 'side' | 'above'
type TypingIndicatorStyle = 'animated_dots' | 'text_only' | 'disabled'
type IntentBorderRadius = 'sharp' | 'rounded' | 'pill'

interface AppearanceSettings {
  color: string
  welcome_message: string
  tooltip_enabled: boolean
  tooltip_text: string
  tooltip_bg_color: string
  tooltip_text_color: string
  tooltip_position: TooltipPosition
  intent_title: string
  intent_description: string
  intent_color_1: string
  intent_color_2: string
  intent_color_3: string
  intent_border_radius: IntentBorderRadius
  avatar_enabled: boolean
  avatar_selection: string
  header_show_status: boolean
  header_title: string
  header_subtitle: string
  typing_indicator_style: TypingIndicatorStyle
  session_ended_enabled: boolean
  session_ended_icon: string
  session_ended_title: string
  session_ended_message: string
  session_expired_enabled: boolean
  session_expired_icon: string
  session_expired_title: string
  session_expired_message: string
  feedback_enabled: boolean
  feedback_prompt_title: string
  feedback_note_placeholder: string
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  color: '#2563EB',
  welcome_message: 'Hi there! How can I help you today?',
  tooltip_enabled: true,
  tooltip_text: 'Ask us anything \u2014 we reply instantly 24/7',
  tooltip_bg_color: '#FFFFFF',
  tooltip_text_color: '#1F2937',
  tooltip_position: 'side',
  intent_title: 'How can we help you?',
  intent_description: 'Select an option to get started',
  intent_color_1: '#3B82F6',
  intent_color_2: '#10B981',
  intent_color_3: '#F59E0B',
  intent_border_radius: 'rounded',
  avatar_enabled: true,
  avatar_selection: 'robot',
  header_show_status: true,
  header_title: 'Chat with us',
  header_subtitle: 'We reply instantly',
  typing_indicator_style: 'animated_dots',
  session_ended_enabled: true,
  session_ended_icon: '\uD83D\uDC4B',
  session_ended_title: 'Chat Ended',
  session_ended_message: 'Thank you for reaching out! We hope we answered all your questions.',
  session_expired_enabled: true,
  session_expired_icon: '\u23F0',
  session_expired_title: 'Session Expired',
  session_expired_message: 'Your session ended due to inactivity. Start a new chat anytime.',
  feedback_enabled: true,
  feedback_prompt_title: 'How was your experience?',
  feedback_note_placeholder: 'Leave a message for the business (optional)',
}

interface TabDefinition {
  id: string
  label: string
}

const TABS: TabDefinition[] = [
  { id: 'appearance', label: 'Appearance Settings' },
  { id: 'information', label: 'Information Control' },
]

function TabBar({ tabs, activeTab, onTabChange }: {
  tabs: TabDefinition[]
  activeTab: string
  onTabChange: (id: string) => void
}) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-0 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

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

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function ColorPickerField({ label, value, onChange, presets }: {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: string[]
}) {
  const colors = presets || PRESET_COLORS
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              value.toUpperCase() === c.toUpperCase() ? 'border-gray-900 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-gray-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}

function SectionDivider() {
  return <hr className="border-gray-100 my-6" />
}

export default function WidgetPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [activeTab, setActiveTab] = useState('appearance')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  // Appearance settings
  const [appearance, setAppearance] = useState<AppearanceSettings>({ ...DEFAULT_APPEARANCE })

  // Visibility settings
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

  function updateAppearance<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) {
    setAppearance(prev => ({ ...prev, [key]: value }))
  }

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
        setAppearance({
          color: data.color || DEFAULT_APPEARANCE.color,
          welcome_message: data.welcome_message || DEFAULT_APPEARANCE.welcome_message,
          tooltip_enabled: data.tooltip_enabled ?? DEFAULT_APPEARANCE.tooltip_enabled,
          tooltip_text: data.tooltip_text || DEFAULT_APPEARANCE.tooltip_text,
          tooltip_bg_color: data.tooltip_bg_color || DEFAULT_APPEARANCE.tooltip_bg_color,
          tooltip_text_color: data.tooltip_text_color || DEFAULT_APPEARANCE.tooltip_text_color,
          tooltip_position: data.tooltip_position || DEFAULT_APPEARANCE.tooltip_position,
          intent_title: data.intent_title || DEFAULT_APPEARANCE.intent_title,
          intent_description: data.intent_description || DEFAULT_APPEARANCE.intent_description,
          intent_color_1: data.intent_color_1 || DEFAULT_APPEARANCE.intent_color_1,
          intent_color_2: data.intent_color_2 || DEFAULT_APPEARANCE.intent_color_2,
          intent_color_3: data.intent_color_3 || DEFAULT_APPEARANCE.intent_color_3,
          intent_border_radius: data.intent_border_radius || DEFAULT_APPEARANCE.intent_border_radius,
          avatar_enabled: data.avatar_enabled ?? DEFAULT_APPEARANCE.avatar_enabled,
          avatar_selection: data.avatar_selection || DEFAULT_APPEARANCE.avatar_selection,
          header_show_status: data.header_show_status ?? DEFAULT_APPEARANCE.header_show_status,
          header_title: data.header_title || DEFAULT_APPEARANCE.header_title,
          header_subtitle: data.header_subtitle || DEFAULT_APPEARANCE.header_subtitle,
          typing_indicator_style: data.typing_indicator_style || DEFAULT_APPEARANCE.typing_indicator_style,
          session_ended_enabled: data.session_ended_enabled ?? DEFAULT_APPEARANCE.session_ended_enabled,
          session_ended_icon: data.session_ended_icon || DEFAULT_APPEARANCE.session_ended_icon,
          session_ended_title: data.session_ended_title || DEFAULT_APPEARANCE.session_ended_title,
          session_ended_message: data.session_ended_message || DEFAULT_APPEARANCE.session_ended_message,
          session_expired_enabled: data.session_expired_enabled ?? DEFAULT_APPEARANCE.session_expired_enabled,
          session_expired_icon: data.session_expired_icon || DEFAULT_APPEARANCE.session_expired_icon,
          session_expired_title: data.session_expired_title || DEFAULT_APPEARANCE.session_expired_title,
          session_expired_message: data.session_expired_message || DEFAULT_APPEARANCE.session_expired_message,
          feedback_enabled: data.feedback_enabled ?? DEFAULT_APPEARANCE.feedback_enabled,
          feedback_prompt_title: data.feedback_prompt_title || DEFAULT_APPEARANCE.feedback_prompt_title,
          feedback_note_placeholder: data.feedback_note_placeholder || DEFAULT_APPEARANCE.feedback_note_placeholder,
        })
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

  async function saveSettings() {
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/widget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appearance,
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
    } else {
      setSuccess('Widget settings saved successfully')
    }
    setSaving(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await saveSettings()
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
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Widget Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Customize how the chat widget looks on your website</p>

      {/* Embed Code */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 max-w-4xl">
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

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-4xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-4xl">
          {success}
        </div>
      )}

      {/* Tabbed Settings Section */}
      <div className="bg-white rounded-xl border border-gray-100 max-w-4xl">
        <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-6">
          {activeTab === 'appearance' && (
            <AppearanceTab
              appearance={appearance}
              updateAppearance={updateAppearance}
              saving={saving}
              onSave={handleSave}
            />
          )}

          {activeTab === 'information' && (
            <InformationControlTab
              businessDetailsCount={businessDetailsCount}
              showBusinessHours={showBusinessHours}
              setShowBusinessHours={setShowBusinessHours}
              servicesStatusLabel={servicesStatusLabel()}
              staffStatusLabel={staffStatusLabel()}
              appointmentCount={appointmentCount}
              setActiveModal={setActiveModal}
              saving={saving}
              onSave={saveSettings}
            />
          )}
        </div>
      </div>

      {/* Modals */}
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

// --- Appearance Tab ---

function AppearanceTab({
  appearance, updateAppearance, saving, onSave,
}: {
  appearance: AppearanceSettings
  updateAppearance: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void
  saving: boolean
  onSave: (e: React.FormEvent) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Settings Column */}
      <div>
        <form onSubmit={onSave} className="space-y-0">

          {/* A. General */}
          <SectionHeading title="General" description="Primary brand color for your widget" />
          <ColorPickerField
            label="Widget Color"
            value={appearance.color}
            onChange={(v) => updateAppearance('color', v)}
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
            <textarea
              value={appearance.welcome_message}
              onChange={(e) => updateAppearance('welcome_message', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First message your customers will see"
            />
          </div>

          <SectionDivider />

          {/* B. Tooltip */}
          <SectionHeading title="Tooltip" description="Speech bubble shown next to the launcher button" />
          <div className="space-y-4">
            <Toggle
              label="Enable Tooltip"
              description="Show a tooltip next to the chat button"
              enabled={appearance.tooltip_enabled}
              onChange={(v) => updateAppearance('tooltip_enabled', v)}
            />
            {appearance.tooltip_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip Text</label>
                  <input
                    type="text"
                    value={appearance.tooltip_text}
                    onChange={(e) => updateAppearance('tooltip_text', e.target.value)}
                    maxLength={100}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <ColorPickerField
                  label="Background Color"
                  value={appearance.tooltip_bg_color}
                  onChange={(v) => updateAppearance('tooltip_bg_color', v)}
                  presets={['#FFFFFF', '#F3F4F6', '#1F2937', '#2563EB', '#7C3AED', '#DC2626', '#16A34A', '#F59E0B']}
                />
                <ColorPickerField
                  label="Text Color"
                  value={appearance.tooltip_text_color}
                  onChange={(v) => updateAppearance('tooltip_text_color', v)}
                  presets={['#1F2937', '#FFFFFF', '#374151', '#6B7280', '#2563EB', '#DC2626', '#16A34A', '#7C3AED']}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tooltip Position</label>
                  <div className="flex gap-3">
                    {([
                      ['side', 'Side of button'],
                      ['above', 'Above button'],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateAppearance('tooltip_position', val)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          appearance.tooltip_position === val
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <SectionDivider />

          {/* C. Intent Selection */}
          <SectionHeading title="Intent Selection" description="The screen where visitors choose what they need help with" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={appearance.intent_title}
                onChange={(e) => updateAppearance('intent_title', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={appearance.intent_description}
                onChange={(e) => updateAppearance('intent_description', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <ColorPickerField
              label="Basic Information Color"
              value={appearance.intent_color_1}
              onChange={(v) => updateAppearance('intent_color_1', v)}
              presets={['#3b82f6', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#16A34A', '#0D9488']}
            />
            <ColorPickerField
              label="Book Appointment Color"
              value={appearance.intent_color_2}
              onChange={(v) => updateAppearance('intent_color_2', v)}
              presets={['#10b981', '#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#F59E0B']}
            />
            <ColorPickerField
              label="Appointment Details Color"
              value={appearance.intent_color_3}
              onChange={(v) => updateAppearance('intent_color_3', v)}
              presets={['#f59e0b', '#F97316', '#EA580C', '#DC2626', '#DB2777', '#7C3AED', '#2563EB', '#16A34A']}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Button Border Radius</label>
              <div className="flex gap-3">
                {BORDER_RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateAppearance('intent_border_radius', opt.id as IntentBorderRadius)}
                    className={`px-4 py-2 text-sm font-medium border transition-colors ${
                      appearance.intent_border_radius === opt.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={{ borderRadius: opt.value }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* D. Chat Conversation */}
          <SectionHeading title="Chat Conversation" description="Bot avatar shown next to messages" />
          <div className="space-y-4">
            <Toggle
              label="Show Avatar"
              description="Display an avatar next to bot messages"
              enabled={appearance.avatar_enabled}
              onChange={(v) => updateAppearance('avatar_enabled', v)}
            />
            {appearance.avatar_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateAppearance('avatar_selection', opt.id)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2 transition-colors ${
                        appearance.avatar_selection === opt.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={opt.label}
                    >
                      {opt.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SectionDivider />

          {/* E. Widget Header */}
          <SectionHeading title="Widget Header" description="Title, subtitle, and online status in the header" />
          <div className="space-y-4">
            <Toggle
              label="Show Online Status"
              description="Display online indicator in the header"
              enabled={appearance.header_show_status}
              onChange={(v) => updateAppearance('header_show_status', v)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header Title</label>
              <input
                type="text"
                value={appearance.header_title}
                onChange={(e) => updateAppearance('header_title', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header Subtitle</label>
              <input
                type="text"
                value={appearance.header_subtitle}
                onChange={(e) => updateAppearance('header_subtitle', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <SectionDivider />

          {/* F. Typing Indicator */}
          <SectionHeading title="Typing Indicator" description="How the typing state is shown while the AI responds" />
          <div>
            <div className="flex gap-3 flex-wrap">
              {([
                ['animated_dots', 'Animated Dots'],
                ['text_only', 'Text Only'],
                ['disabled', 'Disabled'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateAppearance('typing_indicator_style', val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    appearance.typing_indicator_style === val
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SectionDivider />

          {/* G. Session Ended */}
          <SectionHeading title="Session Ended" description="Shown when a chat session ends normally" />
          <div className="space-y-4">
            <Toggle
              label="Enable Session Ended Screen"
              description="Show a custom screen when the session ends"
              enabled={appearance.session_ended_enabled}
              onChange={(v) => updateAppearance('session_ended_enabled', v)}
            />
            {appearance.session_ended_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon / Emoji</label>
                  <input
                    type="text"
                    value={appearance.session_ended_icon}
                    onChange={(e) => updateAppearance('session_ended_icon', e.target.value)}
                    maxLength={4}
                    className="w-16 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={appearance.session_ended_title}
                    onChange={(e) => updateAppearance('session_ended_title', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={appearance.session_ended_message}
                    onChange={(e) => updateAppearance('session_ended_message', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <SectionDivider />

          {/* H. Session Expired */}
          <SectionHeading title="Session Expired" description="Shown when a session times out from inactivity" />
          <div className="space-y-4">
            <Toggle
              label="Enable Session Expired Screen"
              description="Show a custom screen when the session expires"
              enabled={appearance.session_expired_enabled}
              onChange={(v) => updateAppearance('session_expired_enabled', v)}
            />
            {appearance.session_expired_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon / Emoji</label>
                  <input
                    type="text"
                    value={appearance.session_expired_icon}
                    onChange={(e) => updateAppearance('session_expired_icon', e.target.value)}
                    maxLength={4}
                    className="w-16 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={appearance.session_expired_title}
                    onChange={(e) => updateAppearance('session_expired_title', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={appearance.session_expired_message}
                    onChange={(e) => updateAppearance('session_expired_message', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <SectionDivider />

          {/* I. Feedback */}
          <SectionHeading title="Feedback" description="Star rating and feedback form shown after chat ends" />
          <div className="space-y-4">
            <Toggle
              label="Enable Feedback Prompt"
              description="Show the feedback form after a conversation ends"
              enabled={appearance.feedback_enabled}
              onChange={(v) => updateAppearance('feedback_enabled', v)}
            />
            {appearance.feedback_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Title</label>
                  <input
                    type="text"
                    value={appearance.feedback_prompt_title}
                    onChange={(e) => updateAppearance('feedback_prompt_title', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note Placeholder</label>
                  <input
                    type="text"
                    value={appearance.feedback_note_placeholder}
                    onChange={(e) => updateAppearance('feedback_note_placeholder', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Appearance'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Column */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Live Preview</h3>
        <div className="bg-gray-50 rounded-lg p-6 sticky top-8">
          <WidgetPreview appearance={appearance} />
        </div>
      </div>
    </div>
  )
}

// --- Widget Preview ---

function WidgetPreview({ appearance }: { appearance: AppearanceSettings }) {
  const [previewScreen, setPreviewScreen] = useState<'intent' | 'chat' | 'ended' | 'expired' | 'feedback'>('intent')
  const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === appearance.avatar_selection) || AVATAR_OPTIONS[0]
  const borderRadiusValue = BORDER_RADIUS_OPTIONS.find(b => b.id === appearance.intent_border_radius)?.value || '14px'

  return (
    <div>
      {/* Screen selector */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {([
          ['intent', 'Intent'],
          ['chat', 'Chat'],
          ['feedback', 'Feedback'],
          ['ended', 'Ended'],
          ['expired', 'Expired'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setPreviewScreen(val)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              previewScreen === val
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Widget Preview */}
      <div className="w-full max-w-[310px] mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="px-4 py-3 text-white flex justify-between items-center" style={{ backgroundColor: appearance.color }}>
            <div>
              <div className="text-sm font-bold leading-tight">{appearance.header_title}</div>
              {appearance.header_show_status && (
                <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {appearance.header_subtitle}
                </div>
              )}
              {!appearance.header_show_status && (
                <div className="text-[11px] opacity-80 mt-0.5">{appearance.header_subtitle}</div>
              )}
            </div>
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">
              &#x2715;
            </div>
          </div>

          {/* Body */}
          <div className="min-h-[260px] max-h-[260px] overflow-hidden">

            {/* Intent Screen */}
            {previewScreen === 'intent' && (
              <div className="p-4 flex flex-col gap-2.5">
                <div className="text-center pb-1">
                  <div className="text-sm font-bold text-gray-900">{appearance.intent_title}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{appearance.intent_description}</div>
                </div>
                {[
                  { color: appearance.intent_color_1, icon: '\uD83D\uDCAC', name: 'Basic Information', desc: 'Ask questions about our services' },
                  { color: appearance.intent_color_2, icon: '\uD83D\uDCC5', name: 'Book an Appointment', desc: 'Schedule a visit with us' },
                  { color: appearance.intent_color_3, icon: '\uD83D\uDD0D', name: 'Appointment Details', desc: 'Check or manage a booking' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 text-white text-left"
                    style={{ backgroundColor: item.color, borderRadius: borderRadiusValue }}
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{item.name}</div>
                      <div className="text-[10px] opacity-80">{item.desc}</div>
                    </div>
                    <span className="opacity-60 text-sm">{'\u203A'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Screen */}
            {previewScreen === 'chat' && (
              <div className="p-3 flex flex-col gap-2.5">
                {/* Bot message */}
                <div className="flex items-end gap-2">
                  {appearance.avatar_enabled && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: appearance.color }}
                    >
                      {selectedAvatar.emoji}
                    </div>
                  )}
                  <div className="bg-gray-100 rounded-xl rounded-bl px-3 py-2 text-xs text-gray-700 max-w-[200px]">
                    {appearance.welcome_message}
                  </div>
                </div>
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="rounded-xl rounded-br px-3 py-2 text-xs text-white max-w-[200px]"
                    style={{ backgroundColor: appearance.color }}
                  >
                    I&apos;d like to book an appointment
                  </div>
                </div>
                {/* Bot typing */}
                {appearance.typing_indicator_style !== 'disabled' && (
                  <div className="flex items-end gap-2">
                    {appearance.avatar_enabled && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{ backgroundColor: appearance.color }}
                      >
                        {selectedAvatar.emoji}
                      </div>
                    )}
                    <div className="bg-gray-100 rounded-xl rounded-bl px-3 py-2 text-xs text-gray-400">
                      {appearance.typing_indicator_style === 'animated_dots' ? (
                        <span className="inline-flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : (
                        'AI is typing...'
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Screen */}
            {previewScreen === 'feedback' && appearance.feedback_enabled && (
              <div className="p-4 flex flex-col items-center gap-3">
                <div className="text-sm font-bold text-gray-900 text-center">{appearance.feedback_prompt_title}</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className="text-2xl"
                      style={{ color: star <= 4 ? appearance.color : '#d1d5db' }}
                    >
                      {'\u2605'}
                    </span>
                  ))}
                </div>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">
                  {appearance.feedback_note_placeholder}
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: appearance.color }}
                  >
                    Submit Feedback
                  </button>
                  <button type="button" className="py-2 px-3 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {previewScreen === 'feedback' && !appearance.feedback_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Feedback prompt is disabled</p>
              </div>
            )}

            {/* Session Ended Screen */}
            {previewScreen === 'ended' && appearance.session_ended_enabled && (
              <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-3xl">{appearance.session_ended_icon}</span>
                <div className="text-sm font-bold text-gray-900">{appearance.session_ended_title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{appearance.session_ended_message}</div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: appearance.color }}
                >
                  Start New Conversation
                </button>
              </div>
            )}
            {previewScreen === 'ended' && !appearance.session_ended_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Session ended screen is disabled</p>
              </div>
            )}

            {/* Session Expired Screen */}
            {previewScreen === 'expired' && appearance.session_expired_enabled && (
              <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-3xl">{appearance.session_expired_icon}</span>
                <div className="text-sm font-bold text-gray-900">{appearance.session_expired_title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{appearance.session_expired_message}</div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: appearance.color }}
                >
                  Start New Conversation
                </button>
              </div>
            )}
            {previewScreen === 'expired' && !appearance.session_expired_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Session expired screen is disabled</p>
              </div>
            )}
          </div>

          {/* Input Area (chat screen only) */}
          {previewScreen === 'chat' && (
            <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2 items-center">
              <div className="flex-1 bg-gray-50 rounded-full px-3 py-1.5 text-xs text-gray-400 border border-gray-200">
                Type a message...
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: appearance.color }}
              >
                <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </div>
            </div>
          )}
        </div>

        {/* Tooltip Preview */}
        {appearance.tooltip_enabled && previewScreen === 'intent' && (
          <div className="flex justify-end mt-2 items-center gap-2">
            {appearance.tooltip_position === 'side' && (
              <>
                <div
                  className="rounded-lg px-2.5 py-1.5 text-[11px] shadow-sm max-w-[160px] leading-snug"
                  style={{ backgroundColor: appearance.tooltip_bg_color, color: appearance.tooltip_text_color }}
                >
                  {appearance.tooltip_text}
                </div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: appearance.color }}
                >
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
                </div>
              </>
            )}
            {appearance.tooltip_position === 'above' && (
              <div className="flex flex-col items-end gap-1.5">
                <div
                  className="rounded-lg px-2.5 py-1.5 text-[11px] shadow-sm max-w-[160px] leading-snug"
                  style={{ backgroundColor: appearance.tooltip_bg_color, color: appearance.tooltip_text_color }}
                >
                  {appearance.tooltip_text}
                </div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: appearance.color }}
                >
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Launcher only (no tooltip) */}
        {(!appearance.tooltip_enabled || previewScreen !== 'intent') && (
          <div className="flex justify-end mt-2">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: appearance.color }}
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Information Control Tab ---

function InformationControlTab({
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

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-72 mb-6" />
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 max-w-4xl">
        <div className="h-5 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 mb-4" />
        <div className="h-12 bg-gray-200 rounded w-full" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 max-w-4xl">
        <div className="border-b border-gray-200 px-5 py-3 flex gap-6">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-full" />
              <div className="h-20 bg-gray-200 rounded w-full" />
              <div className="h-8 bg-gray-200 rounded w-full" />
              <div className="h-20 bg-gray-200 rounded w-full" />
            </div>
            <div className="bg-gray-100 rounded-lg h-[400px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
