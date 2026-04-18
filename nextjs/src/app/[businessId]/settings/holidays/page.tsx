import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function HolidaysPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params

  return (
    <div>
      <PageHeader title="Holidays" subtitle="One-off closed days" />

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
        <p className="text-sm text-gray-500 mb-4">
          Holiday management currently lives inside Business Hours. A dedicated Holidays page is planned in Module 02.
        </p>
        <Link
          href={`/${businessId}/settings/business-hours`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Go to Business Hours
        </Link>
      </div>
    </div>
  )
}
