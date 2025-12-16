/**
 * Backend Service
 *
 * Factory and React context for backend abstraction layer.
 * Enables switching between Tauri (desktop) and WebRTC (web) backends.
 */

import { createContext, useContext } from 'react';
import type { IBackend, BackendType } from './IBackend';
import { TauriBackend, isTauriAvailable } from './TauriBackend';
import { WebRTCBackend, createWebRTCBackend } from './WebRTCBackend';
import { peerConnection } from '../peerConnection';

// Re-export types and interfaces
export type { IBackend, BackendType } from './IBackend';
export type {
  IProjectBackend,
  IAgentBackend,
  IChatBackend,
  IFileBackend,
  ITaskBackend,
  ITranscriptionBackend,
  ISystemBackend,
} from './IBackend';
export * from './types';
export { TauriBackend, isTauriAvailable } from './TauriBackend';
export { WebRTCBackend, createWebRTCBackend } from './WebRTCBackend';

/**
 * Mock backend for development/testing without Tauri
 */
class MockBackend implements IBackend {
  readonly type: BackendType = 'mock';
  readonly isReady: boolean = true;

  projects = {
    create: async () => {
      throw new Error('Mock backend: projects.create not implemented');
    },
    list: async () => [],
    get: async () => null,
    update: async () => {
      throw new Error('Mock backend: projects.update not implemented');
    },
    delete: async () => false,
    hasRecentActivity: async () => false,
    analyze: async () => ({
      suggested_name: 'Mock Project',
      suggested_description: '',
      detected_languages: [],
      detected_frameworks: [],
      file_count: 0,
      has_git: false,
    }),
    analyzeWithAI: async () => ({
      suggested_name: 'Mock Project',
      suggested_description: '',
      detected_languages: [],
      detected_frameworks: [],
      file_count: 0,
      has_git: false,
    }),
    generateDetails: async () => ({
      name: 'Mock Project',
      description: 'Mock project description',
    }),
  } as IBackend['projects'];

  agent = {
    start: async () => {
      throw new Error('Mock backend: agent.start not implemented');
    },
    send: async () => {},
    readOutput: async () => [],
    stop: async () => {},
    getStatus: async () => {
      throw new Error('Mock backend: agent.getStatus not implemented');
    },
    list: async () => [],
    checkHealth: async () => false,
    syncClaudeSessionId: async () => null,
    getProjectSessions: async () => [],
  } as IBackend['agent'];

  chat = {
    getHistory: async () => [],
    getHistoryPaginated: async () => ({
      messages: [],
      total_count: 0,
      has_more: false,
      offset: 0,
    }),
    listSessions: async () => [],
    startSession: async () => {
      throw new Error('Mock backend: chat.startSession not implemented');
    },
    sendMessage: async () => {},
    watchSession: async () => () => {},
  } as IBackend['chat'];

  files = {
    pickFolder: async () => null,
    readFile: async () => '',
    getFolderChildren: async () => [],
    readProjectFiles: async () => [],
    getGitStatus: async () => '',
  } as IBackend['files'];

  tasks = {
    create: async () => {
      throw new Error('Mock backend: tasks.create not implemented');
    },
    list: async () => [],
    update: async () => {
      throw new Error('Mock backend: tasks.update not implemented');
    },
    delete: async () => false,
    updateStatus: async () => {
      throw new Error('Mock backend: tasks.updateStatus not implemented');
    },
  } as IBackend['tasks'];

  transcription = {
    checkWhisperInstallation: async () => ({ installed: false, model_downloaded: false }),
    installWhisper: async () => {},
    transcribeLocal: async () => ({ text: '' }),
    transcribeOpenAI: async () => ({ text: '' }),
  } as IBackend['transcription'];

  system = {
    detectAgents: async () => [],
    getHostname: async () => 'mock-host',
    getPlatform: async () => 'mock',
  } as IBackend['system'];
}

// Singleton backend instance
let backendInstance: IBackend | null = null;

/**
 * Initialize the backend based on the environment
 */
export function initializeBackend(): IBackend {
  if (backendInstance) {
    return backendInstance;
  }

  // Check for Tauri environment - always use TauriBackend for local operations
  // This includes when desktop is hosting WebRTC connections (isHost = true)
  if (isTauriAvailable()) {
    console.log('[Backend] Initializing TauriBackend');
    backendInstance = new TauriBackend();
    return backendInstance;
  }

  // Check for WebRTC connection as CLIENT (web client connected to remote machine)
  // Only use WebRTCBackend when this machine initiated the connection (is the client)
  // Hosts should use TauriBackend (handled above)
  if (peerConnection.isClient) {
    console.log('[Backend] Initializing WebRTCBackend (connected as client)');
    backendInstance = new WebRTCBackend();
    return backendInstance;
  }

  // Fallback to mock backend for browser dev
  console.log('[Backend] Initializing MockBackend (no Tauri available)');
  backendInstance = new MockBackend();
  return backendInstance;
}

/**
 * Switch to WebRTC backend when connected to a remote machine as a CLIENT
 * Call this after establishing a WebRTC connection from the web client
 * NOTE: This should only be called when this machine is the CLIENT (initiator)
 */
export function switchToWebRTCBackend(): IBackend {
  if (!peerConnection.isConnected) {
    throw new Error('Cannot switch to WebRTC backend: not connected');
  }
  // Safety check: don't switch to WebRTC if this machine is the HOST
  // Hosts should always use TauriBackend for local operations
  if (peerConnection.isHost) {
    console.warn('[Backend] Ignoring switchToWebRTCBackend: this machine is the host, not the client');
    return getBackend();
  }
  console.log('[Backend] Switching to WebRTCBackend');
  backendInstance = new WebRTCBackend();
  return backendInstance;
}

/**
 * Switch back to Tauri backend (for desktop app)
 * Call this when disconnecting from a remote machine
 */
export function switchToTauriBackend(): IBackend | null {
  if (!isTauriAvailable()) {
    console.warn('[Backend] Tauri not available, cannot switch');
    return null;
  }
  console.log('[Backend] Switching to TauriBackend');
  backendInstance = new TauriBackend();
  return backendInstance;
}

/**
 * Get the current backend instance
 */
export function getBackend(): IBackend {
  if (!backendInstance) {
    return initializeBackend();
  }
  return backendInstance;
}

/**
 * Set a custom backend instance (useful for testing or WebRTC)
 */
export function setBackend(backend: IBackend): void {
  backendInstance = backend;
}

/**
 * React context for the backend
 */
export const BackendContext = createContext<IBackend | null>(null);

/**
 * Hook to access the backend from React components
 */
export function useBackend(): IBackend {
  const context = useContext(BackendContext);
  if (context) {
    return context;
  }
  // Fallback to singleton if not in context (for gradual migration)
  return getBackend();
}

/**
 * Check which backend type is active
 */
export function getBackendType(): BackendType {
  return getBackend().type;
}
