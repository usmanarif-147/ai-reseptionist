import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { reapStaleSessions } from '@/lib/reap-stale-sessions'
import { classifyVisitor, VisitorTier } from '@/lib/widget-customer-type'

function getDateRange(range: string, fromParam?: string, toParam?: string): { from: string; to: string } {
  if (range === 'custom' && fromParam && toParam) {
    const from = new Date(fromParam)
    from.setHours(0, 0, 0, 0)
    const to = new Date(toParam)
    to.setHours(23, 59, 59, 999)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  const from = new Date(now)
  if (range === 'today') {
    from.setHours(0, 0, 0, 0)
  } else if (range === '7d') {
    from.setDate(from.getDate() - 7)
    from.setHours(0, 0, 0, 0)
  } else {
    // default to 30d
    from.setDate(from.getDate() - 30)
    from.setHours(0, 0, 0, 0)
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const params = request.nextUrl.searchParams
  const range = params.get('range') || '30d'
  const fromParam = params.get('from') ?? undefined
  const toParam = params.get('to') ?? undefined

  if (!['today', '7d', '30d', 'custom'].includes(range)) {
    return NextResponse.json({ error: 'Invalid range parameter' }, { status: 400 })
  }
  if (range === 'custom' && (!fromParam || !toParam)) {
    return NextResponse.json({ error: 'Custom range requires from and to parameters' }, { status: 400 })
  }

  const { from, to } = getDateRange(range, fromParam, toParam)
  const businessId = business.id

  await reapStaleSessions(businessId)

  try {
    const [
      widgetOpens,
      visitorOverview,
      conversationStats,
      intentBreakdown,
      customerSatisfaction,
      feedbackNotes,
      leadCapture,
      funnel,
      visitorBreakdown,
    ] = await Promise.all([
      getWidgetOpens(supabase, businessId, from, to),
      getVisitorOverview(supabase, businessId, from, to),
      getConversationStats(supabase, businessId, from, to),
      getIntentBreakdown(supabase, businessId, from, to),
      getCustomerSatisfaction(supabase, businessId, from, to),
      getFeedbackNotes(supabase, businessId, from, to),
      getLeadCapture(supabase, businessId, from, to),
      getWidgetFunnel(supabase, businessId, from, to),
      getVisitorBreakdown(supabase, businessId, from, to),
    ])

    return NextResponse.json({
      widgetOpens,
      visitorOverview,
      conversationStats,
      intentBreakdown,
      customerSatisfaction,
      feedbackNotes,
      leadCapture,
      funnel,
      visitorBreakdown,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function getWidgetOpens(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase
    .from('widget_opens')
    .select('visitor_id')
    .eq('business_id', businessId)
    .gte('opened_at', from)
    .lte('opened_at', to)

  if (error) throw new Error(`Widget opens: ${error.message}`)

  const rows = data ?? []
  const total = rows.length
  const distinctVisitors = new Set(
    rows.map((r: { visitor_id: string }) => r.visitor_id).filter(Boolean)
  ).size

  return {
    total,
    distinct_visitors: distinctVisitors,
  }
}

async function getVisitorOverview(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Conversations = all chat sessions in date range
  const { data: sessions, error: sessionsErr } = await supabase
    .from('chat_sessions')
    .select('id, customer_id')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (sessionsErr) throw new Error(`Visitor overview sessions: ${sessionsErr.message}`)

  const totalConversations = sessions?.length ?? 0
  const anonymousChatters = sessions?.filter((s: { customer_id: string | null }) => !s.customer_id).length ?? 0

  // Unique visitors = distinct customers with first_seen_at in range
  const { data: newCustomers, error: newErr } = await supabase
    .from('widget_customers')
    .select('id')
    .eq('business_id', businessId)
    .gte('first_seen_at', from)
    .lte('first_seen_at', to)

  if (newErr) throw new Error(`Visitor overview new customers: ${newErr.message}`)

  const newVisitors = newCustomers?.length ?? 0

  // Returning visitors = customers with total_sessions >= 2 and last_seen_at in range
  const { data: returningCustomers, error: retErr } = await supabase
    .from('widget_customers')
    .select('id')
    .eq('business_id', businessId)
    .gte('total_sessions', 2)
    .gte('last_seen_at', from)
    .lte('last_seen_at', to)

  if (retErr) throw new Error(`Visitor overview returning: ${retErr.message}`)

  const returningVisitors = returningCustomers?.length ?? 0
  const uniqueVisitors = newVisitors + returningVisitors

  return {
    total_conversations: totalConversations,
    // Back-compat alias retained so existing dashboard keeps rendering during rollout.
    total_widget_opens: totalConversations,
    unique_visitors: uniqueVisitors,
    new_visitors: newVisitors,
    returning_visitors: returningVisitors,
    anonymous_chatters: anonymousChatters,
    // Back-compat alias.
    anonymous_visitors: anonymousChatters,
  }
}

async function getConversationStats(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Get ALL sessions in date range (regardless of status)
  const { data: sessions, error: sessErr } = await supabase
    .from('chat_sessions')
    .select('id, status, off_topic_count')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (sessErr) throw new Error(`Conversation stats sessions: ${sessErr.message}`)

  const allSessions = sessions ?? []
  const totalSessions = allSessions.length
  const sessionsEndedNormally = allSessions.filter((s: { status: string }) => s.status === 'ended').length
  const sessionsExpired = allSessions.filter((s: { status: string }) => s.status === 'expired').length
  const offTopicSessions = allSessions.filter((s: { off_topic_count: number }) => s.off_topic_count >= 1).length

  // Average messages per session
  let avgMessagesPerSession = 0
  if (totalSessions > 0) {
    const sessionIds = allSessions.map((s: { id: string }) => s.id)
    const { data: messages, error: msgErr } = await supabase
      .from('chat_messages')
      .select('id')
      .in('session_id', sessionIds)

    if (msgErr) throw new Error(`Conversation stats messages: ${msgErr.message}`)

    const totalMessages = messages?.length ?? 0
    avgMessagesPerSession = Math.round((totalMessages / totalSessions) * 10) / 10
  }

  return {
    total_sessions: totalSessions,
    sessions_ended_normally: sessionsEndedNormally,
    sessions_expired: sessionsExpired,
    avg_messages_per_session: avgMessagesPerSession,
    off_topic_sessions: offTopicSessions,
  }
}

async function getIntentBreakdown(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('intent')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw new Error(`Intent breakdown: ${error.message}`)

  const breakdown: Record<string, number> = {
    basic_information: 0,
    book_appointment: 0,
    appointment_details: 0,
  }

  for (const s of sessions ?? []) {
    if (s.intent && breakdown[s.intent] !== undefined) {
      breakdown[s.intent]++
    }
  }

  return breakdown
}

async function getCustomerSatisfaction(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Get all completed sessions in date range
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('feedback_rating, status')
    .eq('business_id', businessId)
    .in('status', ['ended', 'expired'])
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw new Error(`Customer satisfaction: ${error.message}`)

  const allSessions = sessions ?? []
  const withRating = allSessions.filter((s: { feedback_rating: number | null }) => s.feedback_rating !== null)
  const totalFeedback = withRating.length

  let averageRating = 0
  if (totalFeedback > 0) {
    const sum = withRating.reduce((acc: number, s: { feedback_rating: number }) => acc + s.feedback_rating, 0)
    averageRating = Math.round((sum / totalFeedback) * 10) / 10
  }

  const fiveStars = withRating.filter((s: { feedback_rating: number }) => s.feedback_rating === 5).length
  const fourStars = withRating.filter((s: { feedback_rating: number }) => s.feedback_rating === 4).length
  const threeStars = withRating.filter((s: { feedback_rating: number }) => s.feedback_rating === 3).length
  const oneTwoStars = withRating.filter((s: { feedback_rating: number }) => s.feedback_rating <= 2).length
  const noRating = allSessions.filter((s: { feedback_rating: number | null }) => s.feedback_rating === null).length

  const totalForPercentage = totalFeedback + noRating
  const pct = (count: number) =>
    totalForPercentage > 0 ? Math.round((count / totalForPercentage) * 1000) / 10 : 0

  return {
    total_feedback_received: totalFeedback,
    average_rating: averageRating,
    rating_breakdown: {
      five_stars: { count: fiveStars, percentage: pct(fiveStars) },
      four_stars: { count: fourStars, percentage: pct(fourStars) },
      three_stars: { count: threeStars, percentage: pct(threeStars) },
      one_two_stars: { count: oneTwoStars, percentage: pct(oneTwoStars) },
      no_rating: { count: noRating, percentage: pct(noRating) },
    },
  }
}

async function getFeedbackNotes(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Get sessions with feedback notes, join customer data
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('feedback_rating, feedback_note, ended_at, customer_id')
    .eq('business_id', businessId)
    .in('status', ['ended', 'expired'])
    .not('feedback_note', 'is', null)
    .neq('feedback_note', '')
    .gte('ended_at', from)
    .lte('ended_at', to)
    .order('ended_at', { ascending: false })

  if (error) throw new Error(`Feedback notes: ${error.message}`)

  const allSessions = sessions ?? []

  // Fetch customer details for sessions that have a customer_id
  const customerIds = allSessions
    .map((s: { customer_id: string | null }) => s.customer_id)
    .filter(Boolean) as string[]

  const customerMap = new Map<string, { name: string | null; email: string }>()
  if (customerIds.length > 0) {
    const { data: customers, error: custErr } = await supabase
      .from('widget_customers')
      .select('id, name, email')
      .in('id', customerIds)

    if (custErr) throw new Error(`Feedback notes customers: ${custErr.message}`)

    for (const c of customers ?? []) {
      customerMap.set(c.id, { name: c.name, email: c.email })
    }
  }

  const notes = allSessions.map((s: {
    feedback_rating: number | null
    feedback_note: string
    ended_at: string
    customer_id: string | null
  }) => {
    const customer = s.customer_id ? customerMap.get(s.customer_id) : null
    return {
      rating: s.feedback_rating,
      note: s.feedback_note,
      ended_at: s.ended_at,
      customer_name: customer?.name ?? null,
      customer_email: customer?.email ?? null,
    }
  })

  return { notes }
}

async function getLeadCapture(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  const { data: customers, error: custErr } = await supabase
    .from('widget_customers')
    .select('id, name, email, total_sessions')
    .eq('business_id', businessId)
    .gte('first_seen_at', from)
    .lte('first_seen_at', to)

  if (custErr) throw new Error(`Lead capture customers: ${custErr.message}`)

  const allCustomers = customers ?? []
  const totalLeads = allCustomers.length

  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('customer_name, customer_email')
    .eq('business_id', businessId)

  if (apptErr) throw new Error(`Lead capture appointments: ${apptErr.message}`)

  const { byName: apptByName, byEmail: apptByEmail } = indexAppointments(appointments ?? [])

  const byType: Record<VisitorTier, number> = {
    customer: 0,
    lead: 0,
    frequent_visitor: 0,
    one_time_visitor: 0,
  }

  for (const c of allCustomers) {
    const totalAppointments = appointmentCountFor(c.name, c.email, apptByName, apptByEmail)
    const type = classifyVisitor({ kind: 'identified', totalAppointments })
    byType[type]++
  }

  return {
    total_leads: totalLeads,
    by_type: byType,
  }
}

async function getWidgetFunnel(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Opens — rows in widget_opens within range
  const { count: opensCount, error: opensErr } = await supabase
    .from('widget_opens')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('opened_at', from)
    .lte('opened_at', to)

  if (opensErr) throw new Error(`Funnel opens: ${opensErr.message}`)
  const opens = opensCount ?? 0

  // Engaged — sessions with at least one user message.
  const { data: sessions, error: sessErr } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (sessErr) throw new Error(`Funnel sessions: ${sessErr.message}`)

  let engaged = 0
  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id)
  if (sessionIds.length > 0) {
    const { data: userMsgs, error: msgErr } = await supabase
      .from('chat_messages')
      .select('session_id')
      .eq('role', 'user')
      .in('session_id', sessionIds)

    if (msgErr) throw new Error(`Funnel messages: ${msgErr.message}`)

    engaged = new Set((userMsgs ?? []).map((m: { session_id: string }) => m.session_id)).size
  }

  // Leads — new widget_customers rows in range
  const { data: leadRows, error: leadsErr } = await supabase
    .from('widget_customers')
    .select('name, email')
    .eq('business_id', businessId)
    .gte('first_seen_at', from)
    .lte('first_seen_at', to)

  if (leadsErr) throw new Error(`Funnel leads: ${leadsErr.message}`)

  const leadList = leadRows ?? []
  const leads = leadList.length

  // Customers — leads with at least one appointment (matched by email or name)
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('customer_name, customer_email')
    .eq('business_id', businessId)

  if (apptErr) throw new Error(`Funnel appointments: ${apptErr.message}`)

  const { byName: apptByName, byEmail: apptByEmail } = indexAppointments(appointments ?? [])

  let customers = 0
  for (const lead of leadList) {
    const count = appointmentCountFor(lead.name, lead.email, apptByName, apptByEmail)
    if (count >= 1) customers++
  }

  const pct = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0

  return {
    opens,
    engaged,
    leads,
    customers,
    open_to_chat_pct: pct(engaged, opens),
    chat_to_lead_pct: pct(leads, engaged),
    lead_to_customer_pct: pct(customers, leads),
  }
}

async function getVisitorBreakdown(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  const breakdown: Record<VisitorTier, number> = {
    customer: 0,
    lead: 0,
    frequent_visitor: 0,
    one_time_visitor: 0,
  }

  // Identified visitors — widget_customers with first_seen_at in range.
  const { data: customers, error: custErr } = await supabase
    .from('widget_customers')
    .select('id, name, email, visitor_id')
    .eq('business_id', businessId)
    .gte('first_seen_at', from)
    .lte('first_seen_at', to)

  if (custErr) throw new Error(`Visitor breakdown customers: ${custErr.message}`)

  const identifiedCustomers = customers ?? []
  const identifiedVisitorIds = new Set<string>(
    identifiedCustomers
      .map((c: { visitor_id: string | null }) => c.visitor_id)
      .filter(Boolean) as string[]
  )

  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('customer_name, customer_email')
    .eq('business_id', businessId)

  if (apptErr) throw new Error(`Visitor breakdown appointments: ${apptErr.message}`)

  const { byName: apptByName, byEmail: apptByEmail } = indexAppointments(appointments ?? [])

  for (const c of identifiedCustomers) {
    const totalAppointments = appointmentCountFor(c.name, c.email, apptByName, apptByEmail)
    const tier = classifyVisitor({ kind: 'identified', totalAppointments })
    breakdown[tier]++
  }

  // Anonymous visitors — chat_sessions in range with customer_id null, grouped by visitor_id.
  const { data: anonSessions, error: anonErr } = await supabase
    .from('chat_sessions')
    .select('visitor_id')
    .eq('business_id', businessId)
    .is('customer_id', null)
    .not('visitor_id', 'is', null)
    .gte('created_at', from)
    .lte('created_at', to)

  if (anonErr) throw new Error(`Visitor breakdown anonymous: ${anonErr.message}`)

  const anonCounts = new Map<string, number>()
  for (const s of anonSessions ?? []) {
    const vid = (s as { visitor_id: string | null }).visitor_id
    if (!vid) continue
    // Skip visitors who are also identified — they're already counted above.
    if (identifiedVisitorIds.has(vid)) continue
    anonCounts.set(vid, (anonCounts.get(vid) ?? 0) + 1)
  }

  for (const count of anonCounts.values()) {
    const tier = classifyVisitor({ kind: 'anonymous', sessionCount: count })
    breakdown[tier]++
  }

  return breakdown
}

type AppointmentRow = { customer_name: string | null; customer_email: string | null }

function indexAppointments(rows: AppointmentRow[]) {
  const byName = new Map<string, number>()
  const byEmail = new Map<string, number>()
  for (const a of rows) {
    const name = a.customer_name?.toLowerCase()?.trim()
    if (name) byName.set(name, (byName.get(name) ?? 0) + 1)
    const email = a.customer_email?.toLowerCase()?.trim()
    if (email) byEmail.set(email, (byEmail.get(email) ?? 0) + 1)
  }
  return { byName, byEmail }
}

function appointmentCountFor(
  name: string | null | undefined,
  email: string | null | undefined,
  byName: Map<string, number>,
  byEmail: Map<string, number>,
): number {
  const normEmail = email?.toLowerCase()?.trim()
  if (normEmail) {
    const c = byEmail.get(normEmail)
    if (c !== undefined) return c
  }
  const normName = name?.toLowerCase()?.trim()
  if (normName) {
    return byName.get(normName) ?? 0
  }
  return 0
}
