import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { buildSeoPrompt, buildTextPrompt, SEO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createOpenAiResponse, analyzePhotoForSeo } from '@/lib/ai/openai';
import { getAllPages, updatePage } from '@/lib/data/pages';
import { getAllPhotos, updatePhoto } from '@/lib/data/photos';
import { getAllProjects, updateProject } from '@/lib/data/projects';
import { getAllJournalPosts, updateJournalPost } from '@/lib/data/journal';
import { getHomeLayout, updateHomeLayout } from '@/lib/data/home';
import { getAboutContent, updateAboutContent } from '@/lib/data/about';
import { getContactContent, updateContactContent } from '@/lib/data/contact';
import { revalidateAllPages } from '@/lib/admin/revalidate';
import type { AboutPageContent, ContactPageContent, HomeLayout, PageContent, PhotoAsset, Project, JournalPost } from '@/types';

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
        const shouldProcessPages = payload.includePages !== false;
        const shouldProcessPhotos = payload.includePhotos !== false;

        // Only fetch what's needed based on options
        const pages = shouldProcessPages ? await getAllPages() : [];
        const homeLayout =
          shouldProcessPages && payload.mode === 'text' ? await getHomeLayout() : null;
        const aboutContent =
          shouldProcessPages && payload.mode === 'text' ? await getAboutContent() : null;
        const contactContent =
          shouldProcessPages && payload.mode === 'text' ? await getContactContent() : null;
        const photos = await getAllPhotos(); // Always load for processing
        const projects = payload.includeProjects ? await getAllProjects() : [];
        const journalPosts = payload.includeJournal ? await getAllJournalPosts() : [];
        const photoMap = new Map(photos.map((photo) => [photo.id, photo]));

        const hasText = (value: unknown): value is string =>
          typeof value === 'string' && value.trim().length > 0;

        // Calculate total items for progress
        let totalItems = 0;
        
        for (const page of pages) {
          if (payload.mode === 'text') {
            let fields = 0;
            if (hasText(page.title)) fields++;
            if (hasText(page.intro)) fields++;
            totalItems += fields;
          } else {
            // SEO: 3 fields per page
            totalItems += 3; // metaTitle, metaDescription, metaKeywords
          }
        }

        if (payload.mode === 'text') {
          if (homeLayout && hasText(homeLayout.introText)) totalItems += 1;

          if (aboutContent) {
            if (hasText(aboutContent.heroTitle)) totalItems += 1;
            if (hasText(aboutContent.heroSubtitle)) totalItems += 1;
            for (const paragraph of aboutContent.introParagraphs || []) {
              if (hasText(paragraph)) totalItems += 1;
            }
            if (hasText(aboutContent.approachTitle)) totalItems += 1;
            for (const item of aboutContent.approachItems || []) {
              if (hasText(item.title)) totalItems += 1;
              if (hasText(item.description)) totalItems += 1;
            }
            if (hasText(aboutContent.featuredTitle)) totalItems += 1;
            if (hasText(aboutContent.bio?.name)) totalItems += 1;
            for (const paragraph of aboutContent.bio?.paragraphs || []) {
              if (hasText(paragraph)) totalItems += 1;
            }
          }

          if (contactContent) {
            if (hasText(contactContent.heroTitle)) totalItems += 1;
            if (hasText(contactContent.heroSubtitle)) totalItems += 1;
            if (hasText(contactContent.sectionTitle)) totalItems += 1;
            if (hasText(contactContent.introParagraph)) totalItems += 1;
            if (hasText(contactContent.companyName)) totalItems += 1;
          }
        }
        
        // Count ALL photos if photo processing is enabled (SEO mode only)
        if (shouldProcessPhotos && payload.mode === 'seo') {
          totalItems += photos.length; // 1 vision call per photo
        }

        for (const project of projects) {
          if (payload.mode === 'text') {
            let fields = 0;
            if (hasText(project.title)) fields++;
            if (hasText(project.subtitle)) fields++;
            if (hasText(project.hoverTitle)) fields++;
            if (hasText(project.intro)) fields++;
            if (hasText(project.body)) fields++;
            for (const caption of project.editorialCaptions || []) {
              if (hasText(caption.title)) fields++;
              if (hasText(caption.body)) fields++;
            }
            totalItems += fields;
          } else {
            totalItems += 3; // SEO fields
          }
        }

        for (const post of journalPosts) {
          if (payload.mode === 'text') {
            let fields = 0;
            if (hasText(post.title)) fields++;
            if (hasText(post.excerpt)) fields++;
            if (hasText(post.body)) fields++;
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

            if (hasText(page.title)) {
              updatedPage.title = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'title',
                  input: page.title,
                  context: { page }
                })
              });
              emitProgress('Pages', `${page.slug} -> title`);
            }

            if (hasText(page.intro)) {
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

        // Process structured layouts (Home/About/Contact) when in text mode
        if (payload.mode === 'text') {
          if (homeLayout && hasText(homeLayout.introText)) {
            const introText = await createOpenAiResponse({
              model,
              systemPrompt: TEXT_SYSTEM_PROMPT,
              userPrompt: buildTextPrompt({
                field: 'homeLayout.introText',
                input: homeLayout.introText,
                context: { homeLayout }
              })
            });
            emitProgress('Home', 'introText');
            await updateHomeLayout({ introText });
            updatedPages += 1;
          }

          if (aboutContent) {
            const updatedAbout: AboutPageContent = {
              ...aboutContent,
              introParagraphs: [...(aboutContent.introParagraphs || [])],
              approachItems: (aboutContent.approachItems || []).map((item) => ({ ...item })),
              featuredPublications: [...(aboutContent.featuredPublications || [])],
              bio: {
                ...aboutContent.bio,
                paragraphs: [...(aboutContent.bio?.paragraphs || [])]
              }
            };
            let didUpdate = false;

            if (hasText(aboutContent.heroTitle)) {
              updatedAbout.heroTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'about.heroTitle',
                  input: aboutContent.heroTitle,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', 'heroTitle');
              didUpdate = true;
            }

            if (hasText(aboutContent.heroSubtitle)) {
              updatedAbout.heroSubtitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'about.heroSubtitle',
                  input: aboutContent.heroSubtitle,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', 'heroSubtitle');
              didUpdate = true;
            }

            for (let index = 0; index < (aboutContent.introParagraphs || []).length; index++) {
              const paragraph = aboutContent.introParagraphs[index];
              if (!hasText(paragraph)) continue;
              updatedAbout.introParagraphs[index] = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: `about.introParagraphs[${index}]`,
                  input: paragraph,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', `introParagraphs[${index + 1}]`);
              didUpdate = true;
            }

            if (hasText(aboutContent.approachTitle)) {
              updatedAbout.approachTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'about.approachTitle',
                  input: aboutContent.approachTitle,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', 'approachTitle');
              didUpdate = true;
            }

            for (let index = 0; index < (aboutContent.approachItems || []).length; index++) {
              const item = aboutContent.approachItems[index];
              if (hasText(item.title)) {
                updatedAbout.approachItems[index].title = await createOpenAiResponse({
                  model,
                  systemPrompt: TEXT_SYSTEM_PROMPT,
                  userPrompt: buildTextPrompt({
                    field: `about.approachItems[${index}].title`,
                    input: item.title,
                    context: { about: aboutContent, approachItem: item }
                  })
                });
                emitProgress('About', `approachItems[${index + 1}] title`);
                didUpdate = true;
              }
              if (hasText(item.description)) {
                updatedAbout.approachItems[index].description = await createOpenAiResponse({
                  model,
                  systemPrompt: TEXT_SYSTEM_PROMPT,
                  userPrompt: buildTextPrompt({
                    field: `about.approachItems[${index}].description`,
                    input: item.description,
                    context: { about: aboutContent, approachItem: item }
                  })
                });
                emitProgress('About', `approachItems[${index + 1}] description`);
                didUpdate = true;
              }
            }

            if (hasText(aboutContent.featuredTitle)) {
              updatedAbout.featuredTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'about.featuredTitle',
                  input: aboutContent.featuredTitle,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', 'featuredTitle');
              didUpdate = true;
            }

            if (hasText(aboutContent.bio?.name)) {
              updatedAbout.bio.name = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'about.bio.name',
                  input: aboutContent.bio.name,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', 'bio.name');
              didUpdate = true;
            }

            for (let index = 0; index < (aboutContent.bio?.paragraphs || []).length; index++) {
              const paragraph = aboutContent.bio.paragraphs[index];
              if (!hasText(paragraph)) continue;
              updatedAbout.bio.paragraphs[index] = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: `about.bio.paragraphs[${index}]`,
                  input: paragraph,
                  context: { about: aboutContent }
                })
              });
              emitProgress('About', `bio.paragraphs[${index + 1}]`);
              didUpdate = true;
            }

            if (didUpdate) {
              await updateAboutContent(updatedAbout);
              updatedPages += 1;
            }
          }

          if (contactContent) {
            const updatedContact: ContactPageContent = { ...contactContent };
            let didUpdate = false;

            if (hasText(contactContent.heroTitle)) {
              updatedContact.heroTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'contact.heroTitle',
                  input: contactContent.heroTitle,
                  context: { contact: contactContent }
                })
              });
              emitProgress('Contact', 'heroTitle');
              didUpdate = true;
            }

            if (hasText(contactContent.heroSubtitle)) {
              updatedContact.heroSubtitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'contact.heroSubtitle',
                  input: contactContent.heroSubtitle,
                  context: { contact: contactContent }
                })
              });
              emitProgress('Contact', 'heroSubtitle');
              didUpdate = true;
            }

            if (hasText(contactContent.sectionTitle)) {
              updatedContact.sectionTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'contact.sectionTitle',
                  input: contactContent.sectionTitle,
                  context: { contact: contactContent }
                })
              });
              emitProgress('Contact', 'sectionTitle');
              didUpdate = true;
            }

            if (hasText(contactContent.introParagraph)) {
              updatedContact.introParagraph = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'contact.introParagraph',
                  input: contactContent.introParagraph,
                  context: { contact: contactContent }
                })
              });
              emitProgress('Contact', 'introParagraph');
              didUpdate = true;
            }

            if (hasText(contactContent.companyName)) {
              updatedContact.companyName = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'contact.companyName',
                  input: contactContent.companyName,
                  context: { contact: contactContent }
                })
              });
              emitProgress('Contact', 'companyName');
              didUpdate = true;
            }

            if (didUpdate) {
              await updateContactContent(updatedContact);
              updatedPages += 1;
            }
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

            if (hasText(project.title)) {
              updates.title = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'title',
                  input: project.title,
                  context: {
                    page: {
                      slug: project.slug,
                      title: project.title,
                      subtitle: project.subtitle || '',
                      intro: project.intro || '',
                      body: project.body || ''
                    }
                  }
                })
              });
              emitProgress('Projects', `${project.slug} -> title`);
            }

            if (hasText(project.subtitle)) {
              updates.subtitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'subtitle',
                  input: project.subtitle,
                  context: {
                    page: {
                      slug: project.slug,
                      title: project.title,
                      subtitle: project.subtitle || '',
                      intro: project.intro || '',
                      body: project.body || ''
                    }
                  }
                })
              });
              emitProgress('Projects', `${project.slug} -> subtitle`);
            }

            if (hasText(project.hoverTitle)) {
              updates.hoverTitle = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'hoverTitle',
                  input: project.hoverTitle,
                  context: {
                    page: {
                      slug: project.slug,
                      title: project.title,
                      subtitle: project.subtitle || '',
                      intro: project.intro || '',
                      body: project.body || ''
                    }
                  }
                })
              });
              emitProgress('Projects', `${project.slug} -> hoverTitle`);
            }

            if (hasText(project.intro)) {
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

            if (hasText(project.body)) {
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

            if ((project.editorialCaptions || []).length > 0) {
              const currentCaptions = project.editorialCaptions || [];
              const nextCaptions = currentCaptions.map((caption) => ({ ...caption }));
              let didUpdateCaptions = false;

              for (let index = 0; index < currentCaptions.length; index++) {
                const caption = currentCaptions[index];

                if (hasText(caption.title)) {
                  nextCaptions[index].title = await createOpenAiResponse({
                    model,
                    systemPrompt: TEXT_SYSTEM_PROMPT,
                    userPrompt: buildTextPrompt({
                      field: `editorialCaptions[${index}].title`,
                      input: caption.title,
                      context: {
                        page: { slug: project.slug, title: project.title },
                        captionSlot: index + 1
                      }
                    })
                  });
                  emitProgress('Projects', `${project.slug} -> caption ${index + 1} title`);
                  didUpdateCaptions = true;
                }

                if (hasText(caption.body)) {
                  nextCaptions[index].body = await createOpenAiResponse({
                    model,
                    systemPrompt: TEXT_SYSTEM_PROMPT,
                    userPrompt: buildTextPrompt({
                      field: `editorialCaptions[${index}].body`,
                      input: caption.body,
                      context: {
                        page: { slug: project.slug, title: project.title },
                        captionSlot: index + 1
                      }
                    })
                  });
                  emitProgress('Projects', `${project.slug} -> caption ${index + 1} body`);
                  didUpdateCaptions = true;
                }
              }

              if (didUpdateCaptions) {
                updates.editorialCaptions = nextCaptions;
              }
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

            if (hasText(post.title)) {
              updates.title = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: 'title',
                  input: post.title,
                  context: {
                    page: { slug: post.slug, title: post.title, intro: post.excerpt, body: post.body }
                  }
                })
              });
              emitProgress('Journal', `${post.slug} -> title`);
            }

            if (hasText(post.excerpt)) {
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

            if (hasText(post.body)) {
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
