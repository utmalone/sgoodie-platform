import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { buildSeoPrompt, buildTextPrompt, SEO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createOpenAiResponse, analyzePhotoForSeo } from '@/lib/ai/openai';
import { getAllPages, updatePage } from '@/lib/data/pages';
import { getAllPhotos, updatePhoto } from '@/lib/data/photos';
import { getAllProjects, updateProject } from '@/lib/data/projects';
import { getAllJournalPosts, updateJournalPost } from '@/lib/data/journal';
import { revalidateAllPages } from '@/lib/admin/revalidate';
import type { PageContent, PhotoAsset, Project, JournalPost } from '@/types';

export const runtime = 'nodejs';

type BatchPayload = {
  mode: 'text' | 'seo';
  model?: string | null;
  includePages?: boolean;
  includePhotos?: boolean;
  includeProjects?: boolean;
  includeJournal?: boolean;
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
    const pages = payload.includePages !== false ? await getAllPages() : [];
    const photos = await getAllPhotos();
    const projects = payload.includeProjects ? await getAllProjects() : [];
    const journalPosts = payload.includeJournal ? await getAllJournalPosts() : [];
    const photoMap = new Map(photos.map((photo) => [photo.id, photo]));
    const shouldProcessPhotos = payload.includePhotos !== false;
    let updatedPages = 0;
    let updatedPhotos = 0;
    let updatedProjects = 0;
    let updatedJournalPosts = 0;

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
      }
    }

    // Process ALL photos using Vision AI (if photos included and SEO mode)
    if (shouldProcessPhotos && payload.mode === 'seo') {
      for (const photo of photos) {
        const photoSeo = await analyzePhotoForSeo({
          imageUrl: photo.src,
          model: 'gpt-4o'
        });

        const updatedPhoto: PhotoAsset = {
          ...photo,
          alt: photoSeo.alt,
          metaTitle: photoSeo.metaTitle,
          metaDescription: photoSeo.metaDescription,
          metaKeywords: photoSeo.metaKeywords
        };

        await updatePhoto(updatedPhoto);
        photoMap.set(updatedPhoto.id, updatedPhoto);
        updatedPhotos += 1;
      }
    }

    // Process projects if included
    for (const project of projects) {
      if (payload.mode === 'text') {
        const updates: Partial<Project> = {};

        if (project.intro) {
          updates.intro = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'intro',
              input: project.intro,
              context: { page: { slug: project.slug, title: project.title, intro: project.intro, body: project.body || '' } }
            })
          });
        }

        if (project.body) {
          updates.body = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'body',
              input: project.body,
              context: { page: { slug: project.slug, title: project.title, intro: project.intro || '', body: project.body } }
            })
          });
        }

        if (Object.keys(updates).length > 0) {
          await updateProject(project.id, updates);
          updatedProjects += 1;
        }
      }

      if (payload.mode === 'seo') {
        const projectContext = {
          page: {
            slug: project.slug,
            title: project.title,
            intro: project.intro || '',
            body: project.body || ''
          }
        };

        const updates: Partial<Project> = {
          metaTitle: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaTitle',
              input: project.metaTitle || '',
              context: projectContext
            })
          }),
          metaDescription: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaDescription',
              input: project.metaDescription || '',
              context: projectContext
            })
          }),
          metaKeywords: await createOpenAiResponse({
            model,
            systemPrompt: SEO_SYSTEM_PROMPT,
            userPrompt: buildSeoPrompt({
              field: 'metaKeywords',
              input: project.metaKeywords || '',
              context: projectContext
            })
          })
        };

        await updateProject(project.id, updates);
        updatedProjects += 1;
      }
    }

    // Process journal posts if included
    for (const post of journalPosts) {
      if (payload.mode === 'text') {
        const updates: Partial<JournalPost> = {};

        if (post.excerpt) {
          updates.excerpt = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'excerpt',
              input: post.excerpt,
              context: { page: { slug: post.slug, title: post.title, intro: post.excerpt, body: post.body } }
            })
          });
        }

        if (post.body) {
          updates.body = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'body',
              input: post.body,
              context: { page: { slug: post.slug, title: post.title, intro: post.excerpt, body: post.body } }
            })
          });
        }

        if (Object.keys(updates).length > 0) {
          await updateJournalPost(post.id, updates);
          updatedJournalPosts += 1;
        }
      }
    }

    // Revalidate all pages after batch update
    revalidateAllPages();

    return Response.json({ 
      updatedPages, 
      updatedPhotos, 
      updatedProjects,
      updatedJournalPosts,
      model 
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Batch optimization failed.' },
      { status: 500 }
    );
  }
}
