import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Circle,
  Power,
  PowerOff,
  Send,
  MessageSquare,
  Clock,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import StatsPanel from './StatsPanel';
import { getActivities } from '../../api/activity';
import { getProjectStats } from '../../api/stats';
import type { ActivityLog, ProjectStats } from '../../types/tauri';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore } from '../../stores/chatStore';
import * as agentSessionApi from '../../api/agentSession';
import type { AgentSession } from '../../api/agentSession';
import * as sessionPolling from '../../services/sessionPollingManager';
import type { ChatMessage } from './ChatTab';

export interface OverviewTabProps {
  projectId: string;
  agentType: string;
  projectPath: string;
}

interface QuickMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function OverviewTab({ projectId, agentType, projectPath }: OverviewTabProps) {
  // Session from store (shared across components)
  const activeSession = useSessionStore((state) => state.getActiveSession(projectId));
  const setActiveSession = useSessionStore((state) => state.setActiveSession);

  // State
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  // Quick chat state
  const [quickChatInput, setQuickChatInput] = useState('');
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial stats and check for active session
  useEffect(() => {
    loadStats();
    checkForActiveSession();
  }, [projectId]);

  // Update elapsed time
  useEffect(() => {
    if (activeSession && activeSession.status === 'running' && sessionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime * 1000) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeSession, sessionStartTime]);

  // Auto-scroll quick chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [quickMessages]);

  // Cleanup: Stop polling when component unmounts or project changes
  useEffect(() => {
    return () => {
      console.log('[OverviewTab] Cleanup: Stopping polling for project:', projectId);
      sessionPolling.stopPolling(projectId);
    };
  }, [projectId]);

