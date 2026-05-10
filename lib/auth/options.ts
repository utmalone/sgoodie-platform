import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyAdminCredentials } from './admin-store';

// Session timeout: 30 minutes of inactivity
const SESSION_MAX_AGE = 30 * 60; // 30 minutes in seconds

const resolvedSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-not-for-production');

if (!resolvedSecret) {
  throw new Error('NEXTAUTH_SECRET is required in production');
}

export const authOptions: NextAuthOptions = {
  secret: resolvedSecret,
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: 5 * 60 // Update session every 5 minutes if active
  },
  jwt: {
    maxAge: SESSION_MAX_AGE
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim() || '';
        const password = credentials?.password || '';

        if (!email || !password) return null;

        const admin = await verifyAdminCredentials(email, password);
        if (!admin) return null;

        return { id: admin.id, email: admin.email };
      }
    })
  ],
  pages: {
    signIn: '/admin/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
      }
      return session;
    }
  }
};
