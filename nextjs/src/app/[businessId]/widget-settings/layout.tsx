'use client'

import { usePathname, useParams } from 'next/navigation'
import HorizontalTabs from '@/components/dashboard/HorizontalTabs'
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
    <div>
      <HorizontalTabs items={items} currentPath={pathname} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
