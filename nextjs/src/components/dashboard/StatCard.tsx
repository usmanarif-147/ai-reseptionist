import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  change?: {
    value: number
    direction: 'up' | 'down'
  }
  icon?: ReactNode
}

const changeStyles: Record<'up' | 'down', string> = {
  up: 'text-green-600 bg-green-50',
  down: 'text-red-600 bg-red-50',
}

const changeArrow: Record<'up' | 'down', string> = {
  up: 'M5 10l7-7 7 7M12 3v18',
  down: 'M19 14l-7 7-7-7M12 21V3',
}

export default function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <div className="flex-shrink-0 text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-gray-900 truncate">{value}</p>
        {change && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${changeStyles[change.direction]}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={changeArrow[change.direction]}
              />
            </svg>
            {change.value}%
          </span>
        )}
      </div>
    </div>
  )
}
