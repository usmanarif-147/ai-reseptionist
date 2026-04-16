'use client'

import { SectionHeading, ColorPickerField, BORDER_RADIUS_OPTIONS, type SectionProps, type IntentBorderRadius } from '../shared'

export default function IntentSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Intent Selection" description="The screen where visitors choose what they need help with" />
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={appearance.intent_title}
            onChange={(e) => updateAppearance('intent_title', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={appearance.intent_description}
            onChange={(e) => updateAppearance('intent_description', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ColorPickerField
          label="Basic Information Color"
          value={appearance.intent_color_1}
          onChange={(v) => updateAppearance('intent_color_1', v)}
          presets={['#3b82f6', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#16A34A', '#0D9488']}
        />
        <ColorPickerField
          label="Book Appointment Color"
          value={appearance.intent_color_2}
          onChange={(v) => updateAppearance('intent_color_2', v)}
          presets={['#10b981', '#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#F59E0B']}
        />
        <ColorPickerField
          label="Appointment Details Color"
          value={appearance.intent_color_3}
          onChange={(v) => updateAppearance('intent_color_3', v)}
          presets={['#f59e0b', '#F97316', '#EA580C', '#DC2626', '#DB2777', '#7C3AED', '#2563EB', '#16A34A']}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Button Border Radius</label>
          <div className="flex gap-3">
            {BORDER_RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateAppearance('intent_border_radius', opt.id as IntentBorderRadius)}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${
                  appearance.intent_border_radius === opt.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={{ borderRadius: opt.value }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
