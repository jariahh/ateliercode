// Agent Session API functions for managing persistent AI agent sessions
import { invoke } from '@tauri-apps/api/core';

/**
 * Agent session status
 */
export type AgentStatus = 'starting' | 'running' | 'paused' | 'stopped' | 'error';

/**
 * Agent session information
 */
export interface AgentSession {
  session_id: string;
  project_id: string;
  agent_type: string;
  status: AgentStatus;
  pid: number | null;
  started_at: number;
  last_activity: number;
  claude_session_id?: string | null;
}

/**
 * Start a new persistent agent session
 * @param projectId - The ID of the project
 * @param agentType - The type of agent to start (e.g., 'Claude Code', 'Aider')
 * @param resumeSessionId - Optional Claude session ID to resume
 * @returns Promise with the created agent session
 */
export async function startAgentSession(
  projectId: string,
  agentType: string,
  resumeSessionId?: string
): Promise<AgentSession> {
  return await invoke<AgentSession>('start_agent_session', {
    projectId,
    agentType,
    resumeSessionId: resumeSessionId || null,
  });
}

/**
 * Send a message to an active agent session
 * @param sessionId - The ID of the agent session
 * @param message - The message to send
 * @returns Promise that resolves when message is sent
 */
export async function sendToAgent(
  sessionId: string,
  message: string
): Promise<void> {
  return await invoke<void>('send_to_agent', {
    sessionId,
    message,
  });
}

/**
 * Read output from an agent session
 * @param sessionId - The ID of the agent session
 * @param timeoutMs - Optional timeout in milliseconds
 * @returns Promise with array of output lines
 */
export async function readAgentOutput(
  sessionId: string,
  timeoutMs?: number
): Promise<string[]> {
  return await invoke<string[]>('read_agent_output', {
    sessionId,
    timeoutMs,
  });
}

/**
 * Stop an active agent session
 * @param sessionId - The ID of the agent session
 * @returns Promise that resolves when session is stopped
 */
export async function stopAgentSession(sessionId: string): Promise<void> {
  return await invoke<void>('stop_agent_session', {
    sessionId,
  });
}

/**
 * Get the status of an agent session
 * @param sessionId - The ID of the agent session
 * @returns Promise with the agent session information
 */
export async function getAgentStatus(sessionId: string): Promise<AgentSession> {
  return await invoke<AgentSession>('get_agent_status', {
    sessionId,
  });
}

/**
 * List all active agent sessions
 * @returns Promise with array of all active agent sessions
 */
export async function listAgentSessions(): Promise<AgentSession[]> {
  return await invoke<AgentSession[]>('list_agent_sessions');
}

/**
 * Check if an agent session is healthy
 * @param sessionId - The ID of the agent session
 * @returns Promise with boolean indicating if session is healthy
 */
export async function checkAgentHealth(sessionId: string): Promise<boolean> {
  return await invoke<boolean>('check_agent_health', {
    sessionId,
  });
}

/**
 * Sync the claude_session_id from runtime session to database
 * @param sessionId - The ID of the agent session
 * @returns Promise with the claude_session_id if it was synced, or null
 */
export async function syncClaudeSessionId(sessionId: string): Promise<string | null> {
  return await invoke<string | null>('sync_claude_session_id', {
    sessionId,
  });
}

/**
 * Database agent session (historical record)
 */
export interface DbAgentSession {
  id: string;
  project_id: string;
  task_id: string | null;
  agent_type: string;
  started_at: number;
  ended_at: number | null;
  status: string;
  exit_code: number | null;
  claude_session_id?: string | null;
}

/**
 * Get agent session history for a project from database
 * @param projectId - The ID of the project
 * @returns Promise with array of historical agent sessions
 */
export async function getProjectSessions(projectId: string): Promise<DbAgentSession[]> {
  return await invoke<DbAgentSession[]>('get_project_sessions', {
    projectId,
  });
}
