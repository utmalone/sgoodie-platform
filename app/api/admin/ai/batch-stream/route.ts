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

type ProgressEvent = {
  type: 'progress';
  phase: string;
  item: string;
  completed: number;
  total: number;
  percent: number;
};

type CompleteEvent = {
  type: 'complete';
  updatedPages: number;
  updatedPhotos: number;
  updatedProjects: number;
  updatedJournalPosts: number;
};

type ErrorEvent = {
  type: 'error';
  message: string;
};

type StreamEvent = ProgressEvent | CompleteEvent | ErrorEvent;

function sendEvent(controller: ReadableStreamDefaultController, event: StreamEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Only fetch what's needed based on options
        const pages = payload.includePages !== false ? await getAllPages() : [];
        const photos = await getAllPhotos(); // Always load for processing
        const projects = payload.includeProjects ? await getAllProjects() : [];
        const journalPosts = payload.includeJournal ? await getAllJournalPosts() : [];
        const photoMap = new Map(photos.map((photo) => [photo.id, photo]));
        const shouldProcessPhotos = payload.includePhotos !== false;
        
        // Track which photos have been processed (to avoid duplicates from multiple pages)
        const processedPhotoIds = new Set<string>();

        // Calculate total items for progress
        let totalItems = 0;
        
        for (const page of pages) {
          if (payload.mode === 'text') {
            // Count fields: intro, body, ctaLabel
            let fields = 0;
            if (page.intro) fields++;
            if (page.body) fields++;
            if (page.ctaLabel) fields++;
            totalItems += fields;
          } else {
            // SEO: 3 fields per page
            totalItems += 3; // metaTitle, metaDescription, metaKeywords
          }
        }
        
        // Count ALL photos if photo processing is enabled (SEO mode only)
        if (shouldProcessPhotos && payload.mode === 'seo') {
          totalItems += photos.length; // 1 vision call per photo
        }

        for (const project of projects) {
          if (payload.mode === 'text') {
            let fields = 0;
            if (project.intro) fields++;
            if (project.body) fields++;
            totalItems += fields;
          } else {
            totalItems += 3; // SEO fields
          }
        }

        for (const post of journalPosts) {
          if (payload.mode === 'text') {
            let fields = 0;
            if (post.excerpt) fields++;
            if (post.body) fields++;
            totalItems += fields;
          }
        }

        let completedItems = 0;
        let updatedPages = 0;
        let updatedPhotos = 0;
        let updatedProjects = 0;
        let updatedJournalPosts = 0;

        function emitProgress(phase: string, item: string) {
          completedItems++;
          const percent = Math.round((completedItems / totalItems) * 100);
          sendEvent(controller, {
            type: 'progress',
            phase,
            item,
            completed: completedItems,
            total: totalItems,
            percent
          });
        }

        // Process pages
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
              emitProgress('Pages', `${page.slug} → intro`);
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
              emitProgress('Pages', `${page.slug} → body`);
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
              emitProgress('Pages', `${page.slug} → ctaLabel`);
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

            const metaTitle = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaTitle',
                input: page.metaTitle || '',
                context: pageContext
              })
            });
            emitProgress('Pages', `${page.slug} → metaTitle`);

            const metaDescription = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaDescription',
                input: page.metaDescription || '',
                context: pageContext
              })
            });
            emitProgress('Pages', `${page.slug} → metaDescription`);

            const metaKeywords = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaKeywords',
                input: page.metaKeywords || '',
                context: pageContext
              })
            });
            emitProgress('Pages', `${page.slug} → metaKeywords`);

            const updatedPage: PageContent = {
              ...page,
              metaTitle,
              metaDescription,
              metaKeywords
            };

            await updatePage(updatedPage);
            updatedPages += 1;
          }
        }

        // Process ALL photos using Vision AI (if photos included and SEO mode)
        if (shouldProcessPhotos && payload.mode === 'seo') {
          for (const photo of photos) {
            // Use GPT-4 Vision to analyze the actual image and generate SEO metadata
            const photoSeo = await analyzePhotoForSeo({
              imageUrl: photo.src,
              model: 'gpt-4o' // Vision-capable model
            });
            
            emitProgress('Photos', `${photo.id.slice(0, 8)}... → analyzed`);

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

        // Process projects
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
              emitProgress('Projects', `${project.slug} → intro`);
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
              emitProgress('Projects', `${project.slug} → body`);
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

            const metaTitle = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaTitle',
                input: project.metaTitle || '',
                context: projectContext
              })
            });
            emitProgress('Projects', `${project.slug} → metaTitle`);

            const metaDescription = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaDescription',
                input: project.metaDescription || '',
                context: projectContext
              })
            });
            emitProgress('Projects', `${project.slug} → metaDescription`);

            const metaKeywords = await createOpenAiResponse({
              model,
              systemPrompt: SEO_SYSTEM_PROMPT,
              userPrompt: buildSeoPrompt({
                field: 'metaKeywords',
                input: project.metaKeywords || '',
                context: projectContext
              })
            });
            emitProgress('Projects', `${project.slug} → metaKeywords`);

            await updateProject(project.id, {
              metaTitle,
              metaDescription,
              metaKeywords
            });
            updatedProjects += 1;
          }
        }

        // Process journal posts
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
              emitProgress('Journal', `${post.slug} → excerpt`);
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
              emitProgress('Journal', `${post.slug} → body`);
            }

            if (Object.keys(updates).length > 0) {
              await updateJournalPost(post.id, updates);
              updatedJournalPosts += 1;
            }
          }
        }

        // Revalidate all pages after batch update
        revalidateAllPages();

        // Send completion event
        sendEvent(controller, {
          type: 'complete',
          updatedPages,
          updatedPhotos,
          updatedProjects,
          updatedJournalPosts
        });

        controller.close();
      } catch (error) {
        sendEvent(controller, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Batch optimization failed.'
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
