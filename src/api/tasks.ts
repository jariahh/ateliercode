// Task API wrapper for type-safe command invocations
import { invoke } from '@tauri-apps/api/core';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from '../types/tauri';

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  return await invoke<Task>('create_task', { input });
}

/**
 * Get all tasks for a project
 */
export async function getTasks(projectId: string): Promise<Task[]> {
  return await invoke<Task[]>('get_tasks', { project_id: projectId });
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskInput
): Promise<Task> {
  return await invoke<Task>('update_task', { task_id: taskId, updates });
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  return await invoke<boolean>('delete_task', { task_id: taskId });
}

/**
 * Quick update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<Task> {
  return await invoke<Task>('update_task_status', { task_id: taskId, status });
}
