import type { WorkIndex } from '@/types';
import { readJson } from './local-store';

const WORK_FILE = 'work.json';

export async function getWorkIndex(): Promise<WorkIndex> {
  return readJson<WorkIndex>(WORK_FILE);
}
