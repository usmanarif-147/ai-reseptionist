'use client'

import { useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'

export type MonthCalendarEvent = {
  id: string
  title?: string
  start: string
  end?: string
  allDay?: boolean
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  display?: 'auto' | 'block' | 'list-item' | 'background' | 'inverse-background' | 'none'
  classNames?: string[]
  extendedProps?: Record<string, unknown>
}

interface MonthCalendarProps {
  month: Date
  onMonthChange: (d: Date) => void
  events: MonthCalendarEvent[]
  onDayClick?: (iso: string, date: Date) => void
  onEventClick?: (event: MonthCalendarEvent, iso: string) => void
  selectedIso?: string | null
  height?: 'auto' | number
  className?: string
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthCalendar({
  month,
  onMonthChange,
  events,
  onDayClick,
  onEventClick,
  selectedIso,
  height = 'auto',
  className,
}: MonthCalendarProps) {
  const lastMonthKeyRef = useRef<string>('')

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const midTs = (arg.start.getTime() + arg.end.getTime()) / 2
      const mid = new Date(midTs)
      const key = toMonthKey(mid)
      if (key === lastMonthKeyRef.current) return
      lastMonthKeyRef.current = key
      onMonthChange(new Date(mid.getFullYear(), mid.getMonth(), 1))
    },
    [onMonthChange],
  )

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      onDayClick?.(arg.dateStr, arg.date)
    },
    [onDayClick],
  )

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault()
      const iso = arg.event.startStr.slice(0, 10)
      onEventClick?.(
        {
          id: arg.event.id,
          title: arg.event.title,
          start: arg.event.startStr,
          end: arg.event.endStr || undefined,
          extendedProps: arg.event.extendedProps,
        },
        iso,
      )
    },
    [onEventClick],
  )

  const dayCellClassNames = useCallback(
    (arg: { date: Date }) => {
      if (!selectedIso) return []
      const y = arg.date.getFullYear()
      const m = String(arg.date.getMonth() + 1).padStart(2, '0')
      const d = String(arg.date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}` === selectedIso ? ['fc-day-selected'] : []
    },
    [selectedIso],
  )

  return (
    <div className={`dashboard-fc w-full ${className ?? ''}`.trim()}>
      <FullCalendar
        key={toMonthKey(month)}
        initialDate={month}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height={height}
        fixedWeekCount={false}
        dayMaxEventRows={3}
        moreLinkClick="popover"
        displayEventTime={false}
        eventDisplay="block"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        dayCellClassNames={dayCellClassNames}
      />
    </div>
  )
}
