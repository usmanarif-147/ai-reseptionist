'use client'

import { SectionHeading } from '../shared'

export default function BusinessDetailsSection({
  showBusinessName, setShowBusinessName,
  showContact, setShowContact,
  showAddress, setShowAddress,
  showBusinessType, setShowBusinessType,
}: {
  showBusinessName: boolean
  setShowBusinessName: (v: boolean) => void
  showContact: boolean
  setShowContact: (v: boolean) => void
  showAddress: boolean
  setShowAddress: (v: boolean) => void
  showBusinessType: boolean
  setShowBusinessType: (v: boolean) => void
}) {
  return (
    <div>
      <SectionHeading
        title="Business Details"
        description="Choose which business information the AI can share with customers"
      />
      <div className="space-y-3">
        {([
          ['Show Business Name', showBusinessName, setShowBusinessName],
          ['Show Contact Information (phone, email)', showContact, setShowContact],
          ['Show Address', showAddress, setShowAddress],
          ['Show Business Type', showBusinessType, setShowBusinessType],
        ] as const).map(([label, value, setter]) => (
          <label key={label} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
