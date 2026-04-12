'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)

  async function handleResubscribe() {
    setLoading(true)
    const res = await fetch('/api/create-checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Subscription Required</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your subscription is inactive or has a payment issue.
            Please resubscribe to continue using your dashboard.
          </p>
          <button
            onClick={handleResubscribe}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mb-3"
          >
            {loading ? 'Redirecting...' : 'Resubscribe — $29/month'}
          </button>
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-600">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  )
}
