'use client'

import { useRouter } from 'next/navigation'
import {
  mainNav,
  settingsNav,
  widgetSettingsNav,
  widgetAppearanceNav,
  type NavItem,
} from '@/lib/navigation'
import QuickSearch from './QuickSearch'

interface NavbarProps {
  businessName: string
  userEmail: string
  onLogout: () => void
  businessId?: string
  isCollapsed?: boolean
  onCollapseToggle?: () => void
}

const SECTION_NAV: NavItem[] = [...settingsNav, ...widgetSettingsNav, ...widgetAppearanceNav]

export default function Navbar({
  businessName,
  userEmail,
  onLogout,
  businessId,
  isCollapsed,
  onCollapseToggle,
}: NavbarProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-100 px-4 sm:px-6 flex items-center gap-3">
      {onCollapseToggle && (
        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={isCollapsed ? 'M8.25 4.5l7.5 7.5-7.5 7.5' : 'M15.75 19.5L8.25 12l7.5-7.5'}
            />
          </svg>
        </button>
      )}

      <div className="min-w-0 flex-shrink hidden sm:block">
        <p className="text-sm font-medium text-gray-900 truncate">{businessName}</p>
        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
      </div>

      <div className="flex-1 flex justify-center px-2">
        <QuickSearch
          mainNav={mainNav}
          sectionNav={SECTION_NAV}
          businessId={businessId}
          onNavigate={(href) => router.push(href)}
        />
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
          />
        </svg>
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  )
}
