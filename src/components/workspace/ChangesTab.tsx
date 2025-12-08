import { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import {
  FileText,
  FilePlus,
  FileEdit,
  FileX,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { readFileContent } from '../../api/files';

interface ChangesTabProps {
  projectId?: string;
}

interface FileChange {
  id: string;
  fileName: string;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  timestamp: Date;
  approved?: boolean;
  rejected?: boolean;
}

// Get icon for change type
const getChangeIcon = (changeType: FileChange['changeType']) => {
  switch (changeType) {
    case 'created':
      return <FilePlus className="w-4 h-4 text-success" />;
    case 'modified':
      return <FileEdit className="w-4 h-4 text-warning" />;
    case 'deleted':
      return <FileX className="w-4 h-4 text-error" />;
    case 'renamed':
      return <FileEdit className="w-4 h-4 text-info" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

// Get badge color for change type
const getChangeBadge = (changeType: FileChange['changeType']) => {
  switch (changeType) {
    case 'created':
      return 'badge-success';
    case 'modified':
      return 'badge-warning';
    case 'deleted':
      return 'badge-error';
    case 'renamed':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
};

// Get Monaco language from file extension
const getMonacoLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'c':
      return 'c';
    case 'cs':
      return 'csharp';
    case 'php':
      return 'php';
    case 'rb':
      return 'ruby';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'sql':
      return 'sql';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    default:
      return 'plaintext';
  }
};

export default function ChangesTab({ projectId }: ChangesTabProps) {
  // TODO: Implement file change tracking via file watcher or git integration
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedChange, setSelectedChange] = useState<FileChange | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load file content when a change is selected
  useEffect(() => {
    const loadFileContent = async () => {
      if (!selectedChange || !projectId) return;

      setIsLoadingContent(true);
      setError(null);

      try {
        // For deleted files, we can't read the current content
        if (selectedChange.changeType === 'deleted') {
          setOriginalContent('// File was deleted');
          setModifiedContent('');
          setIsLoadingContent(false);
          return;
        }

        // For created files, original is empty
        if (selectedChange.changeType === 'created') {
          setOriginalContent('');
          const content = await readFileContent(projectId, selectedChange.filePath);
          setModifiedContent(content);
          setIsLoadingContent(false);
          return;
        }

        // For modified files, we read the current content
        // Note: In a real implementation, we'd need to get the original content from git or a backup
        // For now, we'll show the current content as "modified" and empty as "original"
        // This is a limitation that would need backend support to properly implement
        const content = await readFileContent(projectId, selectedChange.filePath);
        setOriginalContent('// Original content not available\n// Backend integration needed to retrieve previous version');
        setModifiedContent(content);

      } catch (err) {
        console.error('Failed to load file content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file content');
        setOriginalContent('');
        setModifiedContent('');
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadFileContent();
  }, [selectedChange, projectId]);

  const handleApprove = (change: FileChange) => {
    console.log('Approving change:', change);
    setFileChanges((prev) =>
      prev.map((c) =>
        c.id === change.id ? { ...c, approved: true, rejected: false } : c
      )
    );
  };

  const handleReject = (change: FileChange) => {
    console.log('Rejecting change:', change);
    setFileChanges((prev) =>
      prev.map((c) =>
        c.id === change.id ? { ...c, rejected: true, approved: false } : c
      )
    );
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

  // Show error if no project ID
  if (!projectId) {
    return (
      <div className="card bg-base-200 h-[calc(100vh-16rem)]">
        <div className="card-body flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No Project Selected</h3>
            <p className="text-base-content/60">Please select a project to view changes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 h-[calc(100vh-16rem)]">
      <div className="card-body p-0 flex flex-row h-full">
        {/* Left side - File changes list */}
        <div className="w-[30%] border-r border-base-300 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-base-300">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Changes
              {fileChanges.length > 0 && (
                <span className="badge badge-neutral">{fileChanges.length}</span>
              )}
            </h3>
            <p className="text-xs text-base-content/60 mt-1">
              Files modified by AI agent
            </p>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {fileChanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-base-content/60">No changes yet</p>
                <p className="text-xs text-base-content/50 mt-1">
                  File changes will appear here when the agent modifies files
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {fileChanges.map((change) => (
                  <div
                    key={change.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChange?.id === change.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-base-300 hover:bg-base-100/50'
                    } ${
                      change.approved
                        ? 'border-l-4 border-l-success'
                        : change.rejected
                        ? 'border-l-4 border-l-error'
                        : ''
                    }`}
                    onClick={() => setSelectedChange(change)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getChangeIcon(change.changeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {change.fileName}
                          </span>
                          <span className={`badge badge-xs ${getChangeBadge(change.changeType)}`}>
                            {change.changeType}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/60 truncate">
                          {change.filePath}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-base-content/50">
                            {formatTimestamp(change.timestamp)}
                          </span>
                          {change.approved && (
                            <span className="badge badge-success badge-xs">Approved</span>
                          )}
                          {change.rejected && (
                            <span className="badge badge-error badge-xs">Rejected</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 text-base-content/30" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Diff viewer */}
        <div className="flex-1 bg-base-100 flex flex-col">
          {selectedChange ? (
            <>
              {/* Header with file info and actions */}
              <div className="border-b border-base-300 p-4 bg-base-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getChangeIcon(selectedChange.changeType)}
                    <div>
                      <h3 className="font-semibold">{selectedChange.fileName}</h3>
                      <p className="text-xs text-base-content/60">{selectedChange.filePath}</p>
                    </div>
                    <span className={`badge ${getChangeBadge(selectedChange.changeType)}`}>
                      {selectedChange.changeType}
                    </span>
                  </div>

                  {/* Approve/Reject buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className={`btn btn-sm gap-2 ${
                        selectedChange.rejected ? 'btn-error' : 'btn-outline btn-error'
                      }`}
                      onClick={() => handleReject(selectedChange)}
                      disabled={selectedChange.rejected}
                    >
                      <X className="w-4 h-4" />
                      {selectedChange.rejected ? 'Rejected' : 'Reject'}
                    </button>
                    <button
                      className={`btn btn-sm gap-2 ${
                        selectedChange.approved ? 'btn-success' : 'btn-outline btn-success'
                      }`}
                      onClick={() => handleApprove(selectedChange)}
                      disabled={selectedChange.approved}
                    >
                      <Check className="w-4 h-4" />
                      {selectedChange.approved ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="alert alert-error alert-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">{error}</span>
                  </div>
                )}
              </div>

              {/* Diff editor */}
              <div className="flex-1 overflow-hidden">
                {isLoadingContent ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-base-content/60">Loading file content...</span>
                    </div>
                  </div>
                ) : selectedChange.changeType === 'deleted' ? (
                  <div className="h-full flex items-center justify-center text-base-content/50">
                    <div className="text-center">
                      <FileX className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="font-semibold text-lg text-base-content">
                        File Deleted
                      </p>
                      <p className="text-sm mt-2">
                        This file was removed by the agent
                      </p>
                    </div>
                  </div>
                ) : (
                  <DiffEditor
                    height="100%"
                    language={getMonacoLanguage(selectedChange.fileName)}
                    original={originalContent}
                    modified={modifiedContent}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      renderWhitespace: 'selection',
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      automaticLayout: true,
                      wordWrap: 'off',
                      ignoreTrimWhitespace: false,
                      renderOverviewRuler: true,
                      enableSplitViewResizing: true,
                      originalEditable: false,
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-base-content/50">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Select a file to view changes</p>
                <p className="text-xs mt-2">
                  Choose a file from the list to see the diff
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
