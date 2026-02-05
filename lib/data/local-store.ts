import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data', 'local');
const seedDir = path.join(process.cwd(), 'data', 'seed');

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getDataFilePath(fileName: string): Promise<string | null> {
  // First check if file exists in local data directory
  const localPath = path.join(dataDir, fileName);
  if (await fileExists(localPath)) {
    return localPath;
  }

  // Fall back to seed directory
  const seedPath = path.join(seedDir, fileName);
  if (await fileExists(seedPath)) {
    return seedPath;
  }

  return null;
}

export async function readJson<T>(fileName: string): Promise<T> {
  const filePath = await getDataFilePath(fileName);
  
  if (!filePath) {
    throw new Error(`Data file not found: ${fileName}. Add it to data/seed or data/local.`);
  }

  const raw = await fs.readFile(filePath, 'utf8');
  
  if (!raw || raw.trim() === '') {
    throw new Error(`Data file is empty: ${fileName}`);
  }

  return JSON.parse(raw) as T;
}

export async function writeJson<T>(fileName: string, data: T) {
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
