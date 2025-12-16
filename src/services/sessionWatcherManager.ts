/**
 * Session Watcher Manager
 *
 * Manages file watchers for all active sessions across all tabs.
 * Watchers persist even when switching tabs, enabling:
 * - Activity indicators to flash when new messages arrive
 * - Background sessions to continue being monitored
 * - Users to see updates when they switch back to a tab
 *
 * Watchers are only stopped when:
 * - Session is explicitly stopped by user
 * - Tab is closed
 * - Session ends naturally
 */

import * as sessionWatcher from '../api/sessionWatcher';
import type { SessionUpdate, HistoryMessage } from '../api/sessionWatcher';
import { useChatStore } from '../stores/chatStore';
import { useChatTabStore } from '../stores/chatTabStore';
import { useProjectActivityStore } from '../stores/projectActivityStore';
import { parseAskUserQuestion } from '../lib/parseAskUserQuestion';
import type { ChatMessage, MessageMetadata } from '../components/workspace/ChatTab';
import { peerConnection } from './peerConnection';

// Check if we're in web mode (connected via WebRTC as CLIENT, not local Tauri)
// Only clients should use WebRTC for session watching - hosts use local Tauri API
function isWebMode(): boolean {
  return peerConnection.isClient;
}

// Track whether we've set up the WebRTC event listener
let webRTCEventListenerSetup = false;

/**
 * Set up listener for session events forwarded over WebRTC
 */
function setupWebRTCEventListener(): void {
  if (webRTCEventListenerSetup) return;

  peerConnection.onEvent((event, payload) => {
    if (event === 'session-update') {
      const data = payload as { cli_session_id: string; update: SessionUpdate };
      console.log('[SessionWatcherManager] Received WebRTC session update for:', data.cli_session_id);
      handleSessionUpdate(data.cli_session_id, data.update);
    }
  });

  webRTCEventListenerSetup = true;
  console.log('[SessionWatcherManager] WebRTC event listener set up');
}

interface WatcherState {
  cliSessionId: string;
  tabId: string;
  projectId: string;
  pluginName: string;
  unsubscribe: (() => Promise<void>) | null;
  isStarting: boolean;
}

// Track active watchers by cliSessionId (since that's the unique identifier for a session)
const activeWatchers = new Map<string, WatcherState>();

// Callbacks for UI updates (like setting pending prompts)
type UICallback = (tabId: string, update: SessionUpdate) => void;
let uiCallback: UICallback | null = null;

/**
 * Register a callback for UI-specific updates that can't be handled by stores
 * (e.g., setting pending user prompts which are component state)
 */
export function setUICallback(callback: UICallback | null) {
  uiCallback = callback;
}

/**
 * Start watching a session
 * This should be called when a session is started or resumed
 */
export async function startWatching(
  cliSessionId: string,
  tabId: string,
  projectId: string,
  pluginName: string,
  projectPath: string
): Promise<void> {
  // Check if already watching this session
  if (activeWatchers.has(cliSessionId)) {
    const existing = activeWatchers.get(cliSessionId)!;
    // If same tab, already watching
    if (existing.tabId === tabId) {
      console.log('[SessionWatcherManager] Already watching session:', cliSessionId);
      return;
    }
    // Different tab trying to watch same session - update tab association
    console.log('[SessionWatcherManager] Updating tab association for session:', cliSessionId);
    existing.tabId = tabId;
    return;
  }

  // Check if already starting (prevent duplicate starts)
  const startingEntry = Array.from(activeWatchers.values()).find(
    w => w.cliSessionId === cliSessionId && w.isStarting
  );
  if (startingEntry) {
    console.log('[SessionWatcherManager] Already starting watcher for session:', cliSessionId);
    return;
  }

  console.log('[SessionWatcherManager] Starting watcher for session:', cliSessionId, 'tab:', tabId, 'webMode:', isWebMode());

  // Create entry with isStarting flag
  const watcherState: WatcherState = {
    cliSessionId,
    tabId,
    projectId,
    pluginName,
    unsubscribe: null,
    isStarting: true,
  };
  activeWatchers.set(cliSessionId, watcherState);

  try {
    let unsubscribe: (() => Promise<void>) | null = null;

    if (isWebMode()) {
      // In web mode, use WebRTC to start watching on the remote machine
      // Set up the event listener first to receive forwarded events
      setupWebRTCEventListener();

      // Start watching via WebRTC command
      const watchId = await peerConnection.sendCommand<string>('start_watching_session', {
        pluginName,
        projectPath,
        cliSessionId,
      });

      console.log('[SessionWatcherManager] WebRTC watcher started, watchId:', watchId);

      // Create unsubscribe function that stops the remote watcher
      unsubscribe = async () => {
        await peerConnection.sendCommand('stop_watching_session', {
          pluginName,
          watchId,
          cliSessionId,
        });
      };
    } else {
      // In local Tauri mode, use direct API
      unsubscribe = await sessionWatcher.startWatchingSession(
        pluginName,
        projectPath,
        cliSessionId,
        (update) => handleSessionUpdate(cliSessionId, update)
      );
    }

    // Update state with unsubscribe function
    const state = activeWatchers.get(cliSessionId);
    if (state) {
      state.unsubscribe = unsubscribe;
      state.isStarting = false;
    }

    console.log('[SessionWatcherManager] Watcher started for session:', cliSessionId);
  } catch (error) {
    console.error('[SessionWatcherManager] Failed to start watcher:', error);
    activeWatchers.delete(cliSessionId);
  }
}

/**
 * Stop watching a specific session
 * This should be called when a session is stopped or tab is closed
 */
