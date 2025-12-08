import { X, Clock, MessageSquare, PlayCircle, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { DbAgentSession } from '../../api/agentSession';
import * as pluginChatApi from '../../lib/chat';

export interface SessionHistoryModalProps {
  projectId: string;
  projectPath: string;
  pluginName: string;
  onResume: (cliSessionId: string) => void;
  onClose: () => void;
  isOpen: boolean;
  activeSessionId?: string | null;
}

export default function SessionHistoryModal({
  projectId,
  projectPath,
  pluginName,
  onResume,
  onClose,
  isOpen,
  activeSessionId,
}: SessionHistoryModalProps) {
  const [sessions, setSessions] = useState<pluginChatApi.SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load CLI sessions from plugin
  useEffect(() => {
    const loadCliSessions = async () => {
      if (!isOpen) return;

      setLoading(true);
      setError(null);

      try {
        console.log('[SessionHistoryModal] Loading CLI sessions for plugin:', pluginName);
        const cliSessions = await pluginChatApi.listCliSessions(pluginName, projectPath);
        console.log('[SessionHistoryModal] Loaded CLI sessions:', cliSessions);

        // Sort sessions by creation time, most recent first
        const sortedSessions = [...cliSessions].sort((a, b) => b.created_at - a.created_at);
        setSessions(sortedSessions);
      } catch (err) {
        console.error('[SessionHistoryModal] Failed to load CLI sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadCliSessions();
  }, [isOpen, pluginName, projectPath]);

  if (!isOpen) return null;

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Format full date
  const formatFullDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Calculate session duration
  const getSessionDuration = (startedAt: number, endedAt: number | null): string => {
    const end = endedAt || Date.now() / 1000;
    const duration = end - startedAt;

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Session History</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            // Loading state
            <div className="text-center py-12">
              <div className="loading loading-spinner loading-lg mx-auto mb-3"></div>
              <p className="text-sm text-base-content/50">Loading sessions...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-error/30 mb-3" />
              <h4 className="font-semibold text-error/70 mb-1">
                Failed to load sessions
              </h4>
              <p className="text-sm text-base-content/50">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
              <h4 className="font-semibold text-base-content/70 mb-1">
                No Previous Sessions
              </h4>
              <p className="text-sm text-base-content/50">
                Start a new session to begin chatting with {pluginName}
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = activeSessionId === session.session_id;
              const messageCount = session.message_count || 0;

              return (
                <div
                  key={session.session_id}
                  className={`card transition-colors ${
                    isActive
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        {/* Session ID */}
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-base">
                            Session {session.session_id.slice(0, 8)}
                          </h4>
                          {isActive && (
                            <div className="badge badge-primary badge-sm">
                              Active
                            </div>
                          )}
                        </div>

                        {/* Last message preview */}
                        {session.last_message_preview && (
                          <p className="text-sm text-base-content/70 mb-2 truncate">
                            {session.last_message_preview}
                          </p>
                        )}

                        {/* Timestamps */}
                        <div className="space-y-1 text-xs text-base-content/60">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>Started {formatRelativeTime(session.created_at)}</span>
                            <span className="text-base-content/40">
                              ({formatFullDate(session.created_at)})
                            </span>
                          </div>

                          {/* Message Count */}
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" />
                            <span>
                              {messageCount} message{messageCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs truncate">
                              ID: {session.session_id.slice(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resume Button */}
                      {!isActive && (
                        <button
                          onClick={() => onResume(session.session_id)}
                          className="btn btn-primary btn-sm gap-1 flex-shrink-0"
                          title="Resume this session"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-action mt-4">
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
