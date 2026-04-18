import { redirect } from 'next/navigation'

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  redirect(`/${businessId}/settings/business-profile`)
}
