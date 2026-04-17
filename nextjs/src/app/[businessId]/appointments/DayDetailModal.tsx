'use client'

import { useEffect, useState } from 'react'
import { confirmDialog } from '@/components/confirmDialog'
import { PaymentBadge, StatusBadge } from './Badges'
import { formatLongDate, formatTime12h } from './utils'
import type { CalendarAppointment } from './types'

interface DayDetailModalProps {
  isOpen: boolean
  isoDate: string | null
  appointments: CalendarAppointment[]
  onClose: () => void
  onEdit: (appointment: CalendarAppointment) => void
  onChanged: () => void
}

export default function DayDetailModal({
  isOpen,
  isoDate,
  appointments,
  onClose,
  onEdit,
  onChanged,
}: DayDetailModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) setError('')
  }, [isOpen])

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

  async function updateStatus(
    apt: CalendarAppointment,
    status: 'cancelled' | 'completed',
  ) {
    if (status === 'cancelled') {
      const confirmed = await confirmDialog({
        title: 'Cancel Appointment?',
        message: `Cancel ${apt.customer_name}'s appointment at ${formatTime12h(apt.slot_start)}?`,
        confirmLabel: 'Yes, Cancel',
        isDanger: true,
      })
      if (!confirmed) return
    }

    setBusyId(apt.id)
    setError('')
    const res = await fetch('/api/business/appointments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: apt.id, status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || `Failed to ${status === 'cancelled' ? 'cancel' : 'complete'} appointment`)
    } else {
      onChanged()
    }
    setBusyId(null)
  }

  if (!isOpen || !isoDate) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {formatLongDate(isoDate)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {appointments.length === 0
                ? 'No appointments'
                : `${appointments.length} appointment${appointments.length === 1 ? '' : 's'}`}
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

          {appointments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              No appointments for this day.
            </p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((apt) => (
                <li
                  key={apt.id}
                  className="border border-gray-100 rounded-xl p-4 bg-gray-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {apt.customer_name}
                        </h3>
                        <StatusBadge status={apt.status} />
                        <PaymentBadge method={apt.payment_method} />
                      </div>
                      <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                        {apt.customer_email && (
                          <span className="truncate">{apt.customer_email}</span>
                        )}
                        {apt.customer_phone && (
                          <span className="truncate">{apt.customer_phone}</span>
                        )}
                        <span>
                          <span className="text-gray-400">Service:</span>{' '}
                          {apt.service?.name ?? '—'}
                        </span>
                        <span>
                          <span className="text-gray-400">Staff:</span>{' '}
                          {apt.staff?.name ?? '—'}
                        </span>
                        <span className="sm:col-span-2">
                          <span className="text-gray-400">Time:</span>{' '}
                          {formatTime12h(apt.slot_start)} – {formatTime12h(apt.slot_end)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {apt.status === 'confirmed' && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onEdit(apt)}
                        disabled={busyId === apt.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(apt, 'completed')}
                        disabled={busyId === apt.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyId === apt.id ? 'Working...' : 'Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(apt, 'cancelled')}
                        disabled={busyId === apt.id}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
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
