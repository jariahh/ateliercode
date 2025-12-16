// Stats API wrapper for type-safe command invocations
import { invoke } from '@tauri-apps/api/core';
import { peerConnection } from '../services/peerConnection';
import type { ProjectStats } from '../types/tauri';

/**
 * Get project statistics
 */
export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  // Only use WebRTC when this machine is the CLIENT (web app connecting to desktop)
  if (peerConnection.isClient) {
    return peerConnection.sendCommand<ProjectStats>('get_project_stats', { projectId });
  }
  return await invoke<ProjectStats>('get_project_stats', { projectId });
}
