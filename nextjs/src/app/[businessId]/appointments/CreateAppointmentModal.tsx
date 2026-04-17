'use client'

import { useEffect, useState } from 'react'
import AppointmentForm, {
  emptyAppointmentFormValues,
  type AppointmentFormValues,
} from './AppointmentForm'
import type { Service, Staff } from './types'

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  services: Service[]
  staff: Staff[]
  initialDate?: string
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onCreated,
  services,
  staff,
  initialDate,
}: CreateAppointmentModalProps) {
  const [values, setValues] = useState<AppointmentFormValues>(() => ({
    ...emptyAppointmentFormValues(),
    appointmentDate: initialDate ?? '',
  }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValues({
        ...emptyAppointmentFormValues(),
        appointmentDate: initialDate ?? '',
      })
      setError('')
    }
  }, [isOpen, initialDate])

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
    setError('')

    if (!values.serviceId) return setError('Please select a service.')
    if (!values.staffId) return setError('Please select a staff member.')
    if (!values.appointmentDate) return setError('Please select a date.')
    if (!values.slotStart || !values.slotEnd) return setError('Please select a time slot.')
    if (!values.customerName.trim()) return setError('Customer name is required.')

    setSubmitting(true)
    const res = await fetch('/api/business/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: values.serviceId,
        staff_id: values.staffId,
        appointment_date: values.appointmentDate,
        slot_start: values.slotStart,
        slot_end: values.slotEnd,
        payment_method: values.paymentMethod,
        customer_name: values.customerName.trim(),
        customer_email: values.customerEmail.trim() || undefined,
        customer_phone: values.customerPhone.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }),
    })

    if (res.status === 409) {
      setError('That slot is no longer available. Please pick another.')
      setSubmitting(false)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create appointment')
      setSubmitting(false)
      return
    }

    onCreated()
    setSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Create a walk-in or phone booking manually.
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
            {submitting ? 'Creating...' : 'Create Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}
