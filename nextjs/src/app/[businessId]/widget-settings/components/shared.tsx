'use client'

// ===== Types =====

export type VisibilityMode = 'active_only' | 'all' | 'hide_specific'
export type TooltipPosition = 'side' | 'above'
export type TypingIndicatorStyle = 'animated_dots' | 'text_only' | 'disabled'

export interface AppearanceSettings {
  color: string
  welcome_message: string
  tooltip_enabled: boolean
  tooltip_text: string
  tooltip_bg_color: string
  tooltip_text_color: string
  tooltip_position: TooltipPosition
  avatar_enabled: boolean
  avatar_selection: string
  header_show_status: boolean
  header_title: string
  header_subtitle: string
  typing_indicator_style: TypingIndicatorStyle
  session_ended_enabled: boolean
  session_ended_icon: string
  session_ended_title: string
  session_ended_message: string
  session_expired_enabled: boolean
  session_expired_icon: string
  session_expired_title: string
  session_expired_message: string
  feedback_enabled: boolean
  feedback_prompt_title: string
  feedback_note_placeholder: string
}

export type UpdateAppearanceFn = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void

export interface SectionProps {
  appearance: AppearanceSettings
  updateAppearance: UpdateAppearanceFn
}

// ===== Constants =====

export const PRESET_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#16A34A', '#0D9488', '#1F2937',
]

export const AVATAR_OPTIONS = [
  { id: 'robot', label: 'Robot', emoji: '\uD83E\uDD16' },
  { id: 'wave', label: 'Wave', emoji: '\uD83D\uDC4B' },
  { id: 'sparkles', label: 'Sparkles', emoji: '\u2728' },
  { id: 'headset', label: 'Headset', emoji: '\uD83C\uDFA7' },
  { id: 'star', label: 'Star', emoji: '\u2B50' },
  { id: 'heart', label: 'Heart', emoji: '\u2764\uFE0F' },
  { id: 'lightning', label: 'Lightning', emoji: '\u26A1' },
  { id: 'speech', label: 'Speech', emoji: '\uD83D\uDCAC' },
  { id: 'bulb', label: 'Bulb', emoji: '\uD83D\uDCA1' },
  { id: 'check', label: 'Check', emoji: '\u2705' },
  { id: 'smile', label: 'Smile', emoji: '\uD83D\uDE0A' },
  { id: 'rocket', label: 'Rocket', emoji: '\uD83D\uDE80' },
]

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  color: '#2563EB',
  welcome_message: 'Hi there! How can I help you today?',
  tooltip_enabled: true,
  tooltip_text: 'Ask us anything \u2014 we reply instantly 24/7',
  tooltip_bg_color: '#FFFFFF',
  tooltip_text_color: '#1F2937',
  tooltip_position: 'side',
  avatar_enabled: true,
  avatar_selection: 'robot',
  header_show_status: true,
  header_title: 'Chat with us',
  header_subtitle: 'We reply instantly',
  typing_indicator_style: 'animated_dots',
  session_ended_enabled: true,
  session_ended_icon: '\uD83D\uDC4B',
  session_ended_title: 'Chat Ended',
  session_ended_message: 'Thank you for reaching out! We hope we answered all your questions.',
  session_expired_enabled: true,
  session_expired_icon: '\u23F0',
  session_expired_title: 'Session Expired',
  session_expired_message: 'Your session ended due to inactivity. Start a new chat anytime.',
  feedback_enabled: true,
  feedback_prompt_title: 'How was your experience?',
  feedback_note_placeholder: 'Leave a message for the business (optional)',
}

// ===== Reusable Components =====

export function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function ColorPickerField({ label, value, onChange, presets }: {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: string[]
}) {
  const colors = presets || PRESET_COLORS
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              value.toUpperCase() === c.toUpperCase() ? 'border-gray-900 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-gray-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}

export function SectionDivider() {
  return <hr className="border-gray-100 my-6" />
}
