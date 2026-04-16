'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { TableView } from '@/components/dashboard'
import type { ColumnDef } from '@/components/dashboard'

interface VisitorOverview {
  total_widget_opens: number
  unique_visitors: number
  new_visitors: number
  returning_visitors: number
  anonymous_visitors: number
}

interface ConversationStats {
  total_sessions: number
  sessions_ended_normally: number
  sessions_expired: number
  avg_messages_per_session: number
  off_topic_sessions: number
}

interface RatingBreakdownEntry {
  count: number
  percentage: number
}

interface CustomerSatisfaction {
  average_rating: number | null
  total_feedback_received: number
  rating_breakdown: Record<string, RatingBreakdownEntry>
}

interface FeedbackNote {
  rating: number | null
  note: string
  ended_at: string
  customer_name: string | null
  customer_email: string | null
}

interface FeedbackNotes {
  notes: FeedbackNote[]
}

interface LeadCapture {
  total_leads: number
  by_type: Record<string, number>
}

interface WidgetStats {
  visitorOverview: VisitorOverview
  conversationStats: ConversationStats
  intentBreakdown: Record<string, number>
  customerSatisfaction: CustomerSatisfaction
  feedbackNotes: FeedbackNotes
  leadCapture: LeadCapture
}

type DateRange = 'today' | '7d' | '30d' | 'custom'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom',
}

