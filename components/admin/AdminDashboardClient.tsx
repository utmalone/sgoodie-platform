'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardStats, Period } from '@/lib/data/stats';
import { loadAiModel, saveAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { clearDraftPages } from '@/lib/admin/draft-store';
import { clearDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import { clearDraftAboutContent } from '@/lib/admin/draft-about-store';
import { clearDraftContactContent } from '@/lib/admin/draft-contact-store';
import { clearDraftProfile } from '@/lib/admin/draft-profile-store';
import { FieldInfoTooltip } from './FieldInfoTooltip';

type ModelResponse = {
  models: string[];
  defaultModel: string;
};

type ProgressEvent = {
  type: 'progress';
  phase: string;
  item: string;
  completed: number;
  total: number;
  percent: number;
};

type CompleteEvent = {
  type: 'complete';
  updatedPages: number;
  updatedPhotos: number;
  updatedProjects: number;
  updatedJournalPosts: number;
};

type ErrorEvent = {
  type: 'error';
  message: string;
};

type StreamEvent = ProgressEvent | CompleteEvent | ErrorEvent;

const dashboardFieldHelp = {
  period: [
    'How analytics are grouped (daily, monthly, quarterly, yearly).'
  ],
  year: [
    'Year of data to view.'
  ],
  month: [
    'Month of data when using the daily view.'
  ],
  quarter: [
    'Quarter of data when using the quarterly view.'
  ],
  model: [
    'AI model used for optimization.'
  ],
  includePages: [
    'Include page copy and SEO updates.'
  ],
  includePhotos: [
    'Include photo metadata updates.'
  ],
  includeProjects: [
    'Include portfolio and work project updates.'
  ],
  includeJournal: [
    'Include journal post updates.'
  ]
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
  const [currentPhase, setCurrentPhase] = useState('');
  const [currentItem, setCurrentItem] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [includePages, setIncludePages] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeJournal, setIncludeJournal] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const progressReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

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
      '/portfolio': 'Portfolio',
      '/journal': 'Journal',
      '/contact': 'Contact'
    }),
    []
  );

  function formatPageLabel(path: string) {
    const label = pageLabelMap[path as keyof typeof pageLabelMap];
    if (label) return label;
    const cleaned = path.replace(/^\//, '').replace(/-/g, ' ');
    if (!cleaned) return 'Home';
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function resetProgress() {
    if (progressReset.current) {
      clearTimeout(progressReset.current);
      progressReset.current = null;
    }
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }

  function startBatchProgress(mode: 'seo' | 'text') {
    resetProgress();
    setIsBatching(true);
    setProgress(0);
    setProgressLabel(`Optimizing ${mode.toUpperCase()}...`);
    setCurrentPhase('');
    setCurrentItem('');
    setCompletedCount(0);
    setTotalCount(0);
  }

  function finishBatchProgress(label?: string) {
    resetProgress();
    setProgressLabel(label || 'Finalizing updates...');
    setProgress(100);
    progressReset.current = setTimeout(() => {
      setIsBatching(false);
      setProgress(0);
      setProgressLabel('');
      setCurrentPhase('');
      setCurrentItem('');
      setCompletedCount(0);
      setTotalCount(0);
    }, 1500);
  }

  async function handleBatch(mode: 'seo' | 'text') {
    if (isBatching) return;
    if (!selectedModel) {
      setAiStatus('Select a model first.');
      return;
    }
    
    const hasSelection = includePages || includePhotos || includeProjects || includeJournal;
    if (!hasSelection) {
      setAiStatus('Select at least one category to optimize.');
      return;
    }

    setAiStatus(`Running AI ${mode.toUpperCase()} optimization...`);
    startBatchProgress(mode);

    try {
      abortController.current = new AbortController();
      
      const response = await fetch('/api/admin/ai/batch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode, 
          model: selectedModel,
          includePages,
          includePhotos,
          includeProjects,
          includeJournal
        }),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response, 'Batch optimization failed.');
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr) as StreamEvent;

              if (event.type === 'progress') {
                setProgress(event.percent);
                setCurrentPhase(event.phase);
                setCurrentItem(event.item);
                setCompletedCount(event.completed);
                setTotalCount(event.total);
                setProgressLabel(`${event.phase}: ${event.item}`);
              } else if (event.type === 'complete') {
                const parts = [
                  `${event.updatedPages} pages`,
                  `${event.updatedPhotos} photos`
                ];
                if (event.updatedProjects) parts.push(`${event.updatedProjects} projects`);
                if (event.updatedJournalPosts) parts.push(`${event.updatedJournalPosts} journal posts`);
                setAiStatus(`Done. Updated ${parts.join(', ')}. Refresh Pages/Photos to see changes.`);
                // Clear any cached drafts so admin UI shows fresh data
                clearDraftPages();
                clearDraftHomeLayout();
                clearDraftAboutContent();
                clearDraftContactContent();
                clearDraftProfile();
                finishBatchProgress('Complete!');
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setAiStatus('Optimization cancelled.');
      } else {
        const message = error instanceof Error ? error.message : 'Batch optimization failed.';
        setAiStatus(message);
      }
      finishBatchProgress('Stopped.');
    }
  }

  if (!stats) {
    return <p className="text-sm text-black/60">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8" aria-busy={isBatching}>
      {isBatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-[min(560px,90vw)] rounded-3xl border border-black/10 bg-white p-8 shadow-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40">AI Optimization</p>
            <h2 className="mt-3 text-xl font-semibold">
              {progress === 100 ? 'Complete!' : 'Processing...'}
            </h2>
            
            {/* Phase indicator */}
            {currentPhase && (
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-medium uppercase tracking-wider">
                  {currentPhase}
                </span>
                <span className="text-sm text-black/60 truncate">{currentItem}</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-5">
              <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-black/70 to-black/90 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">{Math.round(progress)}%</span>
                {totalCount > 0 && (
                  <span className="text-xs text-black/50">
                    {completedCount} / {totalCount} items
                  </span>
                )}
              </div>
            </div>

            {/* Status message */}
            <p className="mt-4 text-sm text-black/50">
              {progress === 100 
                ? 'All items have been optimized.'
                : 'Please keep this tab open. This may take a few minutes.'}
            </p>
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
            <span className="inline-flex items-center gap-2">
              Period
              <FieldInfoTooltip label="Period" lines={dashboardFieldHelp.period} />
            </span>
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
            <span className="inline-flex items-center gap-2">
              Year
              <FieldInfoTooltip label="Year" lines={dashboardFieldHelp.year} />
            </span>
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
              <span className="inline-flex items-center gap-2">
                Month
                <FieldInfoTooltip label="Month" lines={dashboardFieldHelp.month} />
              </span>
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
              <span className="inline-flex items-center gap-2">
                Quarter
                <FieldInfoTooltip label="Quarter" lines={dashboardFieldHelp.quarter} />
              </span>
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
            Choose a model and run global updates across pages, photos, projects, and journal posts.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm text-black/60">
              <span className="inline-flex items-center gap-2">
                Model
                <FieldInfoTooltip label="Model" lines={dashboardFieldHelp.model} />
              </span>
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePages}
                  onChange={(e) => setIncludePages(e.target.checked)}
                  disabled={isBatching}
                  className="h-4 w-4 rounded border-black/20"
                />
                <span className="flex items-center gap-2 text-black/60">
                  Pages
                  <FieldInfoTooltip label="Pages" lines={dashboardFieldHelp.includePages} />
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  disabled={isBatching}
                  className="h-4 w-4 rounded border-black/20"
                />
                <span className="flex items-center gap-2 text-black/60">
                  Photos
                  <FieldInfoTooltip label="Photos" lines={dashboardFieldHelp.includePhotos} />
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProjects}
                  onChange={(e) => setIncludeProjects(e.target.checked)}
                  disabled={isBatching}
                  className="h-4 w-4 rounded border-black/20"
                />
                <span className="flex items-center gap-2 text-black/60">
                  Projects
                  <FieldInfoTooltip label="Projects" lines={dashboardFieldHelp.includeProjects} />
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJournal}
                  onChange={(e) => setIncludeJournal(e.target.checked)}
                  disabled={isBatching}
                  className="h-4 w-4 rounded border-black/20"
                />
                <span className="flex items-center gap-2 text-black/60">
                  Journal
                  <FieldInfoTooltip label="Journal" lines={dashboardFieldHelp.includeJournal} />
                </span>
              </label>
            </div>
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
