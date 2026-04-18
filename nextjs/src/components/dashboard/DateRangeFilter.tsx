'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { dayPickerClassNames } from './dayPickerClassNames'

export type DateRangePreset = 'today' | '7d' | '30d' | 'custom'

interface DateRangeFilterProps {
  onDateRangeChange: (range: { start: Date; end: Date }) => void
  defaultRange?: DateRangePreset
}

const PRESET_BUTTONS: { id: Exclude<DateRangePreset, 'custom'>; label: string; days: number }[] = [
  { id: 'today', label: 'Today', days: 0 },
  { id: '7d', label: 'Last 7 days', days: 6 },
  { id: '30d', label: 'Last 30 days', days: 29 },
]

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function computePreset(preset: Exclude<DateRangePreset, 'custom'>): { start: Date; end: Date } {
  const today = new Date()
  const end = endOfDay(today)
  const start = startOfDay(today)
  const match = PRESET_BUTTONS.find((p) => p.id === preset)
  if (match && match.days > 0) {
    start.setDate(start.getDate() - match.days)
  }
  return { start, end }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DateRangeFilter({
  onDateRangeChange,
  defaultRange = '7d',
}: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DateRangePreset>(defaultRange)
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const emittedRef = useRef(false)

  useEffect(() => {
    if (emittedRef.current) return
    if (defaultRange && defaultRange !== 'custom') {
      onDateRangeChange(computePreset(defaultRange))
      emittedRef.current = true
    }
  }, [defaultRange, onDateRangeChange])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  function selectPreset(id: Exclude<DateRangePreset, 'custom'>) {
    setPreset(id)
    setCustomRange(null)
    onDateRangeChange(computePreset(id))
    setOpen(false)
  }

  function applyCustom() {
    if (draft?.from && draft?.to) {
      const range = { start: startOfDay(draft.from), end: endOfDay(draft.to) }
      setPreset('custom')
      setCustomRange(range)
      onDateRangeChange(range)
      setOpen(false)
    }
  }

  const customLabel =
    preset === 'custom' && customRange
      ? `${formatDate(customRange.start)} – ${formatDate(customRange.end)}`
      : 'Custom'

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1"
      ref={containerRef}
    >
      {PRESET_BUTTONS.map((p) => {
        const active = preset === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPreset(p.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        )
      })}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            preset === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {customLabel}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-[320px]">
            <DayPicker
              mode="range"
              selected={draft}
              onSelect={setDraft}
              classNames={dayPickerClassNames}
              numberOfMonths={1}
            />
            <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!draft?.from || !draft?.to}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
