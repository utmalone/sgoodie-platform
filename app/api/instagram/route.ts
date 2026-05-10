import { NextResponse } from 'next/server';
import { getSecretString } from '@/lib/aws/secrets';

/**
 * Instagram API endpoint for fetching latest posts.
 * 
 * For production, you'll need to:
 * 1. Set up Instagram Basic Display API or Graph API
 * 2. Store the access token securely (env variable)
 * 3. Implement token refresh logic
 * 
 * Instagram Basic Display API docs:
 * https://developers.facebook.com/docs/instagram-basic-display-api
 * 
 * Alternatively, use a service like:
 * - Behold (https://behold.so)
 * - Curator.io
 * - Juicer
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle?.trim()) {
    return NextResponse.json({ posts: [] as unknown[] });
  }

  // Check if Instagram access token is configured
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const secretId = process.env.INSTAGRAM_ACCESS_TOKEN_SECRET_ID?.trim();
  const accessToken = envToken || (secretId ? await getSecretString(secretId) : null);

  if (!accessToken) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[instagram] No INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCESS_TOKEN_SECRET_ID — returning empty posts.');
    }
    return NextResponse.json({ posts: [] });
  }

  try {
    // Fetch from Instagram Basic Display API
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,media_type&access_token=${accessToken}&limit=6`
    );

    if (!response.ok) {
      console.error('Instagram API error:', await response.text());
      return NextResponse.json({ posts: [], error: 'instagram_api_error' });
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; media_url: string; permalink: string; caption?: string; media_type: string }>;
    };

    const raw = Array.isArray(data.data) ? data.data : [];

    const posts = raw
      .filter((item) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        mediaUrl: item.media_url,
        permalink: item.permalink,
        caption: item.caption || ''
      }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Instagram fetch error:', error);
    return NextResponse.json({ posts: [], error: 'instagram_fetch_failed' });
  }
}
