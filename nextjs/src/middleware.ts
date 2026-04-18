import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sub-pages that live directly under /{businessId}/ (outside /dashboard/)
const BUSINESS_SUB_PAGES = new Set([
  'services',
  'staff',
  'appointments',
  'customers',
  'widget-settings',
  'widget-stats',
  'settings',
])

function isBusinessDashboardRoute(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2 || !UUID_REGEX.test(segments[0])) return false
  return segments[1] === 'dashboard' || BUSINESS_SUB_PAGES.has(segments[1])
}

function getBusinessIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2 || !UUID_REGEX.test(segments[0])) return null
  if (segments[1] === 'dashboard' || BUSINESS_SUB_PAGES.has(segments[1])) {
    return segments[0]
  }
  return null
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl =
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-app-auth-token' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isBusinessDashboard = isBusinessDashboardRoute(pathname)

  // Not logged in → redirect to login for protected routes
  if (!user && (isDashboard || isBusinessDashboard)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!user && (
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/subscribe')
  )) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Already logged in → redirect away from auth pages to business dashboard
  if (user && pathname.startsWith('/auth')) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (business) {
      return NextResponse.redirect(new URL(`/${business.id}/dashboard`, request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Old /dashboard route → redirect to /{businessId}/dashboard
  if (user && isDashboard) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (business) {
      // Preserve the rest of the path (e.g. /dashboard/subscription → /{id}/subscription)
      const rest = pathname.replace(/^\/dashboard/, '')
      // Map legacy /dashboard/* paths to current locations (including moved-to-settings routes)
      const mappedRest = rest === '/hours' ? '/settings/business-hours'
                       : rest === '/subscription' ? '/settings/subscription'
                       : rest === '/payments' ? '/settings/payments'
                       : rest === '/widget' ? '/widget-settings'
                       : rest
      if (mappedRest === '') {
        return NextResponse.redirect(new URL(`/${business.id}/dashboard`, request.url))
      }
      return NextResponse.redirect(new URL(`/${business.id}${mappedRest}`, request.url))
    }
    // No business yet — let them through to the old dashboard which will prompt setup
  }

  // /{businessId}/dashboard — verify ownership + subscription
  if (user && isBusinessDashboard) {
    const businessId = getBusinessIdFromPath(pathname)

    // Verify user owns this business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      // User doesn't own this business — redirect to their own or login
      const { data: ownBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (ownBusiness) {
        return NextResponse.redirect(new URL(`/${ownBusiness.id}/dashboard`, request.url))
      }
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Check subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (!sub) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (sub.status === 'canceled' || sub.status === 'past_due') {
      return NextResponse.redirect(new URL('/subscribe', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/onboarding/:path*',
    '/subscribe/:path*',
    '/:businessId/dashboard',
    '/:businessId/dashboard/:path*',
    '/:businessId/services',
    '/:businessId/staff',
    '/:businessId/appointments',
    '/:businessId/customers',
    '/:businessId/widget-settings',
    '/:businessId/widget-stats',
    '/:businessId/settings',
    '/:businessId/settings/:path*',
  ],
}
