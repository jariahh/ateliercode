// File changes API for tracking and reviewing code changes
import { invoke } from '@tauri-apps/api/core';

/**
 * File change structure representing a tracked file modification
 */
export interface FileChange {
  id: string;
  project_id: string;
  session_id: string;
  file_path: string;
  change_type: 'created' | 'modified' | 'deleted';
  diff: string | null;
  reviewed: boolean;
  approved: boolean | null;
  timestamp: number; // Unix timestamp in seconds
}

/**
 * Start watching a project for file changes
 * @param projectId - The ID of the project to watch
 * @returns The session ID for this watch session
 */
export async function startWatchingProject(projectId: string): Promise<string> {
  try {
    return await invoke<string>('start_watching_project', { projectId });
  } catch (error) {
    console.error('Failed to start watching project:', error);
    throw error;
  }
}

/**
 * Stop watching a project
 * @param projectId - The ID of the project to stop watching
 * @returns Success status
 */
export async function stopWatchingProject(projectId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('stop_watching_project', { projectId });
  } catch (error) {
    console.error('Failed to stop watching project:', error);
    throw error;
  }
}

/**
 * Check if a project is being watched
 * @param projectId - The ID of the project to check
 * @returns True if the project is being watched
 */
export async function isWatchingProject(projectId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('is_watching_project', { projectId });
  } catch (error) {
    console.error('Failed to check watching status:', error);
    throw error;
  }
}

/**
 * Get pending file changes for a project
 * @param projectId - The ID of the project
 * @returns Array of pending FileChange objects
 */
export async function getPendingChanges(projectId: string): Promise<FileChange[]> {
  try {
    return await invoke<FileChange[]>('get_pending_changes', { projectId });
  } catch (error) {
    console.error('Failed to get pending changes:', error);
    throw error;
  }
}

/**
 * Get all file changes for a project (including reviewed ones)
 * @param projectId - The ID of the project
 * @param limit - Maximum number of changes to return (default: 100, max: 500)
 * @returns Array of FileChange objects
 */
export async function getAllChanges(
  projectId: string,
  limit?: number
): Promise<FileChange[]> {
  try {
    return await invoke<FileChange[]>('get_all_changes', { projectId, limit });
  } catch (error) {
    console.error('Failed to get all changes:', error);
    throw error;
  }
}

/**
 * Approve a file change
 * @param changeId - The ID of the change to approve
 * @returns The updated FileChange object
 */
export async function approveChange(changeId: string): Promise<FileChange> {
  try {
    return await invoke<FileChange>('approve_change', { changeId });
  } catch (error) {
    console.error('Failed to approve change:', error);
    throw error;
  }
}

/**
 * Reject a file change
 * @param changeId - The ID of the change to reject
 * @returns The updated FileChange object
 */
export async function rejectChange(changeId: string): Promise<FileChange> {
  try {
    return await invoke<FileChange>('reject_change', { changeId });
  } catch (error) {
    console.error('Failed to reject change:', error);
    throw error;
  }
}

/**
 * Get the diff content for a file change
 * @param changeId - The ID of the change
 * @returns The diff content as a string
 */
export async function getFileDiff(changeId: string): Promise<string> {
  try {
    return await invoke<string>('get_file_diff', { changeId });
  } catch (error) {
    console.error('Failed to get file diff:', error);
    throw error;
  }
}
