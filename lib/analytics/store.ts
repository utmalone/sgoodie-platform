import { randomUUID } from 'crypto';
import type { AnalyticsEvent } from './types';
import { readJson, writeJson } from '@/lib/data/local-store';

const ANALYTICS_FILE = 'analytics.json';

export async function getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  try {
    return await readJson<AnalyticsEvent[]>(ANALYTICS_FILE);
  } catch {
    return [];
  }
}

export async function appendAnalyticsEvent(event: Omit<AnalyticsEvent, 'id'>) {
  const events = await getAnalyticsEvents();
  const payload: AnalyticsEvent = {
    id: randomUUID(),
    ...event
  };
  events.push(payload);
  await writeJson(ANALYTICS_FILE, events);
  return payload;
}
