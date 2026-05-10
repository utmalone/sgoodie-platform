import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth/options';

export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

type RouteContext = {
  params: Promise<{
    nextauth?: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}
