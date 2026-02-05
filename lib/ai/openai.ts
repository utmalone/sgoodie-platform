import { getSecretString } from '@/lib/aws/secrets';

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
};

type PhotoSeoResult = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  alt: string;
};

export async function getOpenAiKey() {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) return envKey;

  const secretId = process.env.OPENAI_API_KEY_SECRET_ID?.trim();
  if (secretId) {
    const secret = await getSecretString(secretId);
    if (secret) return secret;
  }

  throw new Error('OpenAI API key is not configured.');
}

export async function fetchOpenAiModels() {
  const key = await getOpenAiKey();
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
  const key = await getOpenAiKey();
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

const PHOTO_SEO_VISION_PROMPT = `You are an SEO expert for a professional photography portfolio website. 

Analyze this photograph carefully and generate optimized SEO metadata based on what you see in the image.

Consider:
- The subject matter (people, places, objects, events)
- The style and mood (candid, formal, dramatic, soft, etc.)
- The setting and context (wedding, portrait, landscape, commercial, etc.)
- Technical qualities (lighting, composition, colors)
- Emotional impact and story the image tells

Return a JSON object with these exact fields:
{
  "metaTitle": "55-60 character SEO title describing the photo",
  "metaDescription": "150-160 character compelling description for search results",
  "metaKeywords": "comma-separated relevant keywords, 5-8 terms",
  "alt": "Descriptive alt text for accessibility, what the image shows"
}

Guidelines:
- Be specific and descriptive, not generic
- Use natural language, avoid keyword stuffing
- Include location/context if identifiable
- Focus on what makes this image unique
- Return ONLY the JSON object, no markdown or explanation`;

/**
 * Analyzes a photo using GPT-4 Vision and generates SEO metadata
 */
export async function analyzePhotoForSeo({
  imageUrl,
  model = 'gpt-4o'
}: {
  imageUrl: string;
  model?: string;
}): Promise<PhotoSeoResult> {
  const key = await getOpenAiKey();

  // Build image content - use URL directly if it's a full URL, otherwise we need base URL
  let fullImageUrl = imageUrl;
  if (imageUrl.startsWith('/')) {
    // Relative URL - need to construct full URL for OpenAI
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    fullImageUrl = `${baseUrl}${imageUrl}`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: PHOTO_SEO_VISION_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: fullImageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const body = await response.text();
    let message = 'OpenAI Vision request failed.';
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
  const text = data.choices?.[0]?.message?.content?.trim();
  
  if (!text) {
    throw new Error('OpenAI Vision response contained no text output.');
  }

  // Parse JSON response
  try {
    // Remove markdown code blocks if present
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON object in the response if it's wrapped in other text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const result = JSON.parse(jsonStr) as PhotoSeoResult;
    
    // Return with defaults for any missing fields
    return {
      metaTitle: result.metaTitle || '',
      metaDescription: result.metaDescription || '',
      metaKeywords: result.metaKeywords || '',
      alt: result.alt || ''
    };
  } catch (parseError) {
    console.error('Failed to parse photo SEO response:', text);
    console.error('Parse error:', parseError);
    
    // Try to extract fields manually from the text
    const fallbackResult: PhotoSeoResult = {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      alt: ''
    };
    
    // Try to extract alt text
    const altMatch = text.match(/"alt"\s*:\s*"([^"]+)"/);
    if (altMatch) fallbackResult.alt = altMatch[1];
    
    // Try to extract metaTitle
    const titleMatch = text.match(/"metaTitle"\s*:\s*"([^"]+)"/);
    if (titleMatch) fallbackResult.metaTitle = titleMatch[1];
    
    // Try to extract metaDescription
    const descMatch = text.match(/"metaDescription"\s*:\s*"([^"]+)"/);
    if (descMatch) fallbackResult.metaDescription = descMatch[1];
    
    // Try to extract metaKeywords
    const keywordsMatch = text.match(/"metaKeywords"\s*:\s*"([^"]+)"/);
    if (keywordsMatch) fallbackResult.metaKeywords = keywordsMatch[1];
    
    // If we extracted at least something, return it
    if (fallbackResult.alt || fallbackResult.metaTitle) {
      return fallbackResult;
    }
    
    throw new Error('Failed to parse photo SEO metadata from AI response.');
  }
}
