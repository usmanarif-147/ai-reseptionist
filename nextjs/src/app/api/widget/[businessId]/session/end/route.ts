import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const { businessId } = await params

  if (!UUID_REGEX.test(businessId)) {
    return NextResponse.json(
      { error: 'Invalid business ID' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const VALID_REVIEW_ACTIONS = ['given', 'skipped', 'closed_widget', 'closed_tab', 'pending'] as const
  type ReviewAction = (typeof VALID_REVIEW_ACTIONS)[number]

  let body: {
    session_id?: string
    feedback_rating?: number
    feedback_note?: string
    status?: string
    end_reason?: string
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

  const { session_id, feedback_rating, feedback_note, status, end_reason, review_action } = body

  if (end_reason !== undefined && end_reason !== null && typeof end_reason !== 'string') {
    return NextResponse.json(
      { error: 'end_reason must be a string' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

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

  if (!session_id || !UUID_REGEX.test(session_id)) {
    return NextResponse.json(
      { error: 'Valid session_id is required' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!status || (status !== 'ended' && status !== 'expired')) {
    return NextResponse.json(
      { error: 'Status must be "ended" or "expired"' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (feedback_rating !== undefined && feedback_rating !== null && (typeof feedback_rating !== 'number' || feedback_rating < 1 || feedback_rating > 5 || !Number.isInteger(feedback_rating))) {
    return NextResponse.json(
      { error: 'feedback_rating must be an integer between 1 and 5' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createAdminClient()

  // Verify session belongs to this business
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('business_id', businessId)
    .single()

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const updateData: Record<string, unknown> = {
    status,
    ended_at: new Date().toISOString(),
  }
  if (feedback_rating !== undefined && feedback_rating !== null) {
    updateData.feedback_rating = feedback_rating
  }
  if (feedback_note !== undefined && feedback_note !== null) {
    updateData.feedback_note = feedback_note
  }

  // Review action: explicit value wins; otherwise default to 'given' when a rating is submitted.
  if (review_action) {
    updateData.review_action = review_action
  } else if (feedback_rating !== undefined && feedback_rating !== null) {
    updateData.review_action = 'given'
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update(updateData)
    .eq('id', session_id)
    .eq('business_id', businessId)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
}
