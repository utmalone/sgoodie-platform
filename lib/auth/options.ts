import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash, timingSafeEqual } from 'crypto';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminEmail || !adminHash) {
          console.error('ADMIN_EMAIL or ADMIN_PASSWORD_HASH is not set.');
          return null;
        }

        const email = credentials?.email || '';
        const password = credentials?.password || '';

        if (email !== adminEmail) return null;
        const inputHash = createHash('sha256').update(password).digest('hex');
        const isValid =
          adminHash.length === inputHash.length &&
          timingSafeEqual(Buffer.from(adminHash), Buffer.from(inputHash));

        if (!isValid) {
          return null;
        }

        return { id: 'admin', email: adminEmail };
      }
    })
  ],
  pages: {
    signIn: '/admin/login'
  }
};
