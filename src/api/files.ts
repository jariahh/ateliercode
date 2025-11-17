// File operations API for interacting with the file system via Tauri
import { invoke } from '@tauri-apps/api/core';

/**
 * File node structure representing a file or directory
 */
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: number; // Unix timestamp in seconds
  children?: FileNode[];
}

/**
 * Read project files and return file tree structure
 * @param projectId - The ID of the project to read files from
 * @returns Array of FileNode objects representing the project's file structure
 */
export async function readProjectFiles(projectId: string): Promise<FileNode[]> {
  try {
    return await invoke<FileNode[]>('read_project_files', { projectId });
  } catch (error) {
    console.error('Failed to read project files:', error);
    throw error;
  }
}

/**
 * Read and return file content
 * @param projectId - The ID of the project the file belongs to
 * @param filePath - The absolute path to the file
 * @returns The content of the file as a string
 */
export async function readFileContent(
  projectId: string,
  filePath: string
): Promise<string> {
  try {
    return await invoke<string>('read_file_content', { projectId, filePath });
  } catch (error) {
    console.error('Failed to read file content:', error);
    throw error;
  }
}
