'use client'

import { SectionHeading, Toggle } from '../shared'

export default function BusinessHoursSection({
  showBusinessHours,
  setShowBusinessHours,
}: {
  showBusinessHours: boolean
  setShowBusinessHours: (v: boolean) => void
}) {
  return (
    <div>
      <SectionHeading
        title="Business Hours"
        description="Control whether the AI can share your operating hours with customers"
      />
      <Toggle
        label="Show Business Hours"
        description="Allow the AI to tell customers about your business hours"
        enabled={showBusinessHours}
        onChange={setShowBusinessHours}
      />
    </div>
  )
}
