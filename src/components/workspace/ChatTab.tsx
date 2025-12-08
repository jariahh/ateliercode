import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Power, PowerOff, History, Terminal, CheckCircle2, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import * as chatApi from '../../api/chat';
import * as agentSessionApi from '../../api/agentSession';
import * as pluginChatApi from '../../lib/chat';
import * as sessionWatcher from '../../api/sessionWatcher';
import type { UserPrompt } from '../../api/sessionWatcher';
import { parseAskUserQuestion } from '../../lib/parseAskUserQuestion';
import type { ChatMessage as BackendChatMessage } from '../../types/tauri';
import type { AgentSession } from '../../api/agentSession';
import * as sessionPolling from '../../services/sessionPollingManager';
import { useProjectStore } from '../../stores/projectStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import { useChatTabStore } from '../../stores/chatTabStore';
import MessageActions from '../chat/MessageActions';
import QuickActions from '../chat/QuickActions';
import StreamingMessage from '../chat/StreamingMessage';
import MessageSkeleton from '../chat/MessageSkeleton';
import MessageContent from '../chat/MessageContent';
import SessionHistoryModal from '../chat/SessionHistoryModal';
import VirtualizedMessageList from '../chat/VirtualizedMessageList';
import UserPromptDialog from '../chat/UserPromptDialog';
import ChatTabBar from '../chat/ChatTabBar';

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'completed' | 'error';

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  model?: string;
  error?: string;
  type?: string; // 'tool_use' | 'tool_result' | 'summary'
  tool_name?: string;
  tool_id?: string;
  input?: string;
  tool_use_id?: string;
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

// Collapsible Tool Message Component
interface CollapsibleToolMessageProps {
  content: string;
  metadata?: MessageMetadata;
}

