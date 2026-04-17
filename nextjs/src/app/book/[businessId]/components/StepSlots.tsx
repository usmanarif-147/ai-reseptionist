import { useMemo } from 'react'
import type { DaySlots, Service, Slot } from './types'

interface StepSlotsProps {
  days: DaySlots[]
  service: Service
  selectedDate: string | null
  selectedSlot: Slot | null
  onSelect: (date: string, slot: Slot) => void
  onDateChange: (date: string) => void
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function formatDayDate(dateStr: string): string {
  const [, monthStr, dayStr] = dateStr.split('-')
  return `${Number(monthStr)}/${Number(dayStr)}`
}

export function StepSlots({
  days,
  service,
  selectedDate,
  selectedSlot,
  onSelect,
  onDateChange,
}: StepSlotsProps) {
  const activeDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate]
  )

  const hasAnySlots = days.some((d) => d.slots.length > 0)

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Choose a time</h2>
      <p className="mb-5 text-sm text-gray-500">
        Available times over the next 7 days for {service.name}.
      </p>

      {!hasAnySlots ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No available time slots in the next 7 days.
        </p>
      ) : (
        <>
          <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2">
              {days.map((day) => {
                const isActive = day.date === selectedDate
                const isDisabled = day.slots.length === 0
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => !isDisabled && onDateChange(day.date)}
                    disabled={isDisabled}
                    className={`flex min-w-[88px] shrink-0 flex-col items-center rounded-xl border-2 px-3 py-2.5 text-center transition-colors ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : isDisabled
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {day.dayLabel.slice(0, 3)}
                    </span>
                    <span className="text-sm font-semibold">{formatDayDate(day.date)}</span>
                    <span
                      className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isDisabled
                            ? 'bg-gray-200 text-gray-500'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {day.slots.length} {day.slots.length === 1 ? 'slot' : 'slots'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {activeDay && activeDay.slots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activeDay.slots.map((slot) => {
                const isSelected =
                  selectedSlot?.start === slot.start && selectedDate === activeDay.date
                const showRemaining =
                  service.max_bookings_per_slot > 1 && slot.remainingSpots > 0
                return (
                  <button
                    key={`${activeDay.date}-${slot.start}`}
                    type="button"
                    onClick={() => onSelect(activeDay.date, slot)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-blue-300'
                    }`}
                  >
                    {formatTime(slot.start)}
                    {showRemaining && (
                      <span
                        className={`ml-1 text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}
                      >
                        ({slot.remainingSpots} left)
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No slots available on this day.
            </p>
          )}
        </>
      )}
    </div>
  )
}
