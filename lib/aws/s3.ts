import { S3Client } from '@aws-sdk/client-s3';

const isLocal =
  process.env.USE_LOCALSTACK === 'true' || process.env.NODE_ENV === 'development';

const baseConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};

const localConfig = {
  ...baseConfig,
  endpoint: 'http://localhost:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  forcePathStyle: true
};

export const s3 = new S3Client(isLocal ? localConfig : baseConfig);
