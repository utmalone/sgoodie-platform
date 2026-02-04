import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';
import { readJson } from './local-store';
import type { Project, ProjectCategory } from '@/types';

const useMock = process.env.USE_MOCK_DATA === 'true';
const tableName = process.env.DYNAMODB_TABLE_PROJECTS || '';
const PROJECTS_FILE = 'projects.json';

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
