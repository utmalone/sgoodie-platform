import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.USE_LOCALSTACK === 'true';

const explicitCredentials =
  process.env.DYNAMODB_ACCESS_KEY_ID && process.env.DYNAMODB_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
        secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY,
        sessionToken: process.env.DYNAMODB_SESSION_TOKEN
      }
    : undefined;

const baseConfig = {
  region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-1',
  ...(explicitCredentials ? { credentials: explicitCredentials } : {})
};

const localConfig = {
  ...baseConfig,
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
};

const client = new DynamoDBClient(isLocal ? localConfig : baseConfig);

export const db = DynamoDBDocumentClient.from(client);
