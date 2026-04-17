'use client'

import { useState } from 'react'

interface BookingLinkCardProps {
  url: string
}

export default function BookingLinkCard({ url }: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 mb-1">Booking Link</p>
          <p className="text-xs text-gray-500 mb-2">
            Share this link with your customers so they can book appointments online.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-full">
            <code className="text-xs text-gray-700 truncate">{url}</code>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            copied
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}
