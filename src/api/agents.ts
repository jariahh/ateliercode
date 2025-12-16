/**
 * Agents API - detect and manage available AI agents
 */

import { invoke } from '@tauri-apps/api/core';
import { peerConnection } from '../services/peerConnection';

export interface DetectedAgent {
  name: string;
  available: boolean;
  version?: string;
  command?: string;
  displayName?: string;
  description?: string;
  /** Display icon (emoji like "🟣" or icon name) */
  icon?: string;
  /** Primary color name for theming (e.g., "purple", "blue", "green") */
  color?: string;
}

// Response type from Rust backend
interface AgentInfoResponse {
  name: string;
  installed: boolean;
  version: string | null;
  command: string;
  display_name: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
}

/**
 * Detect available AI agents on the system
 */
export async function detectAgents(): Promise<DetectedAgent[]> {
  let agents: AgentInfoResponse[];

  // Only use WebRTC when this machine is the CLIENT (web app connecting to desktop)
  if (peerConnection.isClient) {
    agents = await peerConnection.sendCommand<AgentInfoResponse[]>('detect_agents', {});
  } else {
    agents = await invoke<AgentInfoResponse[]>('detect_agents');
  }

  // Transform snake_case from Rust to camelCase for TypeScript
  return agents.map(agent => ({
    name: agent.name,
    available: agent.installed,
    version: agent.version ?? undefined,
    command: agent.command,
    displayName: agent.display_name ?? undefined,
    description: agent.description ?? undefined,
    icon: agent.icon ?? undefined,
    color: agent.color ?? undefined,
  }));
}
