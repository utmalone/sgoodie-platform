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
    const shouldProcessPages = payload.includePages !== false;
    const shouldProcessPhotos = payload.includePhotos !== false;

    const pages = shouldProcessPages ? await getAllPages() : [];
    const homeLayout =
      shouldProcessPages && payload.mode === 'text' ? await getHomeLayout() : null;
    const aboutContent =
      shouldProcessPages && payload.mode === 'text' ? await getAboutContent() : null;
    const contactContent =
      shouldProcessPages && payload.mode === 'text' ? await getContactContent() : null;
    const photos = await getAllPhotos();
    const projects = payload.includeProjects ? await getAllProjects() : [];
    const journalPosts = payload.includeJournal ? await getAllJournalPosts() : [];
    const photoMap = new Map(photos.map((photo) => [photo.id, photo]));

    const hasText = (value: unknown): value is string =>
      typeof value === 'string' && value.trim().length > 0;
    let updatedPages = 0;
    let updatedPhotos = 0;
    let updatedProjects = 0;
    let updatedJournalPosts = 0;

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
                  context: { page: { slug: project.slug, title: project.title }, captionSlot: index + 1 }
                })
              });
              didUpdateCaptions = true;
            }

            if (hasText(caption.body)) {
              nextCaptions[index].body = await createOpenAiResponse({
                model,
                systemPrompt: TEXT_SYSTEM_PROMPT,
                userPrompt: buildTextPrompt({
                  field: `editorialCaptions[${index}].body`,
                  input: caption.body,
                  context: { page: { slug: project.slug, title: project.title }, captionSlot: index + 1 }
                })
              });
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

        if (hasText(post.title)) {
          updates.title = await createOpenAiResponse({
            model,
            systemPrompt: TEXT_SYSTEM_PROMPT,
            userPrompt: buildTextPrompt({
              field: 'title',
              input: post.title,
              context: { page: { slug: post.slug, title: post.title, intro: post.excerpt, body: post.body } }
            })
          });
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
