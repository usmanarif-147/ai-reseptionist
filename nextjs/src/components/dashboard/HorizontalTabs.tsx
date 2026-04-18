'use client'

import Link from 'next/link'
import type { NavItem } from '@/lib/navigation'
import { isPathActive } from '@/lib/nav-active'

interface HorizontalTabsProps {
  items: NavItem[]
  currentPath: string
}

export default function HorizontalTabs({ items, currentPath }: HorizontalTabsProps) {
  return (
    <nav className="border-b border-gray-200 mb-6">
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => {
          const active = isPathActive(item.href, currentPath)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
