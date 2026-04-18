import type { NavItem } from '@/lib/navigation'

export function resolveHref(href: string, businessId: string): string {
  return href.replace('[businessId]', businessId)
}

export function isPathActive(itemHref: string, currentPath: string): boolean {
  if (!itemHref || !currentPath) return false
  if (itemHref === currentPath) return true
  return currentPath.startsWith(itemHref + '/')
}

export interface FlatNavEntry {
  label: string
  href: string
  icon: string
  keywords: string[]
  section: string
}

export function flattenNav(
  items: NavItem[],
  section: string,
  parentKeywords: string[] = [],
): FlatNavEntry[] {
  const out: FlatNavEntry[] = []
  for (const item of items) {
    const keywords = [...parentKeywords, ...(item.keywords ?? [])]
    out.push({
      label: item.label,
      href: item.href,
      icon: item.icon,
      keywords,
      section,
    })
    if (item.children && item.children.length > 0) {
      out.push(...flattenNav(item.children, item.label, keywords))
    }
  }
  return out
}
