import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth/options';

export const runtime = 'nodejs';

// Debug: Log environment variables on initialization (remove in production)
if (process.env.NODE_ENV !== 'development') {
  console.log('[NextAuth] Initializing with config:', {
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasUrl: !!process.env.NEXTAUTH_URL,
    url: process.env.NEXTAUTH_URL,
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    hasAdminHash: !!process.env.ADMIN_PASSWORD_HASH
  });
}

function resolveNextAuthUrl(request: NextRequest) {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicSiteUrl) {
    return publicSiteUrl;
  }

  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) {
    return undefined;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const defaultProtocol =
    process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const protocol = forwardedProto?.split(',')[0]?.trim() || defaultProtocol;
  return `${protocol === 'http' ? 'http' : 'https'}://${host}`;
}

function ensureNextAuthUrl(request: NextRequest) {
  const resolvedUrl = resolveNextAuthUrl(request);
  if (resolvedUrl && process.env.NEXTAUTH_URL !== resolvedUrl) {
    process.env.NEXTAUTH_URL = resolvedUrl;
  }
}

const handler = NextAuth(authOptions);

type RouteContext = {
  params: {
    nextauth?: string[];
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  ensureNextAuthUrl(request);
  return handler(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  ensureNextAuthUrl(request);
  return handler(request, context);
}
