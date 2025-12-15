import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileType,
  File,
  Search,
  Calendar,
  HardDrive,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { readProjectFiles, readFileContent, getFolderChildren, getGitStatus, type FileNode, type GitFileStatus } from '../../api/files';

// File type icons mapping
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-primary" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-warning" />;
    case 'md':
    case 'txt':
      return <FileText className="w-4 h-4 text-base-content/50" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="w-4 h-4 text-secondary" />;
    case 'html':
    case 'css':
      return <FileType className="w-4 h-4 text-accent" />;
    default:
      return <File className="w-4 h-4 text-base-content/50" />;
  }
};

// Get Monaco language based on file extension
const getMonacoLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
      return 'javascript';
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

// Check if file is binary based on extension
const isBinaryFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
    'mp3', 'mp4', 'wav', 'avi', 'mov',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
    'woff', 'woff2', 'ttf', 'eot',
  ];
  return ext ? binaryExtensions.includes(ext) : false;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date from Unix timestamp
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
};

// Extended FileNode with content for preview
interface FileNodeWithContent extends FileNode {
  content?: string;
}

// Simplified mock file structure - kept for fallback in non-Tauri environment
const mockFileStructure: FileNodeWithContent[] = [
  {
    id: 'mock-readme',
    name: 'README.md',
    path: '/mock/README.md',
    type: 'file',
    size: 1234,
    modified: Math.floor(Date.now() / 1000) - 3600,
    content: '# Mock Project\n\nThis is mock data shown when Tauri is not available.',
  },
  {
    id: 'mock-package',
    name: 'package.json',
    path: '/mock/package.json',
    type: 'file',
    size: 567,
    modified: Math.floor(Date.now() / 1000) - 7200,
    content: '{\n  "name": "mock-project",\n  "version": "1.0.0"\n}',
  },
];

