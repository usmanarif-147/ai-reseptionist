'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard')
      return
    }

    async function confirmSubscription() {
      const res = await fetch(`/api/checkout-success?session_id=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setStatus('success')
        const destination = data.businessId ? `/${data.businessId}/dashboard` : '/dashboard'
        setTimeout(() => router.push(destination), 2500)
      } else {
        setStatus('error')
      }
    }

    confirmSubscription()
  }, [sessionId, router])

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-2">Something went wrong confirming your subscription.</p>
        <p className="text-gray-500 text-sm">Please contact support if this continues.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">You are all set!</h1>
      <p className="text-gray-500 mb-2">Your 3-day free trial has started.</p>
      <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
