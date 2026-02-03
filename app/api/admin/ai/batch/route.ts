import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { buildSeoPrompt, buildTextPrompt, SEO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createOpenAiResponse } from '@/lib/ai/openai';
import { getAllPages, updatePage } from '@/lib/data/pages';
import { getAllPhotos, updatePhoto } from '@/lib/data/photos';
import type { PageContent, PhotoAsset } from '@/types';

export const runtime = 'nodejs';

type BatchPayload = {
  mode: 'text' | 'seo';
  model?: string | null;
};

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: BatchPayload;
  try {
    payload = (await request.json()) as BatchPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!payload?.mode) {
    return Response.json({ error: 'Missing mode.' }, { status: 400 });
  }

  const model = payload.model || process.env.OPENAI_DEFAULT_MODEL;
  if (!model) {
    return Response.json(
      { error: 'OPENAI_DEFAULT_MODEL is not set and no model was selected.' },
      { status: 500 }
    );
  }

  try {
    const pages = await getAllPages();
    const photos = await getAllPhotos();
    const photoMap = new Map(photos.map((photo) => [photo.id, photo]));
    let updatedPages = 0;
    let updatedPhotos = 0;

    for (const page of pages) {
      if (payload.mode === 'text') {
        const updatedPage: PageContent = { ...page };

        if (page.intro) {
          updatedPage.intro = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'intro',
              input: page.intro,
              context: { page }
            })
          });
        }

        if (page.body) {
          updatedPage.body = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'body',
              input: page.body,
              context: { page }
            })
          });
        }

        if (page.ctaLabel) {
          updatedPage.ctaLabel = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'ctaLabel',
              input: page.ctaLabel,
              context: { page }
            })
          });
        }

        await updatePage(updatedPage);
        updatedPages += 1;
      }

      if (payload.mode === 'seo') {
        const pagePhotos = page.gallery
          .map((id) => photoMap.get(id))
          .filter(Boolean) as PhotoAsset[];

        const pageContext = {
          page,
          photos: pagePhotos.map((photo) => ({
            id: photo.id,
            alt: photo.alt,
            src: photo.src,
            metaTitle: photo.metaTitle || '',
            metaDescription: photo.metaDescription || '',
            metaKeywords: photo.metaKeywords || ''
          }))
        };

        const updatedPage: PageContent = {
          ...page,
          metaTitle: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaTitle',
              input: page.metaTitle || '',
              context: pageContext
            })
          }),
          metaDescription: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaDescription',
              input: page.metaDescription || '',
              context: pageContext
            })
          }),
          metaKeywords: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaKeywords',
              input: page.metaKeywords || '',
              context: pageContext
            })
          })
        };

        await updatePage(updatedPage);
        updatedPages += 1;

        for (const photo of pagePhotos) {
          const updatedPhoto: PhotoAsset = {
            ...photo,
            metaTitle: await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaTitle',
                input: photo.metaTitle || '',
                context: {
                  pageMeta: {
                    metaTitle: updatedPage.metaTitle,
                    metaDescription: updatedPage.metaDescription,
                    metaKeywords: updatedPage.metaKeywords
                  },
                  pageText: {
                    intro: updatedPage.intro,
                    body: updatedPage.body
                  },
                  photo: {
                    id: photo.id,
                    alt: photo.alt,
                    src: photo.src,
                    metaTitle: photo.metaTitle || '',
                    metaDescription: photo.metaDescription || '',
                    metaKeywords: photo.metaKeywords || ''
                  }
                }
              })
            }),
            metaDescription: await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaDescription',
                input: photo.metaDescription || '',
                context: {
                  pageMeta: {
                    metaTitle: updatedPage.metaTitle,
                    metaDescription: updatedPage.metaDescription,
                    metaKeywords: updatedPage.metaKeywords
                  },
                  pageText: {
                    intro: updatedPage.intro,
                    body: updatedPage.body
                  },
                  photo: {
                    id: photo.id,
                    alt: photo.alt,
                    src: photo.src,
                    metaTitle: photo.metaTitle || '',
                    metaDescription: photo.metaDescription || '',
                    metaKeywords: photo.metaKeywords || ''
                  }
                }
              })
            }),
            metaKeywords: await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaKeywords',
                input: photo.metaKeywords || '',
                context: {
                  pageMeta: {
                    metaTitle: updatedPage.metaTitle,
                    metaDescription: updatedPage.metaDescription,
                    metaKeywords: updatedPage.metaKeywords
                  },
                  pageText: {
                    intro: updatedPage.intro,
                    body: updatedPage.body
                  },
                  photo: {
                    id: photo.id,
                    alt: photo.alt,
                    src: photo.src,
                    metaTitle: photo.metaTitle || '',
                    metaDescription: photo.metaDescription || '',
                    metaKeywords: photo.metaKeywords || ''
                  }
                }
              })
            })
          };

          await updatePhoto(updatedPhoto);
          photoMap.set(updatedPhoto.id, updatedPhoto);
          updatedPhotos += 1;
        }
      }
    }

    return Response.json({ updatedPages, updatedPhotos, model });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Batch optimization failed.' },
      { status: 500 }
    );
  }
}
