import { randomUUID } from 'crypto';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';
import { readJson, writeJson } from './local-store';
import type { Project, ProjectCategory } from '@/types';

const useMock = process.env.USE_MOCK_DATA === 'true';
const tableName = process.env.DYNAMODB_TABLE_PROJECTS || '';
const PROJECTS_FILE = 'projects.json';

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Project management is only implemented for local mock data. Set USE_MOCK_DATA=true.'
  );
}

function mapProject(item: Record<string, unknown>): Project {
  return item as Project;
}

export async function getAllProjects(): Promise<Project[]> {
  if (useMock || !tableName) {
    return readJson<Project[]>(PROJECTS_FILE);
  }

  const result = await db.send(new ScanCommand({ TableName: tableName }));
  return (result.Items || []).map(mapProject);
}

export async function getProjectsByCategory(category: ProjectCategory): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((project) => project.category === category);
}

export async function getPublishedProjectsByCategory(category: ProjectCategory): Promise<Project[]> {
  const projects = await getPublishedProjects();
  return projects.filter((project) => project.category === category);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getAllProjects();
  return projects.find((project) => project.id === id) || null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await getAllProjects();
  return projects.find((project) => project.slug === slug) || null;
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((project) => project.featured);
}

export async function getPublishedProjects(): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((project) => project.status !== 'draft');
}

export async function createProject(
  input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
  assertMockMode();
  const projects = await getAllProjects();

  // Ensure unique slug
  const existingSlug = projects.find((p) => p.slug === input.slug);
  if (existingSlug) {
    throw new Error(`Project with slug "${input.slug}" already exists`);
  }

  const project: Project = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.push(project);
  await writeJson(PROJECTS_FILE, projects);
  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<Project> {
  assertMockMode();
  const projects = await getAllProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index < 0) {
    throw new Error(`Project with id "${id}" not found`);
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== projects[index].slug) {
    const existingSlug = projects.find((p) => p.slug === updates.slug);
    if (existingSlug) {
      throw new Error(`Project with slug "${updates.slug}" already exists`);
    }
  }

  const updated: Project = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  projects[index] = updated;
  await writeJson(PROJECTS_FILE, projects);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  assertMockMode();
  const projects = await getAllProjects();
  const filtered = projects.filter((p) => p.id !== id);

  if (filtered.length === projects.length) {
    throw new Error(`Project with id "${id}" not found`);
  }

  await writeJson(PROJECTS_FILE, filtered);
}
