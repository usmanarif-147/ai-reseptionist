import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl =
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Not logged in → redirect to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Not logged in → redirect to login from onboarding/subscribe
  if (!user && (
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/subscribe')
  )) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Already logged in → redirect away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check subscription for dashboard access
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    // No subscription yet → go through onboarding
    if (!sub) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Cancelled subscription → resubscribe page
    if (sub.status === 'canceled') {
      return NextResponse.redirect(new URL('/subscribe', request.url))
    }

    // Payment failed → resubscribe page
    if (sub.status === 'past_due') {
      return NextResponse.redirect(new URL('/subscribe', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/onboarding/:path*', '/subscribe/:path*'],
}
