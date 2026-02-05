import type { WorkIndex } from '@/types';
import { readJson, writeJson } from './local-store';
import { useMockData, getItem, putItem } from './db';

const WORK_FILE = 'work.json';
const TABLE_NAME = 'pages'; // Store work index in pages table with slug 'work-index'
const WORK_SLUG = 'work-index';

const defaultWorkIndex: WorkIndex = {
  projectIds: []
};

export async function getWorkIndex(): Promise<WorkIndex> {
  if (useMockData()) {
    try {
      return await readJson<WorkIndex>(WORK_FILE);
    } catch {
      return defaultWorkIndex;
    }
  }

  // DynamoDB mode - return default if not found
  const workIndex = await getItem<WorkIndex & { slug: string }>(TABLE_NAME, { slug: WORK_SLUG });
  return workIndex || defaultWorkIndex;
}

export async function updateWorkIndex(projectIds: string[]): Promise<WorkIndex> {
  const workIndex: WorkIndex = { projectIds };

  if (useMockData()) {
    await writeJson(WORK_FILE, workIndex);
    return workIndex;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...workIndex, slug: WORK_SLUG });
  return workIndex;
}

export async function removeProjectFromWorkIndex(projectId: string): Promise<void> {
  const workIndex = await getWorkIndex();
  workIndex.projectIds = workIndex.projectIds.filter((id) => id !== projectId);
  await updateWorkIndex(workIndex.projectIds);
}

export async function addProjectToWorkIndex(projectId: string): Promise<void> {
  const workIndex = await getWorkIndex();
  if (!workIndex.projectIds.includes(projectId)) {
    workIndex.projectIds.push(projectId);
    await updateWorkIndex(workIndex.projectIds);
  }
}
