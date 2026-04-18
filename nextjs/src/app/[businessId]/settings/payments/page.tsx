'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'

type PaymentType = 'cash' | 'online' | 'both'

export default function PaymentsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadPayments() }, [businessId])

  async function loadPayments() {
    setLoading(true)
    const res = await fetch('/api/business/payments')
    if (res.ok) {
      const data = await res.json()
      if (data) {
        setPaymentType(data.payment_type || 'cash')
        setStripePublishableKey(data.stripe_publishable_key || '')
        setStripeSecretKey(data.stripe_secret_key || '')
      }
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if ((paymentType === 'online' || paymentType === 'both') && (!stripePublishableKey.trim() || !stripeSecretKey.trim())) {
      setError('Both Stripe keys are required when online payments are enabled')
      return
    }

    setSaving(true)

    const body: Record<string, string | null> = {
      payment_type: paymentType,
      stripe_publishable_key: (paymentType === 'online' || paymentType === 'both') ? stripePublishableKey : null,
      stripe_secret_key: (paymentType === 'online' || paymentType === 'both') ? stripeSecretKey : null,
    }

    const res = await fetch('/api/business/payments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save payment settings')
      setSaving(false)
      return
    }

    setSuccess('Payment settings saved successfully')
    setSaving(false)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <PageHeader title="Payment Settings" subtitle="Choose how customers pay for appointments" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Payment type toggle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-6">
          <button
            type="button"
            onClick={() => setPaymentType('cash')}
            className={`p-5 rounded-xl border-2 text-left transition-colors ${
              paymentType === 'cash'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className={`w-6 h-6 ${paymentType === 'cash' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              <span className={`font-semibold text-sm ${paymentType === 'cash' ? 'text-blue-900' : 'text-gray-900'}`}>
                Cash in Hand
              </span>
            </div>
            <p className={`text-xs ${paymentType === 'cash' ? 'text-blue-700' : 'text-gray-500'}`}>
              Customers book online and pay in person when they arrive. No online payment setup needed.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentType('online')}
            className={`p-5 rounded-xl border-2 text-left transition-colors ${
              paymentType === 'online'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className={`w-6 h-6 ${paymentType === 'online' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <span className={`font-semibold text-sm ${paymentType === 'online' ? 'text-blue-900' : 'text-gray-900'}`}>
                Online Payment
              </span>
            </div>
            <p className={`text-xs ${paymentType === 'online' ? 'text-blue-700' : 'text-gray-500'}`}>
              Customers pay via Stripe when they book. Money goes directly to your Stripe account.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPaymentType('both')}
            className={`p-5 rounded-xl border-2 text-left transition-colors ${
              paymentType === 'both'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className={`w-6 h-6 ${paymentType === 'both' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <span className={`font-semibold text-sm ${paymentType === 'both' ? 'text-blue-900' : 'text-gray-900'}`}>
                Both (Customer&#39;s Choice)
              </span>
            </div>
            <p className={`text-xs ${paymentType === 'both' ? 'text-blue-700' : 'text-gray-500'}`}>
              Let customers choose to pay online or in person at their appointment.
            </p>
          </button>
        </div>

        {/* Stripe keys */}
        {(paymentType === 'online' || paymentType === 'both') && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl mb-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Stripe API Keys</h3>
              <p className="text-sm text-gray-500 mb-4">
                Enter your Stripe API keys. You can find them in your{' '}
                <span className="text-blue-600">Stripe Dashboard &gt; Developers &gt; API keys</span>.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
              <input
                type="text"
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pk_live_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
              <input
                type="password"
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk_live_..."
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800">
              Your Stripe keys are stored securely and used only to process payments from your customers directly to your Stripe account.
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </form>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-44 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-100 p-5 h-28" />
        <div className="bg-white rounded-xl border border-gray-100 p-5 h-28" />
        <div className="bg-white rounded-xl border border-gray-100 p-5 h-28" />
      </div>
    </div>
  )
}
