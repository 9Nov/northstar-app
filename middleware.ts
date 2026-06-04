import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    // Admin trying to access user-only pages
    if (token?.role === 'admin' && pathname.startsWith('/registration')) {
      return NextResponse.redirect(new URL('/admin/rounds', req.url))
    }

    // User trying to access admin pages
    if (token?.role === 'user' && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/registration', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Return true = allow, false = redirect to login
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  // Protect all pages except login, api/auth, and static assets
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}