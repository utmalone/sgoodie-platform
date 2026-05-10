import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './options';

/**
 * Server-side helper to require admin authentication.
 * Redirects to login if not authenticated.
 * Root `proxy.ts` (Next.js 16) guards `/admin/*` routes listed there; pages should still call this for SSR safety.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}

/**
 * Get the current admin session (returns null if not authenticated).
 */
export async function getAdminSession() {
  return getServerSession(authOptions);
}
