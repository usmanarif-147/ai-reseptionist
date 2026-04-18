'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import BookingLinkCard from './BookingLinkCard'
import CreateAppointmentModal from './CreateAppointmentModal'
import DayDetailModal from './DayDetailModal'
import EditAppointmentModal from './EditAppointmentModal'
import { toMonthParam } from './utils'
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

  const currentMonthKeyRef = useRef<string>('')

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

  const statusColors: Record<string, string> = {
    confirmed: '#3b82f6',
    completed: '#10b981',
    cancelled: '#9ca3af',
  }

  const events = useMemo(() => {
    const list: {
      id: string
      title: string
      start: string
      end: string
      allDay: boolean
      backgroundColor: string
      borderColor: string
      extendedProps: { isoDate: string; status: string; timeLabel: string }
    }[] = []
    for (const iso of Object.keys(calendar)) {
      const day = calendar[iso]
      if (!day) continue
      for (const apt of day.appointments) {
        const color = statusColors[apt.status] ?? '#3b82f6'
        list.push({
          id: apt.id,
          title: `${apt.customer_name} — ${apt.service?.name ?? 'N/A'}`,
          start: `${iso}T${apt.slot_start}:00`,
          end: `${iso}T${apt.slot_end}:00`,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { isoDate: iso, status: apt.status, timeLabel: apt.slot_start },
        })
      }
    }
    return list
  }, [calendar])

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const midTs = (arg.start.getTime() + arg.end.getTime()) / 2
      const mid = new Date(midTs)
      const key = toMonthParam(mid)
      if (key === currentMonthKeyRef.current) return
      currentMonthKeyRef.current = key
      const nextMonth = new Date(mid.getFullYear(), mid.getMonth(), 1)
      setMonth(nextMonth)
    },
    [],
  )

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setSelectedDayIso(arg.dateStr)
    setDayDetailOpen(true)
  }, [])

  const handleEventClick = useCallback((arg: EventClickArg) => {
    arg.jsEvent.preventDefault()
    const iso = (arg.event.extendedProps as { isoDate?: string })?.isoDate
    if (!iso) return
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

      <div className="bg-white border border-gray-100 rounded-xl p-5 overflow-hidden">
        {calendarError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {calendarError}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Monthly Calendar</h2>
          {loadingCalendar && (
            <span className="text-xs text-gray-400">Loading...</span>
          )}
        </div>

        <div className="appointments-fc w-full">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            height="auto"
            fixedWeekCount={false}
            dayMaxEventRows={3}
            moreLinkClick="popover"
            displayEventTime={false}
            eventDisplay="block"
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 justify-center">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
            Confirmed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
            Completed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#9ca3af' }} />
            Cancelled
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
