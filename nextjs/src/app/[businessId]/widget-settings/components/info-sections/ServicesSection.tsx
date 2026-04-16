'use client'

import { useState } from 'react'
import { SectionHeading, type VisibilityMode } from '../shared'

export default function ServicesSection({
  servicesVisibility, setServicesVisibility,
  hiddenServiceIds, setHiddenServiceIds,
  allServices,
}: {
  servicesVisibility: VisibilityMode
  setServicesVisibility: (v: VisibilityMode) => void
  hiddenServiceIds: string[]
  setHiddenServiceIds: (v: string[]) => void
  allServices: Array<{ id: string; name: string; is_active: boolean }>
}) {
  const [search, setSearch] = useState('')

  const filteredServices = allServices.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <SectionHeading
        title="Services"
        description="Control which services the AI can discuss with customers"
      />
      <div className="space-y-3">
        {([
          ['active_only', 'Active services only (default)'],
          ['all', 'All services (including inactive)'],
          ['hide_specific', 'Hide specific services'],
        ] as const).map(([val, label]) => (
          <label key={val} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="services_visibility"
              checked={servicesVisibility === val}
              onChange={() => setServicesVisibility(val)}
              className="w-4 h-4 border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {servicesVisibility === 'hide_specific' && (
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          {filteredServices.length === 0 ? (
            <p className="text-sm text-gray-400">No services found.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredServices.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hiddenServiceIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setHiddenServiceIds([...hiddenServiceIds, s.id])
                      else setHiddenServiceIds(hiddenServiceIds.filter((id) => id !== s.id))
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {s.name}
                    {!s.is_active && (
                      <span className="ml-1.5 text-xs text-gray-400">(inactive)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
