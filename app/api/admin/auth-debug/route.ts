import type { NextRequest } from 'next/server';
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
  return (
    process.env.ADMIN_DEBUG_TOKEN ||
    process.env.REVALIDATE_TOKEN ||
    process.env.NEXTAUTH_SECRET ||
    ''
  );
}

export async function GET(request: NextRequest) {
  const providedToken = getDebugToken(request);
  const expectedToken = getExpectedToken();

  if (!expectedToken || providedToken !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email') || '';
  const password = request.nextUrl.searchParams.get('password') || '';

  const record = await getAdminAuthRecord();
  const credentialsMatch =
    email && password ? Boolean(await verifyAdminCredentials(email, password)) : null;

  return Response.json(
    {
      ok: true,
      env: {
        nodeEnv: process.env.NODE_ENV || '',
        useMockData: isMockMode(),
        useLocalstack: process.env.USE_LOCALSTACK === 'true',
        tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'sgoodie-platform',
        tableEnv: process.env.DYNAMODB_TABLE_ENV || '',
        adminsTable: getTableName('admins'),
        region: process.env.AWS_REGION || 'us-east-1'
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
