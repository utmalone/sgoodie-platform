'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardStats, Period } from '@/lib/data/stats';
import { loadAiModel, saveAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';

type ModelResponse = {
  models: string[];
  defaultModel: string;
};

export function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isBatching, setIsBatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressReset = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadModels() {
      const modelsRes = await fetch('/api/admin/ai/models');
      if (modelsRes.ok) {
        const data = (await modelsRes.json()) as ModelResponse;
        setModels(data.models);
        const stored = loadAiModel();
        setSelectedModel(stored || data.defaultModel || data.models[0] || '');
      } else {
        const message = await getApiErrorMessage(modelsRes, 'Unable to load AI models.');
        setStatus((prev) => prev || message);
      }
    }

    loadModels();
  }, []);

  useEffect(() => {
    async function loadStats() {
      const params = new URLSearchParams({
        period,
        year: String(year),
        month: String(month),
        quarter: String(quarter)
      });
      const statsRes = await fetch(`/api/admin/stats?${params.toString()}`);
      if (statsRes.ok) {
        const data = (await statsRes.json()) as DashboardStats;
        setStats(data);
      } else {
        setStatus('Unable to load dashboard stats.');
      }
    }

    loadStats();
  }, [period, year, month, quarter]);

  useEffect(() => {
    if (selectedModel) {
      saveAiModel(selectedModel);
    }
  }, [selectedModel]);

  const maxSeries = useMemo(() => {
    if (!stats) return 0;
    return Math.max(...stats.series.map((point) => point.visits), 1);
  }, [stats]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => current - index);
  }, []);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'Jan' },
      { value: 2, label: 'Feb' },
      { value: 3, label: 'Mar' },
      { value: 4, label: 'Apr' },
      { value: 5, label: 'May' },
      { value: 6, label: 'Jun' },
      { value: 7, label: 'Jul' },
      { value: 8, label: 'Aug' },
      { value: 9, label: 'Sep' },
      { value: 10, label: 'Oct' },
      { value: 11, label: 'Nov' },
      { value: 12, label: 'Dec' }
    ],
    []
  );

  const pageLabelMap = useMemo(
    () => ({
      '/': 'Home',
      '/about': 'About',
      '/work': 'Work',
      '/journal': 'Journal',
      '/contact': 'Contact'
    }),
    []
  );

  function formatPageLabel(path: string) {
    if (pageLabelMap[path]) return pageLabelMap[path];
    const cleaned = path.replace(/^\//, '').replace(/-/g, ' ');
    if (!cleaned) return 'Home';
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function clearProgressTimers() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (progressReset.current) {
      clearTimeout(progressReset.current);
      progressReset.current = null;
    }
  }

  function startBatchProgress(mode: 'seo' | 'text') {
    clearProgressTimers();
    setIsBatching(true);
    setProgress(6);
    setProgressLabel(`Optimizing ${mode.toUpperCase()}...`);
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const next = prev + Math.max(1, Math.round((90 - prev) / 8));
        return Math.min(90, next);
      });
    }, 700);
  }

  function finishBatchProgress(label?: string) {
    clearProgressTimers();
    setProgressLabel(label || 'Finalizing updates...');
    setProgress(100);
    progressReset.current = setTimeout(() => {
      setIsBatching(false);
      setProgress(0);
      setProgressLabel('');
    }, 900);
  }

  async function handleBatch(mode: 'seo' | 'text') {
    if (isBatching) return;
    if (!selectedModel) {
      setAiStatus('Select a model first.');
      return;
    }

    setAiStatus(`Running AI ${mode.toUpperCase()} optimization...`);
    startBatchProgress(mode);

    try {
      const response = await fetch('/api/admin/ai/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, model: selectedModel })
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response, 'Batch optimization failed.');
        throw new Error(message);
      }

      const data = (await response.json()) as { updatedPages: number; updatedPhotos: number };
      setAiStatus(`Done. Updated ${data.updatedPages} pages and ${data.updatedPhotos} photos.`);
      finishBatchProgress('Done.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch optimization failed.';
      setAiStatus(message);
      finishBatchProgress('Stopping...');
    }
  }

  if (!stats) {
    return <p className="text-sm text-black/60">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8" aria-busy={isBatching}>
      {isBatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-[min(520px,90vw)] rounded-3xl border border-black/10 bg-white p-6 shadow-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40">AI Optimization</p>
            <h2 className="mt-3 text-xl font-semibold">{progressLabel || 'Working...'}</h2>
            <p className="mt-2 text-sm text-black/60">
              Please keep this tab open. Navigation and editing are disabled while this runs.
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-black/10">
              <div
                className="h-2 rounded-full bg-black/80 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-black/40">{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">Welcome</p>
        <h1 className="mt-3 text-3xl font-semibold">Good to see you back.</h1>
        <p className="mt-2 text-sm text-black/60">
          Here&apos;s a quick pulse check on your traffic, plus tools to optimize copy and SEO.
        </p>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs uppercase tracking-[0.3em] text-black/40">
            Period
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              disabled={isBatching}
              className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-black/40">
            Year
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              disabled={isBatching}
              className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {period === 'daily' && (
            <label className="text-xs uppercase tracking-[0.3em] text-black/40">
              Month
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                disabled={isBatching}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {period === 'quarterly' && (
            <label className="text-xs uppercase tracking-[0.3em] text-black/40">
              Quarter
              <select
                value={quarter}
                onChange={(event) => setQuarter(Number(event.target.value))}
                disabled={isBatching}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
            </label>
          )}
          <div className="text-xs uppercase tracking-[0.3em] text-black/40">
            Range
            <p className="mt-2 text-sm text-black/70">{stats.rangeLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40">Visits</p>
          <p className="mt-2 text-2xl font-semibold">{stats.totalVisits.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40">Visitors</p>
          <p className="mt-2 text-2xl font-semibold">{stats.uniqueVisitors.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40">Bounce Rate</p>
          <p className="mt-2 text-2xl font-semibold">{stats.bounceRate}%</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40">Avg Session</p>
          <p className="mt-2 text-2xl font-semibold">{stats.avgSessionMinutes} min</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Traffic</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-black/40">
              Visits
            </span>
          </div>
          <div className="mt-6 flex items-end gap-2">
            {stats.series.map((point) => (
              <div key={point.label} className="flex flex-col items-center gap-2">
                <div
                  className="w-4 rounded-full bg-black/70"
                  style={{ height: `${Math.round((point.visits / maxSeries) * 120)}px` }}
                />
                <span className="text-[10px] text-black/40">{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">AI Optimization</h2>
          <p className="mt-2 text-sm text-black/60">
            Choose a model and run global updates across pages and photos.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm text-black/60">
              Model
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={isBatching}
                className="mt-2 w-full rounded-2xl border border-black/20 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleBatch('seo')}
                disabled={isBatching}
                className="rounded-full border border-black/20 bg-black px-4 py-2 text-xs uppercase tracking-[0.35em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Optimize SEO
              </button>
              <button
                type="button"
                onClick={() => handleBatch('text')}
                disabled={isBatching}
                className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-black/70 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                Optimize Text
              </button>
            </div>
            {aiStatus && <p className="text-xs uppercase tracking-[0.3em] text-black/40">{aiStatus}</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Top Pages</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.3em] text-black/40">
              <tr>
                <th className="py-2">Page</th>
                <th className="py-2">Views</th>
                <th className="py-2">Avg Time</th>
                <th className="py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPages.map((page) => (
                <tr key={page.path} className="border-t border-black/5">
                  <td className="py-3 text-black/70">
                    <div className="text-sm font-medium text-black/80">{formatPageLabel(page.path)}</div>
                    <div className="text-xs text-black/40">{page.path}</div>
                  </td>
                  <td className="py-3">{page.views.toLocaleString()}</td>
                  <td className="py-3">{page.avgDurationMinutes.toFixed(1)} min</td>
                  <td className="py-3 text-emerald-600">{page.change >= 0 ? '+' : ''}{page.change}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Traffic Sources</h2>
          <div className="mt-4 space-y-3">
            {stats.trafficSources.map((source) => (
              <div key={source.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-black/60">
                  <span>{source.label}</span>
                  <span>{source.visits.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/5">
                  <div
                    className="h-2 rounded-full bg-black/70"
                    style={{
                      width: `${Math.round((source.visits / Math.max(stats.totalVisits, 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {status && <p className="text-sm text-black/60">{status}</p>}
    </div>
  );
}
