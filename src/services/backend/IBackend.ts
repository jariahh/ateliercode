/**
 * IBackend Interface
 *
 * Abstract contract for backend operations. Enables the same React code
 * to work with both Tauri (desktop) and WebRTC (web client) backends.
 */

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
 * Backend type identifier
 */
export type BackendType = 'tauri' | 'webrtc' | 'mock';

/**
 * Main backend interface
 */
export interface IBackend {
  /**
   * Backend type identifier
   */
  readonly type: BackendType;

  /**
   * Whether the backend is connected and ready
   */
  readonly isReady: boolean;

  /**
   * Project operations
   */
  projects: IProjectBackend;

  /**
   * Agent session operations (persistent CLI sessions)
   */
  agent: IAgentBackend;

  /**
   * Chat history operations (plugin-based)
   */
  chat: IChatBackend;

  /**
   * File system operations
   */
  files: IFileBackend;

  /**
   * Task management operations
   */
  tasks: ITaskBackend;

  /**
   * Voice transcription operations
   */
  transcription: ITranscriptionBackend;

  /**
   * System information operations
   */
  system: ISystemBackend;
}

/**
 * AI-generated project details
 */
export interface GeneratedProjectDetails {
  name: string;
  description: string;
}

/**
 * Project management operations
 */
export interface IProjectBackend {
  create(input: CreateProjectInput): Promise<Project>;
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  update(id: string, updates: UpdateProjectInput): Promise<Project>;
  delete(id: string): Promise<boolean>;
  hasRecentActivity(id: string): Promise<boolean>;
  analyze(path: string): Promise<ProjectAnalysisResult>;
  analyzeWithAI(path: string): Promise<ProjectAnalysisResult>;
  generateDetails(projectPath: string): Promise<GeneratedProjectDetails>;
}

/**
 * Agent session management operations
 */
export interface IAgentBackend {
  start(projectId: string, agentType: string, resumeSessionId?: string): Promise<AgentSession>;
  send(sessionId: string, message: string): Promise<void>;
  readOutput(sessionId: string, timeoutMs?: number): Promise<string[]>;
  stop(sessionId: string): Promise<void>;
  getStatus(sessionId: string): Promise<AgentSession>;
  list(): Promise<AgentSession[]>;
  checkHealth(sessionId: string): Promise<boolean>;
  syncClaudeSessionId(sessionId: string): Promise<string | null>;
  getProjectSessions(projectId: string): Promise<DbAgentSession[]>;
}

/**
 * Chat history operations (plugin-based CLI history)
 */
export interface IChatBackend {
  getHistory(pluginName: string, cliSessionId: string): Promise<ChatMessage[]>;
  getHistoryPaginated(
    pluginName: string,
    cliSessionId: string,
    offset: number,
    limit: number
  ): Promise<PaginatedChatHistory>;
  listSessions(pluginName: string, projectPath: string): Promise<SessionListItem[]>;
  startSession(projectId: string, pluginName: string): Promise<ChatSessionInfo>;
  sendMessage(
    sessionId: string,
    pluginName: string,
    cliSessionId: string,
    projectPath: string,
    message: string
  ): Promise<void>;
  watchSession(
    pluginName: string,
    cliSessionId: string,
    projectPath: string,
    callback: SessionUpdateCallback
  ): Promise<UnsubscribeFn>;
}

/**
 * File system operations
 */
export interface IFileBackend {
  /**
   * Open native folder picker dialog
   * Returns null if cancelled, or the selected path
   */
  pickFolder(): Promise<string | null>;

  /**
   * Read file content as text
   */
  readFile(path: string): Promise<string>;

  /**
   * Get children of a folder for tree view
   */
  getFolderChildren(folderPath: string, rootPath: string): Promise<FileNode[]>;

  /**
   * Read project files structure
   */
  readProjectFiles(rootPath: string): Promise<FileNode[]>;

  /**
   * Get git status for a project
   */
  getGitStatus(rootPath: string): Promise<string>;
}

/**
 * Task management operations
 */
export interface ITaskBackend {
  create(input: CreateTaskInput): Promise<Task>;
  list(projectId: string): Promise<Task[]>;
  update(taskId: string, updates: UpdateTaskInput): Promise<Task>;
  delete(taskId: string): Promise<boolean>;
  updateStatus(taskId: string, status: string): Promise<Task>;
}

/**
 * Voice transcription operations
 */
export interface ITranscriptionBackend {
  /**
   * Check if local Whisper is installed
   */
  checkWhisperInstallation(): Promise<{ installed: boolean; model_downloaded: boolean }>;

  /**
   * Install local Whisper
   */
  installWhisper(model: string): Promise<void>;

  /**
   * Transcribe audio using local Whisper
   */
  transcribeLocal(audioData: number[], model: string): Promise<TranscriptionResult>;

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  transcribeOpenAI(audioData: number[], apiKey: string): Promise<TranscriptionResult>;
}

/**
 * System information operations
 */
export interface ISystemBackend {
  /**
   * Detect installed AI coding agents
   */
  detectAgents(): Promise<AgentInfo[]>;

  /**
   * Get system hostname
   */
  getHostname(): Promise<string>;

  /**
   * Get platform (windows, macos, linux)
   */
  getPlatform(): Promise<string>;
}
