'use client'

import { SectionHeading, Toggle, type SectionProps } from '../shared'

export default function FeedbackSection({ appearance, updateAppearance }: SectionProps) {
  return (
    <div>
      <SectionHeading title="Feedback" description="Star rating and feedback form shown after chat ends" />
      <div className="space-y-4">
        <Toggle
          label="Enable Feedback Prompt"
          description="Show the feedback form after a conversation ends"
          enabled={appearance.feedback_enabled}
          onChange={(v) => updateAppearance('feedback_enabled', v)}
        />
        {appearance.feedback_enabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Title</label>
              <input
                type="text"
                value={appearance.feedback_prompt_title}
                onChange={(e) => updateAppearance('feedback_prompt_title', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Placeholder</label>
              <input
                type="text"
                value={appearance.feedback_note_placeholder}
                onChange={(e) => updateAppearance('feedback_note_placeholder', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
