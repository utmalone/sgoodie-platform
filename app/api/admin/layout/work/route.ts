import { getWorkIndex } from '@/lib/data/work';

export async function GET() {
  const layout = await getWorkIndex();
  return Response.json(layout);
}
