import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/security/client-ip';
import { consumeRateLimit } from '@/lib/security/rate-limit';

// Paths that require authentication
const protectedPaths = [
  '/admin/dashboard',
  '/admin/pages',
  '/admin/portfolio',
  '/admin/journal',
  '/admin/photos',
  '/admin/work',
  '/admin/profile',
  '/admin/preview'
];

// Paths that should redirect to dashboard if already authenticated
const authPaths = ['/admin/login'];

function rateLimitExceededResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) }
    }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/analytics/events' && request.method === 'POST') {
    const ip = getClientIp(request);
    const result = consumeRateLimit(`analytics:${ip}`, {
      limit: 120,
      windowMs: 60_000
    });
    if (!result.ok) return rateLimitExceededResponse(result.retryAfterSec);
    return NextResponse.next();
  }

  if (pathname === '/api/instagram' && request.method === 'GET') {
    const ip = getClientIp(request);
    const result = consumeRateLimit(`instagram:${ip}`, {
      limit: 60,
      windowMs: 60_000
    });
    if (!result.ok) return rateLimitExceededResponse(result.retryAfterSec);
    return NextResponse.next();
  }

  if (pathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    const ip = getClientIp(request);
    const result = consumeRateLimit(`auth-credentials:${ip}`, {
      limit: 10,
      windowMs: 15 * 60_000
    });
    if (!result.ok) return rateLimitExceededResponse(result.retryAfterSec);
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
  } catch (error) {
    console.error('Error getting token in proxy:', error);
  }

  const isAuthenticated = !!token;

  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const isAuthPath = authPaths.some((path) => pathname === path);

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/analytics/events',
    '/api/instagram',
    '/api/auth/callback/credentials'
  ]
};
