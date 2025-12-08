/**
 * Chat API - Plugin-based chat system
 * Reads conversation history directly from CLI
 */

import { invoke } from '@tauri-apps/api/core';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  metadata?: Record<string, string>;
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
  const result = await invoke<ChatMessage[]>('get_chat_history', {
    pluginName,
    cliSessionId,
  });
  console.log('[chat.ts] getChatHistory returned', result.length, 'messages:', result);
  return result;
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
  const result = await invoke<PaginatedChatHistory>('get_chat_history_paginated', {
    pluginName,
    cliSessionId,
    offset,
    limit,
  });
  console.log('[chat.ts] getChatHistoryPaginated returned:', result);
  return result;
}

/**
 * List available CLI sessions for a plugin
 */
export async function listCliSessions(
  pluginName: string,
  projectPath: string
): Promise<SessionListItem[]> {
  console.log('[chat.ts] listCliSessions called with:', { pluginName, projectPath });
  const result = await invoke<SessionListItem[]>('list_cli_sessions', {
    pluginName,
    projectPath,
  });
  console.log('[chat.ts] listCliSessions returned', result.length, 'sessions:', result);
  return result;
}

/**
 * Start a new chat session using a plugin
 */
export async function startChatSession(
  projectId: string,
  pluginName: string
): Promise<ChatSessionInfo> {
  return invoke<ChatSessionInfo>('start_chat_session', {
    projectId,
    pluginName,
  });
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
  return invoke('send_chat_message', {
    sessionId,
    pluginName,
    cliSessionId,
    projectPath,
    message,
  });
}
