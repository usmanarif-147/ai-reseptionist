import PageHeader from '@/components/dashboard/PageHeader'

export default function CustomFieldsPage() {
  return (
    <div>
      <PageHeader
        title="Custom Fields"
        subtitle="Define extra fields for Services and Staff"
      />

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
        <p className="text-sm text-gray-500">
          Coming soon. You will be able to define custom fields here — for example a &quot;License Number&quot; field on Staff, or a &quot;Room&quot; field on Services.
        </p>
      </div>
    </div>
  )
}
