export type AnalyticsEvent = {
  id: string;
  type: 'page_view';
  path: string;
  referrer?: string;
  timestamp: string;
  durationMs: number;
  visitorId: string;
  sessionId: string;
  userAgent?: string;
};
