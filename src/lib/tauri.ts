/**
 * Tauri API Wrapper
 * Type-safe wrapper functions for all Tauri backend commands
 */

import { invoke } from '@tauri-apps/api/core';
import type { Project, CreateProjectInput, AgentType } from '../types/project';

/**
 * Agent information from backend
 */
export interface AgentInfo {
  name: string;
  installed: boolean;
  version: string | null;
  command: string;
}

/**
 * Backend project structure (matches Rust models)
 */
interface BackendProject {
  id: string;
  name: string;
  root_path: string;
  agent_type: string;
  status: string;
  prd_content: string | null;
  created_at: number;
  last_activity: number;
  settings: string | null;
}

/**
 * Input for creating a project (matches Rust CreateProjectInput)
 */
interface BackendCreateProjectInput {
  name: string;
  root_path: string;
  agent_type: string;
  description: string | null;
  initialize_git: boolean;
}

/**
 * Input for updating a project (matches Rust UpdateProjectInput)
 */
interface BackendUpdateProjectInput {
  name?: string;
  root_path?: string;
  agent_type?: string;
  status?: string;
  prd_content?: string;
  settings?: string;
}

/**
 * Convert backend timestamp to ISO string
 */
function timestampToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Convert backend project to frontend project
 */
function backendToFrontendProject(backend: BackendProject): Project {
  return {
    id: backend.id,
    name: backend.name,
    path: backend.root_path,
    description: backend.prd_content || undefined,
    agent: {
      type: backend.agent_type as AgentType,
      installed: true, // Will be updated by detect_agents
      enabled: true,
    },
    status: backend.status as 'active' | 'archived' | 'paused',
    createdAt: timestampToISO(backend.created_at),
    updatedAt: timestampToISO(backend.last_activity),
    lastOpenedAt: timestampToISO(backend.last_activity),
    tags: [],
  };
}

/**
 * Check if Tauri is available (not in browser dev mode)
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  const backendInput: BackendCreateProjectInput = {
    name: input.name,
    root_path: input.path,
    agent_type: input.agentType,
    description: input.description || null,
    initialize_git: input.initGit || false,
  };

  try {
    const result = await invoke<BackendProject>('create_project', { input: backendInput });
    return backendToFrontendProject(result);
  } catch (error) {
    console.error('Failed to create project:', error);
    throw new Error(error as string || 'Failed to create project');
  }
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  try {
    const results = await invoke<BackendProject[]>('get_projects');
    return results.map(backendToFrontendProject);
  } catch (error) {
    console.error('Failed to get projects:', error);
    throw new Error(error as string || 'Failed to get projects');
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  try {
    const result = await invoke<BackendProject | null>('get_project', { id: projectId });
    return result ? backendToFrontendProject(result) : null;
  } catch (error) {
    console.error('Failed to get project:', error);
    throw new Error(error as string || 'Failed to get project');
  }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  const backendUpdates: BackendUpdateProjectInput = {};

  if (updates.name !== undefined) backendUpdates.name = updates.name;
  if (updates.path !== undefined) backendUpdates.root_path = updates.path;
  if (updates.agent?.type !== undefined) backendUpdates.agent_type = updates.agent.type;
  if (updates.status !== undefined) backendUpdates.status = updates.status;
  if (updates.description !== undefined) backendUpdates.prd_content = updates.description;

  try {
    const result = await invoke<BackendProject>('update_project', {
      id: projectId,
      updates: backendUpdates,
    });
    return backendToFrontendProject(result);
  } catch (error) {
    console.error('Failed to update project:', error);
    throw new Error(error as string || 'Failed to update project');
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  try {
    const result = await invoke<boolean>('delete_project', { id: projectId });
    return result;
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw new Error(error as string || 'Failed to delete project');
  }
}

/**
 * Detect installed AI agents
 */
export async function detectAgents(): Promise<AgentInfo[]> {
  if (!isTauriAvailable()) {
    // Return mock data in browser dev mode
    console.warn('Tauri not available. Returning mock agent data.');
    return [
      { name: 'claude-code', installed: true, version: '1.0.0', command: 'claude' },
      { name: 'aider', installed: false, version: null, command: 'aider' },
      { name: 'cursor', installed: false, version: null, command: 'cursor' },
    ];
  }

  try {
    const result = await invoke<AgentInfo[]>('detect_agents');
    return result;
  } catch (error) {
    console.error('Failed to detect agents:', error);
    throw new Error(error as string || 'Failed to detect agents');
  }
}

/**
 * Open native folder picker and return selected path
 */
export async function selectFolder(): Promise<string | null> {
  if (!isTauriAvailable()) {
    throw new Error('Tauri is not available. Run in Tauri app mode.');
  }

  try {
    const result = await invoke<string | null>('select_folder');
    return result;
  } catch (error) {
    console.error('Failed to open folder picker:', error);
    throw new Error(error as string || 'Failed to open folder picker');
  }
}

/**
 * Error types
 */
export class TauriError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'TauriError';
  }
}

/**
 * Type guard for Tauri errors
 */
export function isTauriError(error: unknown): error is TauriError {
  return error instanceof TauriError;
}
