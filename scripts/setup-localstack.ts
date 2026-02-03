import { CreateBucketCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const useLocal = process.env.USE_LOCALSTACK === 'true' || process.env.NODE_ENV === 'development';

const endpoint = useLocal ? 'http://localhost:4566' : undefined;
const credentials = useLocal
  ? { accessKeyId: 'test', secretAccessKey: 'test' }
  : undefined;

const s3 = new S3Client({
  region,
  endpoint,
  credentials,
  forcePathStyle: useLocal
});

const dynamo = new DynamoDBClient({
  region,
  endpoint,
  credentials
});

const buckets = [
  process.env.S3_BUCKET_PHOTOS,
  process.env.S3_BUCKET_VARIANTS,
  process.env.S3_BUCKET_UPLOADS
].filter(Boolean) as string[];

const corsRules = [
  {
    AllowedHeaders: ['*'],
    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    AllowedOrigins: ['http://localhost:3000'],
    ExposeHeaders: []
  }
];

const tables = [
  {
    name: process.env.DYNAMODB_TABLE_PROJECTS,
    attributes: [
      { AttributeName: 'project_id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'order', AttributeType: 'N' }
    ],
    keySchema: [{ AttributeName: 'project_id', KeyType: 'HASH' }],
    gsi: [
      {
        IndexName: 'gsi_category_order',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'order', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },
  {
    name: process.env.DYNAMODB_TABLE_PHOTOS,
    attributes: [
      { AttributeName: 'project_id', AttributeType: 'S' },
      { AttributeName: 'order_photo_id', AttributeType: 'S' }
    ],
    keySchema: [
      { AttributeName: 'project_id', KeyType: 'HASH' },
      { AttributeName: 'order_photo_id', KeyType: 'RANGE' }
    ]
  },
  {
    name: process.env.DYNAMODB_TABLE_PAGES,
    attributes: [{ AttributeName: 'page_id', AttributeType: 'S' }],
    keySchema: [{ AttributeName: 'page_id', KeyType: 'HASH' }]
  },
  {
    name: process.env.DYNAMODB_TABLE_SETTINGS,
    attributes: [{ AttributeName: 'setting_key', AttributeType: 'S' }],
    keySchema: [{ AttributeName: 'setting_key', KeyType: 'HASH' }]
  },
  {
    name: process.env.DYNAMODB_TABLE_ADMINS,
    attributes: [{ AttributeName: 'user_id', AttributeType: 'S' }],
    keySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }]
  }
].filter((table) => Boolean(table.name));

async function ensureBucket(bucket: string) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: corsRules } }));
    console.log(`Created bucket: ${bucket}`);
  } catch (error) {
    const message = (error as Error).message || '';
    if (message.includes('BucketAlready') || message.includes('BucketAlreadyOwnedByYou')) {
      console.log(`Bucket already exists: ${bucket}`);
      return;
    }
    throw error;
  }
}

async function ensureTable(table: typeof tables[number]) {
  if (!table.name) return;
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: table.name }));
    console.log(`Table already exists: ${table.name}`);
  } catch {
    await dynamo.send(
      new CreateTableCommand({
        TableName: table.name,
        AttributeDefinitions: table.attributes,
        KeySchema: table.keySchema,
        GlobalSecondaryIndexes: table.gsi,
        BillingMode: 'PAY_PER_REQUEST'
      })
    );
    console.log(`Created table: ${table.name}`);
  }
}

async function main() {
  if (!useLocal) {
    console.error('USE_LOCALSTACK is not true. Refusing to run against real AWS.');
    process.exit(1);
  }

  for (const bucket of buckets) {
    await ensureBucket(bucket);
  }

  for (const table of tables) {
    await ensureTable(table);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
