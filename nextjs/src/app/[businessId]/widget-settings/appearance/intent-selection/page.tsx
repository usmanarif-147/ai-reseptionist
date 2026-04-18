'use client'

import IntentSection from '../../components/sections/IntentSection'
import { useAppearance } from '../AppearanceContext'

export default function IntentSelectionPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <IntentSection appearance={appearance} updateAppearance={updateAppearance} />
}
