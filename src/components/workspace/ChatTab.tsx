import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, Sparkles, Power, PowerOff, History, X, Mic } from 'lucide-react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import * as agentSessionApi from '../../api/agentSession';
import * as pluginChatApi from '../../lib/chat';
import type { UserPrompt } from '../../api/sessionWatcher';
import type { ChatMessage as BackendChatMessage } from '../../types/tauri';
import type { AgentSession } from '../../api/agentSession';
import * as sessionPolling from '../../services/sessionPollingManager';
import * as sessionWatcherManager from '../../services/sessionWatcherManager';
import { useBackend } from '../../services/backend';
import { peerConnection } from '../../services/peerConnection';
import { useProjectStore } from '../../stores/projectStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { useChatTabStore } from '../../stores/chatTabStore';
import { useSettingsStore } from '../../stores/settingsStore';
import QuickActions from '../chat/QuickActions';
import MessageSkeleton from '../chat/MessageSkeleton';
import MessageContent from '../chat/MessageContent';
import SessionHistoryModal from '../chat/SessionHistoryModal';
import VirtualizedMessageList from '../chat/VirtualizedMessageList';
import UserPromptDialog from '../chat/UserPromptDialog';
import ChatTabBar from '../chat/ChatTabBar';
import VoiceRecordingModal from '../chat/VoiceRecordingModal';

// Dynamic processing message generator - creates thousands of unique sayings
const SAYING_VERBS = [
  // Atelier/craft verbs
  "Crafting", "Sculpting", "Forging", "Weaving", "Carving", "Polishing", "Molding",
  "Sketching", "Painting", "Etching", "Glazing", "Tempering", "Threading", "Gilding",
  // Tech verbs
  "Compiling", "Parsing", "Debugging", "Optimizing", "Indexing", "Caching", "Rendering",
  "Deploying", "Syncing", "Merging", "Querying", "Decoding", "Encrypting", "Streaming",
  // Thoughtful verbs
  "Contemplating", "Analyzing", "Pondering", "Meditating on", "Evaluating", "Examining",
  "Investigating", "Researching", "Deliberating on", "Considering", "Reflecting on",
  // Action verbs
  "Summoning", "Channeling", "Exploring", "Synthesizing", "Gathering", "Mining",
  "Hunting for", "Navigating", "Charting", "Discovering", "Unlocking", "Conjuring",
  // Creative verbs
  "Composing", "Orchestrating", "Architecting", "Designing", "Imagining", "Dreaming up",
  "Curating", "Distilling", "Brewing", "Stirring up", "Awakening", "Illuminating",
];

const SAYING_NOUNS = [
  // Atelier/craft nouns
  "the masterpiece", "your solution", "the design", "the blueprint", "the framework",
  "the pattern", "the details", "the finishing touches", "the architecture", "the structure",
  // Abstract nouns
  "possibilities", "ideas", "inspiration", "brilliance", "wisdom", "insights",
  "creativity", "innovation", "solutions", "answers", "magic", "genius",
  // Tech nouns
  "the code", "the logic", "the algorithm", "the data", "the response", "the output",
  "the matrix", "the pathways", "the connections", "the system", "the components",
  // Whimsical nouns
  "the cosmos", "the muse", "the stars", "secrets", "treasures", "diamonds",
  "the runes", "the spell", "the potion", "the prophecy", "the ancient scrolls",
];

// Special standalone sayings that don't follow the verb+noun pattern
const SPECIAL_SAYINGS = [
  "The artisan is at work...",
  "Studio session in progress...",
  "The craftsman ponders...",
  "Apprentice hard at work...",
  "Masterpiece loading...",
  "The workshop hums quietly...",
  "The guild master thinks...",
  "Artistry in progress...",
  "Firing up the kiln...",
  "Setting up the easel...",
  "Measuring twice, cutting once...",
  "Consulting the code oracle...",
  "Asking the magic 8-ball...",
  "Reading the tea leaves...",
  "Thinking deeply...",
  "Almost there...",
  "Making progress...",
  "Working on it...",
  "Just a moment...",
  "Hang tight...",
];

// Generate a random saying
function getRandomSaying(): string {
  // 30% chance of special saying, 70% chance of generated saying
  if (Math.random() < 0.3) {
    return SPECIAL_SAYINGS[Math.floor(Math.random() * SPECIAL_SAYINGS.length)];
  }

  const verb = SAYING_VERBS[Math.floor(Math.random() * SAYING_VERBS.length)];
  const noun = SAYING_NOUNS[Math.floor(Math.random() * SAYING_NOUNS.length)];
  return `${verb} ${noun}...`;
}

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'completed' | 'error';

export interface MessageMetadata {
  // Common fields
  tokensUsed?: number;
  processingTime?: number;
  model?: string;
  error?: string;

  // Tool message fields (set by plugins for merged tool messages)
  is_tool_message?: string;  // "true" if this is a tool message
  is_pending?: string;       // "true" if tool is still running
  is_error?: string;         // "true" if tool failed
  tool_name?: string;        // Name of the tool (Bash, Read, etc.)
  tool_input?: string;       // JSON string of tool input params
  tool_result?: string;      // Tool result/output content
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: MessageMetadata;
  isStreaming?: boolean;
}

export interface ChatTabProps {
  projectId?: string;
}


// Helper function to convert backend message to frontend format
function convertMessage(backendMsg: BackendChatMessage): ChatMessage {
  let metadata: MessageMetadata | undefined;
  if (backendMsg.metadata) {
    try {
      metadata = JSON.parse(backendMsg.metadata);
    } catch (e) {
      console.warn('Failed to parse message metadata:', e);
    }
  }

  return {
    id: backendMsg.id,
    role: backendMsg.role as 'user' | 'assistant',
    content: backendMsg.content,
    timestamp: new Date(backendMsg.timestamp * 1000),
    status: 'completed',
    metadata,
    isStreaming: false,
  };
}

