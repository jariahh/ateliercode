/**
 * Chat Tab Store - manages chat tab state using Zustand
 * Supports multiple tabs per project, each with its own agent and session
 */

import { create } from 'zustand';
import * as chatTabsApi from '../api/chatTabs';
import type { ChatTab } from '../api/chatTabs';

interface ChatTabState {
  // State - tabs indexed by project ID
  tabsByProject: Map<string, ChatTab[]>;
  // Track tabs with unread activity (tab ID -> has activity)
  tabsWithActivity: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTabs: (projectId: string) => Promise<void>;
  createTab: (projectId: string, agentType: string, label?: string) => Promise<ChatTab>;
  updateTab: (tabId: string, updates: { label?: string; sessionId?: string; cliSessionId?: string }) => Promise<void>;
  setActiveTab: (projectId: string, tabId: string) => Promise<void>;
  closeTab: (projectId: string, tabId: string) => Promise<void>;
  reorderTabs: (projectId: string, tabIds: string[]) => Promise<void>;

  // Activity tracking
  markTabActivity: (tabId: string) => void;
  clearTabActivity: (tabId: string) => void;
  hasTabActivity: (tabId: string) => boolean;

  // Getters
  getTabs: (projectId: string) => ChatTab[];
  getActiveTab: (projectId: string) => ChatTab | null;
  getTab: (projectId: string, tabId: string) => ChatTab | null;
}