// Fallback component for individual tool messages
function CollapsibleToolMessage({ content, metadata }: CollapsibleToolMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxCollapsedHeight = 150;
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > maxCollapsedHeight);
    }
  }, [content]);

  const isToolUse = metadata?.tool_name || content.includes('🔧 Using tool:') || content.startsWith('Tool:');
  const isToolResult = metadata?.is_tool_result === 'true' || content.includes('✅ Tool Result:') || content.includes('❌ Tool Error:') || content.includes('Tool Result:');
  const isError = metadata?.is_error === 'true' || content.includes('❌ Tool Error:');

  if (!isToolUse && !isToolResult) {
    return <MessageContent content={content} />;
  }

  let toolName = metadata?.tool_name || 'Unknown Tool';
  let displayContent = content;
  let toolParams: any = null;

  if (isToolUse && content.includes('🔧 Using tool:')) {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(/🔧 Using tool:\s*(.+)/);
    if (match) {
      toolName = match[1].trim();
      displayContent = lines.slice(1).join('\n');
      try { toolParams = JSON.parse(displayContent); } catch {}
    }
  } else if (content.startsWith('Tool:')) {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(/Tool:\s*(.+)/);
    if (match) {
      toolName = match[1].trim();
      displayContent = lines.slice(1).join('\n');
      try { toolParams = JSON.parse(displayContent); } catch {}
    }
  } else if (isToolResult) {
    const lines = content.split('\n');
    displayContent = lines.slice(1).join('\n');
  }

  return (
    <div className="space-y-2 border-l-2 border-info/30 pl-3">
      <div className={`flex items-center gap-2 text-sm font-semibold ${isError ? 'text-error' : isToolResult ? 'text-success' : 'text-info'}`}>
        {isToolUse ? (
          <>
            <Wrench className="w-4 h-4" />
            <span>{toolName}</span>
          </>
        ) : isError ? (
          <>
            <Terminal className="w-4 h-4" />
            <span>Error</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Result</span>
          </>
        )}
      </div>

      <div className="relative">
        <div
          ref={contentRef}
          className={`overflow-hidden transition-all duration-300 ${
            !isExpanded && needsCollapse ? 'max-h-[150px]' : ''
          }`}
          style={!isExpanded && needsCollapse ? { maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' } : {}}
        >
          {toolParams ? (
            <div className="text-xs bg-base-300/50 p-2 rounded space-y-1">
              {Object.entries(toolParams).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-base-content/60 font-mono">{key}:</span>
                  <span className="text-base-content font-mono flex-1 break-all">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs bg-base-300/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {displayContent.trim()}
            </pre>
          )}
        </div>

        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 btn btn-xs btn-ghost gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Show More</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface GroupedToolMessageProps {
  toolUse?: ChatMessage;
  toolResult?: ChatMessage;
}

function GroupedToolMessage({ toolUse, toolResult }: GroupedToolMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const maxCollapsedHeight = 150;
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > maxCollapsedHeight);
    }
  }, [toolResult]);

  if (!toolUse && !toolResult) return null;

  // Extract tool name and params from tool use
  let toolName = 'Unknown Tool';
  let toolParams: any = null;

  if (toolUse) {
    const content = toolUse.content;
    if (content.includes('🔧 Using tool:')) {
      const match = content.match(/🔧 Using tool:\s*(.+)/);
      if (match) {
        toolName = match[1].trim();
        const jsonStr = content.split('\n').slice(1).join('\n');
        try { toolParams = JSON.parse(jsonStr); } catch {}
      }
    } else if (content.startsWith('Tool:')) {
      const match = content.match(/Tool:\s*(.+)/);
      if (match) {
        toolName = match[1].trim();
        const jsonStr = content.split('\n').slice(1).join('\n');
        try { toolParams = JSON.parse(jsonStr); } catch {}
      }
    }
  }

  // Extract result content
  let resultContent = '';
  const isError = toolResult?.content.includes('❌ Tool Error:');

  if (toolResult) {
    const lines = toolResult.content.split('\n');
    resultContent = lines.slice(1).join('\n').trim();
  }

  // Get main parameters (exclude less important ones)
  const mainParams: Record<string, any> = {};
  const hiddenParams: Record<string, any> = {};

  if (toolParams) {
    const lessImportant = ['-A', '-B', '-C', '-n', '-i', 'head_limit', 'offset', 'limit', 'dangerouslyDisableSandbox'];
    Object.entries(toolParams).forEach(([key, value]) => {
      if (lessImportant.includes(key)) {
        hiddenParams[key] = value;
      } else {
        mainParams[key] = value;
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Tool Header with name and key params */}
      <div className="flex items-center gap-2 text-sm font-semibold text-info">
        <Wrench className="w-4 h-4" />
        <span>{toolName}</span>
        {Object.keys(mainParams).length > 0 && (
          <span className="text-xs font-normal text-base-content/60">
            ({Object.keys(mainParams).slice(0, 2).join(', ')}{Object.keys(mainParams).length > 2 ? '...' : ''})
          </span>
        )}
      </div>

      {/* Main Parameters (always visible if present) */}
      {Object.keys(mainParams).length > 0 && (
        <div className="text-xs bg-info/5 border border-info/20 rounded p-2 space-y-1">
          {Object.entries(mainParams).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-info/80 font-mono font-semibold min-w-[80px]">{key}:</span>
              <span className="text-base-content/80 font-mono flex-1 break-all">
                {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Parameters (collapsible) */}
      {Object.keys(hiddenParams).length > 0 && (
        <div>
          <button
            onClick={() => setShowParams(!showParams)}
            className="text-xs text-base-content/50 hover:text-base-content/80 flex items-center gap-1"
          >
            {showParams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{Object.keys(hiddenParams).length} more parameter{Object.keys(hiddenParams).length > 1 ? 's' : ''}</span>
          </button>
          {showParams && (
            <div className="text-xs bg-base-300/30 rounded p-2 space-y-1 mt-1">
              {Object.entries(hiddenParams).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-base-content/60 font-mono">{key}:</span>
                  <span className="text-base-content/80 font-mono">{typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool Result */}
      {toolResult && (
        <div>
          <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${isError ? 'text-error' : 'text-success'}`}>
            {isError ? (
              <>
                <Terminal className="w-4 h-4" />
                <span>Error</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Result</span>
              </>
            )}
          </div>

          <div className="relative">
            <div
              ref={contentRef}
              className={`overflow-hidden transition-all duration-300 ${
                !isExpanded && needsCollapse ? 'max-h-[150px]' : ''
              }`}
              style={!isExpanded && needsCollapse ? { maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' } : {}}
            >
              <pre className="text-xs bg-base-300/50 border border-base-content/10 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
                {resultContent}
              </pre>
            </div>

            {needsCollapse && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 btn btn-xs btn-ghost gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Show Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Show More</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const activeWatcherRef = useRef<string | null>(null); // Track active watcher by session ID

  // Pagination state for history loading
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const MESSAGES_PER_PAGE = 50;

  // Session state - use shared store (keyed by tabId for multi-agent support)
  const activeSession = useSessionStore((state) => state.getActiveSession(activeTabId));
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null); // Track the DB session for saving messages
  // Session history is now loaded on-demand via plugin system in SessionHistoryModal
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  const [pendingUserPrompt, setPendingUserPrompt] = useState<UserPrompt | null>(null);
  const skipNextLoadRef = useRef(false); // Flag to skip the next loadData call

  // Tab state - loaded from store (tabs/activeTab/activeTabId already defined at top)
  const loadTabs = useChatTabStore((state) => state.loadTabs);
  const createTab = useChatTabStore((state) => state.createTab);
  const updateTab = useChatTabStore((state) => state.updateTab);
  const setActiveTabInStore = useChatTabStore((state) => state.setActiveTab);
  const closeTab = useChatTabStore((state) => state.closeTab);
  const markTabActivity = useChatTabStore((state) => state.markTabActivity);

  // Get project info
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);

  // Use the active tab's agent type, falling back to project default
  const currentAgentType = activeTab?.agent_type || project?.agent?.type;

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
        if (currentTabs.length === 0 && project?.agent?.type && defaultTabCreatedRef.current !== projectId) {
          defaultTabCreatedRef.current = projectId;
          createTab(projectId, project.agent.type);
        }
      });
    }
  }, [projectId, loadTabs, createTab, project?.agent?.type]);

  // Tab handlers
  const handleTabClick = useCallback(async (tabId: string) => {
    if (!projectId) return;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    console.log('[ChatTab] Switching to tab:', tabId, 'agent:', tab.agent_type, 'session:', tab.cli_session_id);

    // Set the new tab as active
    await setActiveTabInStore(projectId, tabId);

    // Clear messages for the new tab (will be reloaded if session exists)
    // Note: We don't clear the old tab's session - it keeps running in background
    setMessages(tabId, []);

    // If the new tab has an existing CLI session, load its messages
    if (tab.cli_session_id) {
      const agentType = tab.agent_type || project?.agent?.type;
      if (agentType) {
        const pluginName = agentType.toLowerCase().replace(/\s+/g, '-');
        console.log(`[ChatTab] Loading messages from plugin: ${pluginName}, session: ${tab.cli_session_id}`);

        try {
          const history = await pluginChatApi.getChatHistory(pluginName, tab.cli_session_id);

          // Convert plugin history to ChatMessage format
          const loadedMessages: ChatMessage[] = history.map((msg, index) => {
            const displayRole = msg.metadata?.type === 'tool_result' ? 'assistant' : (msg.role as 'user' | 'assistant');
            return {
              id: msg.id || `loaded-${Date.now()}-${index}`,
              project_id: projectId,
              role: displayRole,
              content: msg.content,
              timestamp: msg.timestamp || new Date().toISOString(),
              session_id: tab.cli_session_id || undefined,
              metadata: msg.metadata,
            };
          });

          setMessages(tabId, loadedMessages);

          // Create a display session for this tab (keyed by tabId)
          const resumedSession: AgentSession = {
            session_id: tab.cli_session_id,
            project_id: projectId,
            agent_type: agentType,
            status: 'stopped',
            pid: null,
            started_at: Date.now() / 1000,
            last_activity: Date.now() / 1000,
            claude_session_id: tab.cli_session_id,
          };
          setActiveSession(tabId, resumedSession);

          console.log(`[ChatTab] Loaded ${loadedMessages.length} messages for tab`);
        } catch (err) {
          console.error('[ChatTab] Failed to load tab messages:', err);
        }
      }
    }
  }, [projectId, tabs, setActiveTabInStore, setMessages, setActiveSession, project?.agent?.type]);

  const handleTabClose = useCallback(async (tabId: string) => {
    if (!projectId) return;
    await closeTab(projectId, tabId);
  }, [projectId, closeTab]);

  const handleAddTab = useCallback(async () => {
    // Add a new tab with the project's default agent directly
    console.log('[ChatTab] handleAddTab called, projectId:', projectId, 'agent.type:', project?.agent?.type);
    if (!projectId || !project?.agent?.type) {
      console.error('[ChatTab] Cannot add tab - missing projectId or agent type');
      return;
    }
    try {
      console.log('[ChatTab] Creating new tab...');
      const newTab = await createTab(projectId, project.agent.type);
      console.log('[ChatTab] New tab created:', newTab);
      await setActiveTabInStore(projectId, newTab.id);
      console.log('[ChatTab] Tab set as active');
    } catch (error) {
      console.error('[ChatTab] Failed to create new tab:', error);
    }
  }, [projectId, project?.agent?.type, createTab, setActiveTabInStore]);

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

  // Load chat history and session history on mount or when active session changes
  useEffect(() => {
    const loadData = async () => {
      console.log('[ChatTab useEffect] loadData called, skipNextLoadRef:', skipNextLoadRef.current, 'dbSessionId:', dbSessionId, 'activeSession:', activeSession?.session_id);

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

        // Load chat messages - only if we have an active session for this tab
        if (activeSession) {
          // Check if this is a CLI-only session (no database record)
          const isCliOnlySession = !dbSessionId && activeSession.claude_session_id;

          if (isCliOnlySession) {
            // For CLI-only sessions, load from plugin's chat history
            const pluginName = currentAgentType?.toLowerCase().replace(/\s+/g, '-') || 'claude-code';
            const cliSessionId = activeSession.claude_session_id;
            console.log(`[ChatTab useEffect] Loading CLI-only session from plugin: ${pluginName}, session: ${cliSessionId}`);

            const history = await pluginChatApi.getChatHistory(pluginName, cliSessionId);
            console.log('[ChatTab useEffect] Loaded', history.length, 'messages from plugin for CLI session', cliSessionId);

            // Convert plugin history to ChatMessage format
            const loadedMessages: ChatMessage[] = history.map((msg, index) => {
              const displayRole = msg.role as 'user' | 'assistant';
              return {
                id: `history-${cliSessionId}-${index}`,
                role: displayRole,
                content: msg.content,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                status: 'completed' as const,
                metadata: msg.metadata && Object.keys(msg.metadata).length > 0 ? msg.metadata as MessageMetadata : undefined,
              };
            });

            console.log('[ChatTab useEffect] Setting messages to:', loadedMessages.length);
            setMessages(activeTabId, loadedMessages);
          } else {
            // For database-backed sessions, use the database lookup
            const sessionIdToLoad = dbSessionId || activeSession.session_id;
            const backendMessages = await chatApi.getSessionMessages(sessionIdToLoad);
            console.log('[ChatTab useEffect] Loaded', backendMessages.length, 'messages for session', sessionIdToLoad, backendMessages);

            const convertedMessages = backendMessages.map(convertMessage);
            console.log('[ChatTab useEffect] Setting messages to:', convertedMessages);
            setMessages(activeTabId, convertedMessages);
          }
        } else {
          // No active session for this tab - show empty state (don't load project-wide messages)
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
  }, [projectId, dbSessionId, activeTabId, activeSession, currentAgentType]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    // Use instant scroll to avoid jerky behavior
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    };

    // Single delayed scroll after DOM is rendered
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Plugin-based session watcher for real-time updates
  useEffect(() => {
    if (!activeSession || !activeSession.claude_session_id || !projectId || !project) {
      // Clear ref if no session
      activeWatcherRef.current = null;
      return;
    }

    const pluginName = 'claude-code';
    const cliSessionId = activeSession.claude_session_id;
    const projectPath = project.path;

    // Prevent duplicate watchers for the same session
    if (activeWatcherRef.current === cliSessionId) {
      console.log('[ChatTab] Watcher already active for session:', cliSessionId);
      return;
    }

    console.log('[ChatTab] Setting up plugin-based watcher for session:', cliSessionId);
    activeWatcherRef.current = cliSessionId;

    let unsubscribePromise: Promise<() => Promise<void>> | null = null;
    let unsubscribe: (() => Promise<void>) | null = null;
    let cleanedUp = false;

    // Start watching using the new plugin-based API
    unsubscribePromise = sessionWatcher.startWatchingSession(
      pluginName,
      projectPath,
      cliSessionId,
      (update) => {
        console.log('[ChatTab] Received session update:', update);

        if (update.type === 'NewMessage' && update.message) {
          const msg = update.message;

          // Create a stable ID based on timestamp and content hash to prevent duplicates
          // Use a simple hash function for the content
          const simpleHash = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(36);
          };
          const contentHash = simpleHash(msg.content + msg.role + (msg.timestamp || ''));
          const stableId = `msg-${msg.timestamp}-${contentHash}`;

          // Convert metadata to the right format - handle both old and new format
          const metadata: MessageMetadata | undefined = msg.metadata ? {
            type: msg.metadata.type,
            tool_name: msg.metadata.tool_name,
            tool_id: msg.metadata.tool_id,
            tool_use_id: msg.metadata.tool_use_id,
            input: msg.metadata.input,
            is_tool_result: msg.metadata.is_tool_result,
            is_error: msg.metadata.is_error,
          } : undefined;

          // The role is already correct from the plugin (overridden to 'assistant' for tool messages)
          const displayRole = msg.role as 'user' | 'assistant';

          // Check if message already exists - use displayRole for comparison
          const existingMessages = messages || [];
          const msgTimestamp = msg.timestamp ? msg.timestamp * 1000 : 0;

          // More robust duplicate detection - check by ID first, then by content+timestamp
          const isDuplicate = existingMessages.some(m => {
            // Check if IDs match
            if (m.id === stableId) return true;

            // Check if content and timestamp match (within 100ms tolerance for timing issues)
            const timeDiff = Math.abs((m.timestamp?.getTime() || 0) - msgTimestamp);
            return m.content === msg.content &&
                   m.role === displayRole &&
                   timeDiff < 100;
          });

          if (isDuplicate) {
            console.log('[ChatTab] Skipping duplicate message:', {
              id: stableId,
              role: displayRole,
              contentPreview: msg.content.substring(0, 50)
            });
            return;
          }

          const newMessage: ChatMessage = {
            id: stableId,
            role: displayRole,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
            status: 'completed',
            metadata,
          };

          addMessage(activeTabId, newMessage);

          // Reset typing state when we receive an assistant response (for this tab)
          if (displayRole === 'assistant') {
            setTyping(activeTabId, false);
          }

          // Mark tab activity if user isn't actively viewing this tab
          // This happens when window is not focused, document is hidden, or user is on a different workspace tab
          // Find the tab corresponding to this session
          const currentTabs = useChatTabStore.getState().tabsByProject.get(projectId) || [];
          const sessionTab = currentTabs.find(t => t.cli_session_id === cliSessionId);
          if (sessionTab && displayRole === 'assistant') {
            // Mark activity if window is not focused or document is hidden
            if (document.hidden || !document.hasFocus()) {
              markTabActivity(sessionTab.id);
            }
          }

          // Check if this is an AskUserQuestion tool use - if so, show the prompt UI
          if (displayRole === 'assistant') {
            const prompt = parseAskUserQuestion(msg.content);
            if (prompt) {
              console.log('[ChatTab] Detected AskUserQuestion in message:', prompt);
              setPendingUserPrompt(prompt);
              setIsWaitingForInput(true);
            }
          }

          // Save to database to update last_activity timestamp
          chatApi.saveMessage(projectId, cliSessionId, displayRole, msg.content, metadata ? JSON.stringify(metadata) : undefined)
            .catch(err => console.error('[ChatTab] Failed to save message to database:', err));
        } else if (update.type === 'UserPromptRequired' && update.prompt) {
          console.log('[ChatTab] User prompt required:', update.prompt);
          setPendingUserPrompt(update.prompt);
          setIsWaitingForInput(true);
        } else if (update.type === 'Error') {
          console.error('[ChatTab] Session watcher error:', update.message);
        }
      }
    );

    unsubscribePromise.then((unsub) => {
      unsubscribe = unsub;
      console.log('[ChatTab] Plugin-based watcher started successfully');
    }).catch((err) => {
      console.error('[ChatTab] Failed to start plugin-based watcher:', err);
    });

    // Cleanup
    return () => {
      console.log('[ChatTab] Cleaning up plugin-based watcher for session:', cliSessionId);
      cleanedUp = true;

      // Clear the active watcher ref
      if (activeWatcherRef.current === cliSessionId) {
        activeWatcherRef.current = null;
      }

      // If unsubscribe is already available, call it immediately
      if (unsubscribe) {
        unsubscribe().catch(console.error);
      } else if (unsubscribePromise) {
        // If the promise is still pending, wait for it and then unsubscribe
        // The cleanedUp flag prevents calling unsubscribe twice
        unsubscribePromise.then(unsub => {
          if (cleanedUp) {
            unsub().catch(console.error);
          }
        }).catch(console.error);
      }
    };
  }, [activeSession, projectId, project]);

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

  const startNewSession = async (resumeSessionId?: string) => {
    if (!projectId || !currentAgentType) {
      setError('No project or agent type available');
      return;
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
      setDbSessionId(session.session_id); // Set the DB session ID for message saving
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
              break;
            }
          } catch (err) {
            console.error('[ChatTab] Error syncing claude_session_id:', err);
          }
        }
      };
      pollForCliSessionId();

      // Save and add system message with session context
      const systemMessageContent = resumeSessionId
        ? `🔄 Resumed ${currentAgentType} session`
        : `🤖 Started new ${currentAgentType} session`;

      try {
        const savedMessage = await chatApi.saveMessage(
          projectId,
          session.session_id,
          'assistant',
          systemMessageContent
        );

        const systemMessage: ChatMessage = {
          id: savedMessage.id,
          role: 'assistant',
          content: systemMessageContent,
          timestamp: new Date(savedMessage.timestamp * 1000),
          status: 'completed',
        };
        addMessage(activeTabId, systemMessage);
      } catch (err) {
        console.error('[ChatTab] Failed to save system message:', err);
        // Still add to UI even if save fails
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: systemMessageContent,
          timestamp: new Date(),
          status: 'completed',
        };
        addMessage(activeTabId, systemMessage);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(`Failed to start agent session: ${err}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  const stopSession = async () => {
    if (!activeSession || !projectId) return;

    const sessionId = activeSession.session_id;

    try {
      console.log('[ChatTab] Stopping session:', sessionId);
      await agentSessionApi.stopAgentSession(sessionId);

      // Stop polling for this tab's session
      sessionPolling.stopPolling(activeTabId);

      // Save system message with session context before clearing activeSession
      try {
        // Use dbSessionId if available (for resumed sessions), otherwise use sessionId
        const sessionIdToSave = dbSessionId || sessionId;
        const savedMessage = await chatApi.saveMessage(
          projectId,
          sessionIdToSave,
          'assistant',
          '⏹️ Session stopped'
        );

        const systemMessage: ChatMessage = {
          id: savedMessage.id,
          role: 'assistant',
          content: '⏹️ Session stopped',
          timestamp: new Date(savedMessage.timestamp * 1000),
          status: 'completed',
        };
        addMessage(activeTabId, systemMessage);
      } catch (err) {
        console.error('[ChatTab] Failed to save stop message:', err);
        // Still add to UI even if save fails
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: '⏹️ Session stopped',
          timestamp: new Date(),
          status: 'completed',
        };
        addMessage(activeTabId, systemMessage);
      }

      setActiveSession(activeTabId, null);
    } catch (err) {
      console.error('Failed to stop session:', err);
      setError(`Failed to stop session: ${err}`);
    }
  };

  const handleResumeSession = async (session: DbAgentSession) => {
    console.log('[ChatTab] Resuming session:', session, 'Agent:', currentAgentType);

    if (!projectId || !currentAgentType) {
      setError('No project or agent type available');
      return;
    }

    setIsStartingSession(true);
    setError(null);

    try {
      // Load messages from plugin system if CLI session ID exists, otherwise fallback to database
      let loadedMessages: ChatMessage[] = [];

      if (session.claude_session_id && currentAgentType) {
        try {
          // Load history from CLI via plugin
          const pluginName = currentAgentType.toLowerCase().replace(/\s+/g, '-');
          console.log(`[ChatTab] Loading chat history from plugin: ${pluginName}, session: ${session.claude_session_id}`);

          const history = await pluginChatApi.getChatHistory(
            pluginName,
            session.claude_session_id
          );

          console.log(`[ChatTab] Loaded ${history.length} messages from plugin for session ${session.claude_session_id}`);

          // Debug: Check if messages are in chronological order
          if (history.length > 1) {
            console.log('[ChatTab] First message timestamp:', history[0].timestamp, 'preview:', history[0].content.substring(0, 30));
            console.log('[ChatTab] Last message timestamp:', history[history.length - 1].timestamp, 'preview:', history[history.length - 1].content.substring(0, 30));
          }

          // Convert plugin history to ChatMessage format
          // Plugin returns messages in file order, we need to reverse to get chronological
          loadedMessages = history.map((msg, index) => {
            // Tool results come as user role from API but should display as assistant
            const displayRole = msg.metadata?.type === 'tool_result' ? 'assistant' : (msg.role as 'user' | 'assistant');

            return {
              id: `history-${session.claude_session_id}-${index}`,
              role: displayRole,
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
              status: 'completed' as const,
              metadata: msg.metadata && Object.keys(msg.metadata).length > 0 ? msg.metadata as MessageMetadata : undefined,
            };
          }).reverse();
        } catch (err) {
          console.warn('[ChatTab] Failed to load from plugin, falling back to database:', err);
          // Fallback to database if plugin loading fails
          const sessionMessages = await chatApi.getSessionMessages(session.id);
          console.log(`[ChatTab] Loaded ${sessionMessages.length} messages from database for session ${session.id}`);

          loadedMessages = sessionMessages.map((msg) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp * 1000),
            status: 'completed' as const,
          }));
        }
      } else {
        // No CLI session ID, load from database
        const sessionMessages = await chatApi.getSessionMessages(session.id);
        console.log(`[ChatTab] Loaded ${sessionMessages.length} messages from database for session ${session.id}`);

        loadedMessages = sessionMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp * 1000),
          status: 'completed' as const,
        }));
      }

      console.log('[ChatTab] Setting messages to:', loadedMessages);
      setMessages(activeTabId, loadedMessages);

      // Create an AgentSession object from the database session for display
      // Always set status to 'stopped' for resumed sessions - we don't have an active agent process yet
      const resumedAgentSession: AgentSession = {
        session_id: session.id,
        project_id: session.project_id,
        agent_type: session.agent_type,
        status: 'stopped',
        pid: null,
        started_at: session.started_at,
        last_activity: session.ended_at || session.started_at,
        claude_session_id: session.claude_session_id || null,
      };

      // Set flag to prevent useEffect from reloading messages
      skipNextLoadRef.current = true;

      setActiveSession(activeTabId, resumedAgentSession);
      setDbSessionId(session.id); // Set the DB session ID to the original session
      setShowSessionHistory(false);

      // System message removed - no longer showing "Viewing session history" notification
      console.log('[ChatTab] Resumed session, total messages:', useChatStore.getState().getMessages(activeTabId).length);
    } catch (err) {
      console.error('Failed to resume session:', err);
      setError(`Failed to resume session: ${err}`);
    } finally {
      setIsStartingSession(false);
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

      // Load messages from plugin system
      const pluginName = currentAgentType.toLowerCase().replace(/\s+/g, '-');
      console.log(`[ChatTab] Loading chat history for CLI session: ${cliSessionId} from plugin: ${pluginName}`);

      const history = await pluginChatApi.getChatHistory(pluginName, cliSessionId);
      console.log(`[ChatTab] Loaded ${history.length} messages from plugin`);

      // Convert plugin history to ChatMessage format
      const loadedMessages: ChatMessage[] = history.map((msg, index) => {
        const displayRole = msg.role as 'user' | 'assistant';
        return {
          id: `history-${cliSessionId}-${index}`,
          role: displayRole,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          status: 'completed' as const,
          metadata: msg.metadata && Object.keys(msg.metadata).length > 0 ? msg.metadata as MessageMetadata : undefined,
        };
      });

      // Set messages
      setMessages(activeTabId, loadedMessages);

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
      setDbSessionId(null); // No DB session for CLI-only sessions
      setShowSessionHistory(false);

      console.log('[ChatTab] Resumed CLI session, total messages:', loadedMessages.length);
    } catch (err) {
      console.error('Failed to resume CLI session:', err);
      setError(`Failed to resume CLI session: ${err}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  // Load more historical messages
  const loadMoreMessages = async () => {
    if (!currentCliSessionId || !historyHasMore || isLoadingMore || !currentAgentType) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const pluginName = currentAgentType.toLowerCase().replace(/\s+/g, '-');
      console.log(`[ChatTab] Loading more messages: offset=${historyOffset}, limit=${MESSAGES_PER_PAGE}`);

      const history = await pluginChatApi.getChatHistoryPaginated(
        pluginName,
        currentCliSessionId,
        historyOffset,
        MESSAGES_PER_PAGE
      );

      const newMessages: ChatMessage[] = history.messages.map((msg, index) => {
        // The role is already correct from the plugin (overridden to 'assistant' for tool messages)
        const displayRole = msg.role as 'user' | 'assistant';

        return {
          id: `history-${currentCliSessionId}-${historyOffset + index}`,
          role: displayRole,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
          status: 'completed' as const,
          metadata: msg.metadata && Object.keys(msg.metadata).length > 0 ? msg.metadata as MessageMetadata : undefined,
        };
      }).reverse(); // Reverse to get chronological order (oldest first)

      console.log(`[ChatTab] Loaded ${newMessages.length} more messages (has_more: ${history.has_more})`);

      // Prepend older messages to the beginning of the array
      const currentMessages = useChatStore.getState().getMessages(activeTabId);
      setMessages(activeTabId, [...newMessages, ...currentMessages]);
      setHistoryOffset((prev) => prev + MESSAGES_PER_PAGE);
      setHistoryHasMore(history.has_more);
    } catch (err) {
      console.error('Failed to load more messages:', err);
      setError(`Failed to load more messages: ${err}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content || isTyping) return;

    // If no active session, prompt to start one
    if (!activeSession) {
      setError('Please start a session first');
      return;
    }

    setInputValue('');
    setTyping(activeTabId, true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    if (!projectId || !activeTabId) return;
    addMessage(activeTabId, userMessage);

    try {
      // Check if we need to start a new agent session (for resumed sessions)
      let sessionIdToUse = activeSession.session_id;

      // If the session is stopped/completed, we need to start a new agent process
      if (activeSession.status === 'stopped' && activeSession.claude_session_id && projectId && currentAgentType) {
        console.log('[ChatTab] Restarting agent for resumed session with Claude session ID:', activeSession.claude_session_id, 'Agent:', currentAgentType);

        // Start a new agent session with the Claude resume flag
        const normalizedAgentType = currentAgentType.toLowerCase().replace(/\s+/g, '-');
        const newAgentSession = await agentSessionApi.startAgentSession(
          projectId,
          normalizedAgentType,
          activeSession.claude_session_id
        );

        // Update the active session with the new runtime session
        setActiveSession(activeTabId, newAgentSession);
        // Keep dbSessionId pointing to the original resumed session for message history
        sessionIdToUse = newAgentSession.session_id;

        console.log('[ChatTab] Agent restarted with session ID:', sessionIdToUse);
      }

      // Send to the persistent agent session
      await agentSessionApi.sendToAgent(sessionIdToUse, content);

      // Save user message to database
      if (projectId) {
        try {
          const sessionIdToSave = dbSessionId || sessionIdToUse;
          const savedUserMessage = await chatApi.saveMessage(
            projectId,
            sessionIdToSave,
            'user',
            content
          );
          console.log('[ChatTab] Saved user message to database:', savedUserMessage);

          // Update the temp message with the real ID from database
          updateMessage(activeTabId, userMessage.id, {
            id: savedUserMessage.id,
            status: 'sent' as MessageStatus
          });
        } catch (err) {
          console.error('[ChatTab] Failed to save user message:', err);
          // Still mark as sent even if save failed
          updateMessage(activeTabId, userMessage.id, {
            status: 'sent' as MessageStatus
          });
        }
      }

      // Clear the waiting for input state if this was a response to a prompt
      if (isWaitingForInput) {
        setIsWaitingForInput(false);
        setPendingPrompt('');
        setPendingUserPrompt(null);
      }

      // Add a "thinking" indicator message
      const thinkingMessage: ChatMessage = {
        id: `thinking-${Date.now()}`,
        role: 'assistant',
        content: '🤔 Claude is thinking...',
        timestamp: new Date(),
        status: 'streaming',
        isStreaming: true,
      };
      addMessage(activeTabId, thinkingMessage);

      // The response will come through the output polling
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');

      // Update user message to show error
      if (activeTabId) {
        updateMessage(activeTabId, userMessage.id, {
          status: 'error' as MessageStatus,
          metadata: { error: 'Failed to send' }
        });
      }

      // Restore the input value so user can retry
      setInputValue(content);
      setTyping(activeTabId, false);
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
              console.log('[ChatTab] Project data:', { projectId, path: project?.path, agent_type: currentAgentType });
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
              Start a new agent session to begin chatting. The agent will maintain context throughout the conversation.
            </p>
            {!activeSession && (
              <button
                onClick={() => startNewSession()}
                disabled={isStartingSession}
                className="btn btn-primary gap-2"
              >
                {isStartingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Start New Session
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {historyHasMore && (
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
                      Load {Math.min(MESSAGES_PER_PAGE, historyTotalCount - historyOffset)} more messages
                      ({historyTotalCount - historyOffset} remaining)
                    </>
                  )}
                </button>
              </div>
            )}

            <VirtualizedMessageList
              messages={messages}
              formatTimestamp={formatTimestamp}
            />

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="avatar">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                </div>
                <div className="chat-bubble chat-bubble-secondary px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
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
                activeSession
                  ? "Send a message to the agent... (Shift+Enter for new line)"
                  : "Start a session to begin chatting..."
              }
              className="textarea textarea-bordered flex-1 resize-none min-h-[50px] max-h-[200px]"
              disabled={isTyping || !activeSession}
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping || !activeSession}
              className="btn btn-primary"
              title="Send message (Enter)"
              data-send-button
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center text-xs text-base-content/50 px-1">
            <span>
              {activeSession ? (
                <>
                  Press <kbd className="kbd kbd-xs">Enter</kbd> to send,{' '}
                  <kbd className="kbd kbd-xs">Shift</kbd>+
                  <kbd className="kbd kbd-xs">Enter</kbd> for new line
                </>
              ) : (
                'Start a session to begin chatting'
              )}
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
      {projectId && project?.path && currentAgentType && (
        <SessionHistoryModal
          projectId={projectId}
          projectPath={project.path}
          pluginName={currentAgentType.toLowerCase().replace(/\s+/g, '-')}
          onResume={handleResumeCliSession}
          onClose={() => setShowSessionHistory(false)}
          isOpen={showSessionHistory}
          activeSessionId={activeSession?.claude_session_id || null}
        />
      )}
    </div>
  );
}
