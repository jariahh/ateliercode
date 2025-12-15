import { create } from 'zustand';
import type { ChatMessage } from '../components/workspace/ChatTab';

// Maximum messages to keep in memory per tab (prevents unbounded growth)
const MAX_MESSAGES_PER_TAB = 500;

// Prune to this many messages when limit is exceeded
const PRUNE_TO_COUNT = 300;

interface ChatState {
  // Messages per tab (keyed by tabId for proper isolation)
  messagesByTab: Map<string, ChatMessage[]>;

  // Message ID sets for O(1) duplicate checking
  messageIdsByTab: Map<string, Set<string>>;

  // Typing state per tab (true when waiting for response)
  typingByTab: Map<string, boolean>;

  // Pending message queue per tab (messages waiting to be sent)
  // These are messages the user typed while the agent was processing
  pendingQueueByTab: Map<string, string[]>;

  // Get messages for a tab
  getMessages: (tabId: string) => ChatMessage[];

  // Set messages for a tab
  setMessages: (tabId: string, messages: ChatMessage[]) => void;

  // Add a message to a tab
  addMessage: (tabId: string, message: ChatMessage) => void;

  // Update a message in a tab
  updateMessage: (tabId: string, messageId: string, updates: Partial<ChatMessage>) => void;

  // Clear messages for a tab
  clearMessages: (tabId: string) => void;

  // Clear all messages
  clearAllMessages: () => void;

  // Prune old messages for a tab (keep most recent)
  pruneMessages: (tabId: string) => void;

  // Get typing state for a tab
  getTyping: (tabId: string) => boolean;

  // Set typing state for a tab
  setTyping: (tabId: string, isTyping: boolean) => void;

  // Queue a message to be sent (when agent is busy)
  queueMessage: (tabId: string, content: string) => void;

  // Get all queued messages for a tab
  getQueuedMessages: (tabId: string) => string[];

  // Clear the queue and return all messages (for sending)
  flushQueue: (tabId: string) => string[];

  // Remove specific message from queue (when seen in history)
  dequeueMessage: (tabId: string, content: string) => boolean;

  // Check if queue has messages
  hasQueuedMessages: (tabId: string) => boolean;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByTab: new Map(),
  messageIdsByTab: new Map(),
  typingByTab: new Map(),
  pendingQueueByTab: new Map(),

  getMessages: (tabId: string) => {
    return get().messagesByTab.get(tabId) || [];
  },

  setMessages: (tabId: string, messages: ChatMessage[]) => {
    set((state) => {
      const newMap = new Map(state.messagesByTab);
      const newIdMap = new Map(state.messageIdsByTab);

      // Build ID set for fast lookups
      const idSet = new Set(messages.map(m => m.id));

      newMap.set(tabId, messages);
      newIdMap.set(tabId, idSet);

      return {
        messagesByTab: newMap,
        messageIdsByTab: newIdMap
      };
    });
  },

  addMessage: (tabId: string, message: ChatMessage) => {
    set((state) => {
      const newMap = new Map(state.messagesByTab);
      const newIdMap = new Map(state.messageIdsByTab);
      const currentMessages = newMap.get(tabId) || [];
      const idSet = newIdMap.get(tabId) || new Set();

      // Check if message with same ID already exists (O(1) lookup)
      if (idSet.has(message.id)) {
        console.log('[ChatStore] Message with ID already exists, skipping:', message.id);
        return state; // No change
      }

      const newMessages = [...currentMessages, message];
      const newIdSet = new Set(idSet);
      newIdSet.add(message.id);

      // Auto-prune if exceeds limit
      if (newMessages.length > MAX_MESSAGES_PER_TAB) {
        console.log(`[ChatStore] Pruning messages for tab ${tabId}: ${newMessages.length} -> ${PRUNE_TO_COUNT}`);
        // Keep most recent messages
        const prunedMessages = newMessages.slice(-PRUNE_TO_COUNT);
        const prunedIdSet = new Set(prunedMessages.map(m => m.id));
        newMap.set(tabId, prunedMessages);
        newIdMap.set(tabId, prunedIdSet);
      } else {
        newMap.set(tabId, newMessages);
        newIdMap.set(tabId, newIdSet);
      }

      return {
        messagesByTab: newMap,
        messageIdsByTab: newIdMap
      };
    });
  },

