import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getAnalyticsEvents } from '@/lib/analytics/store';
import { buildDashboardStats, type DashboardStatsOptions, type Period } from '@/lib/data/stats';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const rawPeriod = requestUrl.searchParams.get('period') || 'monthly';
  const period = (['daily', 'monthly', 'quarterly', 'yearly'] as Period[]).includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'monthly';
  const now = new Date();
  const rawYear = Number(requestUrl.searchParams.get('year'));
  const rawMonth = Number(requestUrl.searchParams.get('month'));
  const rawQuarter = Number(requestUrl.searchParams.get('quarter'));

  const year = Number.isFinite(rawYear) ? rawYear : now.getFullYear();
  const month = Number.isFinite(rawMonth) ? rawMonth : now.getMonth() + 1;
  const quarter = Number.isFinite(rawQuarter) ? rawQuarter : Math.floor(now.getMonth() / 3) + 1;

  const options: DashboardStatsOptions = {
    period,
    year,
    month,
    quarter
  };

  const events = await getAnalyticsEvents();
  const stats = buildDashboardStats(events, options);
  return Response.json(stats);
}
