'use client'

import { useState } from 'react'
import { type AppearanceSettings, AVATAR_OPTIONS, BORDER_RADIUS_OPTIONS } from './shared'

export default function WidgetPreview({ appearance }: { appearance: AppearanceSettings }) {
  const [previewScreen, setPreviewScreen] = useState<'launcher' | 'intent' | 'prechat' | 'chat' | 'ended' | 'expired' | 'feedback'>('intent')
  const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === appearance.avatar_selection) || AVATAR_OPTIONS[0]
  const borderRadiusValue = BORDER_RADIUS_OPTIONS.find(b => b.id === appearance.intent_border_radius)?.value || '14px'

  return (
    <div>
      {/* Screen selector */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {([
          ['launcher', 'Launcher'],
          ['intent', 'Intent'],
          ['prechat', 'Pre-Chat'],
          ['chat', 'Chat'],
          ['feedback', 'Feedback'],
          ['ended', 'Ended'],
          ['expired', 'Expired'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setPreviewScreen(val)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              previewScreen === val
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Launcher Screen */}
      {previewScreen === 'launcher' && (
        <div className="w-[348px] mx-auto">
          <div className="flex flex-col items-end gap-2 pt-8">
            {/* Tooltip */}
            {appearance.tooltip_enabled && (
              <>
                {appearance.tooltip_position === 'side' && (
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-lg px-3 py-2 text-[13px] shadow-md max-w-[220px] leading-snug"
                      style={{ backgroundColor: appearance.tooltip_bg_color, color: appearance.tooltip_text_color }}
                    >
                      {appearance.tooltip_text}
                    </div>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0"
                      style={{ backgroundColor: appearance.color }}
                    >
                      <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
                    </div>
                  </div>
                )}
                {appearance.tooltip_position === 'above' && (
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className="rounded-lg px-3 py-2 text-[13px] shadow-md max-w-[220px] leading-snug"
                      style={{ backgroundColor: appearance.tooltip_bg_color, color: appearance.tooltip_text_color }}
                    >
                      {appearance.tooltip_text}
                    </div>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: appearance.color }}
                    >
                      <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Launcher button only (no tooltip) */}
            {!appearance.tooltip_enabled && (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: appearance.color }}
              >
                <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Widget Preview (all screens except launcher) */}
      {previewScreen !== 'launcher' && (
      <div className="w-[348px] mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="px-4 py-3 text-white flex justify-between items-center" style={{ backgroundColor: appearance.color }}>
            <div>
              <div className="text-sm font-bold leading-tight">{appearance.header_title}</div>
              {appearance.header_show_status && (
                <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {appearance.header_subtitle}
                </div>
              )}
              {!appearance.header_show_status && (
                <div className="text-[11px] opacity-80 mt-0.5">{appearance.header_subtitle}</div>
              )}
            </div>
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">
              &#x2715;
            </div>
          </div>

          {/* Body */}
          <div className="min-h-[260px] max-h-[260px] overflow-hidden">

            {/* Intent Screen */}
            {previewScreen === 'intent' && (
              <div className="p-4 flex flex-col gap-2.5">
                <div className="text-center pb-1">
                  <div className="text-sm font-bold text-gray-900">{appearance.intent_title}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{appearance.intent_description}</div>
                </div>
                {[
                  { color: appearance.intent_color_1, icon: '\uD83D\uDCAC', name: 'Basic Information', desc: 'Ask questions about our services' },
                  { color: appearance.intent_color_2, icon: '\uD83D\uDCC5', name: 'Book an Appointment', desc: 'Schedule a visit with us' },
                  { color: appearance.intent_color_3, icon: '\uD83D\uDD0D', name: 'Appointment Details', desc: 'Check or manage a booking' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 text-white text-left"
                    style={{ backgroundColor: item.color, borderRadius: borderRadiusValue }}
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{item.name}</div>
                      <div className="text-[10px] opacity-80">{item.desc}</div>
                    </div>
                    <span className="opacity-60 text-sm">{'\u203A'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pre-Chat Form Screen */}
            {previewScreen === 'prechat' && (
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">Just a few details</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">We&apos;ll remember you for next time</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Name</label>
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 bg-white">
                    Your name (optional)
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 bg-white">
                    you@example.com
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone</label>
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 bg-white">
                    Phone number (optional)
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white mt-1"
                  style={{ backgroundColor: appearance.color }}
                >
                  Start Chat
                </button>
              </div>
            )}

            {/* Chat Screen */}
            {previewScreen === 'chat' && (
              <div className="p-3 flex flex-col gap-2.5">
                {/* Bot message */}
                <div className="flex items-end gap-2">
                  {appearance.avatar_enabled && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: appearance.color }}
                    >
                      {selectedAvatar.emoji}
                    </div>
                  )}
                  <div className="bg-gray-100 rounded-xl rounded-bl px-3 py-2 text-xs text-gray-700 max-w-[200px]">
                    {appearance.welcome_message}
                  </div>
                </div>
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="rounded-xl rounded-br px-3 py-2 text-xs text-white max-w-[200px]"
                    style={{ backgroundColor: appearance.color }}
                  >
                    I&apos;d like to book an appointment
                  </div>
                </div>
                {/* Bot typing */}
                {appearance.typing_indicator_style !== 'disabled' && (
                  <div className="flex items-end gap-2">
                    {appearance.avatar_enabled && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{ backgroundColor: appearance.color }}
                      >
                        {selectedAvatar.emoji}
                      </div>
                    )}
                    <div className="bg-gray-100 rounded-xl rounded-bl px-3 py-2 text-xs text-gray-400">
                      {appearance.typing_indicator_style === 'animated_dots' ? (
                        <span className="inline-flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : (
                        'AI is typing...'
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Screen */}
            {previewScreen === 'feedback' && appearance.feedback_enabled && (
              <div className="p-4 flex flex-col items-center gap-3">
                <div className="text-sm font-bold text-gray-900 text-center">{appearance.feedback_prompt_title}</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className="text-2xl"
                      style={{ color: star <= 4 ? appearance.color : '#d1d5db' }}
                    >
                      {'\u2605'}
                    </span>
                  ))}
                </div>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">
                  {appearance.feedback_note_placeholder}
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: appearance.color }}
                  >
                    Submit Feedback
                  </button>
                  <button type="button" className="py-2 px-3 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {previewScreen === 'feedback' && !appearance.feedback_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Feedback prompt is disabled</p>
              </div>
            )}

            {/* Session Ended Screen */}
            {previewScreen === 'ended' && appearance.session_ended_enabled && (
              <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-3xl">{appearance.session_ended_icon}</span>
                <div className="text-sm font-bold text-gray-900">{appearance.session_ended_title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{appearance.session_ended_message}</div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: appearance.color }}
                >
                  Start New Conversation
                </button>
              </div>
            )}
            {previewScreen === 'ended' && !appearance.session_ended_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Session ended screen is disabled</p>
              </div>
            )}

            {/* Session Expired Screen */}
            {previewScreen === 'expired' && appearance.session_expired_enabled && (
              <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-3xl">{appearance.session_expired_icon}</span>
                <div className="text-sm font-bold text-gray-900">{appearance.session_expired_title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{appearance.session_expired_message}</div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: appearance.color }}
                >
                  Start New Conversation
                </button>
              </div>
            )}
            {previewScreen === 'expired' && !appearance.session_expired_enabled && (
              <div className="p-4 flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 text-center">Session expired screen is disabled</p>
              </div>
            )}
          </div>

          {/* Input Area (chat screen only) */}
          {previewScreen === 'chat' && (
            <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2 items-center">
              <div className="flex-1 bg-gray-50 rounded-full px-3 py-1.5 text-xs text-gray-400 border border-gray-200">
                Type a message...
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: appearance.color }}
              >
                <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
