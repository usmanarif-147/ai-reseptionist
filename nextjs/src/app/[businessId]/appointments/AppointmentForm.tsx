'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import SlotSelector from './SlotSelector'
import { dayPickerClassNames } from '@/components/dashboard/dayPickerClassNames'
import { toDate, toIsoDate, todayIso } from './utils'
import type { DaySlots, Service, Slot, Staff } from './types'

export interface AppointmentFormValues {
  serviceId: string
  staffId: string
  appointmentDate: string
  slotStart: string
  slotEnd: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  paymentMethod: 'cash_on_arrival'
}

interface AppointmentFormProps {
  services: Service[]
  staff: Staff[]
  values: AppointmentFormValues
  onChange: (values: AppointmentFormValues) => void
  serviceLocked?: boolean
  showCustomerFields?: boolean
}

export default function AppointmentForm({
  services,
  staff,
  values,
  onChange,
  serviceLocked = false,
  showCustomerFields = true,
}: AppointmentFormProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState('')

  const selectedService = useMemo(
    () => services.find((s) => s.id === values.serviceId) ?? null,
    [services, values.serviceId],
  )

  const eligibleStaff = useMemo(() => {
    if (!selectedService) return staff.filter((s) => s.is_active)
    const allowed = new Set(selectedService.staff_ids || [])
    return staff.filter((s) => s.is_active && allowed.has(s.id))
  }, [selectedService, staff])

  // If the currently selected staff isn't eligible for the chosen service, clear it.
  // Skip while staff list hasn't loaded yet (prop is empty) to avoid wiping a valid edit-mode value.
  useEffect(() => {
    if (!values.staffId || staff.length === 0) return
    if (!eligibleStaff.some((s) => s.id === values.staffId)) {
      onChange({ ...values, staffId: '', slotStart: '', slotEnd: '' })
      setSlots([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleStaff, staff.length])

  // Fetch slots whenever service + staff + date all set
  useEffect(() => {
    const { serviceId, staffId, appointmentDate } = values
    if (!serviceId || !staffId || !appointmentDate) {
      setSlots([])
      return
    }
    let cancelled = false
    async function load() {
      setLoadingSlots(true)
      setSlotError('')
      try {
        const params = new URLSearchParams({
          serviceId,
          staffId,
          startDate: appointmentDate,
        })
        const res = await fetch(`/api/business/appointments/slots?${params.toString()}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load slots')
        }
        const data = await res.json()
        if (cancelled) return
        const daySlots: DaySlots[] = Array.isArray(data) ? data : []
        const match = daySlots.find((d) => d.date === appointmentDate)
        setSlots(match?.slots ?? [])
      } catch (err) {
        if (!cancelled) {
          setSlotError((err as Error).message || 'Failed to load slots')
          setSlots([])
        }
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [values.serviceId, values.staffId, values.appointmentDate])

  function handleSelectService(serviceId: string) {
    onChange({
      ...values,
      serviceId,
      staffId: '',
      slotStart: '',
      slotEnd: '',
    })
  }

  function handleSelectStaff(staffId: string) {
    onChange({
      ...values,
      staffId,
      slotStart: '',
      slotEnd: '',
    })
  }

  function handleSelectDate(date: Date | undefined) {
    if (!date) return
    onChange({
      ...values,
      appointmentDate: toIsoDate(date),
      slotStart: '',
      slotEnd: '',
    })
  }

  function handleSelectSlot(slot: Slot) {
    onChange({ ...values, slotStart: slot.start, slotEnd: slot.end })
  }

  const todayStr = todayIso()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Service <span className="text-red-500">*</span>
        </label>
        <select
          disabled={serviceLocked}
          value={values.serviceId}
          onChange={(e) => handleSelectService(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">Select a service</option>
          {services
            .filter((s) => s.is_active || s.id === values.serviceId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Staff <span className="text-red-500">*</span>
        </label>
        <select
          disabled={!values.serviceId}
          value={values.staffId}
          onChange={(e) => handleSelectStaff(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value="">
            {values.serviceId
              ? eligibleStaff.length === 0
                ? 'No staff assigned to this service'
                : 'Select staff'
              : 'Select a service first'}
          </option>
          {eligibleStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.role ? ` — ${s.role}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-200 rounded-lg p-2 flex justify-center">
            <DayPicker
              mode="single"
              selected={values.appointmentDate ? toDate(values.appointmentDate) : undefined}
              onSelect={handleSelectDate}
              disabled={{ before: toDate(todayStr) }}
              classNames={dayPickerClassNames}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Time Slot <span className="text-red-500">*</span>
          </label>
          {slotError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs mb-2">
              {slotError}
            </div>
          )}
          <SlotSelector
            slots={slots}
            selectedStart={values.slotStart || null}
            onSelect={handleSelectSlot}
            loading={loadingSlots}
            disabled={!values.serviceId || !values.staffId || !values.appointmentDate}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Payment Method
        </label>
        <select
          value={values.paymentMethod}
          disabled
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
        >
          <option value="cash_on_arrival">Cash on Arrival</option>
        </select>
      </div>

      {showCustomerFields && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={values.customerName}
              onChange={(e) => onChange({ ...values, customerName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Ahmed Khan"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={values.customerEmail}
                onChange={(e) => onChange({ ...values, customerEmail: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={values.customerPhone}
                onChange={(e) => onChange({ ...values, customerPhone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={values.notes}
              onChange={(e) => onChange({ ...values, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Walk-in, phone booking, or other context"
            />
          </div>
        </>
      )}
    </div>
  )
}

export function emptyAppointmentFormValues(): AppointmentFormValues {
  return {
    serviceId: '',
    staffId: '',
    appointmentDate: '',
    slotStart: '',
    slotEnd: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
    paymentMethod: 'cash_on_arrival',
  }
}
