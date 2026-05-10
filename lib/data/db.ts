/**
 * DynamoDB operations helper for production data layer
 * Provides read/write operations with graceful handling of empty data
 */

import { GetCommand, PutCommand, ScanCommand, DeleteCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'sgoodie-platform';
const ENVIRONMENT = (
  process.env.DYNAMODB_TABLE_ENV ||
  process.env.APP_ENV ||
  process.env.ENVIRONMENT ||
  (process.env.NODE_ENV === 'production' ? 'prod' : 'staging')
).toLowerCase();

export function getTableName(tableName: string): string {
  return `${TABLE_PREFIX}-${tableName}-${ENVIRONMENT}`;
}

/**
 * Get a single item from DynamoDB by key
 */
export async function getItem<T>(
  tableName: string,
  key: Record<string, string>
): Promise<T | null> {
  const hasEmptyKeyValue = Object.values(key).some(
    (value) => typeof value !== 'string' || value.trim() === ''
  );
  if (hasEmptyKeyValue) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Skipping getItem for ${tableName}: empty key value`, key);
    }
    return null;
  }

  try {
    const result = await db.send(
      new GetCommand({
        TableName: getTableName(tableName),
        Key: key
      })
    );
    return (result.Item as T) || null;
  } catch (error) {
    console.error(`Error getting item from ${tableName}:`, error);
    return null;
  }
}

/**
 * Batch get items by primary keys (up to 100 keys per DynamoDB round-trip).
 */
export async function batchGetItems<T>(
  tableName: string,
  keys: Record<string, string>[]
): Promise<T[]> {
  const tableFullName = getTableName(tableName);
  const validKeys = keys.filter(
    (key) =>
      Object.keys(key).length > 0 &&
      Object.values(key).every((value) => typeof value === 'string' && value.trim() !== '')
  );
  if (validKeys.length === 0) {
    return [];
  }

  const all: T[] = [];
  const chunkSize = 100;

  for (let offset = 0; offset < validKeys.length; offset += chunkSize) {
    let chunkKeys = validKeys.slice(offset, offset + chunkSize).map((k) => ({ ...k }));

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await db.send(
          new BatchGetCommand({
            RequestItems: {
              [tableFullName]: {
                Keys: chunkKeys
              }
            }
          })
        );

        const items = (result.Responses?.[tableFullName] ?? []) as T[];
        all.push(...items);

        const pending = result.UnprocessedKeys?.[tableFullName]?.Keys as
          | Record<string, string>[]
          | undefined;

        if (!pending?.length) {
          chunkKeys = [];
          break;
        }

        chunkKeys = pending.map((k) => ({ ...k }));

        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      } catch (error) {
        console.error(`Error batchGetting from ${tableName}:`, error);
        break;
      }
    }
  }

  return all;
}

/**
 * Get all items from a DynamoDB table
 */
export async function getAllItems<T>(tableName: string): Promise<T[]> {
  try {
    const result = await db.send(
      new ScanCommand({
        TableName: getTableName(tableName)
      })
    );
    return (result.Items as T[]) || [];
  } catch (error) {
    console.error(`Error scanning ${tableName}:`, error);
    return [];
  }
}

/**
 * Put an item into DynamoDB
 */
export async function putItem<T extends Record<string, unknown>>(
  tableName: string,
  item: T
): Promise<T> {
  await db.send(
    new PutCommand({
      TableName: getTableName(tableName),
      Item: item
    })
  );
  return item;
}

/**
 * Delete an item from DynamoDB
 */
export async function deleteItem(
  tableName: string,
  key: Record<string, string>
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: getTableName(tableName),
      Key: key
    })
  );
}

/**
 * Check if we should use mock data (local JSON files)
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === 'true';
}
