import { redirect } from 'next/navigation'

export default async function WidgetSettingsAppearanceIndexPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  redirect(`/${businessId}/widget-settings/appearance/general`)
}
