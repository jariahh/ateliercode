// Chat API functions for communicating with Tauri backend
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage } from '../types/tauri';

/**
 * Send a chat message and get AI response
 * @param projectId - The ID of the project
 * @param content - The message content
 * @param sessionId - Optional session ID to associate the message with
 * @returns Promise with the AI response message
 */
export async function sendMessage(
  projectId: string,
  content: string,
  sessionId?: string
): Promise<ChatMessage> {
  return await invoke<ChatMessage>('send_message', {
    projectId,
    content,
    sessionId
  });
}

/**
 * Get all chat messages for a project
 * @param projectId - The ID of the project
 * @returns Promise with array of chat messages
 */
export async function getMessages(projectId: string): Promise<ChatMessage[]> {
  return await invoke<ChatMessage[]>('get_messages', { projectId });
}

/**
 * Get chat messages for a specific session
 * @param sessionId - The ID of the session
 * @returns Promise with array of chat messages
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return await invoke<ChatMessage[]>('get_session_messages', { sessionId });
}

/**
 * Get project messages, optionally filtered by session
 * @param projectId - The ID of the project
 * @param sessionId - Optional session ID to filter messages
 * @returns Promise with array of chat messages
 */
export async function getProjectMessages(
  projectId: string,
  sessionId?: string
): Promise<ChatMessage[]> {
  return await invoke<ChatMessage[]>('get_project_messages', {
    projectId,
    sessionId
  });
}

/**
 * Count messages for a session
 * @param sessionId - The ID of the session
 * @returns Promise with message count
 */
export async function countSessionMessages(sessionId: string): Promise<number> {
  return await invoke<number>('count_session_messages', { sessionId });
}

/**
 * Save a message with session context
 * @param projectId - The ID of the project
 * @param sessionId - Optional session ID
 * @param role - Message role ('user' or 'assistant')
 * @param content - Message content
 * @param metadata - Optional metadata JSON string
 * @returns Promise with the saved message
 */
export async function saveMessage(
  projectId: string,
  sessionId: string | null,
  role: string,
  content: string,
  metadata?: string
): Promise<ChatMessage> {
  return await invoke<ChatMessage>('save_message', {
    projectId,
    sessionId,
    role,
    content,
    metadata
  });
}
