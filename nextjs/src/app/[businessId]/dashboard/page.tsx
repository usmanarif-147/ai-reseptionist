'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  DateRangeFilter,
  PageHeader,
  StatCard,
} from '@/components/dashboard'

interface SetupStatus {
  hasProfile: boolean
  hasServices: boolean
  hasHours: boolean
  hasStaff: boolean
  hasWidget: boolean
  hasPayments: boolean
}

interface VisitorOverview {
  total_conversations: number
  unique_visitors: number
  new_visitors: number
  returning_visitors: number
  anonymous_chatters: number
}

interface ConversationStats {
  total_sessions: number
  sessions_ended_normally: number
  sessions_expired: number
  avg_messages_per_session: number
  off_topic_sessions: number
}

interface WidgetFunnel {
  opens: number
  engaged: number
  leads: number
  customers: number
  open_to_chat_pct: number
  chat_to_lead_pct: number
  lead_to_customer_pct: number
}

interface VisitorBreakdown {
  customer: number
  lead: number
  frequent_visitor: number
  one_time_visitor: number
}

interface WidgetStats {
  visitorOverview: VisitorOverview
  conversationStats: ConversationStats
  intentBreakdown: Record<string, number>
  funnel: WidgetFunnel
  visitorBreakdown: VisitorBreakdown
}

type RangeKey = 'today' | '7d' | '30d' | 'custom'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function classifyRange(start: Date, end: Date): RangeKey {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const startMatch = Math.abs(start.getTime() - startOfToday.getTime()) < 1000
  const endMatch = Math.abs(end.getTime() - endOfToday.getTime()) < 1000

  if (startMatch && endMatch) return 'today'

  if (endMatch) {
    const daysBack = Math.round((startOfToday.getTime() - start.getTime()) / MS_PER_DAY)
    if (daysBack === 6) return '7d'
    if (daysBack === 29) return '30d'
  }

  return 'custom'
}

