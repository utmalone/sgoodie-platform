import { createHash, timingSafeEqual } from 'crypto';
import argon2 from 'argon2';
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
const LEGACY_SHA256_REGEX = /^[a-f0-9]{64}$/i;

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

function hashPasswordLegacy(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function safeEqualHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getEnvAdminRecord(): AdminAuthRecord | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
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
        passwordHash: record.passwordHash.trim()
      };
    }
  } catch (error) {
    console.error('Failed to load admin record:', error);
  }

  return seedAdminFromEnv();
}

function isLegacySha256(hash: string) {
  return LEGACY_SHA256_REGEX.test(hash);
}

async function verifyPasswordHash(hash: string, password: string) {
  if (!hash) return false;
  if (hash.startsWith('$argon2')) {
    return argon2.verify(hash, password);
  }

  if (isLegacySha256(hash)) {
    const inputHash = hashPasswordLegacy(password);
    return safeEqualHash(hash.toLowerCase(), inputHash.toLowerCase());
  }

  return false;
}

async function upgradeLegacyHash(record: AdminAuthRecord, password: string) {
  if (!isLegacySha256(record.passwordHash)) return record;

  try {
    const nextHash = await hashPassword(password);
    const now = new Date().toISOString();
    const updated: AdminAuthRecord = {
      ...record,
      passwordHash: nextHash,
      updatedAt: now
    };
    await putItem(TABLE_NAME, updated);
    return updated;
  } catch (error) {
    console.error('Failed to upgrade legacy password hash:', error);
    return record;
  }
}

export async function verifyAdminCredentials(email: string, password: string) {
  const record = await getAdminAuthRecord();
  if (!record) return null;

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== record.email) return null;

  const matches = await verifyPasswordHash(record.passwordHash, password);
  if (!matches) return null;

  const upgraded = await upgradeLegacyHash(record, password);
  return upgraded;
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

  const matches = await verifyPasswordHash(record.passwordHash, currentPassword);
  if (!matches) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const nextHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const updated: AdminAuthRecord = {
    ...record,
    passwordHash: nextHash,
    updatedAt: now
  };

  await putItem(TABLE_NAME, updated);
  return { ok: true, record: updated };
}
