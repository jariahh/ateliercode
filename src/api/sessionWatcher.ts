/**
 * Session File Watcher API
 * Provides real-time updates for CLI session files
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Types for the new plugin-based implementation
export interface HistoryMessage {
  role: string;
  content: any;
  timestamp?: string;
  // Add other relevant fields from your history message structure
}

/** An option in a multiple choice question */
export interface QuestionOption {
  label: string;
  description: string;
}

/** A question from the AskUserQuestion tool */
export interface UserQuestion {
  question: string;
  header: string;
  multi_select: boolean;
  options: QuestionOption[];
}

/** Prompt requiring user input with structured choices */
export interface UserPrompt {
  questions: UserQuestion[];
  tool_use_id: string | null;
}

export interface SessionUpdate {
  type: 'NewMessage' | 'UserPromptRequired' | 'StatusChanged' | 'SessionEnded' | 'Error';
  message?: HistoryMessage | string;  // HistoryMessage for NewMessage, string for Error
  prompt?: UserPrompt;                 // for UserPromptRequired
  status?: string;                     // for StatusChanged
}

interface SessionUpdateEvent {
  cli_session_id: string;
  update: SessionUpdate;
}

/**
 * Start watching a CLI session with the new plugin-based implementation
 *
 * @param pluginName - Name of the CLI plugin
 * @param projectPath - Path to the project directory
 * @param cliSessionId - Session ID to watch
 * @param callback - Function to call when updates occur
 * @returns Unsubscribe function that stops watching and removes the listener
 */
export async function startWatchingSession(
  pluginName: string,
  projectPath: string,
  cliSessionId: string,
  callback: (update: SessionUpdate) => void
): Promise<() => Promise<void>> {
  // IMPORTANT: Set up event listener FIRST before starting the watcher
  // This prevents a race condition where initial messages are sent before the listener is ready
  const unlisten: UnlistenFn = await listen<SessionUpdateEvent>(
    'session-update',
    (event) => {
      // Filter events by cli_session_id
      if (event.payload.cli_session_id === cliSessionId) {
        callback(event.payload.update);
      }
    }
  );

  // Now start watching the session - this will immediately send all existing messages
  const watchId = await invoke<string>('start_watching_session', {
    pluginName,
    projectPath,
    cliSessionId,
  });

  // Return unsubscribe function that includes all required parameters
  return async () => {
    // Stop the watcher - must pass all required parameters
    await invoke('stop_watching_session', {
      pluginName,
      watchId,
      cliSessionId,
    });
    // Remove the event listener
    unlisten();
  };
}
