'use client'

import TypingSection from '../../components/sections/TypingSection'
import { useAppearance } from '../AppearanceContext'

export default function TypingIndicatorPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <TypingSection appearance={appearance} updateAppearance={updateAppearance} />
}
