'use client'

import { SectionHeading, ColorPickerField, type SectionProps } from '../shared'

export default function GeneralSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="General" description="Primary brand color for your widget" />
      <ColorPickerField
        label="Widget Color"
        value={appearance.color}
        onChange={(v) => updateAppearance('color', v)}
      />
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
        <textarea
          value={appearance.welcome_message}
          onChange={(e) => updateAppearance('welcome_message', e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="First message your customers will see"
        />
      </div>
    </div>
  )
}
