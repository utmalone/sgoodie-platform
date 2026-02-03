import { appendAnalyticsEvent } from '@/lib/analytics/store';

export const runtime = 'nodejs';

type IncomingEvent = {
  type: 'page_view';
  path: string;
  referrer?: string;
  timestamp: string;
  durationMs: number;
  visitorId: string;
  sessionId: string;
  userAgent?: string;
};

function isValidEvent(event: IncomingEvent) {
  return (
    event &&
    event.type === 'page_view' &&
    typeof event.path === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.durationMs === 'number' &&
    typeof event.visitorId === 'string' &&
    typeof event.sessionId === 'string'
  );
}

export async function POST(request: Request) {
  let payload: IncomingEvent;
  try {
    payload = (await request.json()) as IncomingEvent;
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!isValidEvent(payload)) {
    return Response.json({ error: 'Invalid event payload.' }, { status: 400 });
  }

  if (payload.path.startsWith('/admin') || payload.path.startsWith('/api')) {
    return Response.json({ ok: true });
  }

  const durationMs = Number.isFinite(payload.durationMs) ? Math.max(0, payload.durationMs) : 0;

  await appendAnalyticsEvent({
    type: payload.type,
    path: payload.path,
    referrer: payload.referrer,
    timestamp: payload.timestamp,
    durationMs,
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    userAgent: payload.userAgent
  });

  return Response.json({ ok: true });
}
