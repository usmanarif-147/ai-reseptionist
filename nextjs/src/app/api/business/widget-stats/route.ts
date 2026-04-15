import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'
import { deriveCustomerType } from '@/lib/widget-customer-type'

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

  try {
    const [
      visitorOverview,
      conversationStats,
      intentBreakdown,
      customerSatisfaction,
      feedbackNotes,
      leadCapture,
    ] = await Promise.all([
      getVisitorOverview(supabase, businessId, from, to),
      getConversationStats(supabase, businessId, from, to),
      getIntentBreakdown(supabase, businessId, from, to),
      getCustomerSatisfaction(supabase, businessId, from, to),
      getFeedbackNotes(supabase, businessId, from, to),
      getLeadCapture(supabase, businessId, from, to),
    ])

    return NextResponse.json({
      visitorOverview,
      conversationStats,
      intentBreakdown,
      customerSatisfaction,
      feedbackNotes,
      leadCapture,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function getVisitorOverview(
  supabase: SupabaseClient,
  businessId: string,
  from: string,
  to: string,
) {
  // Total widget opens = all sessions in date range
  const { data: sessions, error: sessionsErr } = await supabase
    .from('chat_sessions')
    .select('id, customer_id')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (sessionsErr) throw new Error(`Visitor overview sessions: ${sessionsErr.message}`)

  const totalWidgetOpens = sessions?.length ?? 0
  const anonymousVisitors = sessions?.filter((s: { customer_id: string | null }) => !s.customer_id).length ?? 0

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
    total_widget_opens: totalWidgetOpens,
    unique_visitors: uniqueVisitors,
    new_visitors: newVisitors,
    returning_visitors: returningVisitors,
    anonymous_visitors: anonymousVisitors,
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

  let customerMap = new Map<string, { name: string | null; email: string }>()
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
  // Get customers captured in date range
  const { data: customers, error: custErr } = await supabase
    .from('widget_customers')
    .select('id, name, total_sessions')
    .eq('business_id', businessId)
    .gte('first_seen_at', from)
    .lte('first_seen_at', to)

  if (custErr) throw new Error(`Lead capture customers: ${custErr.message}`)

  const allCustomers = customers ?? []
  const totalLeads = allCustomers.length

  // Get appointment counts by customer_name
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('customer_name')
    .eq('business_id', businessId)

  if (apptErr) throw new Error(`Lead capture appointments: ${apptErr.message}`)

  const appointmentCountByName = new Map<string, number>()
  for (const appt of appointments ?? []) {
    const name = appt.customer_name?.toLowerCase()?.trim()
    if (name) {
      appointmentCountByName.set(name, (appointmentCountByName.get(name) || 0) + 1)
    }
  }

  const byType: Record<string, number> = {
    regular_customer: 0,
    booked_customer: 0,
    interested_prospect: 0,
    returning_visitor: 0,
    new_visitor: 0,
  }

  for (const c of allCustomers) {
    const customerName = c.name?.toLowerCase()?.trim()
    const totalAppointments = customerName ? (appointmentCountByName.get(customerName) || 0) : 0
    const type = deriveCustomerType(c.total_sessions, totalAppointments)
    byType[type]++
  }

  return {
    total_leads: totalLeads,
    by_type: byType,
  }
}
