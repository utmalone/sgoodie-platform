import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/options';

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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
