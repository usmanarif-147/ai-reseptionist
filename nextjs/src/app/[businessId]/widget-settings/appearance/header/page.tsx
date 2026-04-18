'use client'

import HeaderSection from '../../components/sections/HeaderSection'
import { useAppearance } from '../AppearanceContext'

export default function HeaderPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <HeaderSection appearance={appearance} updateAppearance={updateAppearance} />
}
