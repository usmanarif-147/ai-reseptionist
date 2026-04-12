'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const PRESET_COLORS = [
  '#2563EB', // blue-600
  '#7C3AED', // violet-600
  '#DB2777', // pink-600
  '#DC2626', // red-600
  '#EA580C', // orange-600
  '#16A34A', // green-600
  '#0D9488', // teal-600
  '#1F2937', // gray-800
]

export default function WidgetPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [color, setColor] = useState('#2563EB')
  const [welcomeMessage, setWelcomeMessage] = useState('Hi there! How can I help you today?')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadWidget() }, [businessId])

  async function loadWidget() {
    setLoading(true)
    const res = await fetch('/api/business/widget')
    if (res.ok) {
      const data = await res.json()
      if (data) {
        setColor(data.color || '#2563EB')
        setWelcomeMessage(data.welcome_message || 'Hi there! How can I help you today?')
      }
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/business/widget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color, welcome_message: welcomeMessage }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save widget settings')
      setSaving(false)
      return
    }

    setSuccess('Widget settings saved successfully')
    setSaving(false)
  }

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-business-id="${businessId}"></script>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Widget Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Customize how the chat widget looks on your website</p>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Appearance</h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Widget Color</label>
              <div className="flex items-center gap-3 mb-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First message your customers will see"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Preview</h2>

          <div className="bg-gray-50 rounded-lg p-6 flex items-end justify-end min-h-[300px]">
            <div className="w-72">
              {/* Chat window preview */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                <div className="px-4 py-3 text-white text-sm font-medium" style={{ backgroundColor: color }}>
                  AI Receptionist
                </div>
                <div className="p-4 min-h-[120px]">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 inline-block max-w-[220px]">
                    {welcomeMessage}
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400">
                    Type a message...
                  </div>
                </div>
              </div>

              {/* Bubble */}
              <div className="flex justify-end mt-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embed Code */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6 max-w-4xl">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Embed Code</h2>
        <p className="text-sm text-gray-500 mb-4">
          Copy this code and paste it before the closing <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on your website.
        </p>

        <div className="relative">
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbed}
            className="absolute top-3 right-3 bg-gray-700 text-gray-200 px-3 py-1.5 rounded text-xs hover:bg-gray-600 font-medium"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-72 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-full" />
            <div className="h-20 bg-gray-200 rounded w-full" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-5 bg-gray-200 rounded w-20 mb-4" />
          <div className="bg-gray-100 rounded-lg h-[300px]" />
        </div>
      </div>
    </div>
  )
}
