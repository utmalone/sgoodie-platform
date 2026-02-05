import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyAdminCredentials } from './admin-store';

// Session timeout: 30 minutes of inactivity
const SESSION_MAX_AGE = 30 * 60; // 30 minutes in seconds

// Ensure NEXTAUTH_SECRET is set
const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  console.error('NEXTAUTH_SECRET is not set in production!');
}

export const authOptions: NextAuthOptions = {
  secret: secret || 'dev-secret-not-for-production',
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
