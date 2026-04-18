'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import Navbar from '@/components/dashboard/Navbar'
import { mainNav } from '@/lib/navigation'
import { resolveHref } from '@/lib/nav-active'
import { createClient } from '@/lib/supabase/client'

interface DashboardShellProps {
  businessId: string
  businessName: string
  userEmail: string
  children: React.ReactNode
}

const STORAGE_KEY = 'dashboard:sidebar:collapsed'

export default function DashboardShell({
  businessId,
  businessName,
  userEmail,
  children,
}: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const pathname = usePathname() ?? ''
  const router = useRouter()

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved !== null) setIsCollapsed(saved === 'true')
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed, isHydrated])

  const sidebarItems = useMemo(
    () =>
      mainNav
        .filter((item) => item.label !== 'Settings')
        .map((item) => {
          const href =
            item.label === 'Overview'
              ? `/${businessId}/dashboard`
              : resolveHref(item.href, businessId)
          return { ...item, href }
        }),
    [businessId],
  )

  function toggleCollapsed() {
    setIsCollapsed((prev) => !prev)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        items={sidebarItems}
        currentPath={pathname}
        isCollapsed={isCollapsed}
        businessName={businessName}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          businessId={businessId}
          businessName={businessName}
          userEmail={userEmail}
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          onCollapseToggle={toggleCollapsed}
        />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
