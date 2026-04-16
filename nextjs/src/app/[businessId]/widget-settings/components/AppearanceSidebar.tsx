'use client'

const APPEARANCE_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
  { id: 'tooltip', label: 'Tooltip', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
  { id: 'intent', label: 'Intent Selection', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'avatar', label: 'Avatar', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { id: 'header', label: 'Header', icon: 'M3 3h18v6H3V3zm0 8h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z' },
  { id: 'typing', label: 'Typing Indicator', icon: 'M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z' },
  { id: 'ended', label: 'Session Ended', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { id: 'expired', label: 'Session Expired', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z' },
  { id: 'feedback', label: 'Feedback', icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
] as const

export type AppearanceCategory = typeof APPEARANCE_CATEGORIES[number]['id']

export default function AppearanceSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: string
  onSelect: (id: AppearanceCategory) => void
}) {
  return (
    <nav className="w-48 flex-shrink-0 border-r border-gray-100 pr-4">
      <ul className="space-y-0.5">
        {APPEARANCE_CATEGORIES.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeSection === cat.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d={cat.icon} />
              </svg>
              {cat.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
