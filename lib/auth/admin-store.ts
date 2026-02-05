import { createHash, timingSafeEqual } from 'crypto';
import { getItem, isMockMode, putItem } from '@/lib/data/db';

export type AdminAuthRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt?: string;
  updatedAt?: string;
};

const TABLE_NAME = 'admins';
const ADMIN_ID = 'primary';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function safeEqualHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getEnvAdminRecord(): AdminAuthRecord | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim()?.toLowerCase();
  if (!email || !passwordHash) return null;
  return {
    id: ADMIN_ID,
    email: normalizeEmail(email),
    passwordHash
  };
}

async function seedAdminFromEnv(): Promise<AdminAuthRecord | null> {
  const envRecord = getEnvAdminRecord();
  if (!envRecord) return null;

  const now = new Date().toISOString();
  const record: AdminAuthRecord = {
    ...envRecord,
    createdAt: now,
    updatedAt: now
  };

  try {
    await putItem(TABLE_NAME, record);
    return record;
  } catch (error) {
    console.error('Failed to seed admin record from env:', error);
    return null;
  }
}

export async function getAdminAuthRecord(): Promise<AdminAuthRecord | null> {
  if (isMockMode()) {
    return getEnvAdminRecord();
  }

  try {
    const record = await getItem<AdminAuthRecord>(TABLE_NAME, { id: ADMIN_ID });
    if (record?.email && record?.passwordHash) {
      return {
        ...record,
        email: normalizeEmail(record.email),
        passwordHash: record.passwordHash.trim().toLowerCase()
      };
    }
  } catch (error) {
    console.error('Failed to load admin record:', error);
  }

  return seedAdminFromEnv();
}

export async function verifyAdminCredentials(email: string, password: string) {
  const record = await getAdminAuthRecord();
  if (!record) return null;

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== record.email) return null;

  const inputHash = hashPassword(password);
  if (!safeEqualHash(record.passwordHash, inputHash)) return null;

  return record;
}

export async function updateAdminEmail(email: string) {
  const record = await getAdminAuthRecord();
  if (!record) {
    return { ok: false, error: 'Admin account is not initialized.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const updated: AdminAuthRecord = {
    ...record,
    email: normalizedEmail,
    updatedAt: now
  };

  await putItem(TABLE_NAME, updated);
  return { ok: true, record: updated };
}

export async function updateAdminPassword(currentPassword: string, newPassword: string) {
  const record = await getAdminAuthRecord();
  if (!record) {
    return { ok: false, error: 'Admin account is not initialized.' };
  }

  const currentHash = hashPassword(currentPassword);
  if (!safeEqualHash(record.passwordHash, currentHash)) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const nextHash = hashPassword(newPassword);
  const now = new Date().toISOString();
  const updated: AdminAuthRecord = {
    ...record,
    passwordHash: nextHash,
    updatedAt: now
  };

  await putItem(TABLE_NAME, updated);
  return { ok: true, record: updated };
}
