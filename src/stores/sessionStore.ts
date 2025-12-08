import { create } from 'zustand';
import type { AgentSession } from '../api/agentSession';

interface SessionState {
  // Active session per tab (keyed by tabId for multi-agent support)
  sessionsByTab: Map<string, AgentSession>;

  // Set active session for a tab
  setActiveSession: (tabId: string, session: AgentSession | null) => void;

  // Get active session for a tab
  getActiveSession: (tabId: string) => AgentSession | null;

  // Clear session for a tab
  clearSession: (tabId: string) => void;

  // Clear all sessions
  clearAllSessions: () => void;

  // Get all sessions for a project (by checking all tabs)
  getProjectSessions: (projectId: string, tabIds: string[]) => AgentSession[];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionsByTab: new Map(),

  setActiveSession: (tabId: string, session: AgentSession | null) => {
    set((state) => {
      const newSessions = new Map(state.sessionsByTab);
      if (session) {
        newSessions.set(tabId, session);
      } else {
        newSessions.delete(tabId);
      }
      return { sessionsByTab: newSessions };
    });
  },

  getActiveSession: (tabId: string) => {
    return get().sessionsByTab.get(tabId) || null;
  },

  clearSession: (tabId: string) => {
    set((state) => {
      const newSessions = new Map(state.sessionsByTab);
      newSessions.delete(tabId);
      return { sessionsByTab: newSessions };
    });
  },

  clearAllSessions: () => {
    set({ sessionsByTab: new Map() });
  },

  getProjectSessions: (projectId: string, tabIds: string[]) => {
    const sessions: AgentSession[] = [];
    const state = get();
    for (const tabId of tabIds) {
      const session = state.sessionsByTab.get(tabId);
      if (session && session.project_id === projectId) {
        sessions.push(session);
      }
    }
    return sessions;
  },
}));
