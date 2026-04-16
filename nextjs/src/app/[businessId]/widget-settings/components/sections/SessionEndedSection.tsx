'use client'

import { SectionHeading, Toggle, type SectionProps } from '../shared'

export default function SessionEndedSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Session Ended" description="Shown when a chat session ends normally" />
      <div className="space-y-4">
        <Toggle
          label="Enable Session Ended Screen"
          description="Show a custom screen when the session ends"
          enabled={appearance.session_ended_enabled}
          onChange={(v) => updateAppearance('session_ended_enabled', v)}
        />
        {appearance.session_ended_enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon / Emoji</label>
              <input
                type="text"
                value={appearance.session_ended_icon}
                onChange={(e) => updateAppearance('session_ended_icon', e.target.value)}
                maxLength={4}
                className="w-16 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={appearance.session_ended_title}
                onChange={(e) => updateAppearance('session_ended_title', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={appearance.session_ended_message}
                onChange={(e) => updateAppearance('session_ended_message', e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
