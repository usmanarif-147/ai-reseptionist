'use client'

import { SectionHeading, type SectionProps } from '../shared'

export default function TypingSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Typing Indicator" description="How the typing state is shown while the AI responds" />
      <div className="flex gap-3 flex-wrap">
        {([
          ['animated_dots', 'Animated Dots'],
          ['text_only', 'Text Only'],
          ['disabled', 'Disabled'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => updateAppearance('typing_indicator_style', val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              appearance.typing_indicator_style === val
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
