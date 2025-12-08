import * as agentSessionApi from '../api/agentSession';
import { useSessionStore } from '../stores/sessionStore';
import { useChatStore } from '../stores/chatStore';
import { useChatTabStore } from '../stores/chatTabStore';
import type { ChatMessage } from '../components/workspace/ChatTab';

interface PollingState {
  intervalId: NodeJS.Timeout | null;
  isPolling: boolean;
  consecutiveErrors: number;
}

// Track polling state per tab (since each tab can have its own session)
const pollingStates = new Map<string, PollingState>();

// Stop polling after this many consecutive "Session not found" errors
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Start polling for a tab's session
 * This runs in the background even when the user switches tabs
 */
export function startPolling(tabId: string) {
  // Don't start if already polling
  if (pollingStates.get(tabId)?.isPolling) {
    console.log('[SessionPolling] Already polling for tab:', tabId);
    return;
  }

  console.log('[SessionPolling] Starting polling for tab:', tabId);

  const intervalId = setInterval(async () => {
    await pollSession(tabId);
  }, 2000); // Poll every 2 seconds

  pollingStates.set(tabId, {
    intervalId,
    isPolling: true,
    consecutiveErrors: 0,
  });
}

/**
 * Stop polling for a tab
 */
export function stopPolling(tabId: string) {
  const state = pollingStates.get(tabId);
  if (!state) return;

  console.log('[SessionPolling] Stopping polling for tab:', tabId);

  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  pollingStates.delete(tabId);
}

/**
 * Check if currently polling for a tab
 */
export function isPolling(tabId: string): boolean {
  return pollingStates.get(tabId)?.isPolling || false;
}

/**
 * Poll a single tab's session for updates
 */
async function pollSession(tabId: string) {
  try {
    // Get the session for this tab
    const session = useSessionStore.getState().getActiveSession(tabId);
    if (!session || session.status !== 'running') {
      // No active session or session not running, stop polling
      stopPolling(tabId);
      return;
    }

    // Check if this tab is currently active
    const projectId = session.project_id;
    const tabs = useChatTabStore.getState().tabsByProject.get(projectId) || [];
    const tab = tabs.find(t => t.id === tabId);
    const activeTab = tabs.find(t => t.is_active);

    // If this tab is not the active one, mark activity but don't add messages
    if (tab && activeTab && tab.id !== activeTab.id) {
      // Mark activity on this tab since it has new output
      useChatTabStore.getState().markTabActivity(tabId);
      // Still read output to prevent buffer overflow, but don't display
      await agentSessionApi.readAgentOutput(session.session_id);
      return;
    }

    // Get output (returns array of strings)
    const outputLines = await agentSessionApi.readAgentOutput(session.session_id);

    // Process output for chat messages
    if (outputLines && outputLines.length > 0) {
      // Join all output lines into a single string
      const output = outputLines.join('\n');
      const parsedOutput = tryParseOutput(output);

      if (parsedOutput.raw_text && parsedOutput.raw_text.trim()) {
        const currentMessages = useChatStore.getState().getMessages(tabId);
        const lastMessage = currentMessages[currentMessages.length - 1];
        const updateMessage = useChatStore.getState().updateMessage;
        const addMessage = useChatStore.getState().addMessage;

        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          // Append to existing streaming message
          updateMessage(tabId, lastMessage.id, {
            content: lastMessage.content + '\n' + parsedOutput.raw_text,
          });
        } else {
          // Create new streaming message
          const newMessage: ChatMessage = {
            id: `stream-${Date.now()}`,
            role: 'assistant',
            content: parsedOutput.raw_text,
            timestamp: new Date(),
            status: 'streaming',
            isStreaming: true,
          };
          addMessage(tabId, newMessage);
        }

        // Reset typing state for this tab when we receive output
        useChatStore.getState().setTyping(tabId, false);
      }
    }
    // Success - reset consecutive errors
    const state = pollingStates.get(tabId);
    if (state) {
      state.consecutiveErrors = 0;
    }
  } catch (error) {
    const errorMessage = String(error);
    const state = pollingStates.get(tabId);

    // Check if this is a "Session not found" error
    if (errorMessage.includes('Session not found')) {
      if (state) {
        state.consecutiveErrors++;

        // Stop polling after too many consecutive "Session not found" errors
        // This indicates the session never started properly
        if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(
            `[SessionPolling] Session not found after ${MAX_CONSECUTIVE_ERRORS} attempts for tab:`,
            tabId,
            '- stopping polling'
          );
          stopPolling(tabId);

          // Clear the session from the store since it doesn't exist
          useSessionStore.getState().clearSession(tabId);
          return;
        }
      }
    }

    console.error('[SessionPolling] Error polling session for tab:', tabId, error);
  }
}

/**
 * Try to parse output as JSON, fallback to raw text
 */
function tryParseOutput(output: string): { raw_text: string; error?: string } {
  try {
    const parsed = JSON.parse(output);
    return parsed;
  } catch {
    return { raw_text: output };
  }
}

/**
 * Stop all polling (cleanup on app unmount)
 */
export function stopAllPolling() {
  console.log('[SessionPolling] Stopping all polling');
  pollingStates.forEach((_, tabId) => {
    stopPolling(tabId);
  });
}