  async function loadStats() {
    try {
      setIsLoadingStats(true);
      const projectStats = await getProjectStats(projectId);
      setStats(projectStats);
    } catch (error) {
      console.error('Failed to load project stats:', error);
      setStats({
        files_changed: 0,
        commits: 0,
        messages: 0,
        tasks_completed: 0,
        tasks_total: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function checkForActiveSession() {
    try {
      const sessions = await agentSessionApi.listAgentSessions();
      const projectSession = sessions.find(s => s.project_id === projectId);

      if (projectSession) {
        setActiveSession(projectId, projectSession);
        setSessionStartTime(projectSession.started_at);
      }
    } catch (error) {
      console.error('Failed to check for active session:', error);
    }
  }

  async function handleStartSession() {
    setIsStartingSession(true);
    try {
      const normalizedAgentType = agentType.toLowerCase().replace(/\s+/g, '-');
      const session = await agentSessionApi.startAgentSession(
        projectId,
        normalizedAgentType
      );

      setActiveSession(projectId, session);
      setSessionStartTime(session.started_at);

      // Start global polling for this session
      sessionPolling.startPolling(projectId);

      // Reload stats after starting session
      loadStats();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start agent session. Please check console for details.');
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleStopSession() {
    if (!activeSession) return;

    try {
      // Only try to stop the backend session if it's actually running
      // Resumed CLI sessions have status 'stopped' and don't have an active backend process
      if (activeSession.status === 'running') {
        await agentSessionApi.stopAgentSession(activeSession.session_id);
      } else {
        console.log('[OverviewTab] Session already stopped, just clearing from UI');
      }

      // Stop global polling for this session
      sessionPolling.stopPolling(projectId);

      setActiveSession(projectId, null);
      setSessionStartTime(null);
      setElapsedTime(0);

      // Reload stats after stopping session
      loadStats();
    } catch (error) {
      console.error('Failed to stop session:', error);
      alert('Failed to stop agent session. Please check console for details.');
    }
  }

  function formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  function copySessionId() {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.session_id);
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    }
  }

  async function handleSendQuickMessage() {
    const message = quickChatInput.trim();
    if (!message || !activeSession) return;

    setIsSendingMessage(true);
    setQuickChatInput('');

    // Add user message to quick chat
    const userMessage: QuickMessage = {
      id: `quick-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setQuickMessages(prev => [...prev, userMessage]);

    // Also add to global chat store for sync with ChatTab
    const globalChatMessage: ChatMessage = {
      id: userMessage.id,
      role: 'user',
      content: message,
      timestamp: new Date(),
      status: 'sending',
    };
    useChatStore.getState().addMessage(projectId, globalChatMessage);

    try {
      // Send to agent
      await agentSessionApi.sendToAgent(activeSession.session_id, message);

      // Note: Chat history is managed by CLI plugins, no database saving needed

      // Update status to sent
      useChatStore.getState().updateMessage(projectId, userMessage.id, { status: 'sent' });

      // Add thinking indicator (only to quick chat, file watcher will update global store)
      const thinkingMessage: QuickMessage = {
        id: `thinking-${Date.now()}`,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date(),
      };
      setQuickMessages(prev => [...prev, thinkingMessage]);

      // Reload stats to update message count
      loadStats();
    } catch (error) {
      console.error('Failed to send message:', error);
      setQuickMessages(prev => prev.filter(m => m.id !== userMessage.id));
      // Remove from global store on error
      useChatStore.getState().updateMessage(projectId, userMessage.id, { status: 'error' });
    } finally {
      setIsSendingMessage(false);
    }
  }

  function handleQuickChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuickMessage();
    }
  }

  function switchToChatTab() {
    // Find the Chat tab button and click it
    const chatTab = document.querySelector('[data-tab="chat"]') as HTMLButtonElement;
    if (chatTab) {
      chatTab.click();
    }
  }

  const getSessionStatusDisplay = () => {
    if (!activeSession) {
      return {
        label: 'No Active Session',
        color: 'text-base-content/30',
        bgColor: 'bg-base-content/10',
        dotColor: 'bg-base-content/30',
      };
    }

    switch (activeSession.status) {
      case 'running':
        return {
          label: 'Running',
          color: 'text-success',
          bgColor: 'bg-success/10',
          dotColor: 'bg-success',
        };
      case 'stopped':
        return {
          label: 'Stopped',
          color: 'text-error',
          bgColor: 'bg-error/10',
          dotColor: 'bg-error',
        };
      default:
        return {
          label: 'Idle',
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          dotColor: 'bg-warning',
        };
    }
  };

  const statusDisplay = getSessionStatusDisplay();

  return (
    <div className="space-y-6">
      {/* Agent Status Banner */}
      <div className={`card ${activeSession?.status === 'running' ? 'bg-success/10 border border-success/30' : 'bg-base-200'}`}>
        <div className="card-body py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Status Info */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                activeSession?.status === 'running' ? 'bg-success/20' : 'bg-base-300'
              }`}>
                <Bot className={`w-6 h-6 ${activeSession?.status === 'running' ? 'text-success' : 'text-base-content/50'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{agentType}</span>
                  <div className={`badge badge-sm ${statusDisplay.bgColor} ${statusDisplay.color} gap-1`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dotColor} ${activeSession?.status === 'running' ? 'animate-pulse' : ''}`}></div>
                    {statusDisplay.label}
                  </div>
                </div>
                {activeSession ? (
                  <div className="flex items-center gap-3 text-sm text-base-content/60 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatElapsedTime(elapsedTime)}
                    </span>
                    <button
                      onClick={copySessionId}
                      className="flex items-center gap-1 hover:text-base-content transition-colors"
                      title="Copy session ID"
                    >
                      <code className="text-xs">{activeSession.session_id.slice(0, 8)}...</code>
                      {copiedSessionId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/50 mt-1">Start a session to begin working with your AI agent</p>
                )}
              </div>
            </div>

            {/* Right: Action Button */}
            <div>
              {activeSession ? (
                <button
                  onClick={handleStopSession}
                  className="btn btn-error gap-2"
                >
                  <PowerOff className="w-4 h-4" />
                  Stop Session
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={isStartingSession}
                  className="btn btn-success gap-2"
                >
                  {isStartingSession ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Start Session
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoadingStats ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <StatsPanel
          filesChanged={stats?.files_changed || 0}
          commits={stats?.commits || 0}
          messages={stats?.messages || 0}
          tasksCompleted={stats?.tasks_completed || 0}
          tasksTotal={stats?.tasks_total || 0}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quick Chat Card */}
        <div className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer" onClick={switchToChatTab}>
          <div className="card-body py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Open Chat</h3>
                <p className="text-sm text-base-content/60">Chat with your AI agent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Send Message */}
        {activeSession && (
          <div className="card bg-base-200">
            <div className="card-body py-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickChatInput}
                  onChange={(e) => setQuickChatInput(e.target.value)}
                  onKeyDown={handleQuickChatKeyDown}
                  placeholder="Quick message..."
                  disabled={isSendingMessage}
                  className="input input-bordered input-sm flex-1"
                />
                <button
                  onClick={handleSendQuickMessage}
                  disabled={!quickChatInput.trim() || isSendingMessage}
                  className="btn btn-primary btn-sm"
                >
                  {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Quick Messages (if any) */}
      {quickMessages.length > 0 && (
        <div className="card bg-base-200">
          <div className="card-body py-4">
            <h3 className="text-sm font-medium text-base-content/60 mb-3">Recent Messages</h3>
            <div className="space-y-2">
              {quickMessages.slice(-3).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/10 ml-8'
                      : 'bg-base-300 mr-8'
                  }`}
                >
                  <div className="font-medium text-xs opacity-60 mb-1">
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </div>
                  <div className="line-clamp-2">{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <button onClick={switchToChatTab} className="btn btn-ghost btn-sm mt-2 w-full">
              View Full Conversation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
