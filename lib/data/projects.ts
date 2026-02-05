import { randomUUID } from 'crypto';
import { readJson, writeJson } from './local-store';
import type { Project, ProjectCategory } from '@/types';
import { useMockData, getAllItems, getItem, putItem, deleteItem } from './db';

const PROJECTS_FILE = 'projects.json';
const TABLE_NAME = 'projects';

export async function getAllProjects(): Promise<Project[]> {
  if (useMockData()) {
    return readJson<Project[]>(PROJECTS_FILE);
  }

  // DynamoDB mode - return empty array if no data
  return getAllItems<Project>(TABLE_NAME);
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
  if (useMockData()) {
    const projects = await getAllProjects();
    return projects.find((project) => project.id === id) || null;
  }

  // DynamoDB mode
  return getItem<Project>(TABLE_NAME, { id });
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

  if (useMockData()) {
    projects.push(project);
    await writeJson(PROJECTS_FILE, projects);
    return project;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, project);
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<Project> {
  const projects = await getAllProjects();
  const existing = projects.find((p) => p.id === id);

  if (!existing) {
    throw new Error(`Project with id "${id}" not found`);
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== existing.slug) {
    const existingSlug = projects.find((p) => p.slug === updates.slug);
    if (existingSlug) {
      throw new Error(`Project with slug "${updates.slug}" already exists`);
    }
  }

  const updated: Project = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (useMockData()) {
    const index = projects.findIndex((p) => p.id === id);
    projects[index] = updated;
    await writeJson(PROJECTS_FILE, projects);
    return updated;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function deleteProject(id: string): Promise<void> {
  if (useMockData()) {
    const projects = await getAllProjects();
    const filtered = projects.filter((p) => p.id !== id);

    if (filtered.length === projects.length) {
      throw new Error(`Project with id "${id}" not found`);
    }

    await writeJson(PROJECTS_FILE, filtered);
    return;
  }

  // DynamoDB mode
  await deleteItem(TABLE_NAME, { id });
}
