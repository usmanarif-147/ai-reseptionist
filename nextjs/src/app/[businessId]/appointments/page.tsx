'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import 'react-day-picker/style.css'
import BookingLinkCard from './BookingLinkCard'
import CreateAppointmentModal from './CreateAppointmentModal'
import DayDetailModal from './DayDetailModal'
import EditAppointmentModal from './EditAppointmentModal'
import { calendarDayPickerClassNames } from './dayPickerClassNames'
import { toDate, toIsoDate, toMonthParam } from './utils'
import type {
  CalendarAppointment,
  CalendarResponse,
  Service,
  Staff,
} from './types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function AppointmentsPage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [month, setMonth] = useState<Date>(() => new Date())
  const [calendar, setCalendar] = useState<CalendarResponse['days']>({})
  const [loadingCalendar, setLoadingCalendar] = useState(true)
  const [calendarError, setCalendarError] = useState('')

  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [isCreateOpen, setCreateOpen] = useState(false)
  const [createInitialDate, setCreateInitialDate] = useState<string | undefined>(undefined)

  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null)
  const [isDayDetailOpen, setDayDetailOpen] = useState(false)

  const [editingAppointment, setEditingAppointment] = useState<CalendarAppointment | null>(null)

  const loadCalendar = useCallback(async (target: Date) => {
    setLoadingCalendar(true)
    setCalendarError('')
    const monthParam = toMonthParam(target)
    const res = await fetch(`/api/business/appointments/calendar?month=${monthParam}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setCalendarError(data.error || 'Failed to load appointments')
      setLoadingCalendar(false)
      return
    }
    const data: CalendarResponse = await res.json()
    setCalendar(data.days ?? {})
    setLoadingCalendar(false)
  }, [])

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    const [servicesRes, staffRes] = await Promise.all([
      fetch('/api/business/services'),
      fetch('/api/business/staff'),
    ])
    if (servicesRes.ok) {
      const data = await servicesRes.json()
      setServices(Array.isArray(data) ? data : data.data ?? [])
    }
    if (staffRes.ok) {
      const data = await staffRes.json()
      setStaff(Array.isArray(data) ? data : data.data ?? [])
    }
    setLoadingMeta(false)
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    loadCalendar(month)
  }, [month, loadCalendar])

  const daysWithAppointments = useMemo(() => {
    const arr: Date[] = []
    for (const iso of Object.keys(calendar)) {
      if ((calendar[iso]?.count ?? 0) > 0) arr.push(toDate(iso))
    }
    return arr
  }, [calendar])

  const handleDayClick = useCallback((day: Date) => {
    const iso = toIsoDate(day)
    setSelectedDayIso(iso)
    setDayDetailOpen(true)
  }, [])

  const selectedAppointments = selectedDayIso
    ? calendar[selectedDayIso]?.appointments ?? []
    : []

  function handleCreateClick() {
    setCreateInitialDate(undefined)
    setCreateOpen(true)
  }

  function handleCreated() {
    setCreateOpen(false)
    loadCalendar(month)
  }

  function handleEditClick(apt: CalendarAppointment) {
    setEditingAppointment(apt)
  }

  function handleEditSaved() {
    setEditingAppointment(null)
    loadCalendar(month)
  }

  function handleDayDetailChanged() {
    loadCalendar(month)
  }

  const bookingUrl = `${APP_URL}/book/${businessId}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h1>
          <p className="text-gray-500 text-sm">
            Calendar view of all bookings. Click a day to see details.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateClick}
          disabled={loadingMeta}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Appointment
        </button>
      </div>

      <BookingLinkCard url={bookingUrl} />

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        {calendarError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {calendarError}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Monthly Calendar</h2>
          {loadingCalendar && (
            <span className="text-xs text-gray-400">Loading...</span>
          )}
        </div>

        <div className="flex justify-center">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            onDayClick={handleDayClick}
            modifiers={{ hasAppointments: daysWithAppointments }}
            modifiersClassNames={{
              hasAppointments: 'bg-blue-50 text-blue-800 font-semibold',
              today: 'ring-2 ring-blue-500',
            }}
            classNames={calendarDayPickerClassNames}
            components={{
              DayButton: (props: DayButtonProps) => {
                const { day, modifiers, children: _children, ...buttonProps } = props
                const iso = toIsoDate(day.date)
                const count = calendar[iso]?.count ?? 0
                return (
                  <button {...buttonProps} type="button">
                    <span>{day.date.getDate()}</span>
                    {count > 0 && !modifiers.outside && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] leading-none rounded-full font-semibold px-1.5 py-0.5 min-w-[18px] text-center">
                        {count}
                      </span>
                    )}
                  </button>
                )
              },
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 justify-center">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
            Has appointments
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded ring-2 ring-blue-500" />
            Today
          </div>
        </div>
      </div>

      <CreateAppointmentModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        services={services}
        staff={staff}
        initialDate={createInitialDate}
      />

      <DayDetailModal
        isOpen={isDayDetailOpen}
        isoDate={selectedDayIso}
        appointments={selectedAppointments}
        onClose={() => setDayDetailOpen(false)}
        onEdit={handleEditClick}
        onChanged={handleDayDetailChanged}
      />

      <EditAppointmentModal
        isOpen={!!editingAppointment}
        appointment={editingAppointment}
        onClose={() => setEditingAppointment(null)}
        onSaved={handleEditSaved}
        services={services}
        staff={staff}
      />
    </div>
  )
}
