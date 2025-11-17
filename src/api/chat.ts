// Chat API functions for communicating with Tauri backend
import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage } from '../types/tauri';

/**
 * Send a chat message and get AI response
 * @param projectId - The ID of the project
 * @param content - The message content
 * @returns Promise with the AI response message
 */
export async function sendMessage(
  projectId: string,
  content: string
): Promise<ChatMessage> {
  return await invoke<ChatMessage>('send_message', {
    projectId,
    content
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
