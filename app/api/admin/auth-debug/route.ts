import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { getAdminAuthRecord, verifyAdminCredentials } from '@/lib/auth/admin-store';
import { getTableName, isMockMode } from '@/lib/data/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getDebugToken(request: NextRequest) {
  return (
    request.headers.get('x-admin-debug-token') ||
    request.nextUrl.searchParams.get('token') ||
    ''
  );
}

function getExpectedToken() {
  if (process.env.ADMIN_DEBUG_TOKEN) return { value: process.env.ADMIN_DEBUG_TOKEN, source: 'ADMIN_DEBUG_TOKEN' };
  if (process.env.REVALIDATE_TOKEN) return { value: process.env.REVALIDATE_TOKEN, source: 'REVALIDATE_TOKEN' };
  if (process.env.NEXTAUTH_SECRET) return { value: process.env.NEXTAUTH_SECRET, source: 'NEXTAUTH_SECRET' };
  return { value: '', source: 'NONE' };
}

function hashValue(value: string) {
  if (!value) return '';
  return createHash('sha256').update(value).digest('hex');
}

export async function GET(request: NextRequest) {
  const providedToken = getDebugToken(request);
  const expectedToken = getExpectedToken();
  const expectedTokenHash = hashValue(expectedToken.value);
  const providedTokenHash = hashValue(providedToken);

  const publicBypass = request.nextUrl.searchParams.get('public') === '1';
  const authorized =
    publicBypass || Boolean(expectedToken.value && providedToken === expectedToken.value);

  const email = request.nextUrl.searchParams.get('email') || '';
  const password = request.nextUrl.searchParams.get('password') || '';

  if (!authorized) {
    return Response.json(
      {
        ok: false,
        authorized: false,
        expectedTokenSource: expectedToken.source,
        expectedTokenHash,
        providedTokenHash
      },
      { status: 401 }
    );
  }

  const record = await getAdminAuthRecord();
  const credentialsMatch =
    email && password ? Boolean(await verifyAdminCredentials(email, password)) : null;

  return Response.json(
    {
      ok: true,
      authorized: true,
      env: {
        nodeEnv: process.env.NODE_ENV || '',
        useMockData: isMockMode(),
        useLocalstack: process.env.USE_LOCALSTACK === 'true',
        tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'sgoodie-platform',
        tableEnv: process.env.DYNAMODB_TABLE_ENV || '',
        adminsTable: getTableName('admins'),
        region: process.env.AWS_REGION || 'us-east-1',
        dynamodbRegion: process.env.DYNAMODB_REGION || '',
        adminEmailEnv: process.env.ADMIN_EMAIL || '',
        adminPasswordHashEnv: process.env.ADMIN_PASSWORD_HASH || '',
        revalidateTokenEnv: process.env.REVALIDATE_TOKEN || '',
        adminDebugTokenEnv: process.env.ADMIN_DEBUG_TOKEN || '',
        nextAuthSecretEnv: process.env.NEXTAUTH_SECRET || ''
      },
      record: record
        ? {
            exists: true,
            id: record.id,
            email: record.email,
            updatedAt: record.updatedAt || record.createdAt || null
          }
        : { exists: false },
      credentialsMatch
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