export default function WidgetStatsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedCustomFrom, setAppliedCustomFrom] = useState('')
  const [appliedCustomTo, setAppliedCustomTo] = useState('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [data, setData] = useState<WidgetStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async (range: DateRange, from?: string, to?: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ range })
      if (range === 'custom' && from && to) {
        params.set('from', from)
        params.set('to', to)
      }
      const res = await fetch(`/api/business/widget-stats?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load statistics')
      }
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dateRange !== 'custom') {
      fetchStats(dateRange)
    }
  }, [dateRange, fetchStats])

  function handleRangeClick(range: DateRange) {
    if (range === 'custom') {
      setShowCustomPicker(true)
      setDateRange('custom')
    } else {
      setShowCustomPicker(false)
      setDateRange(range)
    }
  }

  function handleApplyCustom() {
    if (customFrom && customTo) {
      setAppliedCustomFrom(customFrom)
      setAppliedCustomTo(customTo)
      fetchStats('custom', customFrom, customTo)
    }
  }

  const activeDateLabel = dateRange === 'custom' && appliedCustomFrom && appliedCustomTo
    ? `from ${formatDate(appliedCustomFrom)} to ${formatDate(appliedCustomTo)}`
    : DATE_RANGE_LABELS[dateRange]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Widget Statistics</h1>
      <p className="text-gray-500 text-sm mb-6">
        Statistics for your chat widget performance — {activeDateLabel}
      </p>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {(['today', '7d', '30d', 'custom'] as DateRange[]).map((range) => (
          <button
            key={range}
            onClick={() => handleRangeClick(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {DATE_RANGE_LABELS[range]}
          </button>
        ))}
      </div>

      {showCustomPicker && dateRange === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 mb-8 bg-white rounded-xl border border-gray-100 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!customFrom || !customTo}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="space-y-10">
          <VisitorOverviewSection data={data.visitorOverview} />
          <ConversationStatsSection data={data.conversationStats} />
          <IntentBreakdownSection data={data.intentBreakdown} />
          <CustomerSatisfactionSection data={data.customerSatisfaction} />
          <FeedbackNotesSection data={data.feedbackNotes} />
          <LeadCaptureSection data={data.leadCapture} />
        </div>
      ) : null}
    </div>
  )
}

/* ─── Section Components ─── */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 mb-4">{children}</h2>
}

function VisitorOverviewSection({ data }: { data: VisitorOverview }) {
  return (
    <section>
      <SectionHeading>Visitor Overview</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Widget Opens" value={data.total_widget_opens} />
        <StatCard label="Unique Visitors" value={data.unique_visitors} />
        <StatCard label="New Visitors" value={data.new_visitors} />
        <StatCard label="Returning Visitors" value={data.returning_visitors} />
        <StatCard label="Anonymous Visitors" value={data.anonymous_visitors} />
      </div>
    </section>
  )
}

function ConversationStatsSection({ data }: { data: ConversationStats }) {
  return (
    <section>
      <SectionHeading>Conversation Stats</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Chat Sessions" value={data.total_sessions} />
        <StatCard label="Sessions Ended" value={data.sessions_ended_normally} />
        <StatCard label="Sessions Expired" value={data.sessions_expired} />
        <StatCard label="Avg Messages / Session" value={data.avg_messages_per_session} />
        <StatCard label="Off-Topic Sessions" value={data.off_topic_sessions} />
      </div>
    </section>
  )
}

function IntentBreakdownSection({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)

  if (entries.length === 0) {
    return (
      <section>
        <SectionHeading>Intent Breakdown</SectionHeading>
        <p className="text-sm text-gray-500">No intent data available.</p>
      </section>
    )
  }

  const maxCount = Math.max(...entries.map(([, count]) => count), 1)

  return (
    <section>
      <SectionHeading>Intent Breakdown</SectionHeading>
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        {entries.map(([intent, count]) => (
          <div key={intent}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 capitalize">{intent.replace(/_/g, ' ')}</span>
              <span className="text-sm text-gray-500">{count} sessions</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CustomerSatisfactionSection({ data }: { data: CustomerSatisfaction }) {
  if (data.total_feedback_received === 0) {
    return (
      <section>
        <SectionHeading>Customer Satisfaction</SectionHeading>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">No feedback received yet.</p>
        </div>
      </section>
    )
  }

  const ratingColorMap: Record<string, string> = {
    five_stars: 'bg-green-500',
    four_stars: 'bg-green-400',
    three_stars: 'bg-yellow-400',
    one_two_stars: 'bg-red-400',
    no_rating: 'bg-gray-300',
  }

  const ratingLabelMap: Record<string, string> = {
    five_stars: '5 Stars',
    four_stars: '4 Stars',
    three_stars: '3 Stars',
    one_two_stars: '1-2 Stars',
    no_rating: 'No Rating',
  }

  const ratingOrder = ['five_stars', 'four_stars', 'three_stars', 'one_two_stars', 'no_rating']

  return (
    <section>
      <SectionHeading>Customer Satisfaction</SectionHeading>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Headline Rating */}
          <div className="flex-shrink-0">
            <p className="text-sm text-gray-500 mb-1">Average Rating</p>
            <p className="text-4xl font-bold text-gray-900">
              {data.average_rating !== null ? data.average_rating.toFixed(1) : '---'}
              <span className="text-yellow-400 ml-1">&#9733;</span>
              <span className="text-lg font-normal text-gray-400 ml-1">/ 5</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Based on {data.total_feedback_received} rating{data.total_feedback_received !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-3">
            {ratingOrder.map((key) => {
              const entry = data.rating_breakdown[key]
              if (!entry) return null
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20 text-right">{ratingLabelMap[key]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className={`${ratingColorMap[key] || 'bg-gray-300'} h-3 rounded-full transition-all`}
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-24">
                    {entry.count} ({entry.percentage.toFixed(1)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeedbackNotesSection({ data }: { data: FeedbackNotes }) {
  const notes = data.notes

  const feedbackColumns: ColumnDef<FeedbackNote>[] = useMemo(() => [
    {
      header: 'Rating',
      accessor: (note) => (
        <span className="text-yellow-400">
          {note.rating
            ? Array.from({ length: note.rating }, () => '\u2605').join('')
            : '---'}
        </span>
      ),
    },
    {
      header: 'Note',
      accessor: (note) => <span className="max-w-xs truncate inline-block">{note.note}</span>,
    },
    {
      header: 'Date',
      accessor: (note) => formatDate(note.ended_at),
    },
    {
      header: 'Customer',
      accessor: (note) => note.customer_name || note.customer_email || 'Anonymous',
    },
  ], [])

  return (
    <section>
      <SectionHeading>Feedback Notes</SectionHeading>
      <TableView<FeedbackNote>
        columns={feedbackColumns}
        data={notes}
        keyExtractor={(note) => `${note.ended_at}-${note.note.slice(0, 20)}`}
        emptyMessage="No feedback notes yet."
      />
    </section>
  )
}

function LeadCaptureSection({ data }: { data: LeadCapture }) {
  const typeEntries = Object.entries(data.by_type)

  return (
    <section>
      <SectionHeading>Lead Capture Summary</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Leads Captured" value={data.total_leads} />
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-3">By Customer Type</p>
          {typeEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No leads yet.</p>
          ) : (
            <ul className="space-y-2">
              {typeEntries.map(([type, count]) => (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
