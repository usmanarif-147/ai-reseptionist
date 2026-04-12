import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PLACEHOLDER_REPLY =
  'Thanks for your message! Our AI receptionist will be with you shortly.'

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

  // Persist user message
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: trimmedMessage,
  })

  // Stream SSE response
  const encoder = new TextEncoder()
  const words = PLACEHOLDER_REPLY.split(' ')

  const stream = new ReadableStream({
    async start(controller) {
      // First event: session info
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'session', session_id: sessionId })}\n\n`)
      )

      // Stream tokens word-by-word
      for (let i = 0; i < words.length; i++) {
        const token = i < words.length - 1 ? words[i] + ' ' : words[i]
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
        )
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      // Done event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))

      // Persist assistant reply after streaming
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: PLACEHOLDER_REPLY,
      })

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
