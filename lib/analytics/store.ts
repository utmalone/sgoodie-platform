import { randomUUID } from 'crypto';
import type { AnalyticsEvent } from './types';
import { readJson, writeJson } from '@/lib/data/local-store';
import { db } from '@/lib/aws/dynamodb';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getTableName, isMockMode } from '@/lib/data/db';

const ANALYTICS_FILE = 'analytics.json';
const TABLE_NAME = 'analytics';
const RETENTION_DAYS = 90;

export async function getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  if (isMockMode()) {
    try {
      return await readJson<AnalyticsEvent[]>(ANALYTICS_FILE);
    } catch {
      return [];
    }
  }

  const tableName = getTableName(TABLE_NAME);
  const items: AnalyticsEvent[] = [];
  let lastKey: Record<string, unknown> | undefined;

  try {
    do {
      const result = await db.send(
        new ScanCommand({
          TableName: tableName,
          ExclusiveStartKey: lastKey
        })
      );
      if (result.Items?.length) {
        items.push(...(result.Items as AnalyticsEvent[]));
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
  } catch (error) {
    console.error('Failed to load analytics events:', error);
    return [];
  }

  return items;
}

export async function appendAnalyticsEvent(event: Omit<AnalyticsEvent, 'id'>) {
  const payload: AnalyticsEvent = {
    id: randomUUID(),
    ...event
  };

  if (isMockMode()) {
    const events = await getAnalyticsEvents();
    events.push(payload);
    await writeJson(ANALYTICS_FILE, events);
    return payload;
  }

  const ttl = Math.floor(Date.now() / 1000) + RETENTION_DAYS * 24 * 60 * 60;
  const item: AnalyticsEvent & { ttl: number } = { ...payload, ttl };

  try {
    await db.send(
      new PutCommand({
        TableName: getTableName(TABLE_NAME),
        Item: item
      })
    );
  } catch (error) {
    console.error('Failed to append analytics event:', error);
  }

  return payload;
}
