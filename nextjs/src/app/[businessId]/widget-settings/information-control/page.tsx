'use client'

import { useEffect, useState } from 'react'
import { type VisibilityMode } from '../components/shared'
import InfoControlSidebar, { type InfoCategory } from '../components/InfoControlSidebar'
import BusinessDetailsSection from '../components/info-sections/BusinessDetailsSection'
import BusinessHoursSection from '../components/info-sections/BusinessHoursSection'
import ServicesSection from '../components/info-sections/ServicesSection'
import StaffSection from '../components/info-sections/StaffSection'
import AppointmentsSection from '../components/info-sections/AppointmentsSection'

export default function InformationControlPage() {
  const [activeInfoSection, setActiveInfoSection] = useState<InfoCategory>('business-details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const [allServices, setAllServices] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])
  const [allStaff, setAllStaff] = useState<Array<{ id: string; name: string; is_active: boolean }>>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [widgetRes, servicesRes, staffRes] = await Promise.all([
        fetch('/api/business/widget'),
        fetch('/api/business/services'),
        fetch('/api/business/staff'),
      ])

      if (!cancelled && widgetRes.ok) {
        const data = await widgetRes.json()
        if (data) {
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

      if (!cancelled && servicesRes.ok) {
        const data = await servicesRes.json()
        setAllServices(data.map((s: { id: string; name: string; is_active: boolean }) => ({
          id: s.id, name: s.name, is_active: s.is_active,
        })))
      }

      if (!cancelled && staffRes.ok) {
        const data = await staffRes.json()
        setAllStaff(data.map((s: { id: string; name: string; is_active: boolean }) => ({
          id: s.id, name: s.name, is_active: s.is_active,
        })))
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveSettings() {
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/widget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save widget settings')
    } else {
      setSuccess('Widget settings saved successfully')
    }
    setSaving(false)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Information Control</h1>
      <p className="text-gray-500 text-sm mb-6">Control what the AI is allowed to reveal about your business</p>

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

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex">
          <div className="py-4 pl-4">
            <InfoControlSidebar activeSection={activeInfoSection} onSelect={setActiveInfoSection} />
          </div>

          <div className="flex-1 p-6 min-w-0">
            {activeInfoSection === 'business-details' && (
              <BusinessDetailsSection
                showBusinessName={showBusinessName}
                setShowBusinessName={setShowBusinessName}
                showContact={showContact}
                setShowContact={setShowContact}
                showAddress={showAddress}
                setShowAddress={setShowAddress}
                showBusinessType={showBusinessType}
                setShowBusinessType={setShowBusinessType}
              />
            )}

            {activeInfoSection === 'business-hours' && (
              <BusinessHoursSection
                showBusinessHours={showBusinessHours}
                setShowBusinessHours={setShowBusinessHours}
              />
            )}

            {activeInfoSection === 'services' && (
              <ServicesSection
                servicesVisibility={servicesVisibility}
                setServicesVisibility={setServicesVisibility}
                hiddenServiceIds={hiddenServiceIds}
                setHiddenServiceIds={setHiddenServiceIds}
                allServices={allServices}
              />
            )}

            {activeInfoSection === 'staff' && (
              <StaffSection
                staffVisibility={staffVisibility}
                setStaffVisibility={setStaffVisibility}
                hiddenStaffIds={hiddenStaffIds}
                setHiddenStaffIds={setHiddenStaffIds}
                allStaff={allStaff}
              />
            )}

            {activeInfoSection === 'appointments' && (
              <AppointmentsSection
                showAppointmentService={showAppointmentService}
                setShowAppointmentService={setShowAppointmentService}
                showAppointmentStaff={showAppointmentStaff}
                setShowAppointmentStaff={setShowAppointmentStaff}
                showAppointmentDatetime={showAppointmentDatetime}
                setShowAppointmentDatetime={setShowAppointmentDatetime}
                showAppointmentDuration={showAppointmentDuration}
                setShowAppointmentDuration={setShowAppointmentDuration}
                showAppointmentPaymentType={showAppointmentPaymentType}
                setShowAppointmentPaymentType={setShowAppointmentPaymentType}
                showAppointmentPaymentStatus={showAppointmentPaymentStatus}
                setShowAppointmentPaymentStatus={setShowAppointmentPaymentStatus}
                showAppointmentNotes={showAppointmentNotes}
                setShowAppointmentNotes={setShowAppointmentNotes}
              />
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-80 mb-6" />
      <div className="bg-white rounded-xl border border-gray-100 h-96" />
    </div>
  )
}
