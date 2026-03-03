import { auth } from '@/auth'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // 보호된 경로: 인증 필요
  const protectedPaths = ['/dashboard', '/onboarding']
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !isAuthenticated) {
    return Response.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    // API auth 경로는 제외
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
