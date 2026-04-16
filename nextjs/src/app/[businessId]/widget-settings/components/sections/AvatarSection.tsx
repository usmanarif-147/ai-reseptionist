'use client'

import { SectionHeading, Toggle, AVATAR_OPTIONS, type SectionProps } from '../shared'

export default function AvatarSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Chat Conversation" description="Bot avatar shown next to messages" />
      <div className="space-y-4">
        <Toggle
          label="Show Avatar"
          description="Display an avatar next to bot messages"
          enabled={appearance.avatar_enabled}
          onChange={(v) => updateAppearance('avatar_enabled', v)}
        />
        {appearance.avatar_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateAppearance('avatar_selection', opt.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2 transition-colors ${
                    appearance.avatar_selection === opt.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={opt.label}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