export default function OverviewPage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [setupLoading, setSetupLoading] = useState(true)

  const [stats, setStats] = useState<WidgetStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    loadSetup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  async function loadSetup() {
    setSetupLoading(true)
    const supabase = createClient()

    const { data: biz } = await supabase
      .from('businesses')
      .select('name, type')
      .eq('id', businessId)
      .single()

    const [services, hours, staff, widget, payments] = await Promise.all([
      supabase.from('services').select('id').eq('business_id', businessId).limit(1),
      supabase.from('business_hours').select('id').eq('business_id', businessId).eq('is_closed', false).limit(1),
      supabase.from('staff').select('id').eq('business_id', businessId).limit(1),
      supabase.from('widget_settings').select('id').eq('business_id', businessId).limit(1),
      supabase.from('payment_settings').select('id').eq('business_id', businessId).limit(1),
    ])

    setSetup({
      hasProfile: !!biz?.name && !!biz?.type,
      hasServices: (services.data?.length ?? 0) > 0,
      hasHours: (hours.data?.length ?? 0) > 0,
      hasStaff: (staff.data?.length ?? 0) > 0,
      hasWidget: (widget.data?.length ?? 0) > 0,
      hasPayments: (payments.data?.length ?? 0) > 0,
    })

    setSetupLoading(false)
  }

  const fetchStats = useCallback(async (start: Date, end: Date) => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const rangeKey = classifyRange(start, end)
      const params = new URLSearchParams({ range: rangeKey })
      if (rangeKey === 'custom') {
        params.set('from', toIsoDate(start))
        params.set('to', toIsoDate(end))
      }
      const res = await fetch(`/api/business/widget-stats?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load statistics')
      }
      const json = await res.json()
      setStats({
        visitorOverview: json.visitorOverview,
        conversationStats: json.conversationStats,
        intentBreakdown: json.intentBreakdown,
        funnel: json.funnel,
        visitorBreakdown: json.visitorBreakdown,
      })
    } catch (err: unknown) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const handleDateRangeChange = useCallback(
    (range: { start: Date; end: Date }) => {
      fetchStats(range.start, range.end)
    },
    [fetchStats],
  )

  const businessBasePath = `/${businessId}`

  const checklist = [
    { done: setup?.hasProfile ?? false, label: 'Complete your business profile', href: '/settings/business-profile' },
    { done: setup?.hasServices ?? false, label: 'Add your services and pricing', href: '/services' },
    { done: setup?.hasHours ?? false, label: 'Set your business hours', href: '/settings/business-hours' },
    { done: setup?.hasStaff ?? false, label: 'Add your staff members', href: '/staff' },
    { done: setup?.hasPayments ?? false, label: 'Configure payment settings', href: '/settings/payments' },
    { done: setup?.hasWidget ?? false, label: 'Customize and copy your widget settings', href: '/widget-settings' },
  ]

  const completedCount = checklist.filter((c) => c.done).length

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Welcome to your business dashboard"
        actions={
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            defaultRange="7d"
          />
        }
      />

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-blue-900">Setup Checklist</h2>
          <span className="text-sm text-blue-600 font-medium">
            {setupLoading ? '…' : `${completedCount}/${checklist.length} complete`}
          </span>
        </div>
        {setupLoading ? (
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className="h-4 bg-blue-200/60 rounded w-full animate-pulse" />
            ))}
          </ul>
        ) : (
          <ul className="space-y-3 text-sm text-blue-800">
            {checklist.map((item, i) => (
              <li key={i}>
                <Link href={`${businessBasePath}${item.href}`} className="flex items-center gap-3 hover:text-blue-900">
                  {item.done ? (
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center text-xs flex-shrink-0">
                      {i + 1}
                    </span>
                  )}
                  <span className={item.done ? 'line-through opacity-60' : ''}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {statsError}
        </div>
      )}

      {statsLoading ? (
        <StatsLoadingSkeleton />
      ) : stats ? (
        <div className="space-y-10">
          <WidgetFunnelSection data={stats.funnel} />
          <VisitorBreakdownSection data={stats.visitorBreakdown} />
          <VisitorOverviewSection data={stats.visitorOverview} />
          <ConversationStatsSection data={stats.conversationStats} />
          <IntentBreakdownSection data={stats.intentBreakdown} />
        </div>
      ) : null}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 mb-4">{children}</h2>
}

function WidgetFunnelSection({ data }: { data: WidgetFunnel }) {
  const steps: { label: string; value: number }[] = [
    { label: 'Launcher Opens', value: data.opens },
    { label: 'Engaged Conversations', value: data.engaged },
    { label: 'Leads Captured', value: data.leads },
    { label: 'Customers', value: data.customers },
  ]

  const conversions: { label: string; pct: number }[] = [
    { label: 'Open → Chat', pct: data.open_to_chat_pct },
    { label: 'Chat → Lead', pct: data.chat_to_lead_pct },
    { label: 'Lead → Customer', pct: data.lead_to_customer_pct },
  ]

  return (
    <section>
      <SectionHeading>Widget Funnel</SectionHeading>
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col lg:flex-row lg:items-stretch gap-4 lg:flex-1">
            <div className="flex-1">
              <StatCard label={step.label} value={step.value} />
            </div>
            {i < conversions.length && (
              <div className="flex items-center justify-center lg:flex-shrink-0">
                <div className="inline-flex flex-col items-center gap-0.5 px-3 py-2 rounded-full bg-gray-50 border border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{conversions[i].pct}%</span>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">{conversions[i].label}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function VisitorBreakdownSection({ data }: { data: VisitorBreakdown }) {
  const tiers: { label: string; value: number; accent: string }[] = [
    { label: 'Customers', value: data.customer, accent: 'bg-green-500' },
    { label: 'Leads', value: data.lead, accent: 'bg-blue-500' },
    { label: 'Frequent Visitors', value: data.frequent_visitor, accent: 'bg-purple-500' },
    { label: 'One-Time Visitors', value: data.one_time_visitor, accent: 'bg-gray-400' },
  ]

  const total = tiers.reduce((sum, t) => sum + t.value, 0)

  return (
    <section>
      <SectionHeading>Visitor Breakdown</SectionHeading>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => {
            const share = total > 0 ? Math.round((tier.value / total) * 100) : 0
            return (
              <div key={tier.label}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${tier.accent}`} />
                  <span className="text-sm text-gray-600">{tier.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{tier.value}</span>
                  <span className="text-xs text-gray-500">{share}% of total</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function VisitorOverviewSection({ data }: { data: VisitorOverview }) {
  return (
    <section>
      <SectionHeading>Visitor Overview</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Conversations" value={data.total_conversations} />
        <StatCard label="Unique Visitors" value={data.unique_visitors} />
        <StatCard label="New Visitors" value={data.new_visitors} />
        <StatCard label="Returning Visitors" value={data.returning_visitors} />
        <StatCard label="Anonymous Chatters" value={data.anonymous_chatters} />
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

function StatsLoadingSkeleton() {
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
