import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export type AdminApiSession = {
  user: {
    email?: string;
  };
};

function hasNextAuthSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return (
    cookieHeader.includes('next-auth.session-token') ||
    cookieHeader.includes('__Secure-next-auth.session-token')
  );
}

/**
 * Validate admin API requests using the same JWT path as proxy.ts middleware.
 * Pass the incoming Request from App Router route handlers.
 */
export async function requireAdminApi(request: Request): Promise<AdminApiSession | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('[requireAdminApi] NEXTAUTH_SECRET is not configured');
    return null;
  }

  const cookieHeader = request.headers.get('cookie');
  const hasSessionCookie = hasNextAuthSessionCookie(cookieHeader);
  const path = (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return 'unknown';
    }
  })();

  try {
    const token = await getToken({
      req: request as NextRequest,
      secret
    });

    if (!token) {
      console.error('[requireAdminApi] Unauthorized: no valid JWT', {
        path,
        hasSessionCookie
      });
      return null;
    }

    return {
      user: {
        email: typeof token.email === 'string' ? token.email : undefined
      }
    };
  } catch (error) {
    console.error('[requireAdminApi] Error validating token', {
      path,
      hasSessionCookie,
      error
    });
    return null;
  }
}
