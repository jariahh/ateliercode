/**
 * TauriBackend Implementation
 *
 * Backend implementation for the Tauri desktop app.
 * Wraps all @tauri-apps/api invoke() calls.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
  IBackend,
  IProjectBackend,
  IAgentBackend,
  IChatBackend,
  IFileBackend,
  ITaskBackend,
  ITranscriptionBackend,
  ISystemBackend,
  BackendType,
  GeneratedProjectDetails,
} from './IBackend';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  AgentInfo,
  AgentSession,
  DbAgentSession,
  ChatMessage,
  SessionListItem,
  ChatSessionInfo,
  PaginatedChatHistory,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  ProjectAnalysisResult,
  FileNode,
  TranscriptionResult,
  SessionUpdateCallback,
  UnsubscribeFn,
} from './types';

// Import session update types from sessionWatcher
import type { SessionUpdate as WatcherSessionUpdate } from '../../api/sessionWatcher';

/**
 * Project backend implementation for Tauri
 */
class TauriProjectBackend implements IProjectBackend {
  async create(input: CreateProjectInput): Promise<Project> {
    return await invoke<Project>('create_project', { input });
  }

  async list(): Promise<Project[]> {
    return await invoke<Project[]>('get_projects');
  }

  async get(id: string): Promise<Project | null> {
    return await invoke<Project | null>('get_project', { id });
  }

  async update(id: string, updates: UpdateProjectInput): Promise<Project> {
    return await invoke<Project>('update_project', { id, updates });
  }

  async delete(id: string): Promise<boolean> {
    return await invoke<boolean>('delete_project', { id });
  }

  async hasRecentActivity(id: string): Promise<boolean> {
    return await invoke<boolean>('has_recent_activity', { id });
  }

  async analyze(path: string): Promise<ProjectAnalysisResult> {
    return await invoke<ProjectAnalysisResult>('analyze_project_directory', { path });
  }

  async analyzeWithAI(path: string): Promise<ProjectAnalysisResult> {
    return await invoke<ProjectAnalysisResult>('analyze_project_with_ai', { path });
  }

  async generateDetails(projectPath: string): Promise<GeneratedProjectDetails> {
    return await invoke<GeneratedProjectDetails>('generate_project_details', { projectPath });
  }
}

/**
 * Agent backend implementation for Tauri
 */
class TauriAgentBackend implements IAgentBackend {
  async start(projectId: string, agentType: string, resumeSessionId?: string): Promise<AgentSession> {
    return await invoke<AgentSession>('start_agent_session', {
      projectId,
      agentType,
      resumeSessionId: resumeSessionId || null,
    });
  }

  async send(sessionId: string, message: string): Promise<void> {
    return await invoke<void>('send_to_agent', { sessionId, message });
  }

  async readOutput(sessionId: string, timeoutMs?: number): Promise<string[]> {
    return await invoke<string[]>('read_agent_output', { sessionId, timeoutMs });
  }

  async stop(sessionId: string): Promise<void> {
    return await invoke<void>('stop_agent_session', { sessionId });
  }

  async getStatus(sessionId: string): Promise<AgentSession> {
    return await invoke<AgentSession>('get_agent_status', { sessionId });
  }

  async list(): Promise<AgentSession[]> {
    return await invoke<AgentSession[]>('list_agent_sessions');
  }

  async checkHealth(sessionId: string): Promise<boolean> {
    return await invoke<boolean>('check_agent_health', { sessionId });
  }

  async syncClaudeSessionId(sessionId: string): Promise<string | null> {
    return await invoke<string | null>('sync_claude_session_id', { sessionId });
  }

  async getProjectSessions(projectId: string): Promise<DbAgentSession[]> {
    return await invoke<DbAgentSession[]>('get_project_sessions', { projectId });
  }
}

/**
 * Chat backend implementation for Tauri
 */
class TauriChatBackend implements IChatBackend {
  async getHistory(pluginName: string, cliSessionId: string): Promise<ChatMessage[]> {
    return await invoke<ChatMessage[]>('get_chat_history', { pluginName, cliSessionId });
  }

  async getHistoryPaginated(
    pluginName: string,
    cliSessionId: string,
    offset: number,
    limit: number
  ): Promise<PaginatedChatHistory> {
    return await invoke<PaginatedChatHistory>('get_chat_history_paginated', {
      pluginName,
      cliSessionId,
      offset,
      limit,
    });
  }

  async listSessions(pluginName: string, projectPath: string): Promise<SessionListItem[]> {
    return await invoke<SessionListItem[]>('list_cli_sessions', { pluginName, projectPath });
  }

  async startSession(projectId: string, pluginName: string): Promise<ChatSessionInfo> {
    return await invoke<ChatSessionInfo>('start_chat_session', { projectId, pluginName });
  }

  async sendMessage(
    sessionId: string,
    pluginName: string,
    cliSessionId: string,
    projectPath: string,
    message: string
  ): Promise<void> {
    return await invoke('send_chat_message', {
      sessionId,
      pluginName,
      cliSessionId,
      projectPath,
      message,
    });
  }

