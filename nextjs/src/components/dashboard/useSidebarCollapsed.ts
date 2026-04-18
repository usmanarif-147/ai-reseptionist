'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dashboard.sidebar.collapsed'

export function useSidebarCollapsed(): [boolean, (value: boolean) => void, () => void] {
  const [collapsed, setCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setCollapsedState(true)
    } catch {
      // ignore storage errors (private mode, SSR)
    }
    setHydrated(true)
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return [hydrated ? collapsed : false, setCollapsed, toggle]
}
