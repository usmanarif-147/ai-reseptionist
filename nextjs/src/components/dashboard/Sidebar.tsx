'use client'

import Link from 'next/link'
import type { NavItem } from '@/lib/navigation'
import { isPathActive } from '@/lib/nav-active'

interface SidebarProps {
  items: NavItem[]
  currentPath: string
  isCollapsed: boolean
  businessName: string
}

export default function Sidebar({
  items,
  currentPath,
  isCollapsed,
  businessName,
}: SidebarProps) {
  const widthClass = isCollapsed ? 'w-16' : 'w-64'

  return (
    <aside
      className={`${widthClass} bg-white border-r border-gray-100 flex flex-col transition-[width] duration-200 ease-out h-screen sticky top-0`}
    >
      <div className="flex items-center px-4 py-5 border-b border-gray-100 h-16 flex-shrink-0">
        {!isCollapsed ? (
          <span className="text-lg font-bold text-blue-600 truncate">AI Receptionist</span>
        ) : (
          <span className="text-lg font-bold text-blue-600 mx-auto">AI</span>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">{businessName}</p>
          <p className="text-xs text-gray-400">Business Dashboard</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = isPathActive(item.href, currentPath)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
