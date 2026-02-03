import type { AnalyticsEvent } from '@/lib/analytics/types';

export type Period = 'daily' | 'monthly' | 'quarterly' | 'yearly';

export type DashboardStats = {
  totalVisits: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionMinutes: number;
  series: Array<{ label: string; visits: number }>;
  topPages: Array<{
    path: string;
    views: number;
    change: number;
    avgDurationMinutes: number;
    totalDurationMinutes: number;
  }>;
  trafficSources: Array<{ label: string; visits: number }>;
  rangeLabel: string;
};

export type DashboardStatsOptions = {
  period: Period;
  year: number;
  month?: number;
  quarter?: number;
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getQuarter(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1;
}

function buildRange(options: DashboardStatsOptions) {
  const year = options.year;
  const period = options.period;
  const now = new Date();

  if (period === 'daily') {
    const month = clamp(options.month ?? now.getMonth() + 1, 1, 12);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    return { start, end, labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`) };
  }

  if (period === 'monthly') {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start, end, labels: monthLabels };
  }

  if (period === 'quarterly') {
    const quarter = clamp(options.quarter ?? getQuarter(now.getMonth()), 1, 4);
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 1);
    return { start, end, labels: monthLabels.slice(startMonth, startMonth + 3), quarter };
  }

  const endYear = year;
  const startYear = year - 4;
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear + 1, 0, 1);
  const labels = Array.from({ length: 5 }, (_, i) => `${startYear + i}`);
  return { start, end, labels };
}

function buildPreviousRange(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - duration);
  return { prevStart, prevEnd };
}

function getRangeLabel(options: DashboardStatsOptions) {
  if (options.period === 'daily') {
    return `${monthLabels[(options.month ?? 1) - 1]} ${options.year}`;
  }
  if (options.period === 'monthly') {
    return `${options.year}`;
  }
  if (options.period === 'quarterly') {
    const quarter = clamp(options.quarter ?? 1, 1, 4);
    return `Q${quarter} ${options.year}`;
  }
  return `${options.year - 4} - ${options.year}`;
}

function resolveReferrer(referrer?: string) {
  if (!referrer) return 'Direct';
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return 'Direct';
  }
}

export function buildDashboardStats(
  events: AnalyticsEvent[],
  options: DashboardStatsOptions
): DashboardStats {
  const { start, end, labels, quarter } = buildRange(options);
  const rangeLabel = getRangeLabel(options);
  const { prevStart, prevEnd } = buildPreviousRange(start, end);

  const inRange = events.filter((event) => {
    const timestamp = new Date(event.timestamp).getTime();
    return timestamp >= start.getTime() && timestamp < end.getTime();
  });

  const previousRange = events.filter((event) => {
    const timestamp = new Date(event.timestamp).getTime();
    return timestamp >= prevStart.getTime() && timestamp < prevEnd.getTime();
  });

  const seriesMap = new Map<string, number>();
  labels.forEach((label) => seriesMap.set(label, 0));

  const visitsByPath = new Map<string, number>();
  const durationByPath = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const sessionMap = new Map<string, { views: number; duration: number }>();

  for (const event of inRange) {
    const date = new Date(event.timestamp);
    let label = '';
    if (options.period === 'daily') {
      label = `${date.getDate()}`;
    } else if (options.period === 'monthly') {
      label = monthLabels[date.getMonth()];
    } else if (options.period === 'quarterly') {
      label = monthLabels[date.getMonth()];
    } else {
      label = `${date.getFullYear()}`;
    }

    seriesMap.set(label, (seriesMap.get(label) || 0) + 1);

    visitsByPath.set(event.path, (visitsByPath.get(event.path) || 0) + 1);
    durationByPath.set(event.path, (durationByPath.get(event.path) || 0) + event.durationMs);

    const source = resolveReferrer(event.referrer);
    referrerMap.set(source, (referrerMap.get(source) || 0) + 1);

    const session = sessionMap.get(event.sessionId) ?? { views: 0, duration: 0 };
    session.views += 1;
    session.duration += event.durationMs;
    sessionMap.set(event.sessionId, session);
  }

  const uniqueVisitors = new Set(inRange.map((event) => event.visitorId)).size;
  const totalVisits = inRange.length;
  const sessions = Array.from(sessionMap.values());
  const bounces = sessions.filter((session) => session.views <= 1).length;
  const bounceRate = sessions.length ? Math.round((bounces / sessions.length) * 1000) / 10 : 0;
  const avgSessionMinutes =
    sessions.length > 0
      ? Math.round((sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length / 60000) * 10) /
        10
      : 0;

  const previousViewsByPath = new Map<string, number>();
  for (const event of previousRange) {
    previousViewsByPath.set(event.path, (previousViewsByPath.get(event.path) || 0) + 1);
  }

  const topPages = Array.from(visitsByPath.entries())
    .map(([path, views]) => {
      const prevViews = previousViewsByPath.get(path) || 0;
      const change = prevViews > 0 ? Math.round(((views - prevViews) / prevViews) * 100) : 0;
      const totalDuration = durationByPath.get(path) || 0;
      const avgDuration = views ? totalDuration / views : 0;
      return {
        path,
        views,
        change,
        avgDurationMinutes: Math.round((avgDuration / 60000) * 10) / 10,
        totalDurationMinutes: Math.round((totalDuration / 60000) * 10) / 10
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const trafficSources = Array.from(referrerMap.entries())
    .map(([label, visits]) => ({ label, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 6);

  const series = labels.map((label) => ({ label, visits: seriesMap.get(label) || 0 }));

  if (options.period === 'quarterly' && quarter) {
    const startMonth = (quarter - 1) * 3;
    const quarterLabels = monthLabels.slice(startMonth, startMonth + 3);
    return {
      totalVisits,
      uniqueVisitors,
      bounceRate,
      avgSessionMinutes,
      series: quarterLabels.map((label) => ({ label, visits: seriesMap.get(label) || 0 })),
      topPages,
      trafficSources,
      rangeLabel
    };
  }

  return {
    totalVisits,
    uniqueVisitors,
    bounceRate,
    avgSessionMinutes,
    series,
    topPages,
    trafficSources,
    rangeLabel
  };
}
