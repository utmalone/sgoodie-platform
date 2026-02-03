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

async function ensureDataFile<T>(fileName: string, fallbackData: T) {
  await fs.mkdir(dataDir, { recursive: true });
  const targetPath = path.join(dataDir, fileName);

  if (await fileExists(targetPath)) {
    return targetPath;
  }

  const seedPath = path.join(seedDir, fileName);
  if (await fileExists(seedPath)) {
    await fs.copyFile(seedPath, targetPath);
    return targetPath;
  }

  await fs.writeFile(targetPath, JSON.stringify(fallbackData, null, 2), 'utf8');
  return targetPath;
}

export async function readJson<T>(fileName: string, fallbackData: T): Promise<T> {
  const filePath = await ensureDataFile(fileName, fallbackData);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

export async function writeJson<T>(fileName: string, data: T) {
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
