'use client';

import { useEffect, useState } from 'react';
import type { JournalPost, PhotoAsset } from '@/types';
import { loadDraftJournalIndex } from '@/lib/admin/draft-journal-index-store';
import { JournalGrid } from '@/components/portfolio/JournalGrid';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const DRAFT_JOURNAL_INDEX_KEY = 'sgoodie.admin.draft.journalIndex';

type DraftJournalGridSectionProps = {
  isPreview: boolean;
  allPosts: JournalPost[];
  photosById: Map<string, PhotoAsset>;
  startIndex: number;
  endIndex: number;
};

export function DraftJournalGridSection({
  isPreview,
  allPosts,
  photosById,
  startIndex,
  endIndex
}: DraftJournalGridSectionProps) {
  const [orderedPosts, setOrderedPosts] = useState(allPosts);

  useEffect(() => {
    if (!isPreview) {
      queueMicrotask(() => setOrderedPosts(allPosts));
      return;
    }

    const load = async () => {
      try {
        const [indexRes, draft] = await Promise.all([
          fetch('/api/admin/layout/journal'),
          Promise.resolve(typeof window !== 'undefined' ? loadDraftJournalIndex() : null)
        ]);
        if (!indexRes.ok) {
          setOrderedPosts(allPosts);
          return;
        }
        const indexData = await indexRes.json();
        const journalIndex = draft ?? indexData;

        const dateSorted = [...allPosts].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (!journalIndex?.postIds?.length) {
          setOrderedPosts(allPosts);
          return;
        }

        const byId = new Map(dateSorted.map((p) => [p.id, p]));
        const ordered = journalIndex.postIds
          .map((id: string) => byId.get(id))
          .filter(Boolean) as JournalPost[];
        const remaining = dateSorted.filter((p) => !journalIndex.postIds.includes(p.id));
        setOrderedPosts([...ordered, ...remaining]);
      } catch {
        setOrderedPosts(allPosts);
      }
    };

    load();

    const pollId = window.setInterval(load, 500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAFT_JOURNAL_INDEX_KEY || event.key === PREVIEW_REFRESH_KEY) load();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isPreview, allPosts]);

  const posts = orderedPosts.slice(startIndex, endIndex);

  return <JournalGrid posts={posts} photosById={photosById} isPreview={isPreview} />;
}
