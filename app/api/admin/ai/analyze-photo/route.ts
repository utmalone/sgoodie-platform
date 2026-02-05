import { NextResponse } from 'next/server';
import { getOpenAiKey } from '@/lib/ai/openai';

const PHOTO_SEO_PROMPT = `You are helping a professional photographer organize their portfolio website. 

Please analyze this photograph and generate SEO metadata to help it appear in search results. This is for a legitimate business website showcasing professional photography work.

Describe what you see in the image - the subject, setting, lighting, mood, and any notable details. Then format your response as JSON:

{
  "alt": "A detailed description of what the image shows for accessibility",
  "metaTitle": "A compelling SEO title under 60 characters",
  "metaDescription": "A description for search results, under 160 characters",
  "metaKeywords": "relevant, comma, separated, keywords"
}

Please respond with only the JSON object.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    let apiKey: string;
    try {
      apiKey = await getOpenAiKey();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Sending image to OpenAI, size:', Math.round(base64.length / 1024), 'KB');

    // Call OpenAI Vision API directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO assistant helping a professional photographer organize their portfolio website. You analyze photographs and generate appropriate metadata for web accessibility and search engine optimization. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: PHOTO_SEO_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI API error:', response.status, errorBody);
      
      let errorMessage = 'OpenAI API request failed';
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use default message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    console.log('OpenAI response content:', content);

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let result = { alt: '', metaTitle: '', metaDescription: '', metaKeywords: '' };
    
    try {
      // Clean up the response - remove markdown code blocks
      let jsonStr = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      result = {
        alt: parsed.alt || '',
        metaTitle: parsed.metaTitle || '',
        metaDescription: parsed.metaDescription || '',
        metaKeywords: parsed.metaKeywords || ''
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content was:', content);
      
      // Try regex extraction as fallback
      const altMatch = content.match(/"alt"\s*:\s*"([^"]+)"/);
      const titleMatch = content.match(/"metaTitle"\s*:\s*"([^"]+)"/);
      const descMatch = content.match(/"metaDescription"\s*:\s*"([^"]+)"/);
      const keywordsMatch = content.match(/"metaKeywords"\s*:\s*"([^"]+)"/);
      
      result = {
        alt: altMatch?.[1] || '',
        metaTitle: titleMatch?.[1] || '',
        metaDescription: descMatch?.[1] || '',
        metaKeywords: keywordsMatch?.[1] || ''
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Photo analysis error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze photo';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
