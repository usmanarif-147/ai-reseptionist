'use client'

import { usePathname, useParams } from 'next/navigation'
import InnerSidebar from '@/components/dashboard/InnerSidebar'
import { widgetAppearanceNav } from '@/lib/navigation'
import { resolveHref } from '@/lib/nav-active'
import WidgetPreview from '../components/WidgetPreview'
import { AppearanceProvider, useAppearance } from './AppearanceContext'

export default function AppearanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppearanceProvider>
      <AppearanceShell>{children}</AppearanceShell>
    </AppearanceProvider>
  )
}

function AppearanceShell({ children }: { children: React.ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>()
  const pathname = usePathname() ?? ''
  const { appearance, saving, error, success, save } = useAppearance()

  const items = widgetAppearanceNav.map((item) => ({
    ...item,
    href: resolveHref(item.href, businessId),
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Appearance</h1>
      <p className="text-gray-500 text-sm mb-6">Customize how the chat widget looks on your website</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-4xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-4xl">
          {success}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <InnerSidebar items={items} currentPath={pathname} title="Appearance" />

        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 p-6">
          {children}
          <div className="mt-8">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Appearance'}
            </button>
          </div>
        </div>

        <div className="hidden xl:block w-80 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Live Preview</h3>
          <div className="bg-gray-50 rounded-lg p-6 sticky top-8">
            <WidgetPreview appearance={appearance} />
          </div>
        </div>
      </div>
    </div>
  )
}
