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

// Import plugin flag types
import type { PluginFlag } from './pluginSettings';

// Response from list_plugins includes flags
interface PluginInfoResponse {
  name: string;
  display_name: string;
  version: string;
  description: string;
  capabilities: string[];
  icon: string | null;
  color: string | null;
  flags: PluginFlag[];
}

/**
 * Get all plugins with their available flags
 */
export async function getPlugins(): Promise<PluginInfoResponse[]> {
  if (peerConnection.isClient) {
    return await peerConnection.sendCommand<PluginInfoResponse[]>('list_plugins', {});
  }
  return await invoke<PluginInfoResponse[]>('list_plugins');
}

/**
 * Get flags for a specific plugin
 */
export async function getPluginFlags(pluginName: string): Promise<PluginFlag[]> {
  const plugins = await getPlugins();
  const plugin = plugins.find(p => p.name === pluginName);
  return plugin?.flags ?? [];
}
