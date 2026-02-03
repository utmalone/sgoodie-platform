type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
};

export function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set.');
  }
  return key;
}

export async function fetchOpenAiModels() {
  const key = getOpenAiKey();
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    let message = 'OpenAI models request failed.';
    try {
      const data = JSON.parse(body) as {
        error?: { message?: string; code?: string };
      };
      if (data?.error?.message) {
        message = data.error.message;
      }
      if (data?.error?.code) {
        message = `${message} (${data.error.code})`;
      }
    } catch {
      if (body?.trim()) message = body.trim();
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { data?: Array<{ id: string }> };
  return data.data?.map((item) => item.id) ?? [];
}

function extractText(payload: OpenAiResponse): string | null {
  if (!payload) return null;
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content || [])
    .find(
      (content) =>
        content.type === 'output_text' ||
        content.type === 'summary_text' ||
        content.type === 'text'
    )?.text;

  if (outputText && outputText.trim()) {
    return outputText.trim();
  }

  const chatText = payload.choices?.[0]?.message?.content;
  return chatText?.trim() || null;
}

export async function createOpenAiResponse({
  model,
  systemPrompt,
  userPrompt
}: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const key = getOpenAiKey();
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }]
        }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const body = await response.text();
    let message = 'OpenAI request failed.';
    try {
      const data = JSON.parse(body) as {
        error?: { message?: string; code?: string };
      };
      if (data?.error?.message) {
        message = data.error.message;
      }
      if (data?.error?.code) {
        message = `${message} (${data.error.code})`;
      }
    } catch {
      if (body?.trim()) message = body.trim();
    }
    throw new Error(message);
  }

  const data = (await response.json()) as OpenAiResponse;
  const text = extractText(data);
  if (!text) {
    throw new Error('OpenAI response contained no text output.');
  }

  return text;
}
