'use client'

import { useState } from 'react'
import { SectionHeading, type VisibilityMode } from '../shared'

export default function StaffSection({
  staffVisibility, setStaffVisibility,
  hiddenStaffIds, setHiddenStaffIds,
  allStaff,
}: {
  staffVisibility: VisibilityMode
  setStaffVisibility: (v: VisibilityMode) => void
  hiddenStaffIds: string[]
  setHiddenStaffIds: (v: string[]) => void
  allStaff: Array<{ id: string; name: string; is_active: boolean }>
}) {
  const [search, setSearch] = useState('')

  const filteredStaff = allStaff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <SectionHeading
        title="Staff"
        description="Control which staff members the AI can mention to customers"
      />
      <div className="space-y-3">
        {([
          ['active_only', 'Active staff only (default)'],
          ['all', 'All staff (including inactive)'],
          ['hide_specific', 'Hide specific staff members'],
        ] as const).map(([val, label]) => (
          <label key={val} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="staff_visibility"
              checked={staffVisibility === val}
              onChange={() => setStaffVisibility(val)}
              className="w-4 h-4 border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {staffVisibility === 'hide_specific' && (
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          {filteredStaff.length === 0 ? (
            <p className="text-sm text-gray-400">No staff found.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredStaff.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hiddenStaffIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setHiddenStaffIds([...hiddenStaffIds, s.id])
                      else setHiddenStaffIds(hiddenStaffIds.filter((id) => id !== s.id))
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
