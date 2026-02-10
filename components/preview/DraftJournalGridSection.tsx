'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { JournalPost, PhotoAsset } from '@/types';
import { loadDraftJournalIndex } from '@/lib/admin/draft-journal-index-store';
import { JournalGrid } from '@/components/portfolio/JournalGrid';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const DRAFT_JOURNAL_INDEX_KEY = 'sgoodie.admin.draft.journalIndex';

type DraftJournalGridSectionProps = {
  isPreview: boolean;
  allPosts: JournalPost[];
  photosById: Map<string, PhotoAsset>;
  startIndex: number;
  endIndex: number;
};

async function fetchJournalIndex() {
  const res = await fetch('/api/admin/layout/journal', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load journal index');
  return (await res.json()) as { postIds?: string[] };
}

export function DraftJournalGridSection({
  isPreview,
  allPosts,
  photosById,
  startIndex,
  endIndex
}: DraftJournalGridSectionProps) {
  const draftSignal = usePreviewKeySignal([DRAFT_JOURNAL_INDEX_KEY], isPreview);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], isPreview);

  const draftIndex = useMemo(() => {
    if (!isPreview) return null;
    void draftSignal; // Recompute when draft journal index changes.
    return loadDraftJournalIndex();
  }, [draftSignal, isPreview]);

  const journalIndexQuery = useQuery({
    queryKey: ['admin', 'layout', 'journal', refreshSignal],
    queryFn: fetchJournalIndex,
    enabled: isPreview,
    staleTime: Infinity
  });

  const orderedPosts = useMemo(() => {
    if (!isPreview) return allPosts;

    const journalIndex = draftIndex ?? journalIndexQuery.data ?? null;
    const ids = Array.isArray(journalIndex?.postIds) ? journalIndex.postIds : [];
    if (!ids.length) return allPosts;

    const dateSorted = [...allPosts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const byId = new Map(dateSorted.map((post) => [post.id, post]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as JournalPost[];
    const idSet = new Set(ids);
    const remaining = dateSorted.filter((post) => !idSet.has(post.id));
    return [...ordered, ...remaining];
  }, [allPosts, draftIndex, isPreview, journalIndexQuery.data]);

  const posts = orderedPosts.slice(startIndex, endIndex);

  return <JournalGrid posts={posts} photosById={photosById} isPreview={isPreview} />;
}
