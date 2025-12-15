/**
 * Chat API - Plugin-based chat system
 * Reads conversation history directly from CLI
 */

import { getBackend } from '../services/backend';

export interface ChatMessage {
  id: string;              // Unique message ID from plugin (stable)
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix timestamp in SECONDS
  metadata?: {
    // Common fields
    model?: string;
    // Tool message fields
    is_tool_message?: string;  // "true" or "false"
    is_pending?: string;
    is_error?: string;
    tool_name?: string;
    tool_input?: string;
    tool_result?: string;
  };
}

export interface SessionListItem {
  session_id: string;
  created_at: number;
  last_message_preview?: string;
  message_count: number;
}

export interface ChatSessionInfo {
  session_id: string;
  cli_session_id: string;
  plugin_name: string;
  project_id: string;
  created_at: number;
}

export interface PaginatedChatHistory {
  messages: ChatMessage[];
  total_count: number;
  has_more: boolean;
  offset: number;
}

/**
 * Get conversation history from the CLI for a specific session
 */
export async function getChatHistory(
  pluginName: string,
  cliSessionId: string
): Promise<ChatMessage[]> {
  console.log('[chat.ts] getChatHistory called with:', { pluginName, cliSessionId });
  const backend = getBackend();
  const result = await backend.chat.getHistory(pluginName, cliSessionId);
  console.log('[chat.ts] getChatHistory returned', result.length, 'messages:', result);
  return result as ChatMessage[];
}

/**
 * Get paginated conversation history (most recent first)
 */
export async function getChatHistoryPaginated(
  pluginName: string,
  cliSessionId: string,
  offset: number,
  limit: number
): Promise<PaginatedChatHistory> {
  console.log('[chat.ts] getChatHistoryPaginated called with:', {
    pluginName,
    cliSessionId,
    offset,
    limit,
  });
  const backend = getBackend();
  const result = await backend.chat.getHistoryPaginated(pluginName, cliSessionId, offset, limit);
  console.log('[chat.ts] getChatHistoryPaginated returned:', result);
  return result as PaginatedChatHistory;
}

/**
 * List available CLI sessions for a plugin
 */
export async function listCliSessions(
  pluginName: string,
  projectPath: string
): Promise<SessionListItem[]> {
  console.log('[chat.ts] listCliSessions called with:', { pluginName, projectPath });
  const backend = getBackend();
  const result = await backend.chat.listSessions(pluginName, projectPath);
  console.log('[chat.ts] listCliSessions returned', result.length, 'sessions:', result);
  return result as SessionListItem[];
}

/**
 * Start a new chat session using a plugin
 */
export async function startChatSession(
  projectId: string,
  pluginName: string
): Promise<ChatSessionInfo> {
  const backend = getBackend();
  return backend.chat.startSession(projectId, pluginName) as Promise<ChatSessionInfo>;
}

/**
 * Send a message in a chat session
 */
export async function sendChatMessage(
  sessionId: string,
  pluginName: string,
  cliSessionId: string,
  projectPath: string,
  message: string
): Promise<void> {
  const backend = getBackend();
  return backend.chat.sendMessage(sessionId, pluginName, cliSessionId, projectPath, message);
}
