'use client'

import { useEffect, useState } from 'react'
import AppointmentForm, { type AppointmentFormValues } from './AppointmentForm'
import type { CalendarAppointment, Service, Staff } from './types'

interface EditAppointmentModalProps {
  isOpen: boolean
  appointment: CalendarAppointment | null
  onClose: () => void
  onSaved: () => void
  services: Service[]
  staff: Staff[]
}

function toFormValues(apt: CalendarAppointment): AppointmentFormValues {
  return {
    serviceId: apt.service?.id ?? '',
    staffId: apt.staff?.id ?? '',
    appointmentDate: apt.appointment_date,
    slotStart: apt.slot_start.slice(0, 5),
    slotEnd: apt.slot_end.slice(0, 5),
    customerName: apt.customer_name,
    customerEmail: apt.customer_email ?? '',
    customerPhone: apt.customer_phone ?? '',
    notes: apt.notes ?? '',
    paymentMethod: 'cash_on_arrival',
  }
}

export default function EditAppointmentModal({
  isOpen,
  appointment,
  onClose,
  onSaved,
  services,
  staff,
}: EditAppointmentModalProps) {
  const [values, setValues] = useState<AppointmentFormValues | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && appointment) {
      setValues(toFormValues(appointment))
      setError('')
    }
  }, [isOpen, appointment])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  async function handleSubmit() {
    if (!appointment || !values) return
    setError('')

    if (!values.staffId) return setError('Please select a staff member.')
    if (!values.appointmentDate) return setError('Please select a date.')
    if (!values.slotStart || !values.slotEnd) return setError('Please select a time slot.')
    if (!values.customerName.trim()) return setError('Customer name is required.')

    setSubmitting(true)

    const res = await fetch('/api/business/appointments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: appointment.id,
        staff_id: values.staffId,
        appointment_date: values.appointmentDate,
        slot_start: values.slotStart,
        slot_end: values.slotEnd,
        customer_name: values.customerName.trim(),
        customer_email: values.customerEmail.trim() || null,
        customer_phone: values.customerPhone.trim() || null,
        notes: values.notes.trim() || null,
      }),
    })

    if (res.status === 409) {
      setError('That slot is no longer available. Please pick another.')
      setSubmitting(false)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to update appointment')
      setSubmitting(false)
      return
    }

    onSaved()
    setSubmitting(false)
  }

  if (!isOpen || !appointment || !values) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Reschedule, change staff, or update customer details.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">
              {error}
            </div>
          )}
          <AppointmentForm
            services={services}
            staff={staff}
            values={values}
            onChange={setValues}
            serviceLocked
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
