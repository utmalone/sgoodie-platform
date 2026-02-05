import type { WorkIndex } from '@/types';
import { readJson, writeJson } from './local-store';

const WORK_FILE = 'work.json';

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Work index management is only implemented for local mock data. Set USE_MOCK_DATA=true.'
  );
}

export async function getWorkIndex(): Promise<WorkIndex> {
  return readJson<WorkIndex>(WORK_FILE);
}

export async function updateWorkIndex(projectIds: string[]): Promise<WorkIndex> {
  assertMockMode();
  const workIndex: WorkIndex = { projectIds };
  await writeJson(WORK_FILE, workIndex);
  return workIndex;
}

export async function removeProjectFromWorkIndex(projectId: string): Promise<void> {
  assertMockMode();
  const workIndex = await getWorkIndex();
  workIndex.projectIds = workIndex.projectIds.filter((id) => id !== projectId);
  await writeJson(WORK_FILE, workIndex);
}

export async function addProjectToWorkIndex(projectId: string): Promise<void> {
  assertMockMode();
  const workIndex = await getWorkIndex();
  if (!workIndex.projectIds.includes(projectId)) {
    workIndex.projectIds.push(projectId);
    await writeJson(WORK_FILE, workIndex);
  }
}
