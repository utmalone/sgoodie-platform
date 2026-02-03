type PromptPayload = {
  field: string;
  input: string;
  context?: Record<string, unknown>;
};

export const TEXT_SYSTEM_PROMPT =
  'You are a senior copy editor for a premium photography portfolio website. Improve clarity, flow, and SEO relevance while preserving the original meaning and tone. Keep it professional and human-sounding. Avoid jargon, hype, and changing factual details. Return only the revised text.';

export const SEO_SYSTEM_PROMPT =
  'You are an SEO editor for a photography portfolio website. Create concise, human-sounding metadata that reflects the page or photo content. Use relevant keywords without repetition or stuffing, and keep the user’s intent and tone. For meta titles aim for ~55-60 characters, meta descriptions ~150-160 characters, and meta keywords as a comma-separated list. Return only the revised text for the requested field.';

export function buildTextPrompt({ field, input, context }: PromptPayload) {
  const lines = [
    `Field: ${field}`,
    `User Input: ${input}`,
    context ? `Context (JSON): ${JSON.stringify(context)}` : ''
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildSeoPrompt({ field, input, context }: PromptPayload) {
  const lines = [
    `Field: ${field}`,
    `User Input: ${input}`,
    context ? `Context (JSON): ${JSON.stringify(context)}` : ''
  ].filter(Boolean);

  return lines.join('\n');
}