  updateMessage: (tabId: string, messageId: string, updates: Partial<ChatMessage>) => {
    set((state) => {
      const newMap = new Map(state.messagesByTab);
      const newIdMap = new Map(state.messageIdsByTab);
      const messages = newMap.get(tabId) || [];
      const updatedMessages = messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      newMap.set(tabId, updatedMessages);
      // ID set remains the same since we're just updating, not adding/removing
      return {
        messagesByTab: newMap,
        messageIdsByTab: newIdMap
      };
    });
  },

  clearMessages: (tabId: string) => {
    set((state) => {
      const newMap = new Map(state.messagesByTab);
      const newIdMap = new Map(state.messageIdsByTab);
      newMap.delete(tabId);
      newIdMap.delete(tabId);
      return {
        messagesByTab: newMap,
        messageIdsByTab: newIdMap
      };
    });
  },

  clearAllMessages: () => {
    set({
      messagesByTab: new Map(),
      messageIdsByTab: new Map()
    });
  },

  pruneMessages: (tabId: string) => {
    set((state) => {
      const newMap = new Map(state.messagesByTab);
      const newIdMap = new Map(state.messageIdsByTab);
      const messages = newMap.get(tabId) || [];

      if (messages.length > PRUNE_TO_COUNT) {
        console.log(`[ChatStore] Manual prune for tab ${tabId}: ${messages.length} -> ${PRUNE_TO_COUNT}`);
        const prunedMessages = messages.slice(-PRUNE_TO_COUNT);
        const prunedIdSet = new Set(prunedMessages.map(m => m.id));
        newMap.set(tabId, prunedMessages);
        newIdMap.set(tabId, prunedIdSet);
        return {
          messagesByTab: newMap,
          messageIdsByTab: newIdMap
        };
      }

      return state; // No change needed
    });
  },

  getTyping: (tabId: string) => {
    return get().typingByTab.get(tabId) || false;
  },

  setTyping: (tabId: string, isTyping: boolean) => {
    set((state) => {
      const newMap = new Map(state.typingByTab);
      if (isTyping) {
        newMap.set(tabId, true);
      } else {
        newMap.delete(tabId); // Remove entry when not typing to keep map clean
      }
      return { typingByTab: newMap };
    });
  },

  queueMessage: (tabId: string, content: string) => {
    set((state) => {
      const newMap = new Map(state.pendingQueueByTab);
      const queue = newMap.get(tabId) || [];
      newMap.set(tabId, [...queue, content]);
      console.log(`[ChatStore] Queued message for tab ${tabId}:`, content.substring(0, 50));
      return { pendingQueueByTab: newMap };
    });
  },

  getQueuedMessages: (tabId: string) => {
    return get().pendingQueueByTab.get(tabId) || [];
  },

  flushQueue: (tabId: string) => {
    const queue = get().pendingQueueByTab.get(tabId) || [];
    set((state) => {
      const newMap = new Map(state.pendingQueueByTab);
      newMap.delete(tabId);
      return { pendingQueueByTab: newMap };
    });
    console.log(`[ChatStore] Flushed ${queue.length} messages from queue for tab ${tabId}`);
    return queue;
  },

  dequeueMessage: (tabId: string, content: string) => {
    const queue = get().pendingQueueByTab.get(tabId) || [];
    // Find and remove the first matching message (normalize whitespace for comparison)
    const normalizedContent = content.trim();
    const index = queue.findIndex(msg => msg.trim() === normalizedContent);

    if (index !== -1) {
      set((state) => {
        const newMap = new Map(state.pendingQueueByTab);
        const newQueue = [...queue];
        newQueue.splice(index, 1);
        if (newQueue.length === 0) {
          newMap.delete(tabId);
        } else {
          newMap.set(tabId, newQueue);
        }
        return { pendingQueueByTab: newMap };
      });
      console.log(`[ChatStore] Dequeued message for tab ${tabId}:`, content.substring(0, 50));
      return true;
    }
    return false;
  },

  hasQueuedMessages: (tabId: string) => {
    const queue = get().pendingQueueByTab.get(tabId);
    return queue !== undefined && queue.length > 0;
  },
}));
