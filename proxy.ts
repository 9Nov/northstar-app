import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })
  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Non-admins cannot access /admin
  if (pathname.startsWith('/admin') && (token as any).role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/registration/:path*', '/admin/:path*'],
}
