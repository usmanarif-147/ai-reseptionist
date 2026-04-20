import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { createGeminiClient } from '@/lib/gemini'
import { buildSystemPrompt, DEFAULT_VISIBILITY_SETTINGS, VisibilitySettings, CustomerData } from '@/lib/build-system-prompt'
import { inferIntent } from '@/lib/infer-intent'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { businessId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let body: { session_id?: string; message?: string; customer_id?: string; intent?: string; visitor_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const message = body.message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const trimmedMessage = message.slice(0, 2000)

  const supabase = createAdminClient()

  // Resolve or create session
  let sessionId = body.session_id
  let sessionOffTopicCount = 0

  if (sessionId) {
    if (!UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Verify session belongs to this business
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, customer_id, off_topic_count, status, intent')
      .eq('id', sessionId)
      .eq('business_id', businessId)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Reject messages to ended/expired sessions
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session has ended' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    sessionOffTopicCount = session.off_topic_count ?? 0

    // Link customer to existing session if not already linked
    if (body.customer_id && UUID_REGEX.test(body.customer_id) && !session.customer_id) {
      await supabase
        .from('chat_sessions')
        .update({
          customer_id: body.customer_id,
          intent: body.intent || session.intent || null,
        })
        .eq('id', sessionId)
        .eq('business_id', businessId)
    }

    // First-turn intent inference: if the session has no messages yet and no intent, classify now
    if (!session.intent) {
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)

      if ((count ?? 0) === 0) {
        const inferredIntent = inferIntent(trimmedMessage)
        await supabase
          .from('chat_sessions')
          .update({ intent: inferredIntent })
          .eq('id', sessionId)
          .eq('business_id', businessId)
        body.intent = body.intent || inferredIntent
      }
    }
  } else {
    // Verify business exists before creating a session
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const sessionInsert: Record<string, unknown> = { business_id: businessId }
    if (body.customer_id && UUID_REGEX.test(body.customer_id)) {
      sessionInsert.customer_id = body.customer_id
    }
    const incomingVisitorId = body.visitor_id?.trim()
    if (incomingVisitorId && incomingVisitorId.length > 0 && incomingVisitorId.length <= 128) {
      sessionInsert.visitor_id = incomingVisitorId
    }
    // First-turn intent inference — classify from the opening message
    const inferredIntent = body.intent || inferIntent(trimmedMessage)
    sessionInsert.intent = inferredIntent
    body.intent = inferredIntent

    const { data: newSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert(sessionInsert)
      .select('id')
      .single()

    if (sessionError || !newSession) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    sessionId = newSession.id
  }

  // Off-topic short-circuit: if user has hit the limit, skip Gemini entirely
  if (sessionOffTopicCount >= 3) {
    // Persist user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: trimmedMessage,
    })

    // Fetch business name for the message
    const { data: biz } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single()
    const bizName = biz?.name ?? 'this business'

    const offTopicMsg = `It looks like your questions are outside what I can help with here. I'm only able to assist with ${bizName} related topics. Feel free to contact us directly if you need further help.`

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: offTopicMsg,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'session', session_id: sessionId })}\n\n`)
        )
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'token', token: offTopicMsg })}\n\n`)
        )
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Fetch business data, widget settings, and conversation history in parallel
  const [
    { data: businessData },
    { data: services },
    { data: hours },
    { data: staff },
    { data: customFields },
    { data: staffCustomFields },
    { data: staffHours },
    { data: widgetSettings },
    { data: customerData },
    { data: history },
  ] = await Promise.all([
    supabase
      .from('businesses')
      .select('name, type, contact, address')
      .eq('id', businessId)
      .single(),
    supabase
      .from('services')
      .select('id, name, description, price, duration_minutes, category, is_active, meta')
      .eq('business_id', businessId),
    supabase
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', businessId)
      .order('day_of_week'),
    supabase
      .from('staff')
      .select('id, name, role, bio, is_active, meta')
      .eq('business_id', businessId),
    supabase
      .from('service_custom_fields')
      .select('label, field_key')
      .eq('business_id', businessId)
      .order('sort_order'),
    supabase
      .from('staff_custom_fields')
      .select('label, field_key')
      .eq('business_id', businessId)
      .order('sort_order'),
    supabase
      .from('staff_hours')
      .select('staff_id, day_of_week, open_time, close_time, is_closed')
      .eq('business_id', businessId)
      .order('day_of_week'),
    supabase
      .from('widget_settings')
      .select('show_business_name, show_contact, show_address, show_business_type, show_business_hours, services_visibility, hidden_service_ids, staff_visibility, hidden_staff_ids, show_appointment_service, show_appointment_staff, show_appointment_datetime, show_appointment_duration, show_appointment_payment_type, show_appointment_payment_status, show_appointment_notes')
      .eq('business_id', businessId)
      .single(),
    // Fetch customer data if session has a linked customer
    (async () => {
      const { data: sess } = await supabase
        .from('chat_sessions')
        .select('customer_id')
        .eq('id', sessionId)
        .single()
      if (!sess?.customer_id) return { data: null }
      return supabase
        .from('widget_customers')
        .select('name, email')
        .eq('id', sess.customer_id)
        .single()
    })(),
    supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at'),
  ])

  // Build visibility settings — DB values take priority, central defaults are fallback
  const visibilitySettings: VisibilitySettings = {
    ...DEFAULT_VISIBILITY_SETTINGS,
    ...(widgetSettings ?? {}),
  }

  const systemPrompt = buildSystemPrompt(
    businessData?.name ?? 'this business',
    services ?? [],
    hours ?? [],
    staff ?? [],
    customFields ?? [],
    staffCustomFields ?? [],
    staffHours ?? [],
    visibilitySettings,
    {
      contact: businessData?.contact,
      address: businessData?.address,
      type: businessData?.type,
    },
    body.intent || undefined,
    customerData ?? undefined
  )

  // Persist user message
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: trimmedMessage,
  })

  // Build conversation contents for Gemini (history before the current message)
  const conversationHistory = (history ?? []).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content as string }],
  }))

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // First event: session info
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'session', session_id: sessionId })}\n\n`)
      )

      let fullReply = ''

      try {
        const genai = createGeminiClient()

        const geminiStream = await genai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: systemPrompt },
          contents: [
            ...conversationHistory,
            { role: 'user', parts: [{ text: trimmedMessage }] },
          ],
        })

        for await (const chunk of geminiStream) {
          const token = chunk.text
          if (token) {
            fullReply += token
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
            )
          }
        }
      } catch (err) {
        console.error('Gemini error:', err)
        const errorMsg = 'Sorry, I am having trouble responding right now. Please try again.'
        fullReply = errorMsg
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'token', token: errorMsg })}\n\n`)
        )
      }

      // Off-topic detection: check if the response contains the scope guard phrase
      if (fullReply.includes('I can only help with questions about')) {
        await supabase
          .from('chat_sessions')
          .update({ off_topic_count: sessionOffTopicCount + 1 })
          .eq('id', sessionId)
      }

      // Request-contact signal detection: check for [REQUEST_CONTACT] marker
      const hasRequestContactSignal = fullReply.includes('[REQUEST_CONTACT]')
      if (hasRequestContactSignal) {
        fullReply = fullReply.replace(/\s*\[REQUEST_CONTACT\]\s*/g, '')
      }

      // End signal detection: check for [END_CONVERSATION] marker
      const hasEndSignal = fullReply.includes('[END_CONVERSATION]')
      if (hasEndSignal) {
        fullReply = fullReply.replace(/\s*\[END_CONVERSATION\]\s*/g, '')
      }

      // Send request_contact event before done if contact info is needed
      if (hasRequestContactSignal) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'request_contact' })}\n\n`)
        )
      }

      // Send end_conversation event before done if conversation is ending
      if (hasEndSignal) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'end_conversation' })}\n\n`)
        )
        await supabase
          .from('chat_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', sessionId)
      }

      // Done event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))

      // Persist assistant reply
      if (fullReply) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: fullReply,
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
