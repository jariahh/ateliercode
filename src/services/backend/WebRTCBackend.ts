/**
 * WebRTCBackend Implementation
 *
 * Backend implementation for web clients connecting to remote machines via WebRTC.
 * Proxies all commands through the WebRTC data channel to the remote machine.
 */

import { peerConnection } from '../peerConnection';
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

/**
 * Project backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCProjectBackend implements IProjectBackend {
  async create(input: CreateProjectInput): Promise<Project> {
    return await peerConnection.sendCommand<Project>('create_project', { input });
  }

  async list(): Promise<Project[]> {
    return await peerConnection.sendCommand<Project[]>('get_projects');
  }

  async get(id: string): Promise<Project | null> {
    return await peerConnection.sendCommand<Project | null>('get_project', { id });
  }

  async update(id: string, updates: UpdateProjectInput): Promise<Project> {
    return await peerConnection.sendCommand<Project>('update_project', { id, updates });
  }

  async delete(id: string): Promise<boolean> {
    return await peerConnection.sendCommand<boolean>('delete_project', { id });
  }

  async hasRecentActivity(id: string): Promise<boolean> {
    return await peerConnection.sendCommand<boolean>('has_recent_activity', { id });
  }

  async analyze(path: string): Promise<ProjectAnalysisResult> {
    return await peerConnection.sendCommand<ProjectAnalysisResult>('analyze_project_directory', { path });
  }

  async analyzeWithAI(path: string): Promise<ProjectAnalysisResult> {
    return await peerConnection.sendCommand<ProjectAnalysisResult>('analyze_project_with_ai', { path });
  }

  async generateDetails(projectPath: string): Promise<GeneratedProjectDetails> {
    return await peerConnection.sendCommand<GeneratedProjectDetails>('generate_project_details', { projectPath });
  }
}

/**
 * Agent backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCAgentBackend implements IAgentBackend {
  async start(projectId: string, agentType: string, resumeSessionId?: string): Promise<AgentSession> {
    return await peerConnection.sendCommand<AgentSession>('start_agent_session', {
      projectId,
      agentType,
      resumeSessionId: resumeSessionId || null,
    });
  }

  async send(sessionId: string, message: string, pluginName?: string): Promise<void> {
    await peerConnection.sendCommand<void>('send_to_agent', { sessionId, message, pluginName: pluginName || null });
  }

  async readOutput(sessionId: string, timeoutMs?: number): Promise<string[]> {
    return await peerConnection.sendCommand<string[]>('read_agent_output', { sessionId, timeoutMs });
  }

  async stop(sessionId: string): Promise<void> {
    await peerConnection.sendCommand<void>('stop_agent_session', { sessionId });
  }

  async getStatus(sessionId: string): Promise<AgentSession> {
    return await peerConnection.sendCommand<AgentSession>('get_agent_status', { sessionId });
  }

  async list(): Promise<AgentSession[]> {
    return await peerConnection.sendCommand<AgentSession[]>('list_agent_sessions');
  }

  async checkHealth(sessionId: string): Promise<boolean> {
    return await peerConnection.sendCommand<boolean>('check_agent_health', { sessionId });
  }

  async syncClaudeSessionId(sessionId: string): Promise<string | null> {
    return await peerConnection.sendCommand<string | null>('sync_claude_session_id', { sessionId });
  }

  async getProjectSessions(projectId: string): Promise<DbAgentSession[]> {
    return await peerConnection.sendCommand<DbAgentSession[]>('get_project_sessions', { projectId });
  }
}

/**
 * Chat backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCChatBackend implements IChatBackend {
  async getHistory(pluginName: string, cliSessionId: string): Promise<ChatMessage[]> {
    return await peerConnection.sendCommand<ChatMessage[]>('get_chat_history', { pluginName, cliSessionId });
  }

  async getHistoryPaginated(
    pluginName: string,
    cliSessionId: string,
    offset: number,
    limit: number
  ): Promise<PaginatedChatHistory> {
    return await peerConnection.sendCommand<PaginatedChatHistory>('get_chat_history_paginated', {
      pluginName,
      cliSessionId,
      offset,
      limit,
    });
  }

  async listSessions(pluginName: string, projectPath: string): Promise<SessionListItem[]> {
    return await peerConnection.sendCommand<SessionListItem[]>('list_cli_sessions', { pluginName, projectPath });
  }

  async startSession(projectId: string, pluginName: string): Promise<ChatSessionInfo> {
    return await peerConnection.sendCommand<ChatSessionInfo>('start_chat_session', { projectId, pluginName });
  }

  async sendMessage(
    sessionId: string,
    pluginName: string,
    cliSessionId: string,
    projectPath: string,
    message: string
  ): Promise<void> {
    await peerConnection.sendCommand('send_chat_message', {
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
    // Start watching via command
    const watchId = await peerConnection.sendCommand<string>('start_watching_session', {
      pluginName,
      projectPath,
      cliSessionId,
    });

    // Subscribe to events from the peer connection
    const unsubscribeEvent = peerConnection.onEvent((event, payload) => {
      if (event === 'session-update') {
        const eventPayload = payload as { cli_session_id: string; update: { type: string; message?: ChatMessage } };
        if (eventPayload.cli_session_id === cliSessionId) {
          const update = eventPayload.update;
          if (update.type === 'NewMessage' && update.message) {
            callback({
              sessionId: cliSessionId,
              messages: [update.message],
              hasMoreMessages: false,
            });
          }
        }
      }
    });

    // Return unsubscribe function
    return async () => {
      await peerConnection.sendCommand('stop_watching_session', { pluginName, watchId, cliSessionId });
      unsubscribeEvent();
    };
  }
}

/**
 * File backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCFileBackend implements IFileBackend {
  async pickFolder(): Promise<string | null> {
    // Note: For web clients, this opens a folder picker on the REMOTE machine
    // The user will need to interact with the remote machine to select a folder
    // Alternatively, we could implement a web-based file browser
    return await peerConnection.sendCommand<string | null>('select_folder');
  }

  async readFile(path: string): Promise<string> {
    return await peerConnection.sendCommand<string>('read_file_content', { path });
  }

  async getFolderChildren(folderPath: string, rootPath: string): Promise<FileNode[]> {
    return await peerConnection.sendCommand<FileNode[]>('get_folder_children', { folderPath, rootPath });
  }

  async readProjectFiles(rootPath: string): Promise<FileNode[]> {
    return await peerConnection.sendCommand<FileNode[]>('read_project_files', { rootPath });
  }

  async getGitStatus(rootPath: string): Promise<string> {
    return await peerConnection.sendCommand<string>('get_git_status', { rootPath });
  }
}

/**
 * Task backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCTaskBackend implements ITaskBackend {
  async create(input: CreateTaskInput): Promise<Task> {
    return await peerConnection.sendCommand<Task>('create_task', { input });
  }

  async list(projectId: string): Promise<Task[]> {
    return await peerConnection.sendCommand<Task[]>('get_tasks', { projectId });
  }

  async update(taskId: string, updates: UpdateTaskInput): Promise<Task> {
    return await peerConnection.sendCommand<Task>('update_task', { taskId, updates });
  }

  async delete(taskId: string): Promise<boolean> {
    return await peerConnection.sendCommand<boolean>('delete_task', { taskId });
  }

  async updateStatus(taskId: string, status: string): Promise<Task> {
    return await peerConnection.sendCommand<Task>('update_task_status', { taskId, status });
  }
}

/**
 * Transcription backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCTranscriptionBackend implements ITranscriptionBackend {
  async checkWhisperInstallation(): Promise<{ installed: boolean; model_downloaded: boolean }> {
    return await peerConnection.sendCommand<{ installed: boolean; model_downloaded: boolean }>('check_whisper_installation');
  }

  async installWhisper(model: string): Promise<void> {
    await peerConnection.sendCommand('install_whisper', { model });
  }

  async transcribeLocal(audioData: number[], model: string): Promise<TranscriptionResult> {
    // Note: This sends audio data over WebRTC to be transcribed on the remote machine
    const result = await peerConnection.sendCommand<{ text: string }>('transcribe_local', { audioData, model });
    return { text: result.text };
  }

  async transcribeOpenAI(audioData: number[], apiKey: string): Promise<TranscriptionResult> {
    // Note: This sends audio data over WebRTC, the remote machine calls OpenAI
    const result = await peerConnection.sendCommand<{ text: string }>('transcribe_openai', { audioData, apiKey });
    return { text: result.text };
  }
}

/**
 * System backend implementation for WebRTC (remote machine proxy)
 */
