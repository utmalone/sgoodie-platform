import { GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';
import { mockProjects } from '@/lib/data/mock';
import type { Project, ProjectCategory } from '@/types';

const useMock = process.env.USE_MOCK_DATA === 'true';
const tableName = process.env.DYNAMODB_TABLE_PROJECTS || '';

function mapProject(item: Record<string, unknown>): Project {
  return item as Project;
}

export async function getAllProjects(): Promise<Project[]> {
  if (useMock || !tableName) {
    return mockProjects;
  }

  const result = await db.send(new ScanCommand({ TableName: tableName }));
  return (result.Items || []).map(mapProject);
}

export async function getProjectsByCategory(category: ProjectCategory): Promise<Project[]> {
  if (useMock || !tableName) {
    return mockProjects.filter((project) => project.category === category);
  }

  const result = await db.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'gsi_category_order',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: { ':category': category }
    })
  );

  return (result.Items || []).map(mapProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (useMock || !tableName) {
    return mockProjects.find((project) => project.id === id) || null;
  }

  const result = await db.send(
    new GetCommand({
      TableName: tableName,
      Key: { project_id: id }
    })
  );

  return result.Item ? mapProject(result.Item) : null;
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const projects = await getAllProjects();
  return projects.filter((project) => project.featured);
}
