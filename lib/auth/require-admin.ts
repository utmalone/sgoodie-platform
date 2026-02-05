import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './options';

/**
 * Server-side helper to require admin authentication.
 * Redirects to login if not authenticated.
 * Note: Middleware handles primary route protection, this is for additional checks.
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
