'use client'

import FeedbackSection from '../../components/sections/FeedbackSection'
import { useAppearance } from '../AppearanceContext'

export default function FeedbackPage() {
  const { appearance, updateAppearance } = useAppearance()
  return <FeedbackSection appearance={appearance} updateAppearance={updateAppearance} />
}
