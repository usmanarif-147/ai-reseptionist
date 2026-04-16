'use client'

import { SectionHeading, Toggle, type SectionProps } from '../shared'

export default function HeaderSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Widget Header" description="Title, subtitle, and online status in the header" />
      <div className="space-y-4">
        <Toggle
          label="Show Online Status"
          description="Display online indicator in the header"
          enabled={appearance.header_show_status}
          onChange={(v) => updateAppearance('header_show_status', v)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Header Title</label>
          <input
            type="text"
            value={appearance.header_title}
            onChange={(e) => updateAppearance('header_title', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Header Subtitle</label>
          <input
            type="text"
            value={appearance.header_subtitle}
            onChange={(e) => updateAppearance('header_subtitle', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
