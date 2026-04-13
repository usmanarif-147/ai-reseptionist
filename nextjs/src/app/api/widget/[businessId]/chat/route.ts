import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { createGeminiClient } from '@/lib/gemini'
import { buildSystemPrompt, VisibilitySettings } from '@/lib/build-system-prompt'

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

  let body: { session_id?: string; message?: string }
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
      .select('id')
      .eq('id', sessionId)
      .eq('business_id', businessId)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: CORS_HEADERS }
      )
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

    const { data: newSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({ business_id: businessId })
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
    supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at'),
  ])

  // Build visibility settings with DB defaults as fallback
  const visibilitySettings: VisibilitySettings = {
    show_business_name: widgetSettings?.show_business_name ?? true,
    show_contact: widgetSettings?.show_contact ?? true,
    show_address: widgetSettings?.show_address ?? true,
    show_business_type: widgetSettings?.show_business_type ?? true,
    show_business_hours: widgetSettings?.show_business_hours ?? true,
    services_visibility: widgetSettings?.services_visibility ?? 'active_only',
    hidden_service_ids: widgetSettings?.hidden_service_ids ?? [],
    staff_visibility: widgetSettings?.staff_visibility ?? 'active_only',
    hidden_staff_ids: widgetSettings?.hidden_staff_ids ?? [],
    show_appointment_service: widgetSettings?.show_appointment_service ?? true,
    show_appointment_staff: widgetSettings?.show_appointment_staff ?? true,
    show_appointment_datetime: widgetSettings?.show_appointment_datetime ?? true,
    show_appointment_duration: widgetSettings?.show_appointment_duration ?? true,
    show_appointment_payment_type: widgetSettings?.show_appointment_payment_type ?? false,
    show_appointment_payment_status: widgetSettings?.show_appointment_payment_status ?? false,
    show_appointment_notes: widgetSettings?.show_appointment_notes ?? true,
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
    }
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
