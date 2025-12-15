/**
 * Backend Types
 * Re-exports and additional types for the backend abstraction layer
 */

// Import types we need to use in local interfaces
import type { ChatMessage as ChatMessageType } from '../../lib/chat';

// Re-export existing types
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  AgentInfo,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  ProjectAnalysisResult,
} from '../../types/tauri';

export type {
  AgentSession,
  AgentStatus,
  DbAgentSession,
} from '../../api/agentSession';

export type {
  ChatMessage,
  SessionListItem,
  ChatSessionInfo,
  PaginatedChatHistory,
} from '../../lib/chat';

/**
 * Session update event from watching a CLI session
 */
export interface SessionUpdate {
  sessionId: string;
  messages: ChatMessageType[];
  hasMoreMessages: boolean;
}

/**
 * Callback for session updates (from session watcher)
 */
export type SessionUpdateCallback = (update: SessionUpdate) => void;

/**
 * File tree node for folder browsing
 */
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Unsubscribe function for event listeners
 */
export type UnsubscribeFn = () => void;
