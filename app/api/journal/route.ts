import { getAllJournalPosts } from '@/lib/data/journal';

export async function GET() {
  const posts = await getAllJournalPosts();
  return Response.json(posts);
}
