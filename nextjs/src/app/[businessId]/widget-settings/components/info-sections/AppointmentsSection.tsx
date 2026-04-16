'use client'

import { SectionHeading } from '../shared'

export default function AppointmentsSection({
  showAppointmentService, setShowAppointmentService,
  showAppointmentStaff, setShowAppointmentStaff,
  showAppointmentDatetime, setShowAppointmentDatetime,
  showAppointmentDuration, setShowAppointmentDuration,
  showAppointmentPaymentType, setShowAppointmentPaymentType,
  showAppointmentPaymentStatus, setShowAppointmentPaymentStatus,
  showAppointmentNotes, setShowAppointmentNotes,
}: {
  showAppointmentService: boolean
  setShowAppointmentService: (v: boolean) => void
  showAppointmentStaff: boolean
  setShowAppointmentStaff: (v: boolean) => void
  showAppointmentDatetime: boolean
  setShowAppointmentDatetime: (v: boolean) => void
  showAppointmentDuration: boolean
  setShowAppointmentDuration: (v: boolean) => void
  showAppointmentPaymentType: boolean
  setShowAppointmentPaymentType: (v: boolean) => void
  showAppointmentPaymentStatus: boolean
  setShowAppointmentPaymentStatus: (v: boolean) => void
  showAppointmentNotes: boolean
  setShowAppointmentNotes: (v: boolean) => void
}) {
  return (
    <div>
      <SectionHeading
        title="Appointment Details"
        description="When a customer looks up their appointment, choose what details the AI can share"
      />
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
    </div>
  )
}
