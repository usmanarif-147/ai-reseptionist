'use client'

import Link from 'next/link'

interface CustomFieldsInfoBoxProps {
  type: 'services' | 'staff'
  businessId: string
}

const COPY: Record<CustomFieldsInfoBoxProps['type'], { title: string; body: string }> = {
  services: {
    title: 'Custom Fields for Services',
    body: 'You can define custom fields for your services from Settings.',
  },
  staff: {
    title: 'Custom Fields for Staff',
    body: 'You can define custom fields for your staff from Settings.',
  },
}

export default function CustomFieldsInfoBox({ type, businessId }: CustomFieldsInfoBoxProps) {
  const href = `/${businessId}/settings/custom-fields?tab=${type}`
  const { title, body } = COPY[type]

  return (
    <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/85 mt-0.5">{body}</p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/95 flex-shrink-0"
        >
          Manage Fields
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
