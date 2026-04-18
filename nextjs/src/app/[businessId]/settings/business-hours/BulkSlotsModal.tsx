'use client'

import { useEffect, useState } from 'react'
import type { DaySlots } from '@/components/dashboard'

const MAX_SLOTS = 5
const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '17:00'

interface BulkSlotsModalProps {
  isOpen: boolean
  onClose: () => void
  hours: DaySlots[]
  onChange: (next: DaySlots[]) => void
}

interface Slot {
  open_time: string
  close_time: string
}

function initialSlots(): Slot[] {
  return [{ open_time: DEFAULT_OPEN, close_time: DEFAULT_CLOSE }]
}

export default function BulkSlotsModal({ isOpen, onClose, hours, onChange }: BulkSlotsModalProps) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots())
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSlots(initialSlots())
      setError('')
    }
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

  function updateSlot(i: number, field: 'open_time' | 'close_time', value: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  function addSlot() {
    setSlots((prev) => (prev.length >= MAX_SLOTS ? prev : [...prev, { open_time: DEFAULT_OPEN, close_time: DEFAULT_CLOSE }]))
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i))
  }

  function validate(): string | null {
    if (slots.length === 0) return 'Add at least one slot to apply.'
    if (slots.length > MAX_SLOTS) return `A day can have at most ${MAX_SLOTS} slots.`
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (!s.open_time || !s.close_time) return 'Each slot must have both an open and close time.'
      if (s.open_time >= s.close_time) return 'Each slot\u2019s open time must be before its close time.'
      if (i > 0 && s.open_time <= slots[i - 1].close_time) {
        return 'Each slot must start after the previous slot\u2019s close time.'
      }
    }
    return null
  }

  function handleApply() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const next = hours.map((day) =>
      day.is_closed
        ? day
        : { ...day, slots: slots.map((s) => ({ ...s })) },
    )
    onChange(next)
    onClose()
  }

  if (!isOpen) return null

  const openDayCount = hours.filter((d) => !d.is_closed).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Bulk Time Slots</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              These slots will be applied to every Open day ({openDayCount}). Closed days are left unchanged.
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

          {openDayCount === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No days are marked Open. Check at least one day before applying bulk slots.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                {slots.map((slot, i) => {
                  const prevClose = i > 0 ? slots[i - 1].close_time || undefined : undefined
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.open_time || ''}
                        min={prevClose}
                        onChange={(e) => updateSlot(i, 'open_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="time"
                        value={slot.close_time || ''}
                        min={slot.open_time || undefined}
                        onChange={(e) => updateSlot(i, 'close_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(i)}
                          aria-label="Remove slot"
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {slots.length < MAX_SLOTS && (
                <button
                  type="button"
                  onClick={addSlot}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add another slot
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={openDayCount === 0}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
