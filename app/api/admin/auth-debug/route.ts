import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { getAdminAuthRecord, verifyAdminCredentials } from '@/lib/auth/admin-store';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';
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

  const authorized = Boolean(expectedToken.value && providedToken === expectedToken.value);

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

  let ddbProbe: {
    ok: boolean;
    table: string;
    hasItem?: boolean;
    error?: { name?: string; message?: string };
  } = {
    ok: false,
    table: getTableName('admins')
  };

  try {
    const probe = await db.send(
      new GetCommand({
        TableName: getTableName('admins'),
        Key: { id: 'primary' }
      })
    );
    ddbProbe = {
      ok: true,
      table: getTableName('admins'),
      hasItem: Boolean(probe.Item)
    };
  } catch (error) {
    const err = error as { name?: string; message?: string };
    ddbProbe = {
      ok: false,
      table: getTableName('admins'),
      error: { name: err?.name, message: err?.message }
    };
  }

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
        hasAwsAccessKeyId: Boolean(process.env.AWS_ACCESS_KEY_ID),
        hasAwsSecretAccessKey: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
        hasAwsSessionToken: Boolean(process.env.AWS_SESSION_TOKEN),
        hasWebIdentityTokenFile: Boolean(process.env.AWS_WEB_IDENTITY_TOKEN_FILE),
        hasAwsRoleArn: Boolean(process.env.AWS_ROLE_ARN),
        hasDynamoAccessKeyId: Boolean(process.env.DYNAMODB_ACCESS_KEY_ID),
        hasDynamoSecretAccessKey: Boolean(process.env.DYNAMODB_SECRET_ACCESS_KEY),
        hasDynamoSessionToken: Boolean(process.env.DYNAMODB_SESSION_TOKEN),
        hasAdminEmailEnv: Boolean(process.env.ADMIN_EMAIL),
        hasAdminPasswordHashEnv: Boolean(process.env.ADMIN_PASSWORD_HASH),
        hasRevalidateTokenEnv: Boolean(process.env.REVALIDATE_TOKEN),
        hasAdminDebugTokenEnv: Boolean(process.env.ADMIN_DEBUG_TOKEN),
        hasNextAuthSecretEnv: Boolean(process.env.NEXTAUTH_SECRET),
        hasOpenAiSecretIdEnv: Boolean(process.env.OPENAI_API_KEY_SECRET_ID),
        hasInstagramSecretIdEnv: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN_SECRET_ID)
      },
      record: record
        ? {
            exists: true,
            id: record.id,
            email: record.email,
            updatedAt: record.updatedAt || record.createdAt || null
          }
        : { exists: false },
      ddbProbe,
      credentialsMatch
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