export const useChatTabStore = create<ChatTabState>((set, get) => ({
  tabsByProject: new Map(),
  tabsWithActivity: new Set(),
  isLoading: false,
  error: null,

  /**
   * Load tabs for a project from the backend
   */
  loadTabs: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const tabs = await chatTabsApi.getChatTabs(projectId);
      set((state) => {
        const newMap = new Map(state.tabsByProject);
        newMap.set(projectId, tabs);
        return { tabsByProject: newMap, isLoading: false };
      });
    } catch (error) {
      console.error('Failed to load tabs:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  /**
   * Create a new tab for a project
   */
  createTab: async (projectId: string, agentType: string, label?: string) => {
    set({ isLoading: true, error: null });
    try {
      const newTab = await chatTabsApi.createChatTab(projectId, agentType, label);

      set((state) => {
        const newMap = new Map(state.tabsByProject);
        const existingTabs = newMap.get(projectId) || [];

        // If this is the first tab, it becomes active (backend handles this)
        // Otherwise, deactivate other tabs if the new one is active
        let updatedTabs: ChatTab[];
        if (newTab.is_active) {
          updatedTabs = existingTabs.map(t => ({ ...t, is_active: false }));
          updatedTabs.push(newTab);
        } else {
          updatedTabs = [...existingTabs, newTab];
        }

        newMap.set(projectId, updatedTabs);
        return { tabsByProject: newMap, isLoading: false };
      });

      return newTab;
    } catch (error) {
      console.error('Failed to create tab:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  /**
   * Update a tab's properties
   */
  updateTab: async (tabId: string, updates: { label?: string; sessionId?: string; cliSessionId?: string }) => {
    try {
      const updatedTab = await chatTabsApi.updateChatTab(tabId, updates);

      set((state) => {
        const newMap = new Map(state.tabsByProject);
        const projectTabs = newMap.get(updatedTab.project_id);
        if (projectTabs) {
          const updatedTabs = projectTabs.map(t =>
            t.id === tabId ? updatedTab : t
          );
          newMap.set(updatedTab.project_id, updatedTabs);
        }
        return { tabsByProject: newMap };
      });
    } catch (error) {
      console.error('Failed to update tab:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  /**
   * Set the active tab for a project
   */
  setActiveTab: async (projectId: string, tabId: string) => {
    try {
      await chatTabsApi.setActiveTab(projectId, tabId);

      set((state) => {
        const newMap = new Map(state.tabsByProject);
        const projectTabs = newMap.get(projectId);
        if (projectTabs) {
          const updatedTabs = projectTabs.map(t => ({
            ...t,
            is_active: t.id === tabId,
          }));
          newMap.set(projectId, updatedTabs);
        }

        // Clear activity indicator for the newly active tab
        const newActivitySet = new Set(state.tabsWithActivity);
        newActivitySet.delete(tabId);

        return { tabsByProject: newMap, tabsWithActivity: newActivitySet };
      });
    } catch (error) {
      console.error('Failed to set active tab:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  /**
   * Close/delete a tab
   */
  closeTab: async (projectId: string, tabId: string) => {
    try {
      await chatTabsApi.closeChatTab(tabId);

      set((state) => {
        const newMap = new Map(state.tabsByProject);
        const projectTabs = newMap.get(projectId);
        if (projectTabs) {
          const closedTab = projectTabs.find(t => t.id === tabId);
          let updatedTabs = projectTabs.filter(t => t.id !== tabId);

          // Re-number tab_order
          updatedTabs = updatedTabs.map((t, index) => ({
            ...t,
            tab_order: index,
          }));

          // If closed tab was active, activate the first remaining tab
          if (closedTab?.is_active && updatedTabs.length > 0) {
            updatedTabs[0].is_active = true;
          }

          newMap.set(projectId, updatedTabs);
        }
        return { tabsByProject: newMap };
      });
    } catch (error) {
      console.error('Failed to close tab:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  /**
   * Reorder tabs
   */
  reorderTabs: async (projectId: string, tabIds: string[]) => {
    try {
      await chatTabsApi.reorderChatTabs(projectId, tabIds);

      set((state) => {
        const newMap = new Map(state.tabsByProject);
        const projectTabs = newMap.get(projectId);
        if (projectTabs) {
          // Reorder tabs based on the new order
          const tabMap = new Map(projectTabs.map(t => [t.id, t]));
          const reorderedTabs = tabIds
            .map((id, index) => {
              const tab = tabMap.get(id);
              return tab ? { ...tab, tab_order: index } : null;
            })
            .filter((t): t is ChatTab => t !== null);
          newMap.set(projectId, reorderedTabs);
        }
        return { tabsByProject: newMap };
      });
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  /**
   * Mark a tab as having new activity (unread messages)
   */
  markTabActivity: (tabId: string) => {
    set((state) => {
      // Don't mark activity for the active tab
      let isActiveTab = false;
      state.tabsByProject.forEach((tabs) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.is_active) {
          isActiveTab = true;
        }
      });

      if (isActiveTab) {
        return state; // Don't mark activity for active tab
      }

      const newSet = new Set(state.tabsWithActivity);
      newSet.add(tabId);
      return { tabsWithActivity: newSet };
    });
  },

  /**
   * Clear activity indicator for a tab
   */
  clearTabActivity: (tabId: string) => {
    set((state) => {
      const newSet = new Set(state.tabsWithActivity);
      newSet.delete(tabId);
      return { tabsWithActivity: newSet };
    });
  },

  /**
   * Check if a tab has unread activity
   */
  hasTabActivity: (tabId: string) => {
    return get().tabsWithActivity.has(tabId);
  },

  /**
   * Get tabs for a project
   */
  getTabs: (projectId: string) => {
    return get().tabsByProject.get(projectId) || [];
  },

  /**
   * Get the active tab for a project
   */
  getActiveTab: (projectId: string) => {
    const tabs = get().tabsByProject.get(projectId) || [];
    return tabs.find(t => t.is_active) || null;
  },

  /**
   * Get a specific tab
   */
  getTab: (projectId: string, tabId: string) => {
    const tabs = get().tabsByProject.get(projectId) || [];
    return tabs.find(t => t.id === tabId) || null;
  },
}));

// Selector hooks for better performance
export const useProjectTabs = (projectId: string) =>
  useChatTabStore((state) => state.tabsByProject.get(projectId) || []);

export const useActiveTab = (projectId: string) =>
  useChatTabStore((state) => {
    const tabs = state.tabsByProject.get(projectId) || [];
    return tabs.find(t => t.is_active) || null;
  });
