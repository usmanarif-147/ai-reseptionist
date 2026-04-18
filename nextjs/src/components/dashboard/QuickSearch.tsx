'use client'

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import type { NavItem } from '@/lib/navigation'
import { flattenNav, type FlatNavEntry } from '@/lib/nav-active'

interface QuickSearchProps {
  mainNav: NavItem[]
  sectionNav?: NavItem[]
  onNavigate: (href: string) => void
}

function dedupe(entries: FlatNavEntry[]): FlatNavEntry[] {
  const seen = new Set<string>()
  return entries.filter((e) => {
    const key = `${e.section}:${e.href}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function QuickSearch({ mainNav, sectionNav, onNavigate }: QuickSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(() => {
    const list = [...flattenNav(mainNav, 'Main')]
    if (sectionNav && sectionNav.length > 0) {
      list.push(...flattenNav(sectionNav, 'Section'))
    }
    return dedupe(list)
  }, [mainNav, sectionNav])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => {
      if (e.label.toLowerCase().includes(q)) return true
      if (e.section.toLowerCase().includes(q)) return true
      return e.keywords.some((k) => k.toLowerCase().includes(q))
    })
  }, [entries, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    function handleGlobalKey(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [])

  function selectEntry(entry: FlatNavEntry) {
    onNavigate(entry.href)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const entry = results[activeIndex]
      if (entry) selectEntry(entry)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Jump to... (Ctrl+K)"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">No matches found.</p>
          ) : (
            results.map((entry, i) => {
              const active = i === activeIndex
              return (
                <button
                  key={`${entry.section}:${entry.href}`}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectEntry(entry)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    active ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={entry.icon} />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        active ? 'text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      {entry.label}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{entry.section}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