class WebRTCSystemBackend implements ISystemBackend {
  async detectAgents(): Promise<AgentInfo[]> {
    return await peerConnection.sendCommand<AgentInfo[]>('detect_agents');
  }

  async getHostname(): Promise<string> {
    return await peerConnection.sendCommand<string>('get_hostname');
  }

  async getPlatform(): Promise<string> {
    return await peerConnection.sendCommand<string>('get_platform');
  }
}

/**
 * Main WebRTC Backend class
 */
export class WebRTCBackend implements IBackend {
  readonly type: BackendType = 'webrtc';

  get isReady(): boolean {
    return peerConnection.isConnected;
  }

  readonly projects: IProjectBackend;
  readonly agent: IAgentBackend;
  readonly chat: IChatBackend;
  readonly files: IFileBackend;
  readonly tasks: ITaskBackend;
  readonly transcription: ITranscriptionBackend;
  readonly system: ISystemBackend;

  constructor() {
    this.projects = new WebRTCProjectBackend();
    this.agent = new WebRTCAgentBackend();
    this.chat = new WebRTCChatBackend();
    this.files = new WebRTCFileBackend();
    this.tasks = new WebRTCTaskBackend();
    this.transcription = new WebRTCTranscriptionBackend();
    this.system = new WebRTCSystemBackend();
  }
}

/**
 * Create a WebRTCBackend instance
 * Note: The peer connection must be established before using this backend
 */
export function createWebRTCBackend(): WebRTCBackend {
  return new WebRTCBackend();
}
