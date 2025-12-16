/**
 * WebRTC Host Service
 * Handles incoming WebRTC commands on the desktop (Tauri) side.
 * Routes commands to Tauri and sends responses back to the web client.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectAnalysisResult, AgentInfo, Task, CreateTaskInput, UpdateTaskInput } from '../types/tauri';
import { peerConnection } from './peerConnection';

interface PeerMessage {
  type: 'request' | 'response' | 'event';
  id?: string;
  command?: string;
  params?: Record<string, unknown>;
  success?: boolean;
  data?: unknown;
  error?: string;
}

type CommandHandler = (params: Record<string, unknown>) => Promise<unknown>;

// Track active session watchers and their event listeners for cleanup
const activeSessionWatchers = new Map<string, {
  cliSessionId: string;
  unlisten: UnlistenFn;
}>();

/**
 * Command handlers that map WebRTC commands to Tauri invocations
 */
const commandHandlers: Record<string, CommandHandler> = {
  // Project commands
  get_projects: async () => {
    return await invoke<Project[]>('get_projects');
  },

  get_project: async (params) => {
    return await invoke<Project | null>('get_project', { id: params.id as string });
  },

  create_project: async (params) => {
    const input = params.input as CreateProjectInput;
    return await invoke<Project>('create_project', { input });
  },

  update_project: async (params) => {
    return await invoke<Project>('update_project', {
      id: params.id as string,
      updates: params.updates as UpdateProjectInput,
    });
  },

  delete_project: async (params) => {
    return await invoke<boolean>('delete_project', { id: params.id as string });
  },

  has_recent_activity: async (params) => {
    return await invoke<boolean>('has_recent_activity', { projectId: params.id as string });
  },

  analyze_project_directory: async (params) => {
    return await invoke<ProjectAnalysisResult>('analyze_project_directory', { path: params.path as string });
  },

  analyze_project_with_ai: async (params) => {
    return await invoke<ProjectAnalysisResult>('analyze_project_with_ai', { path: params.path as string });
  },

  generate_project_details: async (params) => {
    return await invoke<{ name: string; description: string }>('generate_project_details', {
      projectPath: params.projectPath as string,
    });
  },

  // File commands
  select_folder: async () => {
    return await invoke<string | null>('select_folder');
  },

  read_file_content: async (params) => {
    return await invoke<string>('read_file_content', { path: params.path as string });
  },

  get_folder_children: async (params) => {
    return await invoke<unknown[]>('get_folder_children', {
      folderPath: params.folderPath as string,
      rootPath: params.rootPath as string,
    });
  },

  read_project_files: async (params) => {
    return await invoke<unknown[]>('read_project_files', { rootPath: params.rootPath as string });
  },

  get_git_status: async (params) => {
    return await invoke<string>('get_git_status', { rootPath: params.rootPath as string });
  },

  // Agent commands
  start_agent_session: async (params) => {
    return await invoke<unknown>('start_agent_session', {
      projectId: params.projectId as string,
      agentType: params.agentType as string,
      resumeSessionId: params.resumeSessionId as string | null,
    });
  },

  send_to_agent: async (params) => {
    return await invoke<void>('send_to_agent', {
      sessionId: params.sessionId as string,
      message: params.message as string,
    });
  },

  read_agent_output: async (params) => {
    return await invoke<string[]>('read_agent_output', {
      sessionId: params.sessionId as string,
      timeoutMs: params.timeoutMs as number | undefined,
    });
  },

  stop_agent_session: async (params) => {
    return await invoke<void>('stop_agent_session', { sessionId: params.sessionId as string });
  },

  get_agent_status: async (params) => {
    return await invoke<unknown>('get_agent_status', { sessionId: params.sessionId as string });
  },

  list_agent_sessions: async () => {
    return await invoke<unknown[]>('list_agent_sessions');
  },

  check_agent_health: async (params) => {
    return await invoke<boolean>('check_agent_health', { sessionId: params.sessionId as string });
  },

  sync_claude_session_id: async (params) => {
    return await invoke<string | null>('sync_claude_session_id', { sessionId: params.sessionId as string });
  },

  get_project_sessions: async (params) => {
    return await invoke<unknown[]>('get_project_sessions', { projectId: params.projectId as string });
  },

  // Chat commands
  get_chat_history: async (params) => {
    return await invoke<unknown[]>('get_chat_history', {
      pluginName: params.pluginName as string,
      cliSessionId: params.cliSessionId as string,
    });
  },

  get_chat_history_paginated: async (params) => {
    return await invoke<unknown>('get_chat_history_paginated', {
      pluginName: params.pluginName as string,
      cliSessionId: params.cliSessionId as string,
      offset: params.offset as number,
      limit: params.limit as number,
    });
  },

  list_cli_sessions: async (params) => {
    return await invoke<unknown[]>('list_cli_sessions', {
      pluginName: params.pluginName as string,
      projectPath: params.projectPath as string,
    });
  },

  start_chat_session: async (params) => {
    return await invoke<unknown>('start_chat_session', {
      projectId: params.projectId as string,
      pluginName: params.pluginName as string,
    });
  },

  send_chat_message: async (params) => {
    return await invoke<void>('send_chat_message', {
      sessionId: params.sessionId as string,
      pluginName: params.pluginName as string,
      cliSessionId: params.cliSessionId as string,
      projectPath: params.projectPath as string,
      message: params.message as string,
    });
  },

  start_watching_session: async (params) => {
    const pluginName = params.pluginName as string;
    const projectPath = params.projectPath as string;
    const cliSessionId = params.cliSessionId as string;

    // Set up event listener FIRST to forward session events to the web client
    const unlisten = await listen<{ cli_session_id: string; update: unknown }>(
      'session-update',
      (event) => {
        // Filter events by cli_session_id and forward to web client
        if (event.payload.cli_session_id === cliSessionId) {
          console.log('[WebRTCHost] Forwarding session update for:', cliSessionId);
          peerConnection.sendEvent('session-update', event.payload);
        }
      }
    );

    // Start the watcher on the backend
    const watchId = await invoke<string>('start_watching_session', {
      pluginName,
      projectPath,
      cliSessionId,
    });

    // Store the unlisten function for cleanup
    activeSessionWatchers.set(watchId, { cliSessionId, unlisten });
    console.log('[WebRTCHost] Started session watcher:', watchId, 'for session:', cliSessionId);

    return watchId;
  },

  stop_watching_session: async (params) => {
    const pluginName = params.pluginName as string;
    const watchId = params.watchId as string;
    const cliSessionId = params.cliSessionId as string;

    // Clean up the event listener
    const watcherState = activeSessionWatchers.get(watchId);
    if (watcherState) {
      watcherState.unlisten();
      activeSessionWatchers.delete(watchId);
      console.log('[WebRTCHost] Stopped session watcher:', watchId);
    }

    // Stop the watcher on the backend
    return await invoke<void>('stop_watching_session', {
      pluginName,
      watchId,
      cliSessionId,
    });
  },

  // Task commands
  create_task: async (params) => {
    return await invoke<Task>('create_task', { input: params.input as CreateTaskInput });
  },

  get_tasks: async (params) => {
    return await invoke<Task[]>('get_tasks', { projectId: params.projectId as string });
  },

  update_task: async (params) => {
    return await invoke<Task>('update_task', {
      taskId: params.taskId as string,
      updates: params.updates as UpdateTaskInput,
    });
  },

  delete_task: async (params) => {
    return await invoke<boolean>('delete_task', { taskId: params.taskId as string });
  },

  update_task_status: async (params) => {
    return await invoke<Task>('update_task_status', {
      taskId: params.taskId as string,
      status: params.status as string,
    });
  },

  // Stats commands
  get_project_stats: async (params) => {
    return await invoke<unknown>('get_project_stats', { projectId: params.projectId as string });
  },

  // Chat tab commands
  get_chat_tabs: async (params) => {
    return await invoke<unknown[]>('get_chat_tabs', { projectId: params.projectId as string });
  },

  create_chat_tab: async (params) => {
    return await invoke<unknown>('create_chat_tab', {
      projectId: params.projectId as string,
      agentType: params.agentType as string,
      label: params.label as string | undefined,
    });
  },

  update_chat_tab: async (params) => {
    return await invoke<unknown>('update_chat_tab', {
      tabId: params.tabId as string,
      label: params.label as string | undefined,
      sessionId: params.sessionId as string | undefined,
      cliSessionId: params.cliSessionId as string | undefined,
    });
  },

  set_active_tab: async (params) => {
    return await invoke<void>('set_active_tab', {
      projectId: params.projectId as string,
      tabId: params.tabId as string,
    });
  },

  close_chat_tab: async (params) => {
    return await invoke<void>('close_chat_tab', { tabId: params.tabId as string });
  },

  reorder_chat_tabs: async (params) => {
    return await invoke<void>('reorder_chat_tabs', {
      projectId: params.projectId as string,
      tabIds: params.tabIds as string[],
    });
  },

  // System commands
  detect_agents: async () => {
    return await invoke<AgentInfo[]>('detect_agents');
  },

  get_hostname: async () => {
    return await invoke<string>('get_hostname');
  },

  get_platform: async () => {
    return await invoke<string>('get_platform');
  },

  // Transcription commands
  check_whisper_installation: async () => {
    return await invoke<{ installed: boolean; model_downloaded: boolean }>('check_whisper_installation');
  },

  install_whisper: async (params) => {
    return await invoke<void>('install_whisper', { model: params.model as string });
  },

  transcribe_local: async (params) => {
    const audioData = params.audioData as number[];
    const model = params.model as string;

    // Debug: Log audio data info to verify integrity after WebRTC transfer
    console.log('[WebRTCHost] transcribe_local - audioData type:', typeof audioData);
    console.log('[WebRTCHost] transcribe_local - audioData isArray:', Array.isArray(audioData));
    console.log('[WebRTCHost] transcribe_local - audioData length:', audioData?.length || 0);
    if (audioData && audioData.length > 0) {
      // Log first 20 bytes to verify it's valid audio (webm starts with 0x1A 0x45 0xDF 0xA3)
      const first20 = audioData.slice(0, 20);
      console.log('[WebRTCHost] transcribe_local - first 20 bytes:', first20);
      console.log('[WebRTCHost] transcribe_local - last 20 bytes:', audioData.slice(-20));
      // Check for webm magic bytes (EBML header)
      const isWebm = first20[0] === 0x1A && first20[1] === 0x45 && first20[2] === 0xDF && first20[3] === 0xA3;
      console.log('[WebRTCHost] transcribe_local - looks like valid webm:', isWebm);
    } else {
      console.error('[WebRTCHost] transcribe_local - audioData is empty or invalid!');
    }

    return await invoke<{ text: string }>('transcribe_local', {
      audioData,
      model,
    });
  },

  transcribe_openai: async (params) => {
    return await invoke<{ text: string }>('transcribe_openai', {
      audioData: params.audioData as number[],
      apiKey: params.apiKey as string,
    });
  },

  // Get whisper settings from host machine (for web clients to know how to transcribe)
  get_whisper_settings: async () => {
    // Import settings store dynamically to avoid circular deps
    const { useSettingsStore } = await import('../stores/settingsStore');
    const whisper = useSettingsStore.getState().whisper;
    return {
      provider: whisper.provider,
      openaiApiKey: whisper.openaiApiKey,
      localModel: whisper.localModel,
      localInstalled: whisper.localInstalled,
      localModelDownloaded: whisper.localModelDownloaded,
    };
  },
};

/**
 * Handle an incoming WebRTC command and return a response
 */
export async function handleWebRTCCommand(message: PeerMessage): Promise<PeerMessage> {
  if (message.type !== 'request' || !message.command) {
    return {
      type: 'response',
      id: message.id,
      success: false,
      error: 'Invalid request format',
    };
  }

  const handler = commandHandlers[message.command];
  if (!handler) {
    console.warn(`[WebRTCHost] Unknown command: ${message.command}`);
    return {
      type: 'response',
      id: message.id,
      success: false,
      error: `Unknown command: ${message.command}`,
    };
  }

  try {
    console.log(`[WebRTCHost] Executing command: ${message.command}`, message.params);
    const result = await handler(message.params || {});
    console.log(`[WebRTCHost] Command ${message.command} succeeded`);
    return {
      type: 'response',
      id: message.id,
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[WebRTCHost] Command ${message.command} failed:`, error);
    return {
      type: 'response',
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : 'Command execution failed',
    };
  }
}

/**
 * Check if the WebRTC host is available (running in Tauri)
 */
export function isWebRTCHostAvailable(): boolean {
  // Tauri v2 uses __TAURI_INTERNALS__, v1 uses __TAURI__
  return typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}
