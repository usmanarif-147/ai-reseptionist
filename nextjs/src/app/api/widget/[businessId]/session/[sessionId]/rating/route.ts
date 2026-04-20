import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Mid-session rating for the post-booking congratulations card.
// Writes feedback_rating/feedback_note/review_action without changing session
// status — the visitor keeps chatting after submitting. For natural-end
// feedback use POST /session/end (which also updates status + ended_at).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; sessionId: string }> }
) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { businessId, sessionId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }
  if (!UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid session ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let body: {
    feedback_rating?: number
    feedback_note?: string
    review_action?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { feedback_rating, feedback_note, review_action } = body

  if (
    feedback_rating === undefined ||
    feedback_rating === null ||
    typeof feedback_rating !== 'number' ||
    !Number.isInteger(feedback_rating) ||
    feedback_rating < 1 ||
    feedback_rating > 5
  ) {
    return NextResponse.json(
      { error: 'feedback_rating must be an integer between 1 and 5' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (feedback_note !== undefined && feedback_note !== null && typeof feedback_note !== 'string') {
    return NextResponse.json(
      { error: 'feedback_note must be a string' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const VALID_REVIEW_ACTIONS = ['given', 'skipped', 'closed_widget', 'closed_tab', 'pending'] as const
  type ReviewAction = (typeof VALID_REVIEW_ACTIONS)[number]
  if (
    review_action !== undefined &&
    review_action !== null &&
    (typeof review_action !== 'string' ||
      !VALID_REVIEW_ACTIONS.includes(review_action as ReviewAction))
  ) {
    return NextResponse.json(
      { error: `review_action must be one of: ${VALID_REVIEW_ACTIONS.join(', ')}` },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

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

  const updateData: Record<string, unknown> = {
    feedback_rating,
    review_action: review_action ?? 'given',
  }
  if (feedback_note !== undefined && feedback_note !== null) {
    updateData.feedback_note = feedback_note
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('business_id', businessId)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
}
