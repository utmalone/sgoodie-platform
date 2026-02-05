import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretCache = new Map<string, string | null>();
let client: SecretsManagerClient | null = null;

function getClient() {
  if (!client) {
    client = new SecretsManagerClient({
      region: process.env.AWS_REGION || process.env.DYNAMODB_REGION
    });
  }
  return client;
}

export async function getSecretString(secretId?: string | null) {
  const trimmedId = secretId?.trim();
  if (!trimmedId) return null;

  if (secretCache.has(trimmedId)) {
    return secretCache.get(trimmedId) ?? null;
  }

  try {
    const response = await getClient().send(
      new GetSecretValueCommand({ SecretId: trimmedId })
    );

    const secretString =
      response.SecretString ??
      (response.SecretBinary
        ? Buffer.from(response.SecretBinary as Uint8Array).toString('utf-8')
        : '');

    const normalized = secretString?.trim() || null;
    secretCache.set(trimmedId, normalized);
    return normalized;
  } catch (error) {
    const err = error as { name?: string; message?: string };
    console.error('Failed to load secret value:', {
      secretId: trimmedId,
      name: err?.name,
      message: err?.message
    });
    secretCache.set(trimmedId, null);
    return null;
  }
}