export default function ChatTab({ projectId }: ChatTabProps) {
  // Backend abstraction for Tauri/WebRTC
  const backend = useBackend();

  // Tab state - for multi-agent support (MUST be before messages for proper tab isolation)
  const tabs = useChatTabStore((state) => state.tabsByProject.get(projectId || '') || []);
  const activeTab = tabs.find(t => t.is_active) || null;
  const activeTabId = activeTab?.id || '';

  // Get messages for current tab - keyed by tabId for proper isolation
  const messages = useChatStore(
    (state) => state.getMessages(activeTabId),
    (a, b) => {
      // Force re-render when messages change
      return a.length === b.length && a.every((msg, i) => msg.id === b[i]?.id);
    }
  );
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);

  // Message queue for pending messages (sent while agent is processing)
  const queueMessage = useChatStore((state) => state.queueMessage);
  const getQueuedMessages = useChatStore((state) => state.getQueuedMessages);
  const flushQueue = useChatStore((state) => state.flushQueue);
  const dequeueMessage = useChatStore((state) => state.dequeueMessage);

  // "Load more" functionality for older messages
  const prependMessages = useChatStore((state) => state.prependMessages);
  const historyMeta = useChatStore((state) => state.getHistoryMeta(activeTabId));
  const hasMoreMessages = useChatStore((state) => state.hasMoreMessages(activeTabId));

  // Debug logging
  console.log('[ChatTab] Rendering with projectId:', projectId, 'messages:', messages.length);
  const [inputValue, setInputValue] = useState('');
  // Typing state is now per-tab (stored in chatStore) to prevent one tab's typing from blocking others
  const isTyping = useChatStore((state) => state.getTyping(activeTabId));
  const setTyping = useChatStore((state) => state.setTyping);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pagination state for history loading
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const MESSAGES_PER_PAGE = 50;

  // Processing saying state - dynamically generated messages while AI is thinking
  const [currentSaying, setCurrentSaying] = useState(() => getRandomSaying());

  // Session state - use shared store (keyed by tabId for multi-agent support)
  const activeSession = useSessionStore((state) => state.getActiveSession(activeTabId));
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  // dbSessionId removed - we now use only plugin-based chat history
  // Session history is now loaded on-demand via plugin system in SessionHistoryModal
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  const [pendingUserPrompt, setPendingUserPrompt] = useState<UserPrompt | null>(null);
  const skipNextLoadRef = useRef(false); // Flag to skip the next loadData call

  // Voice recording state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Tab state - loaded from store (tabs/activeTab/activeTabId already defined at top)
  const loadTabs = useChatTabStore((state) => state.loadTabs);
  const createTab = useChatTabStore((state) => state.createTab);
  const updateTab = useChatTabStore((state) => state.updateTab);
  const setActiveTabInStore = useChatTabStore((state) => state.setActiveTab);
  const closeTab = useChatTabStore((state) => state.closeTab);
  // Note: markTabActivity is now handled by sessionWatcherManager

  // Get project info
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);

  // Use the active tab's agent type, falling back to project default
  const currentAgentType = activeTab?.agent_type || project?.agent_type;

  // Track if we've already created a default tab for this project
  const defaultTabCreatedRef = useRef<string | null>(null);
  const clearTabActivity = useChatTabStore((state) => state.clearTabActivity);

  // Clear activity for active tab when user focuses the window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab) {
        clearTabActivity(activeTab.id);
      }
    };

    const handleFocus = () => {
      if (activeTab) {
        clearTabActivity(activeTab.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab, clearTabActivity]);

  // Load tabs on mount
  useEffect(() => {
    if (projectId) {
      loadTabs(projectId).then(() => {
        // If no tabs exist, create a default tab with the project's agent
        // Only do this once per project
        const currentTabs = useChatTabStore.getState().tabsByProject.get(projectId) || [];
        if (currentTabs.length === 0 && project?.agent_type && defaultTabCreatedRef.current !== projectId) {
          defaultTabCreatedRef.current = projectId;
          createTab(projectId, project.agent_type);
        }
      });
    }
  }, [projectId, loadTabs, createTab, project?.agent_type]);

  // Tab handlers
  const handleTabClick = useCallback(async (tabId: string) => {
    if (!projectId) return;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    console.log('[ChatTab] Switching to tab:', tabId, 'agent:', tab.agent_type, 'session:', tab.cli_session_id);

    // Set the new tab as active
    await setActiveTabInStore(projectId, tabId);

    // NOTE: We do NOT clear messages or sessions when switching tabs!
    // Messages are stored per-tab in chatStore (messagesByTab)
    // Sessions are stored per-tab in sessionStore (sessionsByTab)
    // Both stores handle tab isolation automatically.
    //
    // This allows:
    // 1. Fast tab switching without reloading data
    // 2. Session watchers to continue running in background
    // 3. Messages to persist when switching back and forth
    //
    // The useEffect will handle any necessary loading based on activeSession state.
  }, [projectId, tabs, setActiveTabInStore]);

  const handleTabClose = useCallback(async (tabId: string) => {
    if (!projectId) return;

    // Stop any watchers for sessions in this tab
    await sessionWatcherManager.stopWatchingForTab(tabId);

    // Stop polling for this tab
    sessionPolling.stopPolling(tabId);

    await closeTab(projectId, tabId);
  }, [projectId, closeTab]);

  const handleAddTab = useCallback(async () => {
    // Add a new tab with the project's default agent directly
    console.log('[ChatTab] handleAddTab called, projectId:', projectId, 'agent_type:', project?.agent_type);
    if (!projectId || !project?.agent_type) {
      console.error('[ChatTab] Cannot add tab - missing projectId or agent type');
      return;
    }
    try {
      console.log('[ChatTab] Creating new tab...');
      const newTab = await createTab(projectId, project.agent_type);
      console.log('[ChatTab] New tab created:', newTab);
      await setActiveTabInStore(projectId, newTab.id);
      console.log('[ChatTab] Tab set as active');
    } catch (error) {
      console.error('[ChatTab] Failed to create new tab:', error);
    }
  }, [projectId, project?.agent_type, createTab, setActiveTabInStore]);

  const handleAgentSelect = useCallback(async (agentType: string) => {
    console.log('[ChatTab] handleAgentSelect called with agentType:', agentType, 'projectId:', projectId);
    if (!projectId) {
      console.error('[ChatTab] No projectId, cannot create tab');
      return;
    }
    try {
      console.log('[ChatTab] Calling createTab...');
      const newTab = await createTab(projectId, agentType);
      console.log('[ChatTab] Tab created:', newTab);
      // Make the new tab active
      await setActiveTabInStore(projectId, newTab.id);
      console.log('[ChatTab] Tab set as active');
    } catch (error) {
      console.error('[ChatTab] Failed to create tab with agent:', error);
    }
  }, [projectId, createTab, setActiveTabInStore]);

  const handleRenameTab = useCallback(async (tabId: string, newLabel: string) => {
    await updateTab(tabId, { label: newLabel });
  }, [updateTab]);

  // Load chat history from plugin on mount or when active session changes
  // All chat history now comes from CLI plugins, not from our database
  useEffect(() => {
    const loadData = async () => {
      console.log('[ChatTab useEffect] loadData called, skipNextLoadRef:', skipNextLoadRef.current, 'activeSession:', activeSession?.session_id);

      // Skip if flagged (e.g., when manually loading in handleResumeSession)
      if (skipNextLoadRef.current) {
        console.log('[ChatTab useEffect] Skipping load due to flag');
        skipNextLoadRef.current = false;
        return;
      }

      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load chat messages from plugin - only if we have an active session with a CLI session ID
        // Note: activeSession is set when:
        // 1. User starts a new session (startNewSession)
        // 2. User resumes a session via History modal (handleResumeCliSession)
        // It is NOT set just because a tab has a cli_session_id from a previous run
        if (activeSession && activeSession.claude_session_id) {
          const pluginName = currentAgentType?.toLowerCase().replace(/\s+/g, '-') || 'claude-code';
          const cliSessionId = activeSession.claude_session_id;
          console.log(`[ChatTab useEffect] Loading chat history from plugin: ${pluginName}, session: ${cliSessionId}`);

          // Use pagination to load messages in chunks (WebRTC has ~64KB message limit)
          // Use smaller page size to avoid WebRTC data channel limits with large messages
          const PAGE_SIZE = 20;
          const MAX_MESSAGES = 500; // Only load most recent 500 messages initially
          let allMessages: ChatMessage[] = [];
          let offset = 0;
          let hasMore = true;
          let totalCount = 0;

          while (hasMore && allMessages.length < MAX_MESSAGES) {
            const page = await pluginChatApi.getChatHistoryPaginated(pluginName, cliSessionId, offset, PAGE_SIZE);
            totalCount = page.total_count;

            const pageMessages: ChatMessage[] = page.messages.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp * 1000),
              status: 'completed' as const,
              metadata: msg.metadata as MessageMetadata | undefined,
            }));

            // Paginated API returns newest first, reverse for chronological order
            allMessages = [...pageMessages.reverse(), ...allMessages];

            hasMore = page.has_more;
            offset += PAGE_SIZE;

            // Safety limit
            if (offset > 10000) break;
          }

          // Sort by timestamp to ensure chronological order
          const loadedMessages = allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          if (totalCount > MAX_MESSAGES) {
            console.log(`[ChatTab useEffect] Loaded ${loadedMessages.length} of ${totalCount} messages (limited to most recent ${MAX_MESSAGES})`);
          } else {
            console.log('[ChatTab useEffect] Loaded', loadedMessages.length, 'messages from plugin');
          }

          setMessages(activeTabId, loadedMessages);
        } else {
          // No active session for this tab - show empty state
          console.log('[ChatTab useEffect] No active session for tab, showing empty state');
          setMessages(activeTabId, []);
        }
      } catch (err) {
        console.error('Failed to load chat data:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId, activeTabId, activeSession, currentAgentType]);

  // Auto-scroll to bottom on new messages or when switching tabs/projects
  useEffect(() => {
    // Use instant scroll to avoid jerky behavior
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    };

    // Multiple scroll attempts to handle virtualized list rendering delays
    // First attempt quickly, then again after list has time to render
    const timer1 = setTimeout(scrollToBottom, 50);
    const timer2 = setTimeout(scrollToBottom, 150);
    const timer3 = setTimeout(scrollToBottom, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [messages.length, isTyping, activeTabId, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Cycle through processing sayings while typing (dynamic generation)
  useEffect(() => {
    if (!isTyping) return;

    // Start with a fresh random saying
    setCurrentSaying(getRandomSaying());

    // Generate a new random saying every 5 seconds
    const interval = setInterval(() => {
      setCurrentSaying(getRandomSaying());
    }, 5000);

    return () => clearInterval(interval);
  }, [isTyping]);

  // Register UI callback for session watcher manager
  // This handles UI-specific updates like showing user prompt dialogs
  useEffect(() => {
    // Set up the UI callback to handle prompts that need component state
    sessionWatcherManager.setUICallback((tabId, update) => {
      // Only handle updates for the currently active tab
      if (tabId !== activeTabId) return;

      if (update.type === 'UserPromptRequired' && update.prompt) {
        console.log('[ChatTab] User prompt required from watcher manager:', update.prompt);
        setPendingUserPrompt(update.prompt);
        setIsWaitingForInput(true);
      }
    });

    // Cleanup: remove the callback when component unmounts
    return () => {
      sessionWatcherManager.setUICallback(null);
    };
  }, [activeTabId]);

  // NOTE: We intentionally do NOT stop sessions when switching tabs.
  // Sessions should continue running in the background so:
  // 1. The activity indicator can flash when there's new output
  // 2. The session continues processing even when not viewing
  // 3. Users can switch back and see the full history
  //
  // Sessions are only stopped when:
  // - User explicitly clicks "Stop Session" button
  // - User closes the tab (handled in tab close logic)
  // - User leaves the workspace entirely (navigate away from project)

  const startNewSession = async (resumeSessionId?: string): Promise<AgentSession | null> => {
    if (!projectId || !currentAgentType) {
      setError('No project or agent type available');
      return null;
    }

    setIsStartingSession(true);
    setError(null);

    try {
      console.log('[ChatTab] Starting agent session...', resumeSessionId ? 'Resuming' : 'New', 'Agent:', currentAgentType);
      // Clear previous messages when starting a new session
      setMessages(activeTabId, []);

      // Normalize agent type to lowercase and replace spaces with hyphens
      const normalizedAgentType = currentAgentType.toLowerCase().replace(/\s+/g, '-');
      const session = await agentSessionApi.startAgentSession(
        projectId,
        normalizedAgentType,
        resumeSessionId
      );
      console.log('[ChatTab] Session started:', session);

      setActiveSession(activeTabId, session);
      setShowSessionHistory(false);

      // Update the active tab with the session info
      if (activeTab) {
        updateTab(activeTab.id, { sessionId: session.session_id });
      }

      // Start polling for this tab's session
      sessionPolling.startPolling(activeTabId);

      // Poll for claude_session_id (it takes a moment for the agent to create the session file)
      const pollForCliSessionId = async () => {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          try {
            const cliSessionId = await agentSessionApi.syncClaudeSessionId(session.session_id);
            if (cliSessionId) {
              console.log('[ChatTab] Synced claude_session_id:', cliSessionId);
              // Update the session in store with the claude_session_id
              setActiveSession(activeTabId, { ...session, claude_session_id: cliSessionId });
              // Update the active tab with the CLI session ID for resumability
              if (activeTab) {
                updateTab(activeTab.id, { cliSessionId });
              }
              // Start the watcher through the manager (persists across tab switches)
              sessionWatcherManager.startWatching(
                cliSessionId,
                activeTabId,
                projectId,
                normalizedAgentType,
                project?.root_path || ''
              );
              break;
            }
          } catch (err) {
            console.error('[ChatTab] Error syncing claude_session_id:', err);
          }
        }
      };
      pollForCliSessionId();

      // Add system message with session context (UI only - no database)
      const systemMessageContent = resumeSessionId
        ? `🔄 Resumed ${currentAgentType} session`
        : `🤖 Started new ${currentAgentType} session`;

      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: systemMessageContent,
        timestamp: new Date(),
        status: 'completed',
      };
      addMessage(activeTabId, systemMessage);
      return session;
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(`Failed to start agent session: ${err}`);
      return null;
    } finally {
      setIsStartingSession(false);
    }
  };

  const stopSession = async () => {
    if (!activeSession || !projectId) return;

    const sessionId = activeSession.session_id;
    const cliSessionId = activeSession.claude_session_id;

    try {
      console.log('[ChatTab] Stopping session:', sessionId);
      await agentSessionApi.stopAgentSession(sessionId);

      // Stop polling for this tab's session
      sessionPolling.stopPolling(activeTabId);

      // Stop the watcher for this session
      if (cliSessionId) {
        sessionWatcherManager.stopWatching(cliSessionId);
      }

      // Add system message (UI only - no database)
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: '⏹️ Session stopped',
        timestamp: new Date(),
        status: 'completed',
      };
      addMessage(activeTabId, systemMessage);

      setActiveSession(activeTabId, null);
    } catch (err) {
      console.error('Failed to stop session:', err);
      setError(`Failed to stop session: ${err}`);
    }
  };

  // Resume a CLI session directly by CLI session ID
  const handleResumeCliSession = async (cliSessionId: string) => {
    console.log('[ChatTab] Resuming CLI session:', cliSessionId, 'Agent:', currentAgentType);

    if (!projectId || !currentAgentType) {
      setError('No project or agent type available');
      return;
    }

    setIsStartingSession(true);
    setError(null);

    try {
      // Clear previous messages
      setMessages(activeTabId, []);

      // Load messages from plugin system using pagination to avoid WebRTC message size limits
      const pluginName = currentAgentType.toLowerCase().replace(/\s+/g, '-');
      console.log(`[ChatTab] Loading chat history for CLI session: ${cliSessionId} from plugin: ${pluginName}`);

      // Use pagination to load messages in chunks (WebRTC has ~64KB message limit)
      // Use smaller page size to avoid WebRTC data channel limits with large messages
      const PAGE_SIZE = 20;
      const MAX_MESSAGES = 500; // Only load most recent 500 messages initially
      let allMessages: ChatMessage[] = [];
      let offset = 0;
      let hasMore = true;
      let totalCount = 0;

      while (hasMore && allMessages.length < MAX_MESSAGES) {
        console.log(`[ChatTab] Loading page at offset ${offset}`);
        const page = await pluginChatApi.getChatHistoryPaginated(pluginName, cliSessionId, offset, PAGE_SIZE);
        totalCount = page.total_count;

        // Convert plugin history to ChatMessage format
        const pageMessages: ChatMessage[] = page.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp * 1000),
          status: 'completed' as const,
          metadata: msg.metadata as MessageMetadata | undefined,
        }));

        // Paginated API returns newest first, so we prepend to maintain chronological order
        allMessages = [...pageMessages.reverse(), ...allMessages];

        hasMore = page.has_more;
        offset += PAGE_SIZE;

        // Safety check to prevent infinite loops
        if (offset > 10000) {
          console.warn('[ChatTab] Safety limit reached, stopping pagination');
          break;
        }
      }

      const moreAvailable = totalCount > allMessages.length;
      if (moreAvailable) {
        console.log(`[ChatTab] Loaded ${allMessages.length} of ${totalCount} messages (more available)`);
      } else {
        console.log(`[ChatTab] Loaded ${allMessages.length} messages total`);
      }

      // Sort by timestamp to ensure chronological order
      const loadedMessages = allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Set messages with history metadata for "load more" feature
      setMessages(activeTabId, loadedMessages, {
        totalCount,
        loadedCount: loadedMessages.length,
        hasMore: moreAvailable,
        currentOffset: offset,
        cliSessionId,
        pluginName,
      });

      // Create an AgentSession object for display
      const resumedAgentSession: AgentSession = {
        session_id: cliSessionId,
        project_id: projectId,
        agent_type: currentAgentType,
        status: 'stopped',
        pid: null,
        started_at: Date.now() / 1000,
        last_activity: Date.now() / 1000,
        claude_session_id: cliSessionId,
      };

      // Set flag to prevent useEffect from reloading messages
      skipNextLoadRef.current = true;

      setActiveSession(activeTabId, resumedAgentSession);
      setShowSessionHistory(false);

      // Start the watcher through the manager (persists across tab switches)
      sessionWatcherManager.startWatching(
        cliSessionId,
        activeTabId,
        projectId,
        pluginName,
        project?.root_path || ''
      );

      console.log('[ChatTab] Resumed CLI session, total messages:', loadedMessages.length);
    } catch (err) {
      console.error('Failed to resume CLI session:', err);
      setError(`Failed to resume CLI session: ${err}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  // Load more historical messages (uses store-based metadata)
  const loadMoreMessages = async () => {
    if (!historyMeta || !historyMeta.hasMore || isLoadingMore) {
      console.log('[ChatTab] Cannot load more:', { historyMeta, isLoadingMore });
      return;
    }

    const { cliSessionId, pluginName, currentOffset } = historyMeta;
    const PAGE_SIZE = 20;

    setIsLoadingMore(true);
    try {
      console.log(`[ChatTab] Loading more messages: offset=${currentOffset}, limit=${PAGE_SIZE}`);

      const history = await pluginChatApi.getChatHistoryPaginated(
        pluginName,
        cliSessionId,
        currentOffset,
        PAGE_SIZE
      );

      const newMessages: ChatMessage[] = history.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp * 1000),
        status: 'completed' as const,
        metadata: msg.metadata as MessageMetadata | undefined,
      })).reverse(); // Reverse to get chronological order (oldest first)

      console.log(`[ChatTab] Loaded ${newMessages.length} more messages (has_more: ${history.has_more})`);

      // Prepend older messages using the store's prependMessages function
      const newOffset = currentOffset + PAGE_SIZE;
      prependMessages(activeTabId, newMessages, newOffset);
    } catch (err) {
      console.error('Failed to load more messages:', err);
      setError(`Failed to load more messages: ${err}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Cancel the current processing request
  const handleCancel = useCallback(() => {
    console.log('[ChatTab] Cancel requested');
    // Reset typing state - this allows the user to send another message
    setTyping(activeTabId, false);
    // TODO: Implement backend process termination
    // For now, this just resets the UI state so the user can send another message
    // The AI process will continue running in the background and may still produce output
  }, [activeTabId, setTyping]);

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content) return;

    console.log('[ChatTab handleSend] ========== START ==========');
    console.log('[ChatTab handleSend] Content:', content);
    console.log('[ChatTab handleSend] activeSession:', JSON.stringify(activeSession, null, 2));
    console.log('[ChatTab handleSend] currentAgentType:', currentAgentType);
    console.log('[ChatTab handleSend] isTyping:', isTyping);

    if (!projectId || !activeTabId) {
      console.log('[ChatTab handleSend] ERROR: No projectId or activeTabId');
      return;
    }

    // Track the session we'll use (may be created if none exists)
    let sessionToUse = activeSession;

    // If no active session, auto-start one
    if (!sessionToUse) {
      console.log('[ChatTab handleSend] No active session, auto-starting new session...');

      if (!currentAgentType) {
        console.log('[ChatTab handleSend] ERROR: No agent type available');
        setError('No agent type selected');
        return;
      }

      const newSession = await startNewSession();
      if (!newSession) {
        console.log('[ChatTab handleSend] ERROR: Failed to start session');
        return; // Error already set by startNewSession
      }

      sessionToUse = newSession;
      console.log('[ChatTab handleSend] Auto-started session:', sessionToUse.session_id);
    }

    setInputValue('');
    setError(null);

    // Get any pending messages that haven't been acknowledged in history yet
    const pendingMessages = getQueuedMessages(activeTabId);

    // Combine pending messages with new message
    // This handles the case where user sends multiple messages before Claude processes the first
    let combinedContent: string;
    if (pendingMessages.length > 0) {
      console.log('[ChatTab handleSend] Combining', pendingMessages.length, 'pending messages with new message');
      combinedContent = [...pendingMessages, content].join('\n\n');
      // Flush the queue since we're sending them all now
      flushQueue(activeTabId);
    } else {
      combinedContent = content;
    }

    // Queue the combined message (will be dequeued when seen in history)
    queueMessage(activeTabId, combinedContent);

    // Add user message to UI immediately (show combined content)
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: combinedContent,
      timestamp: new Date(),
      status: 'sending',
    };
    addMessage(activeTabId, userMessage);

    // Set typing indicator
    setTyping(activeTabId, true);

    try {
      // Check if we need to start a new agent session (for resumed sessions)
      let sessionIdToUse = sessionToUse.session_id;
      console.log('[ChatTab handleSend] Initial sessionIdToUse:', sessionIdToUse);

      // If the session is stopped/completed, we need to start a new agent process
      console.log('[ChatTab handleSend] Checking restart conditions:');
      console.log('  - status === stopped:', sessionToUse.status === 'stopped');
      console.log('  - claude_session_id:', sessionToUse.claude_session_id);
      console.log('  - projectId:', projectId);
      console.log('  - currentAgentType:', currentAgentType);

      if (sessionToUse.status === 'stopped' && sessionToUse.claude_session_id && projectId && currentAgentType) {
        console.log('[ChatTab handleSend] Restarting agent for resumed session with Claude session ID:', sessionToUse.claude_session_id, 'Agent:', currentAgentType);

        // Start a new agent session with the Claude resume flag
        const normalizedAgentType = currentAgentType.toLowerCase().replace(/\s+/g, '-');
        console.log('[ChatTab handleSend] Normalized agent type:', normalizedAgentType);

        const newAgentSession = await agentSessionApi.startAgentSession(
          projectId,
          normalizedAgentType,
          sessionToUse.claude_session_id
        );
        console.log('[ChatTab handleSend] New agent session:', JSON.stringify(newAgentSession, null, 2));

        // Set flag to prevent useEffect from reloading messages (which would overwrite the user's new message)
        skipNextLoadRef.current = true;

        // Update the active session with the new runtime session
        setActiveSession(activeTabId, newAgentSession);
        sessionIdToUse = newAgentSession.session_id;

        // Start polling for this restarted session
        sessionPolling.startPolling(activeTabId);

        // Make sure we're watching the correct CLI session for updates
        const cliSessionToWatch = newAgentSession.claude_session_id || sessionToUse.claude_session_id;
        if (cliSessionToWatch && project?.root_path) {
          console.log('[ChatTab handleSend] Starting/updating watcher for CLI session:', cliSessionToWatch);
          sessionWatcherManager.startWatching(
            cliSessionToWatch,
            activeTabId,
            projectId,
            normalizedAgentType,
            project.root_path
          );
        }

        console.log('[ChatTab handleSend] Agent restarted with session ID:', sessionIdToUse);
      } else {
        console.log('[ChatTab handleSend] Using existing session, not restarting');
      }

      // Send the combined content to the persistent agent session
      console.log('[ChatTab handleSend] Calling sendToAgent with sessionId:', sessionIdToUse, 'message:', combinedContent);
      await agentSessionApi.sendToAgent(sessionIdToUse, combinedContent);
      console.log('[ChatTab handleSend] sendToAgent completed successfully');

      // Mark the user message as sent (chat history is managed by CLI plugins)
      updateMessage(activeTabId, userMessage.id, {
        status: 'sent' as MessageStatus
      });

      // Clear the waiting for input state if this was a response to a prompt
      if (isWaitingForInput) {
        setIsWaitingForInput(false);
        setPendingPrompt('');
        setPendingUserPrompt(null);
      }

      // The response will come through the session watcher
      // The typing indicator (isTyping state) shows "Processing..." in the UI
    } catch (err) {
      console.error('[ChatTab handleSend] ERROR:', err);
      console.error('[ChatTab handleSend] Error type:', typeof err);
      console.error('[ChatTab handleSend] Error string:', String(err));
      if (err instanceof Error) {
        console.error('[ChatTab handleSend] Error message:', err.message);
        console.error('[ChatTab handleSend] Error stack:', err.stack);
      }
      setError(`Failed to send message: ${String(err)}`);

      // Update user message to show error
      if (activeTabId) {
        updateMessage(activeTabId, userMessage.id, {
          status: 'error' as MessageStatus,
          metadata: { error: 'Failed to send' }
        });
      }

      // Restore the input value so user can retry (just the new content, not combined)
      setInputValue(content);
      setTyping(activeTabId, false);

      // Also remove the failed message from queue
      dequeueMessage(activeTabId, combinedContent);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  // Handle structured prompt submission (AskUserQuestion)
  const handlePromptSubmit = async (answers: Record<string, string | string[]>) => {
    if (!pendingUserPrompt) return;

    // Format the answers as a readable response
    let responseText = '';
    for (const [header, value] of Object.entries(answers)) {
      if (Array.isArray(value)) {
        responseText += `${header}: ${value.join(', ')}\n`;
      } else {
        responseText += `${header}: ${value}\n`;
      }
    }

    // Clear the pending prompt
    setPendingUserPrompt(null);
    setIsWaitingForInput(false);

    // Send the formatted response as a regular message
    setInputValue(responseText.trim());
    // Use a small delay to let state update, then trigger send
    setTimeout(() => {
      const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
      if (sendButton) {
        sendButton.click();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle voice recording submission
  const handleVoiceSubmit = async (audioBlob: Blob) => {
    console.log('[ChatTab] Voice recording submitted, size:', audioBlob.size);
    setIsTranscribing(true);

    try {
      // Get Whisper settings - use remote settings if connected via WebRTC
      let whisperSettings = useSettingsStore.getState().whisper;

      if (peerConnection.isClient) {
        // Fetch settings from remote machine
        console.log('[ChatTab] Fetching whisper settings from remote machine');
        try {
          const remoteSettings = await peerConnection.sendCommand<{
            provider: string;
            openaiApiKey: string;
            localModel: string;
            localInstalled: boolean;
            localModelDownloaded: boolean;
          }>('get_whisper_settings', {});
          whisperSettings = {
            ...whisperSettings,
            provider: remoteSettings.provider as 'none' | 'openai' | 'local',
            openaiApiKey: remoteSettings.openaiApiKey,
            localModel: remoteSettings.localModel,
            localInstalled: remoteSettings.localInstalled,
            localModelDownloaded: remoteSettings.localModelDownloaded,
          };
          console.log('[ChatTab] Remote whisper settings:', remoteSettings.provider);
        } catch (err) {
          console.error('[ChatTab] Failed to fetch remote whisper settings:', err);
          setError('Failed to get voice settings from remote machine');
          setShowVoiceModal(false);
          return;
        }
      }

      console.log('[ChatTab] Whisper settings provider:', whisperSettings.provider);

      if (whisperSettings.provider === 'none') {
        const errorMsg = peerConnection.isClient
          ? 'Voice transcription not configured on remote machine. Please set up Whisper in Settings on the desktop.'
          : 'Voice transcription not configured. Please set up Whisper in Settings.';
        setError(errorMsg);
        setShowVoiceModal(false);
        return;
      }

      // Convert blob to array buffer for Tauri
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = Array.from(new Uint8Array(arrayBuffer));

      // Debug: Log audio data info before sending
      const first20 = audioData.slice(0, 20);
      console.log('[ChatTab] audioData length:', audioData.length);
      console.log('[ChatTab] audioData first 20 bytes:', first20);
      console.log('[ChatTab] audioData last 20 bytes:', audioData.slice(-20));
      // Check for webm magic bytes (EBML header: 0x1A 0x45 0xDF 0xA3)
      const isWebm = first20[0] === 0x1A && first20[1] === 0x45 && first20[2] === 0xDF && first20[3] === 0xA3;
      console.log('[ChatTab] looks like valid webm:', isWebm);

      let transcribedText: string;

      if (whisperSettings.provider === 'openai') {
        // Use OpenAI API via backend
        console.log('[ChatTab] Using OpenAI Whisper API');
        const result = await backend.transcription.transcribeOpenAI(
          audioData,
          whisperSettings.openaiApiKey
        );
        transcribedText = result.text;
      } else {
        // Use local Whisper via backend
        console.log('[ChatTab] Using local Whisper with model:', whisperSettings.localModel);
        const result = await backend.transcription.transcribeLocal(
          audioData,
          whisperSettings.localModel
        );
        transcribedText = result.text;
      }

      console.log('[ChatTab] Transcription result:', transcribedText);

      // Close modal first
      setShowVoiceModal(false);
      setIsTranscribing(false);

      // Send the transcribed text as a message
      if (transcribedText.trim()) {
        console.log('[ChatTab] Calling handleSend with transcribed text:', transcribedText.trim());
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          handleSend(transcribedText.trim());
        }, 100);
      } else {
        console.log('[ChatTab] Transcription was empty, not sending');
      }
      return; // Exit early since we handled everything
    } catch (err) {
      console.error('[ChatTab] Transcription failed:', err);
      setError(`Failed to transcribe audio: ${err}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Check if voice recording is available
  // Voice is enabled when: whisper is configured locally OR connected via WebRTC
  // When connected via WebRTC, transcription happens on the remote machine which may have Whisper configured
  const isWhisperConfigured = useSettingsStore((state) => state.isWhisperConfigured);
  const isWebRTCClient = peerConnection.isClient;
  const isVoiceEnabled = isWhisperConfigured() || isWebRTCClient;

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const characterCount = inputValue.length;
  const maxCharacters = 50000; // Increased limit - CLI agents can handle large inputs

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-243px)]">
        <div className="flex flex-col bg-base-200 rounded-lg overflow-hidden h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </div>
          <div className="border-t border-base-300 bg-base-100 p-4">
            <div className="flex items-center gap-2 text-base-content/60">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading chat...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no project ID
  if (!projectId) {
    return (
      <div className="h-[calc(100vh-243px)]">
        <div className="flex flex-col bg-base-200 rounded-lg overflow-hidden h-full items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">No Project Selected</h3>
            <p className="text-base-content/60">Please select a project to start chatting.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-243px)] flex flex-col">
      {/* Chat Tab Bar - for multi-agent support */}
      {tabs.length > 0 && (
        <ChatTabBar
          tabs={tabs}
          activeTabId={activeTab?.id || null}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onAddTab={handleAddTab}
          onAddTabWithAgent={handleAgentSelect}
          onRenameTab={handleRenameTab}
        />
      )}

    <PanelGroup direction="horizontal" className="flex-1 gap-2" autoSaveId="chat-panels">
      {/* Main Chat Area */}
      <Panel defaultSize={activeSession ? 65 : 100} minSize={30}>
      <div className="flex flex-col bg-base-200 rounded-lg overflow-hidden h-full">
        {/* Session Status Bar */}
        <div className="bg-base-300 border-b border-base-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <span className="text-sm font-medium">Session Active</span>
              </div>
              <span className="text-xs text-base-content/60">
                {currentAgentType || 'Agent'}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-base-content/30"></div>
                <span className="text-sm font-medium">No Active Session</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              console.log('[ChatTab] History button clicked, current state:', showSessionHistory);
              console.log('[ChatTab] Project data:', { projectId, root_path: project?.root_path, agent_type: currentAgentType });
              setShowSessionHistory(!showSessionHistory);
            }}
            className="btn btn-ghost btn-xs gap-1"
            title="View session history"
          >
            <History className="w-3 h-3" />
            History
          </button>

          {activeSession ? (
            <button
              onClick={stopSession}
              className="btn btn-error btn-xs gap-1"
              title="Stop session"
            >
              <PowerOff className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => startNewSession()}
              disabled={isStartingSession}
              className="btn btn-success btn-xs gap-1"
              title="Start new session"
            >
              {isStartingSession ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Power className="w-3 h-3" />
                  Start Session
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error m-4 mb-0">
          <span>{error}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isLoading ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Start a Conversation</h3>
            <p className="text-base-content/60 max-w-md mb-4">
              Type a message below to start chatting. A new session will be created automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMoreMessages && historyMeta && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoadingMore}
                  className="btn btn-sm btn-outline gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading older messages...
                    </>
                  ) : (
                    <>
                      <History className="w-4 h-4" />
                      Load more messages
                      ({historyMeta.totalCount - historyMeta.loadedCount} older messages available)
                    </>
                  )}
                </button>
              </div>
            )}

            <VirtualizedMessageList
              messages={messages}
              formatTimestamp={formatTimestamp}
            />

            {/* Typing Indicator with Cycling Messages */}
            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center animate-pulse flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="chat-bubble chat-bubble-secondary px-4 py-3 flex items-center gap-3">
                    <span className="loading loading-dots loading-sm"></span>
                    <span className="text-sm min-w-[160px]">
                      {currentSaying}
                    </span>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="btn btn-ghost btn-sm btn-circle hover:bg-error/20 hover:text-error transition-colors"
                    title="Cancel and send a different message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && !isLoading && activeSession && (
        <QuickActions
          onActionClick={handleQuickAction}
          disabled={isTyping}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-base-300 bg-base-100 p-4">
        {/* Structured Prompt Dialog (AskUserQuestion) */}
        {pendingUserPrompt && (
          <div className="mb-3">
            <UserPromptDialog
              prompt={pendingUserPrompt}
              onSubmit={handlePromptSubmit}
              onCancel={() => {
                setPendingUserPrompt(null);
                setIsWaitingForInput(false);
              }}
              disabled={isTyping}
            />
          </div>
        )}

        {/* Simple Waiting for Input Banner (fallback for non-structured prompts) */}
        {isWaitingForInput && pendingPrompt && !pendingUserPrompt && (
          <div className="alert alert-info mb-3">
            <Sparkles className="w-5 h-5" />
            <div className="flex-1">
              <h4 className="font-semibold">Agent is waiting for your response</h4>
              <p className="text-sm opacity-80">{pendingPrompt}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTyping
                ? "Send a new message to interrupt and redirect... (Shift+Enter for new line)"
                : "Send a message to the agent... (Shift+Enter for new line)"
              }
              className="textarea textarea-bordered flex-1 resize-none min-h-[50px] max-h-[200px]"
              disabled={isStartingSession}
              rows={1}
            />
            {/* Voice Recording Button */}
            <button
              onClick={() => setShowVoiceModal(true)}
              disabled={isStartingSession || (!isWhisperConfigured() && !isWebRTCClient)}
              className="btn btn-ghost btn-square"
              title={
                !isWhisperConfigured() && !isWebRTCClient
                  ? "Configure voice transcription in Settings"
                  : isWebRTCClient
                  ? "Record voice message (transcribed on remote machine)"
                  : "Record voice message"
              }
            >
              <Mic className={`w-5 h-5 ${isVoiceEnabled ? 'text-base-content' : 'text-base-content/30'}`} />
            </button>
            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isStartingSession}
              className={`btn ${isTyping ? 'btn-warning' : 'btn-primary'}`}
              title={isTyping ? "Send new message (interrupts current)" : "Send message (Enter)"}
              data-send-button
            >
              {isTyping ? (
                <Send className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center text-xs text-base-content/50 px-1">
            <span>
              Press <kbd className="kbd kbd-xs">Enter</kbd> to send,{' '}
              <kbd className="kbd kbd-xs">Shift</kbd>+
              <kbd className="kbd kbd-xs">Enter</kbd> for new line
            </span>
            <span
              className={
                characterCount > maxCharacters * 0.9
                  ? 'text-warning'
                  : characterCount > maxCharacters
                  ? 'text-error'
                  : ''
              }
            >
              {characterCount} / {maxCharacters}
            </span>
          </div>
        </div>
      </div>
      </div>
      </Panel>
    </PanelGroup>

      {/* Session History Modal - placed at root level for proper z-index */}
      {projectId && project?.root_path && currentAgentType && (
        <SessionHistoryModal
          projectId={projectId}
          projectPath={project.root_path}
          pluginName={currentAgentType.toLowerCase().replace(/\s+/g, '-')}
          onResume={handleResumeCliSession}
          onClose={() => setShowSessionHistory(false)}
          isOpen={showSessionHistory}
          activeSessionId={activeSession?.claude_session_id || null}
        />
      )}

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSubmit={handleVoiceSubmit}
        isTranscribing={isTranscribing}
      />
    </div>
  );
}
