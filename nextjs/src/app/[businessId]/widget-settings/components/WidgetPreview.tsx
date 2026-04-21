'use client'

import { useEffect, useRef, useState } from 'react'
import { type AppearanceSettings } from './shared'

type PreviewScreen = 'launcher' | 'chat' | 'feedback' | 'ended' | 'expired'

const SCREEN_OPTIONS: ReadonlyArray<readonly [PreviewScreen, string]> = [
  ['launcher', 'Launcher'],
  ['chat', 'Chat'],
  ['feedback', 'Feedback'],
  ['ended', 'Ended'],
  ['expired', 'Expired'],
]

const PREVIEW_SRC = '/widget-preview.html?preview=1'

export default function WidgetPreview({ appearance }: { appearance: AppearanceSettings }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [screen, setScreen] = useState<PreviewScreen>('launcher')
  const [iframeReady, setIframeReady] = useState(false)

  useEffect(() => {
    if (!iframeReady) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'appearance', settings: appearance }, '*')
  }, [appearance, iframeReady])

  useEffect(() => {
    if (!iframeReady) return
    iframeRef.current?.contentWindow?.postMessage({ type: 'screen', screen }, '*')
  }, [screen, iframeReady])

  const handleLoad = () => {
    setIframeReady(true)
  }

  return (
    <div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {SCREEN_OPTIONS.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setScreen(val)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              screen === val
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <iframe
        ref={iframeRef}
        src={PREVIEW_SRC}
        onLoad={handleLoad}
        title="Widget preview"
        className="w-full h-[520px] border-0 bg-transparent"
      />
    </div>
  )
}
