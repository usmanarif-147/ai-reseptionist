'use client'

import SessionEndedSection from '../../components/sections/SessionEndedSection'
import { useAppearance } from '../AppearanceContext'

export default function SessionEndedPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <SessionEndedSection appearance={appearance} updateAppearance={updateAppearance} />
}
