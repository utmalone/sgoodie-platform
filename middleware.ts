import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes to let NextAuth handle them directly
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get the token from the request
  let token = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
  } catch (error) {
    console.error('Error getting token in middleware:', error);
    // Continue without token - protected routes will redirect to login
  }

  const isAuthenticated = !!token;

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if the path is an auth path (login)
  const isAuthPath = authPaths.some((path) => pathname === path);

  // If trying to access protected path without authentication, redirect to login
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Add pathname header for server components
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: [
    // Only run middleware on admin pages, not API routes
    '/admin/:path*'
  ]
};
