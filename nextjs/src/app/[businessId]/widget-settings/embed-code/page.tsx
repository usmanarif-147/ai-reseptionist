'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function EmbedCodePage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [copied, setCopied] = useState(false)

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-business-id="${businessId}"></script>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Embed Code</h1>
      <p className="text-gray-500 text-sm mb-6">Paste this snippet into your website to display the chat widget</p>

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-4xl">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Installation</h2>
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
