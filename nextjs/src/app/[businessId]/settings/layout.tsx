'use client'

import { usePathname } from 'next/navigation'
import { useParams } from 'next/navigation'
import InnerSidebar from '@/components/dashboard/InnerSidebar'
import { settingsNav } from '@/lib/navigation'
import { resolveHref } from '@/lib/nav-active'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>()
  const pathname = usePathname() ?? ''

  const items = settingsNav.map((item) => ({
    ...item,
    href: resolveHref(item.href, businessId),
  }))

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <InnerSidebar items={items} currentPath={pathname} title="Settings" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