export async function stopWatching(cliSessionId: string): Promise<void> {
  const state = activeWatchers.get(cliSessionId);
  if (!state) {
    console.log('[SessionWatcherManager] No watcher found for session:', cliSessionId);
    return;
  }

  console.log('[SessionWatcherManager] Stopping watcher for session:', cliSessionId);

  if (state.unsubscribe) {
    try {
      await state.unsubscribe();
    } catch (error) {
      console.error('[SessionWatcherManager] Error stopping watcher:', error);
    }
  }

  activeWatchers.delete(cliSessionId);
}

/**
 * Stop all watchers for a specific tab
 * This should be called when a tab is closed
 */
export async function stopWatchingForTab(tabId: string): Promise<void> {
  const sessionsToStop: string[] = [];

  activeWatchers.forEach((state, cliSessionId) => {
    if (state.tabId === tabId) {
      sessionsToStop.push(cliSessionId);
    }
  });

  console.log('[SessionWatcherManager] Stopping watchers for tab:', tabId, 'sessions:', sessionsToStop);

  await Promise.all(sessionsToStop.map(stopWatching));
}

/**
 * Check if a session is being watched
 */
export function isWatching(cliSessionId: string): boolean {
  return activeWatchers.has(cliSessionId);
}

/**
 * Get the tab ID associated with a session
 */
export function getTabForSession(cliSessionId: string): string | null {
  return activeWatchers.get(cliSessionId)?.tabId || null;
}

/**
 * Handle updates from a session watcher
 */
function handleSessionUpdate(cliSessionId: string, update: SessionUpdate): void {
  const state = activeWatchers.get(cliSessionId);
  if (!state) {
    console.warn('[SessionWatcherManager] Received update for unknown session:', cliSessionId);
    return;
  }

  const { tabId, projectId } = state;
  console.log('[SessionWatcherManager] Update for session:', cliSessionId, 'type:', update.type);

  // Check if this tab is currently active
  const tabs = useChatTabStore.getState().tabsByProject.get(projectId) || [];
  const isActiveTab = tabs.find(t => t.id === tabId)?.is_active || false;

  if (update.type === 'NewMessage' && update.message) {
    if (typeof update.message === 'string') {
      console.log('[SessionWatcherManager] Received string message, skipping');
      return;
    }

    const msg = update.message as HistoryMessage;
    const messageId = msg.id;
    const content = msg.content;
    const timestamp = new Date(msg.timestamp * 1000);
    const role = msg.role as 'user' | 'assistant';

    // Check for duplicate by ID
    const existingMessages = useChatStore.getState().getMessages(tabId);
    if (existingMessages.some(m => m.id === messageId)) {
      console.log('[SessionWatcherManager] Skipping duplicate message:', messageId);
      return;
    }

    const newMessage: ChatMessage = {
      id: messageId,
      role,
      content,
      timestamp,
      status: 'completed',
      metadata: msg.metadata as MessageMetadata | undefined,
    };

    // Add message to store
    useChatStore.getState().addMessage(tabId, newMessage);

    // If this is a user message, try to dequeue it from pending queue
    if (role === 'user') {
      const wasDequeued = useChatStore.getState().dequeueMessage(tabId, content);
      if (wasDequeued) {
        console.log('[SessionWatcherManager] Message confirmed in history, dequeued');
      }
    }

    // Mark tab activity if NOT the active tab or window is not focused
    if (!isActiveTab || document.hidden || !document.hasFocus()) {
      if (role === 'assistant') {
        useChatTabStore.getState().markTabActivity(tabId);
      }
    }

    // Mark project activity for sidebar indicator (flashes for 30 seconds)
    // This fires for ALL messages (user and assistant) to show project is active
    useProjectActivityStore.getState().markActivity(projectId);

    // Check for AskUserQuestion in assistant messages
    if (role === 'assistant' && uiCallback) {
      const prompt = parseAskUserQuestion(content);
      if (prompt) {
        console.log('[SessionWatcherManager] Detected AskUserQuestion');
        uiCallback(tabId, {
          type: 'UserPromptRequired',
          prompt,
        });
      }
    }
  } else if (update.type === 'UserPromptRequired' && update.prompt) {
    console.log('[SessionWatcherManager] User prompt required');
    if (uiCallback) {
      uiCallback(tabId, update);
    }
  } else if (update.type === 'StatusChanged' && update.status) {
    console.log('[SessionWatcherManager] Status changed:', update.status);
    // Update typing indicator based on process status
    if (update.status === 'working') {
      useChatStore.getState().setTyping(tabId, true);
    } else if (update.status === 'idle') {
      useChatStore.getState().setTyping(tabId, false);
    }
  } else if (update.type === 'Error') {
    console.error('[SessionWatcherManager] Session error:', update.message);
  } else if (update.type === 'SessionEnded') {
    console.log('[SessionWatcherManager] Session ended');
    // Optionally stop watching when session ends
    // stopWatching(cliSessionId);
  }
}

/**
 * Stop all watchers (cleanup on app unmount)
 */
export async function stopAllWatching(): Promise<void> {
  console.log('[SessionWatcherManager] Stopping all watchers');
  const sessions = Array.from(activeWatchers.keys());
  await Promise.all(sessions.map(stopWatching));
}

/**
 * Get all active watchers (for debugging)
 */
export function getActiveWatchers(): Map<string, { tabId: string; projectId: string }> {
  const result = new Map<string, { tabId: string; projectId: string }>();
  activeWatchers.forEach((state, cliSessionId) => {
    result.set(cliSessionId, { tabId: state.tabId, projectId: state.projectId });
  });
  return result;
}
