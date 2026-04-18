'use client'

import SessionExpiredSection from '../../components/sections/SessionExpiredSection'
import { useAppearance } from '../AppearanceContext'

export default function SessionExpiredPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <SessionExpiredSection appearance={appearance} updateAppearance={updateAppearance} />
}
