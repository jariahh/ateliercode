/**
 * Chat Tabs API - manages chat tabs for multi-agent support
 */

import { invoke } from '@tauri-apps/api/core';

export interface ChatTab {
  id: string;
  project_id: string;
  agent_type: string;
  session_id: string | null;
  cli_session_id: string | null;
  label: string | null;
  tab_order: number;
  is_active: boolean;
  created_at: number;
  last_activity: number;
}

/**
 * Get all chat tabs for a project
 */
export async function getChatTabs(projectId: string): Promise<ChatTab[]> {
  return invoke<ChatTab[]>('get_chat_tabs', { projectId });
}

/**
 * Create a new chat tab
 */
export async function createChatTab(
  projectId: string,
  agentType: string,
  label?: string
): Promise<ChatTab> {
  return invoke<ChatTab>('create_chat_tab', { projectId, agentType, label });
}

/**
 * Update a chat tab
 */
export async function updateChatTab(
  tabId: string,
  updates: {
    label?: string;
    sessionId?: string;
    cliSessionId?: string;
  }
): Promise<ChatTab> {
  return invoke<ChatTab>('update_chat_tab', {
    tabId,
    label: updates.label,
    sessionId: updates.sessionId,
    cliSessionId: updates.cliSessionId,
  });
}

/**
 * Set the active tab for a project
 */
export async function setActiveTab(projectId: string, tabId: string): Promise<void> {
  return invoke('set_active_tab', { projectId, tabId });
}

/**
 * Close/delete a chat tab
 */
export async function closeChatTab(tabId: string): Promise<void> {
  return invoke('close_chat_tab', { tabId });
}

/**
 * Reorder chat tabs
 */
export async function reorderChatTabs(projectId: string, tabIds: string[]): Promise<void> {
  return invoke('reorder_chat_tabs', { projectId, tabIds });
}
