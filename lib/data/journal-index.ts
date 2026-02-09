import { unstable_cache } from 'next/cache';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { isMockMode, getItem, putItem } from './db';

const JOURNAL_INDEX_FILE = 'journal-index.json';
const TABLE_NAME = 'pages';
const JOURNAL_INDEX_SLUG = 'journal-index';

export type JournalIndex = {
  postIds: string[];
};

const defaultJournalIndex: JournalIndex = {
  postIds: []
};

async function loadJournalIndex(): Promise<JournalIndex> {
  if (isMockMode()) {
    try {
      return await readJson<JournalIndex>(JOURNAL_INDEX_FILE);
    } catch {
      return defaultJournalIndex;
    }
  }

  const index = await getItem<JournalIndex & { slug: string }>(TABLE_NAME, { slug: JOURNAL_INDEX_SLUG });
  return index || defaultJournalIndex;
}

const getJournalIndexCached = unstable_cache(
  async (): Promise<JournalIndex> => loadJournalIndex(),
  ['journal-index'],
  { tags: [CacheTags.journal], revalidate: false }
);

export async function getJournalIndex(): Promise<JournalIndex> {
  return getJournalIndexCached();
}

export async function updateJournalIndex(postIds: string[]): Promise<JournalIndex> {
  const index: JournalIndex = { postIds };

  if (isMockMode()) {
    await writeJson(JOURNAL_INDEX_FILE, index);
    return index;
  }

  await putItem(TABLE_NAME, { ...index, slug: JOURNAL_INDEX_SLUG });
  return index;
}
