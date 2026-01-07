import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/inbox/:path*',
    '/admin/:path*',
    '/api/conversations/:path*',
    '/api/messages/:path*',
    '/api/tags/:path*',
    '/api/users/:path*',
    // Note: /api/webhooks/* is intentionally excluded from authentication
    // Webhooks use signature validation instead
  ],
}
