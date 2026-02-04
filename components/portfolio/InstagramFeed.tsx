'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from '@/styles/public/InstagramFeed.module.css';

type InstagramPost = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
};

type InstagramFeedProps = {
  handle: string;
  instagramUrl: string;
};

/**
 * Instagram feed component that displays the latest 6 posts.
 * 
 * For production, this needs to be connected to the Instagram Basic Display API
 * or use a service like Behold, Curator, or similar.
 * 
 * The API endpoint should return posts sorted newest first.
 */
export function InstagramFeed({ handle, instagramUrl }: InstagramFeedProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchInstagramPosts() {
      try {
        // Try to fetch from our API endpoint
        const res = await fetch(`/api/instagram?handle=${handle}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts.slice(0, 6)); // Latest 6 posts
        } else {
          // Fallback: show placeholder posts that link to Instagram
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchInstagramPosts();
  }, [handle]);

  // Placeholder images for when API isn't connected yet
  // These will be replaced with actual Instagram posts once the API is set up
  const placeholderPosts: InstagramPost[] = [
    { id: '1', mediaUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl },
    { id: '2', mediaUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl },
    { id: '3', mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl },
    { id: '4', mediaUrl: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl },
    { id: '5', mediaUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl },
    { id: '6', mediaUrl: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=400&q=80', permalink: instagramUrl }
  ];

  const displayPosts = posts.length > 0 ? posts : placeholderPosts;

  if (loading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Follow Along On Instagram</h2>
        <div className={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Follow Along On Instagram</h2>
      <div className={styles.grid}>
        {displayPosts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.item}
            aria-label="View on Instagram"
          >
            <Image
              src={post.mediaUrl}
              alt={post.caption || 'Instagram post'}
              fill
              sizes="(max-width: 768px) 50vw, 16vw"
              className={styles.image}
            />
          </a>
        ))}
      </div>
    </section>
  );
}
