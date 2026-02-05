'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { JournalPost, PhotoAsset } from '@/types';
import { usePreview } from '@/lib/admin/preview-context';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function AdminJournalClient() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent'>('all');
  const { openPreview } = usePreview();

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const sortedPosts = useMemo(() => {
    const sorted = [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (filter === 'recent') {
      return sorted.slice(0, 10);
    }
    return sorted;
  }, [posts, filter]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setStatus('');

    try {
      const [postsRes, photosRes] = await Promise.all([
        fetch('/api/admin/journal'),
        fetch('/api/admin/photos')
      ]);

      if (!postsRes.ok || !photosRes.ok) {
        setStatus('Unable to load data. Please refresh.');
        setIsLoading(false);
        return;
      }

      const postsData = (await postsRes.json()) as JournalPost[];
      const photosData = (await photosRes.json()) as PhotoAsset[];

      setPosts(postsData);
      setPhotos(photosData);
    } catch {
      setStatus('Unable to load data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(post: JournalPost) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

    setStatus('Deleting...');
    try {
      const res = await fetch(`/api/admin/journal/${post.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        setStatus('Failed to delete post.');
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setStatus('Deleted.');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Failed to delete post.');
    }
  }

  if (isLoading) {
    return <p className="text-sm text-black/60">Loading journal posts...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Journal</h1>
          <p className="mt-2 text-sm text-black/60">
            Manage journal posts and project features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openPreview('/journal')}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-black/60 hover:border-black/40 hover:text-black"
          >
            Preview
          </button>
          <Link
            href="/admin/journal/new"
            className="rounded-full bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
          >
            Add Post
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.25em] ${
            filter === 'all'
              ? 'bg-black text-white'
              : 'border border-black/10 text-black/60 hover:border-black/30'
          }`}
        >
          All Posts ({posts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('recent')}
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.25em] ${
            filter === 'recent'
              ? 'bg-black text-white'
              : 'border border-black/10 text-black/60 hover:border-black/30'
          }`}
        >
          Recent
        </button>
      </div>

      {status && <p className="text-sm text-black/60">{status}</p>}

      {/* Posts List */}
      <div className="space-y-3">
        {sortedPosts.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-black/60">No journal posts yet.</p>
            <Link
              href="/admin/journal/new"
              className="mt-4 inline-block text-sm text-black/70 underline hover:text-black"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          sortedPosts.map((post) => {
            const heroPhoto = photosById.get(post.heroPhotoId);

            return (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
              >
                {/* Thumbnail */}
                <div className="h-16 w-24 overflow-hidden rounded-xl bg-black/5">
                  {heroPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPhoto.src}
                      alt={heroPhoto.alt}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-black/30">
                      No image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{post.title}</h3>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-black/50">
                      {post.category}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-black/60">
                    <span>{formatDate(post.date)}</span>
                    <span>•</span>
                    <span>{post.author}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-black/50">
                    /journal/{post.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(`/journal/${post.slug}`)}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/40 hover:border-black/40 hover:text-black/60"
                    title="Preview"
                  >
                    👁
                  </button>
                  <Link
                    href={`/admin/journal/${post.id}`}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/60 hover:border-black/40 hover:text-black"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/40 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
