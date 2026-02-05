import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.USE_LOCALSTACK === 'true';

const baseConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
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
