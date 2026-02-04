import { getHomeLayout } from '@/lib/data/home';

export async function GET() {
  const layout = await getHomeLayout();
  return Response.json(layout);
}
