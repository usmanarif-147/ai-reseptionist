'use client'

import { usePathname, useParams } from 'next/navigation'
import InnerSidebar from '@/components/dashboard/InnerSidebar'
import { widgetSettingsNav } from '@/lib/navigation'
import { resolveHref } from '@/lib/nav-active'

export default function WidgetSettingsLayout({ children }: { children: React.ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>()
  const pathname = usePathname() ?? ''

  const items = widgetSettingsNav.map((item) => ({
    ...item,
    href: resolveHref(item.href, businessId),
  }))

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <InnerSidebar items={items} currentPath={pathname} title="Widget Settings" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
