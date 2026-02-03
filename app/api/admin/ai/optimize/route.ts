import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { buildSeoPrompt, buildTextPrompt, SEO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createOpenAiResponse } from '@/lib/ai/openai';

export const runtime = 'nodejs';

type OptimizePayload = {
  mode: 'text' | 'seo';
  target: 'page' | 'photo';
  field: string;
  input: string;
  model?: string | null;
  context?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: OptimizePayload;
  try {
    payload = (await request.json()) as OptimizePayload;
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!payload?.mode || !payload.field) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const model = payload.model || process.env.OPENAI_DEFAULT_MODEL;
  if (!model) {
    return Response.json(
      { error: 'OPENAI_DEFAULT_MODEL is not set and no model was selected.' },
      { status: 500 }
    );
  }

  const promptPayload = {
    field: payload.field,
    input: payload.input || '',
    context: payload.context
  };

  try {
    const output = await createOpenAiResponse({
      model,
      systemPrompt: payload.mode === 'seo' ? SEO_SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT,
      userPrompt: payload.mode === 'seo' ? buildSeoPrompt(promptPayload) : buildTextPrompt(promptPayload)
    });

    return Response.json({ output, model });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'AI optimization failed.' },
      { status: 500 }
    );
  }
}