// Highlight matched text component
interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) {
    return <span>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-warning text-warning-content px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

// Git status color mapping
const getGitStatusColor = (status: GitFileStatus['status'] | undefined) => {
  switch (status) {
    case 'modified':
      return 'text-warning';
    case 'added':
    case 'untracked':
      return 'text-success';
    case 'deleted':
      return 'text-error';
    case 'renamed':
    case 'copied':
      return 'text-info';
    case 'conflict':
      return 'text-error font-bold';
    default:
      return '';
  }
};

const getGitStatusIndicator = (status: GitFileStatus['status'] | undefined) => {
  switch (status) {
    case 'modified':
      return 'M';
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'untracked':
      return 'U';
    case 'copied':
      return 'C';
    case 'conflict':
      return '!';
    default:
      return null;
  }
};

// File tree item component
interface FileTreeItemProps {
  node: FileNodeWithContent;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  loadingIds: Set<string>;
  gitStatus: Map<string, GitFileStatus['status']>;
  onSelect: (node: FileNodeWithContent) => void;
  onToggle: (id: string, node: FileNodeWithContent) => void;
  searchQuery?: string;
}

function FileTreeItem({
  node,
  level,
  selectedId,
  expandedIds,
  loadingIds,
  gitStatus,
  onSelect,
  onToggle,
  searchQuery = '',
}: FileTreeItemProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isFolder = node.type === 'folder';
  const isLoading = loadingIds.has(node.id);
  const hasChildren = node.hasChildren || (node.children && node.children.length > 0);

  // Check git status for this file
  const normalizedPath = node.path.replace(/\\/g, '/');
  const fileGitStatus = gitStatus.get(normalizedPath);
  const statusColor = getGitStatusColor(fileGitStatus);
  const statusIndicator = getGitStatusIndicator(fileGitStatus);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-base-300 rounded ${
          isSelected ? 'bg-primary/20 hover:bg-primary/30' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            onToggle(node.id, node);
          }
          onSelect(node);
        }}
      >
        {isFolder && hasChildren && (
          <span className="flex-shrink-0">
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            )}
          </span>
        )}
        {isFolder && !hasChildren && <span className="w-4" />}
        {!isFolder && <span className="w-4" />}

        <span className="flex-shrink-0">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-warning" />
            ) : (
              <Folder className="w-4 h-4 text-warning" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>

        <span className={`text-sm truncate flex-1 ${statusColor}`}>
          <HighlightedText text={node.name} query={searchQuery} />
        </span>

        {/* Git status indicator */}
        {statusIndicator && (
          <span className={`text-xs font-mono ${statusColor} flex-shrink-0`} title={fileGitStatus}>
            {statusIndicator}
          </span>
        )}
      </div>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              loadingIds={loadingIds}
              gitStatus={gitStatus}
              onSelect={onSelect}
              onToggle={onToggle}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Quick file search component
interface QuickFileSearchProps {
  fileTree: FileNodeWithContent[];
  onSelect: (node: FileNodeWithContent) => void;
  onClose: () => void;
}

function QuickFileSearch({ fileTree, onSelect, onClose }: QuickFileSearchProps) {
  const [query, setQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileNodeWithContent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const getAllFiles = (nodes: FileNodeWithContent[]): FileNodeWithContent[] => {
      const files: FileNodeWithContent[] = [];
      for (const node of nodes) {
        if (node.type === 'file') {
          files.push(node);
        }
        if (node.children) {
          files.push(...getAllFiles(node.children));
        }
      }
      return files;
    };

    const allFiles = getAllFiles(fileTree);
    const filtered = query
      ? allFiles.filter((file) =>
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          file.path.toLowerCase().includes(query.toLowerCase())
        )
      : allFiles;

    setFilteredFiles(filtered.slice(0, 20)); // Limit to 20 results
    setSelectedIndex(0);
  }, [query, fileTree]);

  const handleSelect = (file: FileNodeWithContent) => {
    onSelect(file);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredFiles[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={onClose}>
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search files by name or path..."
              className="input input-bordered w-full pl-10 pr-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No files found</p>
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-base-200 ${
                  index === selectedIndex ? 'bg-primary/20' : ''
                }`}
                onClick={() => handleSelect(file)}
              >
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-base-content/50 truncate">{file.path}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Filter file tree based on search query
const filterFileTree = (
  nodes: FileNodeWithContent[],
  query: string
): { filteredNodes: FileNodeWithContent[]; matchCount: number } => {
  if (!query.trim()) {
    return { filteredNodes: nodes, matchCount: 0 };
  }

  const lowerQuery = query.toLowerCase();
  let totalMatches = 0;

  const filterNode = (node: FileNodeWithContent): FileNodeWithContent | null => {
    const nameMatches = node.name.toLowerCase().includes(lowerQuery);
    const pathMatches = node.path.toLowerCase().includes(lowerQuery);

    if (node.type === 'file') {
      if (nameMatches || pathMatches) {
        totalMatches++;
        return node;
      }
      return null;
    }

    // For folders, check if any children match
    if (node.children) {
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is FileNodeWithContent => child !== null);

      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
    }

    // Include folder if its name matches, even if no children match
    if (nameMatches) {
      totalMatches++;
      return node;
    }

    return null;
  };

  const filteredNodes = nodes
    .map(node => filterNode(node))
    .filter((node): node is FileNodeWithContent => node !== null);

  return { filteredNodes, matchCount: totalMatches };
};

// Main FilesTab component props
interface FilesTabProps {
  projectId?: string;
}

// Main FilesTab component
export default function FilesTab({ projectId }: FilesTabProps) {
  const [fileTree, setFileTree] = useState<FileNodeWithContent[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNodeWithContent | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [gitStatus, setGitStatus] = useState<Map<string, GitFileStatus['status']>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useHotkeys('ctrl+p, cmd+p', (e) => {
    e.preventDefault();
    setShowQuickSearch(true);
  });

  // Keyboard shortcut for inline search (Ctrl/Cmd+F)
  useHotkeys('ctrl+f, cmd+f', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-expand folders when searching
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      // Expand all folders that contain matches
      const expandAllMatchingFolders = (nodes: FileNodeWithContent[]): string[] => {
        const ids: string[] = [];
        for (const node of nodes) {
          if (node.type === 'folder') {
            ids.push(node.id);
            if (node.children) {
              ids.push(...expandAllMatchingFolders(node.children));
            }
          }
        }
        return ids;
      };

      const { filteredNodes } = filterFileTree(fileTree, debouncedSearchQuery);
      const idsToExpand = expandAllMatchingFolders(filteredNodes);
      setExpandedIds(new Set(idsToExpand));
    }
  }, [debouncedSearchQuery, fileTree]);

  // Load file tree on mount
  useEffect(() => {
    const loadFiles = async () => {
      if (!projectId) {
        // Show empty state if no project ID
        setFileTree([]);
        setError('No project selected');
        return;
      }

      setIsLoadingTree(true);
      setError(null);

      try {
        // Load files and git status in parallel
        const [files, status] = await Promise.all([
          readProjectFiles(projectId),
          getGitStatus(projectId),
        ]);

        setFileTree(files as FileNodeWithContent[]);

        // Convert git status array to a Map for quick lookups
        const statusMap = new Map<string, GitFileStatus['status']>();
        for (const file of status) {
          // Normalize path separators for comparison
          const normalizedPath = file.path.replace(/\\/g, '/');
          statusMap.set(normalizedPath, file.status);
        }
        setGitStatus(statusMap);
      } catch (err) {
        console.error('Failed to load project files:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
        setError(errorMessage);
        // Show empty state on error instead of mock data
        setFileTree([]);
      } finally {
        setIsLoadingTree(false);
      }
    };

    loadFiles();
  }, [projectId]);

  // Helper function to update children in the file tree
  const updateNodeChildren = (
    nodes: FileNodeWithContent[],
    nodeId: string,
    children: FileNodeWithContent[]
  ): FileNodeWithContent[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, nodeId, children) };
      }
      return node;
    });
  };

  const handleToggle = async (id: string, node: FileNodeWithContent) => {
    // If collapsing, just toggle the expanded state
    if (expandedIds.has(id)) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    // If expanding and children not loaded, fetch them
    if (node.type === 'folder' && !node.children && node.hasChildren && projectId) {
      setLoadingIds((prev) => new Set(prev).add(id));

      try {
        const children = await getFolderChildren(projectId, node.path);
        // Update the file tree with the loaded children
        setFileTree((prev) => updateNodeChildren(prev, id, children as FileNodeWithContent[]));
      } catch (err) {
        console.error('Failed to load folder children:', err);
        setError(err instanceof Error ? err.message : 'Failed to load folder contents');
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }

    // Expand the folder
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleSelect = async (node: FileNodeWithContent) => {
    setSelectedFile(node);

    // Only load content for files, not folders
    if (node.type !== 'file') {
      return;
    }

    // Don't try to load binary files
    if (isBinaryFile(node.name)) {
      setSelectedFile({ ...node, content: undefined });
      return;
    }

    // Check file size limit (1MB = 1,048,576 bytes)
    if (node.size && node.size > 1048576) {
      setSelectedFile({ ...node, content: undefined });
      setError('File is too large to display (> 1MB)');
      return;
    }

    // If it's a file and we have a project ID, load its content
    if (projectId && !node.content) {
      setIsLoadingContent(true);
      setError(null);
      try {
        const content = await readFileContent(projectId, node.path);
        // Update the selected file with content
        setSelectedFile({ ...node, content });
      } catch (err) {
        console.error('Failed to load file content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file content');
        // Show file without content on error
        setSelectedFile({ ...node, content: undefined });
      } finally {
        setIsLoadingContent(false);
      }
    }
  };

  const toggleEditor = () => {
    setEditorCollapsed(!editorCollapsed);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  // Get breadcrumb path
  const getBreadcrumbs = (): string[] => {
    if (!selectedFile) return [];
    return selectedFile.path.split(/[/\\]/).filter(Boolean);
  };

  // Get filtered file tree and match count
  const { filteredNodes: displayedFileTree, matchCount } = filterFileTree(
    fileTree,
    debouncedSearchQuery
  );

  return (
    <>
      <div className="card bg-base-200 h-[calc(100vh-16rem)]">
        <PanelGroup direction="horizontal" className="h-full" autoSaveId="files-panels">
          {/* Left side - File tree */}
          <Panel defaultSize={30} minSize={20} maxSize={editorCollapsed ? 100 : 50}>
          <div className="border-r border-base-300 flex flex-col h-full">
            {/* Search bar */}
            <div className="p-4 border-b border-base-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search files... (Ctrl/Cmd+F)"
                  className="input input-sm input-bordered w-full pl-9 pr-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {debouncedSearchQuery && (
                <div className="mt-2 text-xs text-base-content/60">
                  {matchCount === 0 ? (
                    <span className="text-warning">No matches found</span>
                  ) : (
                    <span>
                      {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-warning m-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* File tree */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingTree ? (
                <div className="flex items-center justify-center h-full">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : displayedFileTree.length === 0 ? (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  <div className="text-center max-w-md px-4">
                    {debouncedSearchQuery ? (
                      <>
                        <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium mb-2">No files match your search</p>
                        <p className="text-xs">
                          Try a different search term or{' '}
                          <button
                            className="link link-primary"
                            onClick={clearSearch}
                          >
                            clear the search
                          </button>
                        </p>
                      </>
                    ) : fileTree.length === 0 ? (
                      <>
                        <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        {error ? (
                          <>
                            <p className="text-sm font-medium mb-2">Unable to load files</p>
                            <p className="text-xs text-error mb-3">{error}</p>
                            {error.includes('Project not found') && (
                              <p className="text-xs">
                                This project no longer exists. Please create a new project or open an existing one from the home page.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm">No files found</p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                displayedFileTree.map((node) => (
                  <FileTreeItem
                    key={node.id}
                    node={node}
                    level={0}
                    selectedId={selectedFile?.id || null}
                    expandedIds={expandedIds}
                    loadingIds={loadingIds}
                    gitStatus={gitStatus}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                    searchQuery={debouncedSearchQuery}
                  />
                ))
              )}
            </div>
          </div>
          </Panel>

          {/* Right side - Monaco Editor */}
          {!editorCollapsed && (
            <>
            <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />
            <Panel defaultSize={70} minSize={50}>
            <div className="bg-base-100 flex flex-col h-full">
              {selectedFile ? (
                <>
                  {/* Header with breadcrumbs and file info */}
                  <div className="border-b border-base-300 p-3 bg-base-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-base-content/60">
                        {getBreadcrumbs().map((crumb, index, arr) => (
                          <div key={index} className="flex items-center gap-2">
                            <span>{crumb}</span>
                            {index < arr.length - 1 && (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={toggleEditor}
                        title="Hide editor"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedFile.name)}
                      <h3 className="font-semibold">{selectedFile.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-base-content/70">
                      {selectedFile.size && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          <span>{formatFileSize(selectedFile.size)}</span>
                        </div>
                      )}
                      {selectedFile.modified && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(selectedFile.modified)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editor content */}
                  <div className="flex-1 overflow-hidden">
                    {isLoadingContent ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="loading loading-spinner loading-lg"></span>
                      </div>
                    ) : selectedFile.type === 'folder' ? (
                      <div className="h-full flex items-center justify-center text-base-content/50">
                        <div className="text-center">
                          <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p className="font-semibold text-lg text-base-content">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm mt-2">Folder</p>
                        </div>
                      </div>
                    ) : isBinaryFile(selectedFile.name) ? (
                      <div className="h-full flex items-center justify-center text-base-content/50">
                        <div className="text-center">
                          <FileImage className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p className="font-semibold text-lg text-base-content">
                            Binary File
                          </p>
                          <p className="text-sm mt-2">Cannot display binary files</p>
                        </div>
                      </div>
                    ) : selectedFile.size && selectedFile.size > 1048576 ? (
                      <div className="h-full flex items-center justify-center text-base-content/50">
                        <div className="text-center">
                          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p className="font-semibold text-lg text-base-content">
                            File Too Large
                          </p>
                          <p className="text-sm mt-2">
                            Files larger than 1MB cannot be displayed
                          </p>
                          <p className="text-xs mt-1">
                            Size: {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                    ) : selectedFile.content !== undefined ? (
                      <Editor
                        height="100%"
                        defaultLanguage={getMonacoLanguage(selectedFile.name)}
                        language={getMonacoLanguage(selectedFile.name)}
                        value={selectedFile.content}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: true },
                          lineNumbers: 'on',
                          renderWhitespace: 'selection',
                          scrollBeyondLastLine: false,
                          fontSize: 13,
                          automaticLayout: true,
                          wordWrap: 'off',
                          find: {
                            addExtraSpaceOnTop: false,
                            autoFindInSelection: 'never',
                            seedSearchStringFromSelection: 'always',
                          },
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-base-content/50">
                        <div className="text-center">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p>No preview available</p>
                          <p className="text-xs mt-2">File content could not be loaded</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-base-content/50">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a file to view</p>
                    <p className="text-xs mt-2">Press Ctrl/Cmd+P for quick search</p>
                  </div>
                </div>
              )}
            </div>
            </Panel>
            </>
          )}
        </PanelGroup>

        {/* Show editor button when collapsed */}
        {editorCollapsed && selectedFile && selectedFile.type === 'file' && (
          <button
            className="absolute top-4 right-4 btn btn-primary btn-sm gap-2"
            onClick={toggleEditor}
          >
            <Maximize2 className="w-4 h-4" />
            Show Editor
          </button>
        )}
      </div>

      {/* Quick file search modal */}
      {showQuickSearch && (
        <QuickFileSearch
          fileTree={fileTree}
          onSelect={handleSelect}
          onClose={() => setShowQuickSearch(false)}
        />
      )}
    </>
  );
}
