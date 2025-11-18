import { FC, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, FileCode, FilePlus, FileX, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FileChange {
  id: string;
  project_id: string;
  session_id: string;
  file_path: string;
  change_type: 'created' | 'modified' | 'deleted';
  diff: string | null;
  reviewed: boolean;
  approved: boolean | null;
  timestamp: number;
}

interface ChangesTabProps {
  projectId: string;
}

export const ChangesTab: FC<ChangesTabProps> = ({ projectId }) => {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [selectedChange, setSelectedChange] = useState<FileChange | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Load changes
  const loadChanges = useCallback(async () => {
    try {
      setLoading(true);

      let allChanges: FileChange[];
      if (filter === 'pending') {
        allChanges = await invoke<FileChange[]>('get_pending_changes', { projectId });
      } else {
        allChanges = await invoke<FileChange[]>('get_all_changes', { projectId, limit: 100 });
      }

      // Filter based on selected filter
      let filteredChanges = allChanges;
      if (filter === 'approved') {
        filteredChanges = allChanges.filter(c => c.reviewed && c.approved === true);
      } else if (filter === 'rejected') {
        filteredChanges = allChanges.filter(c => c.reviewed && c.approved === false);
      } else if (filter === 'pending') {
        filteredChanges = allChanges.filter(c => !c.reviewed);
      }

      setChanges(filteredChanges);

      // Select first change if none selected
      if (!selectedChange && filteredChanges.length > 0) {
        setSelectedChange(filteredChanges[0]);
      }
    } catch (error) {
      console.error('Failed to load changes:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, selectedChange]);

  // Check if project is being watched
  const checkWatchingStatus = useCallback(async () => {
    try {
      const watching = await invoke<boolean>('is_watching_project', { projectId });
      setIsWatching(watching);
    } catch (error) {
      console.error('Failed to check watching status:', error);
    }
  }, [projectId]);

  // Start watching
  const startWatching = async () => {
    try {
      await invoke('start_watching_project', { projectId });
      setIsWatching(true);
      await loadChanges();
    } catch (error) {
      console.error('Failed to start watching:', error);
      alert('Failed to start watching: ' + error);
    }
  };

  // Stop watching
  const stopWatching = async () => {
    try {
      await invoke('stop_watching_project', { projectId });
      setIsWatching(false);
    } catch (error) {
      console.error('Failed to stop watching:', error);
      alert('Failed to stop watching: ' + error);
    }
  };

  // Approve a change
  const approveChange = async (changeId: string) => {
    try {
      await invoke('approve_change', { changeId });
      await loadChanges();

      // Update selected change if it was approved
      if (selectedChange?.id === changeId) {
        const updated = await invoke<FileChange>('approve_change', { changeId });
        setSelectedChange(updated);
      }
    } catch (error) {
      console.error('Failed to approve change:', error);
      alert('Failed to approve change: ' + error);
    }
  };

  // Reject a change
  const rejectChange = async (changeId: string) => {
    try {
      await invoke('reject_change', { changeId });
      await loadChanges();

      // Update selected change if it was rejected
      if (selectedChange?.id === changeId) {
        const updated = await invoke<FileChange>('reject_change', { changeId });
        setSelectedChange(updated);
      }
    } catch (error) {
      console.error('Failed to reject change:', error);
      alert('Failed to reject change: ' + error);
    }
  };

  // Load changes and check watching status on mount and when filter changes
  useEffect(() => {
    loadChanges();
    checkWatchingStatus();

    // Poll for new changes every 5 seconds
    const interval = setInterval(() => {
      loadChanges();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadChanges, checkWatchingStatus]);

  // Parse diff to get original and modified content
  const parseDiff = (diff: string | null, changeType: string): { original: string; modified: string } => {
    if (!diff) {
      return { original: '', modified: '' };
    }

    if (changeType === 'deleted') {
      // For deleted files, show the original content
      const lines = diff.split('\n').filter(line => line.startsWith('-') && !line.startsWith('---'));
      const original = lines.map(line => line.substring(1)).join('\n');
      return { original, modified: '' };
    }

    if (changeType === 'created') {
      // For created files, show the new content
      const lines = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
      const modified = lines.map(line => line.substring(1)).join('\n');
      return { original: '', modified };
    }

    // For modified files, reconstruct both versions
    const lines = diff.split('\n');
    const originalLines: string[] = [];
    const modifiedLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        continue;
      }

      if (line.startsWith('-')) {
        originalLines.push(line.substring(1));
      } else if (line.startsWith('+')) {
        modifiedLines.push(line.substring(1));
      } else if (line.startsWith(' ')) {
        const content = line.substring(1);
        originalLines.push(content);
        modifiedLines.push(content);
      }
    }

    return {
      original: originalLines.join('\n'),
      modified: modifiedLines.join('\n'),
    };
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <FilePlus className="w-4 h-4 text-green-500" />;
      case 'modified':
        return <FileCode className="w-4 h-4 text-blue-500" />;
      case 'deleted':
        return <FileX className="w-4 h-4 text-red-500" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (change: FileChange) => {
    if (!change.reviewed) {
      return <span className="badge badge-warning badge-sm">Pending</span>;
    }
    if (change.approved === true) {
      return <span className="badge badge-success badge-sm">Approved</span>;
    }
    if (change.approved === false) {
      return <span className="badge badge-error badge-sm">Rejected</span>;
    }
    return null;
  };

  const { original, modified } = selectedChange
    ? parseDiff(selectedChange.diff, selectedChange.change_type)
    : { original: '', modified: '' };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">File Changes</h2>

          {/* Filter tabs */}
          <div className="tabs tabs-boxed">
            <a
              className={`tab ${filter === 'pending' ? 'tab-active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </a>
            <a
              className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </a>
            <a
              className={`tab ${filter === 'approved' ? 'tab-active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved
            </a>
            <a
              className={`tab ${filter === 'rejected' ? 'tab-active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              Rejected
            </a>
          </div>
        </div>

        {/* Watch toggle */}
        <div className="flex items-center gap-2">
          {isWatching ? (
            <>
              <span className="text-sm text-success flex items-center gap-1">
                <Clock className="w-4 h-4 animate-pulse" />
                Watching
              </span>
              <button className="btn btn-sm btn-outline" onClick={stopWatching}>
                Stop Watching
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={startWatching}>
              Start Watching
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Changes list */}
        <div className="w-80 border-r flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <FileCode className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm text-center">
                  {filter === 'pending' ? 'No pending changes' : 'No changes found'}
                </p>
                {!isWatching && (
                  <p className="text-xs text-center mt-2">
                    Start watching to track file changes
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className={`p-3 cursor-pointer hover:bg-base-200 transition-colors ${
                      selectedChange?.id === change.id ? 'bg-base-200' : ''
                    }`}
                    onClick={() => setSelectedChange(change)}
                  >
                    <div className="flex items-start gap-2">
                      {getChangeIcon(change.change_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {change.file_path}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {getStatusBadge(change)}
                          <span className="capitalize">{change.change_type}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(change.timestamp * 1000, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diff viewer */}
        <div className="flex-1 flex flex-col">
          {selectedChange ? (
            <>
              {/* Selected file header */}
              <div className="flex items-center justify-between p-4 border-b bg-base-100">
                <div className="flex items-center gap-3">
                  {getChangeIcon(selectedChange.change_type)}
                  <div>
                    <h3 className="font-medium">{selectedChange.file_path}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedChange.change_type} • {formatDistanceToNow(selectedChange.timestamp * 1000, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {!selectedChange.reviewed && (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-success gap-2"
                      onClick={() => approveChange(selectedChange.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-error gap-2"
                      onClick={() => rejectChange(selectedChange.id)}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
                {selectedChange.reviewed && (
                  <div className="flex items-center gap-2">
                    {selectedChange.approved ? (
                      <span className="badge badge-success gap-1">
                        <Check className="w-3 h-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="badge badge-error gap-1">
                        <X className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Diff editor */}
              <div className="flex-1 overflow-hidden">
                {selectedChange.change_type === 'deleted' ? (
                  <div className="h-full bg-base-200 p-4">
                    <div className="alert alert-error">
                      <FileX className="w-5 h-5" />
                      <span>This file was deleted</span>
                    </div>
                    {original && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Original content:</h4>
                        <pre className="bg-base-100 p-4 rounded-lg overflow-auto max-h-96">
                          <code>{original}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : selectedChange.diff ? (
                  <DiffEditor
                    height="100%"
                    language="plaintext"
                    original={original}
                    modified={modified}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No diff available for this change</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a change to view the diff</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
