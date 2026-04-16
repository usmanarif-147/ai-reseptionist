'use client'

import { SectionHeading, Toggle, type SectionProps } from '../shared'

export default function SessionExpiredSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Session Expired" description="Shown when a session times out from inactivity" />
      <div className="space-y-4">
        <Toggle
          label="Enable Session Expired Screen"
          description="Show a custom screen when the session expires"
          enabled={appearance.session_expired_enabled}
          onChange={(v) => updateAppearance('session_expired_enabled', v)}
        />
        {appearance.session_expired_enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon / Emoji</label>
              <input
                type="text"
                value={appearance.session_expired_icon}
                onChange={(e) => updateAppearance('session_expired_icon', e.target.value)}
                maxLength={4}
                className="w-16 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={appearance.session_expired_title}
                onChange={(e) => updateAppearance('session_expired_title', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={appearance.session_expired_message}
                onChange={(e) => updateAppearance('session_expired_message', e.target.value)}
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
