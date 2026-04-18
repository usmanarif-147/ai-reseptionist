'use client'

import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-900 text-white',
}

const typeIcons: Record<ToastType, string> = {
  success: 'M4.5 12.75l6 6 9-13.5',
  error: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  info: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
}

export default function Toast({ message, type, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return
    const id = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(id)
  }, [duration, onClose])

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[260px] max-w-sm ${typeStyles[type]}`}
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[type]} />
      </svg>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 opacity-80 hover:opacity-100"
        aria-label="Dismiss"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
