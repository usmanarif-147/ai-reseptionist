import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { createGeminiClient } from '@/lib/gemini'
import { buildSystemPrompt } from '@/lib/build-system-prompt'

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

  // Fetch business data and conversation history in parallel
  const [
    { data: businessData },
    { data: services },
    { data: hours },
    { data: staff },
    { data: customFields },
    { data: staffCustomFields },
    { data: staffHours },
    { data: history },
  ] = await Promise.all([
    supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single(),
    supabase
      .from('services')
      .select('name, description, price, duration_minutes, category, is_active, meta')
      .eq('business_id', businessId)
      .eq('is_active', true),
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
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at'),
  ])

  const systemPrompt = buildSystemPrompt(
    businessData?.name ?? 'this business',
    services ?? [],
    hours ?? [],
    staff ?? [],
    customFields ?? [],
    staffCustomFields ?? [],
    staffHours ?? []
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
