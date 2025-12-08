// Activity API wrapper for type-safe command invocations
import { invoke } from '@tauri-apps/api/core';
import type { ActivityLog } from '../types/tauri';

/**
 * Log an activity event for a project
 */
export async function logActivity(
  projectId: string,
  eventType: string,
  description: string,
  data?: string
): Promise<ActivityLog> {
  return await invoke<ActivityLog>('log_activity', {
    projectId,
    eventType,
    description,
    data,
  });
}

/**
 * Get recent activities for a project
 * @param projectId - The project ID
 * @param limit - Maximum number of activities to fetch (default: 50, max: 100)
 */
export async function getActivities(
  projectId: string,
  limit?: number
): Promise<ActivityLog[]> {
  return await invoke<ActivityLog[]>('get_activities', {
    projectId,
    limit,
  });
}
