'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import { CustomFieldsManager } from '@/components/dashboard'

type TabKey = 'services' | 'staff'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'services', label: 'Services' },
  { key: 'staff', label: 'Staff' },
]

export default function CustomFieldsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialTab: TabKey = searchParams.get('tab') === 'staff' ? 'staff' : 'services'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  useEffect(() => {
    const param = searchParams.get('tab')
    const next: TabKey = param === 'staff' ? 'staff' : 'services'
    setActiveTab(next)
  }, [searchParams])

  function selectTab(tab: TabKey) {
    setActiveTab(tab)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div>
      <PageHeader
        title="Custom Fields"
        subtitle="Define extra fields for Services and Staff"
      />

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6" aria-label="Custom field tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`relative py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'services' ? (
        <CustomFieldsManager
          apiBase="/api/business/service-custom-fields"
          targetLabel="service"
          formPlaceholder="e.g. Gender Type, Includes Wash"
          optionsPlaceholder={'One option per line, e.g.:\nMale\nFemale\nAny'}
          deleteMessage="Existing service values will be kept but not displayed."
        />
      ) : (
        <CustomFieldsManager
          apiBase="/api/business/staff-custom-fields"
          targetLabel="staff"
          formPlaceholder="e.g. License Number, Specialization"
          optionsPlaceholder={'One option per line, e.g.:\nOrthopedics\nCardiology\nGeneral'}
          deleteMessage="Existing staff values will be kept but not displayed."
        />
      )}
    </div>
  )
}
