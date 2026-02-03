import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { fetchOpenAiModels } from '@/lib/ai/openai';

export const runtime = 'nodejs';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const models = await fetchOpenAiModels();
    const preferredOrder = ['gpt-5.2', 'o3', 'gpt-4.1', 'gpt-4o'];
    const available = new Set(models);

    const curated = preferredOrder.filter((model) => available.has(model));
    const fallback = models
      .filter((id) => id.startsWith('gpt') || id.startsWith('o'))
      .filter((id) => !id.match(/-\d{4}-\d{2}-\d{2}$/))
      .filter(
        (id) =>
          !id.includes('audio') &&
          !id.includes('whisper') &&
          !id.includes('tts') &&
          !id.includes('realtime') &&
          !id.includes('embedding') &&
          !id.includes('dall-e') &&
          !id.includes('moderation') &&
          !id.includes('codex')
      )
      .filter((id) => !preferredOrder.includes(id));

    const topModels = [...curated, ...fallback].slice(0, 4);
    const envDefault = process.env.OPENAI_DEFAULT_MODEL || '';
    const useLatest = envDefault.toLowerCase() === 'latest' || envDefault.toLowerCase() === 'auto';
    const defaultModel =
      useLatest || !topModels.includes(envDefault)
        ? topModels[0] || ''
        : envDefault;
    return Response.json({ models: topModels, defaultModel });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load models.' },
      { status: 500 }
    );
  }
}
