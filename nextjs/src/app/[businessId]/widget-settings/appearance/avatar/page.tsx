'use client'

import AvatarSection from '../../components/sections/AvatarSection'
import { useAppearance } from '../AppearanceContext'

export default function AvatarPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <AvatarSection appearance={appearance} updateAppearance={updateAppearance} />
}
