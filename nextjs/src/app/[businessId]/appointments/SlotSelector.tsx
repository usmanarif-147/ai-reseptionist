'use client'

import { formatTime12h } from './utils'
import type { Slot } from './types'

interface SlotSelectorProps {
  slots: Slot[]
  selectedStart: string | null
  onSelect: (slot: Slot) => void
  loading: boolean
  disabled?: boolean
  emptyMessage?: string
}

export default function SlotSelector({
  slots,
  selectedStart,
  onSelect,
  loading,
  disabled,
  emptyMessage = 'No available slots for this date.',
}: SlotSelectorProps) {
  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-gray-500">Loading slots...</div>
    )
  }

  if (disabled) {
    return (
      <div className="py-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
        Select service, staff, and date to see available slots.
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
      {slots.map((slot) => {
        const isSelected = selectedStart === slot.start
        return (
          <button
            key={slot.start}
            type="button"
            onClick={() => onSelect(slot)}
            className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
              isSelected
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
            }`}
          >
            {formatTime12h(slot.start)}
          </button>
        )
      })}
    </div>
  )
}