  async watchSession(
    pluginName: string,
    cliSessionId: string,
    projectPath: string,
    callback: SessionUpdateCallback
  ): Promise<UnsubscribeFn> {
    // Set up event listener first
    const unlisten: UnlistenFn = await listen<{ cli_session_id: string; update: WatcherSessionUpdate }>(
      'session-update',
      (event) => {
        if (event.payload.cli_session_id === cliSessionId) {
          const update = event.payload.update;
          // Transform to our SessionUpdate format
          if (update.type === 'NewMessage' && update.message && typeof update.message !== 'string') {
            callback({
              sessionId: cliSessionId,
              messages: [update.message as ChatMessage],
              hasMoreMessages: false,
            });
          }
        }
      }
    );

    // Start watching
    const watchId = await invoke<string>('start_watching_session', {
      pluginName,
      projectPath,
      cliSessionId,
    });

    // Return unsubscribe function
    return async () => {
      await invoke('stop_watching_session', { pluginName, watchId, cliSessionId });
      unlisten();
    };
  }
}

/**
 * File backend implementation for Tauri
 */
class TauriFileBackend implements IFileBackend {
  async pickFolder(): Promise<string | null> {
    return await invoke<string | null>('select_folder');
  }

  async readFile(path: string): Promise<string> {
    return await invoke<string>('read_file_content', { path });
  }

  async getFolderChildren(folderPath: string, rootPath: string): Promise<FileNode[]> {
    return await invoke<FileNode[]>('get_folder_children', { folderPath, rootPath });
  }

  async readProjectFiles(rootPath: string): Promise<FileNode[]> {
    return await invoke<FileNode[]>('read_project_files', { rootPath });
  }

  async getGitStatus(rootPath: string): Promise<string> {
    return await invoke<string>('get_git_status', { rootPath });
  }
}

/**
 * Task backend implementation for Tauri
 */
class TauriTaskBackend implements ITaskBackend {
  async create(input: CreateTaskInput): Promise<Task> {
    return await invoke<Task>('create_task', { input });
  }

  async list(projectId: string): Promise<Task[]> {
    return await invoke<Task[]>('get_tasks', { projectId });
  }

  async update(taskId: string, updates: UpdateTaskInput): Promise<Task> {
    return await invoke<Task>('update_task', { taskId, updates });
  }

  async delete(taskId: string): Promise<boolean> {
    return await invoke<boolean>('delete_task', { taskId });
  }

  async updateStatus(taskId: string, status: string): Promise<Task> {
    return await invoke<Task>('update_task_status', { taskId, status });
  }
}

/**
 * Transcription backend implementation for Tauri
 */
class TauriTranscriptionBackend implements ITranscriptionBackend {
  async checkWhisperInstallation(): Promise<{ installed: boolean; model_downloaded: boolean }> {
    return await invoke<{ installed: boolean; model_downloaded: boolean }>('check_whisper_installation');
  }

  async installWhisper(model: string): Promise<void> {
    return await invoke('install_whisper', { model });
  }

  async transcribeLocal(audioData: number[], model: string): Promise<TranscriptionResult> {
    const result = await invoke<{ text: string }>('transcribe_local', { audioData, model });
    return { text: result.text };
  }

  async transcribeOpenAI(audioData: number[], apiKey: string): Promise<TranscriptionResult> {
    const result = await invoke<{ text: string }>('transcribe_openai', { audioData, apiKey });
    return { text: result.text };
  }
}

/**
 * System backend implementation for Tauri
 */
class TauriSystemBackend implements ISystemBackend {
  async detectAgents(): Promise<AgentInfo[]> {
    return await invoke<AgentInfo[]>('detect_agents');
  }

  async getHostname(): Promise<string> {
    return await invoke<string>('get_hostname');
  }

  async getPlatform(): Promise<string> {
    return await invoke<string>('get_platform');
  }
}

/**
 * Main Tauri Backend class
 */
export class TauriBackend implements IBackend {
  readonly type: BackendType = 'tauri';
  readonly isReady: boolean = true;

  readonly projects: IProjectBackend;
  readonly agent: IAgentBackend;
  readonly chat: IChatBackend;
  readonly files: IFileBackend;
  readonly tasks: ITaskBackend;
  readonly transcription: ITranscriptionBackend;
  readonly system: ISystemBackend;

  constructor() {
    this.projects = new TauriProjectBackend();
    this.agent = new TauriAgentBackend();
    this.chat = new TauriChatBackend();
    this.files = new TauriFileBackend();
    this.tasks = new TauriTaskBackend();
    this.transcription = new TauriTranscriptionBackend();
    this.system = new TauriSystemBackend();
  }
}

/**
 * Check if Tauri API is available (running in desktop app)
 * Supports both Tauri v1 (__TAURI__) and Tauri v2 (__TAURI_INTERNALS__)
 */
export function isTauriAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // Tauri v2 uses __TAURI_INTERNALS__
  if ('__TAURI_INTERNALS__' in window) return true;
  // Tauri v1 uses __TAURI__
  if ('__TAURI__' in window) return true;
  return false;
}

/**
 * Create a TauriBackend instance if available
 */
export function createTauriBackend(): TauriBackend | null {
  if (isTauriAvailable()) {
    return new TauriBackend();
  }
  return null;
}
