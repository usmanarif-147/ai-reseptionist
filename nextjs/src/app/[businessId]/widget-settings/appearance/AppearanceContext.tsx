'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { type AppearanceSettings, DEFAULT_APPEARANCE } from '../components/shared'

interface AppearanceContextType {
  appearance: AppearanceSettings
  updateAppearance: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void
  loading: boolean
  saving: boolean
  error: string
  success: string
  save: () => Promise<void>
}

const AppearanceContext = createContext<AppearanceContextType | null>(null)

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>({ ...DEFAULT_APPEARANCE })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateAppearance = useCallback(<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    setAppearance((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const res = await fetch('/api/business/widget')
      if (!cancelled && res.ok) {
        const data = await res.json()
        if (data) {
          setAppearance({
            color: data.color || DEFAULT_APPEARANCE.color,
            welcome_message: data.welcome_message || DEFAULT_APPEARANCE.welcome_message,
            tooltip_enabled: data.tooltip_enabled ?? DEFAULT_APPEARANCE.tooltip_enabled,
            tooltip_text: data.tooltip_text || DEFAULT_APPEARANCE.tooltip_text,
            tooltip_bg_color: data.tooltip_bg_color || DEFAULT_APPEARANCE.tooltip_bg_color,
            tooltip_text_color: data.tooltip_text_color || DEFAULT_APPEARANCE.tooltip_text_color,
            tooltip_position: data.tooltip_position || DEFAULT_APPEARANCE.tooltip_position,
            avatar_enabled: data.avatar_enabled ?? DEFAULT_APPEARANCE.avatar_enabled,
            avatar_selection: data.avatar_selection || DEFAULT_APPEARANCE.avatar_selection,
            header_show_status: data.header_show_status ?? DEFAULT_APPEARANCE.header_show_status,
            header_title: data.header_title || DEFAULT_APPEARANCE.header_title,
            header_subtitle: data.header_subtitle || DEFAULT_APPEARANCE.header_subtitle,
            typing_indicator_style: data.typing_indicator_style || DEFAULT_APPEARANCE.typing_indicator_style,
            session_ended_enabled: data.session_ended_enabled ?? DEFAULT_APPEARANCE.session_ended_enabled,
            session_ended_icon: data.session_ended_icon || DEFAULT_APPEARANCE.session_ended_icon,
            session_ended_title: data.session_ended_title || DEFAULT_APPEARANCE.session_ended_title,
            session_ended_message: data.session_ended_message || DEFAULT_APPEARANCE.session_ended_message,
            session_expired_enabled: data.session_expired_enabled ?? DEFAULT_APPEARANCE.session_expired_enabled,
            session_expired_icon: data.session_expired_icon || DEFAULT_APPEARANCE.session_expired_icon,
            session_expired_title: data.session_expired_title || DEFAULT_APPEARANCE.session_expired_title,
            session_expired_message: data.session_expired_message || DEFAULT_APPEARANCE.session_expired_message,
            feedback_enabled: data.feedback_enabled ?? DEFAULT_APPEARANCE.feedback_enabled,
            feedback_prompt_title: data.feedback_prompt_title || DEFAULT_APPEARANCE.feedback_prompt_title,
            feedback_note_placeholder: data.feedback_note_placeholder || DEFAULT_APPEARANCE.feedback_note_placeholder,
          })
        }
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/widget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appearance),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save widget settings')
    } else {
      setSuccess('Widget settings saved successfully')
    }
    setSaving(false)
  }, [appearance])

  const value = useMemo<AppearanceContextType>(
    () => ({ appearance, updateAppearance, loading, saving, error, success, save }),
    [appearance, updateAppearance, loading, saving, error, success, save]
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}
