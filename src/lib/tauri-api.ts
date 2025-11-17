// Tauri API wrapper for type-safe command invocations
import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  AgentInfo,
} from '../types/tauri';

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  return await invoke<Project>('create_project', { input });
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  return await invoke<Project[]>('get_projects');
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<Project | null> {
  return await invoke<Project | null>('get_project', { id });
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  updates: UpdateProjectInput
): Promise<Project> {
  return await invoke<Project>('update_project', { id, updates });
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<boolean> {
  return await invoke<boolean>('delete_project', { id });
}

/**
 * Detect installed AI coding agents
 */
export async function detectAgents(): Promise<AgentInfo[]> {
  return await invoke<AgentInfo[]>('detect_agents');
}

/**
 * Open native folder picker and return selected path
 */
export async function selectFolder(): Promise<string | null> {
  return await invoke<string | null>('select_folder');
}
