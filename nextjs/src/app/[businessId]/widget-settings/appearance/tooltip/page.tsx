'use client'

import TooltipSection from '../../components/sections/TooltipSection'
import { useAppearance } from '../AppearanceContext'

export default function TooltipPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <TooltipSection appearance={appearance} updateAppearance={updateAppearance} />
}
