'use client'

import Link from 'next/link'
import type { NavItem } from '@/lib/navigation'
import { isPathActive } from '@/lib/nav-active'

interface InnerSidebarProps {
  items: NavItem[]
  currentPath: string
  title: string
}

export default function InnerSidebar({ items, currentPath, title }: InnerSidebarProps) {
  return (
    <aside className="w-full md:w-60 flex-shrink-0 bg-white border border-gray-100 rounded-xl p-3">
      <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h2>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isPathActive(item.href, currentPath)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
