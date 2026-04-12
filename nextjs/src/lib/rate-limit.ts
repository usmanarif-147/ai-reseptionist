import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 30

const ipMap = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

/**
 * Returns a 429 NextResponse if the IP has exceeded the rate limit,
 * or null if the request is allowed.
 */
export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request)
  const now = Date.now()

  const entry = ipMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }

  return null
}
