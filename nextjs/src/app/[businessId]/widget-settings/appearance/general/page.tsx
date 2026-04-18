'use client'

import GeneralSection from '../../components/sections/GeneralSection'
import { useAppearance } from '../AppearanceContext'

export default function GeneralPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <GeneralSection appearance={appearance} updateAppearance={updateAppearance} />
}
