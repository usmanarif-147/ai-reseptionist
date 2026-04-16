'use client'

import { SectionHeading, Toggle, ColorPickerField, type SectionProps } from '../shared'

export default function TooltipSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Tooltip" description="Speech bubble shown next to the launcher button" />
      <div className="space-y-4">
        <Toggle
          label="Enable Tooltip"
          description="Show a tooltip next to the chat button"
          enabled={appearance.tooltip_enabled}
          onChange={(v) => updateAppearance('tooltip_enabled', v)}
        />
        {appearance.tooltip_enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip Text</label>
              <input
                type="text"
                value={appearance.tooltip_text}
                onChange={(e) => updateAppearance('tooltip_text', e.target.value)}
                maxLength={100}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <ColorPickerField
              label="Background Color"
              value={appearance.tooltip_bg_color}
              onChange={(v) => updateAppearance('tooltip_bg_color', v)}
              presets={['#FFFFFF', '#F3F4F6', '#1F2937', '#2563EB', '#7C3AED', '#DC2626', '#16A34A', '#F59E0B']}
            />
            <ColorPickerField
              label="Text Color"
              value={appearance.tooltip_text_color}
              onChange={(v) => updateAppearance('tooltip_text_color', v)}
              presets={['#1F2937', '#FFFFFF', '#374151', '#6B7280', '#2563EB', '#DC2626', '#16A34A', '#7C3AED']}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tooltip Position</label>
              <div className="flex gap-3">
                {([
                  ['side', 'Side of button'],
                  ['above', 'Above button'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => updateAppearance('tooltip_position', val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      appearance.tooltip_position === val
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
