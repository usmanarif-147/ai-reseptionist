'use client'

import { FilterDef } from './types'

interface FilterBarProps {
  filters: FilterDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function FilterBar({ filters, values, onChange }: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => {
        if (filter.type === 'text') {
          return (
            <input
              key={filter.key}
              type="text"
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              placeholder={filter.placeholder || filter.label}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          )
        }

        if (filter.type === 'select') {
          return (
            <select
              key={filter.key}
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{filter.placeholder || `All ${filter.label}`}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
        }

        return null
      })}
    </div>
  )
}
