import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { readProjectFiles, readFileContent, type FileNode } from '../../api/files';

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

// File tree item component
interface FileTreeItemProps {
  node: FileNodeWithContent;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: FileNodeWithContent) => void;
  onToggle: (id: string) => void;
}

function FileTreeItem({
  node,
  level,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: FileTreeItemProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isFolder = node.type === 'folder';

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-base-300 rounded ${
          isSelected ? 'bg-primary/20 hover:bg-primary/30' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            onToggle(node.id);
          }
          onSelect(node);
        }}
      >
        {isFolder && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronRight className="w-4 h-4 text-base-content/50" />
            )}
          </span>
        )}
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

        <span className="text-sm truncate">{node.name}</span>
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
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// File preview component
interface FilePreviewProps {
  file: FileNodeWithContent | null;
  isLoading?: boolean;
}

function FilePreview({ file, isLoading }: FilePreviewProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-base-content/50">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }

  if (file.type === 'folder') {
    return (
      <div className="h-full flex items-center justify-center text-base-content/50">
        <div className="text-center">
          <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg text-base-content">{file.name}</p>
          <p className="text-sm mt-2">Folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* File metadata header */}
      <div className="border-b border-base-300 p-4 bg-base-200">
        <div className="flex items-center gap-3 mb-3">
          {getFileIcon(file.name)}
          <h3 className="font-semibold text-lg">{file.name}</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {file.size && (
            <div className="flex items-center gap-2 text-base-content/70">
              <HardDrive className="w-4 h-4" />
              <span>{formatFileSize(file.size)}</span>
            </div>
          )}
          {file.modified && (
            <div className="flex items-center gap-2 text-base-content/70">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(file.modified)}</span>
            </div>
          )}
        </div>
      </div>

      {/* File content preview */}
      <div className="flex-1 overflow-auto">
        {file.content ? (
          <div className="bg-base-300">
            <pre className="p-4 text-sm font-mono overflow-x-auto">
              <code className="text-base-content/90">{file.content}</code>
            </pre>
          </div>
        ) : (
          <div className="p-8 text-center text-base-content/50">
            <p>No preview available</p>
            <p className="text-xs mt-2">File content not loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main FilesTab component props
interface FilesTabProps {
  projectId?: string;
}

// Main FilesTab component
export default function FilesTab({ projectId }: FilesTabProps) {
  const [fileTree, setFileTree] = useState<FileNodeWithContent[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNodeWithContent | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load file tree on mount
  useEffect(() => {
    const loadFiles = async () => {
      if (!projectId) {
        // Use mock data if no project ID
        setFileTree(mockFileStructure);
        return;
      }

      setIsLoadingTree(true);
      setError(null);

      try {
        const files = await readProjectFiles(projectId);
        setFileTree(files as FileNodeWithContent[]);
      } catch (err) {
        console.error('Failed to load project files:', err);
        setError(err instanceof Error ? err.message : 'Failed to load files');
        // Fallback to mock data on error
        setFileTree(mockFileStructure);
      } finally {
        setIsLoadingTree(false);
      }
    };

    loadFiles();
  }, [projectId]);

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = async (node: FileNodeWithContent) => {
    setSelectedFile(node);

    // If it's a file and we have a project ID, load its content
    if (node.type === 'file' && projectId && !node.content) {
      setIsLoadingContent(true);
      try {
        const content = await readFileContent(projectId, node.path);
        // Update the selected file with content
        setSelectedFile({ ...node, content });
      } catch (err) {
        console.error('Failed to load file content:', err);
        // Show file without content on error
        setSelectedFile({ ...node, content: undefined });
      } finally {
        setIsLoadingContent(false);
      }
    }
  };

  return (
    <div className="card bg-base-200 h-[calc(100vh-16rem)]">
      <div className="card-body p-0 flex flex-row h-full">
        {/* Left side - File tree */}
        <div className="w-[30%] border-r border-base-300 flex flex-col">
          {/* Search bar */}
          <div className="p-4 border-b border-base-300">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Search files..."
                className="input input-sm input-bordered w-full pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
            ) : fileTree.length === 0 ? (
              <div className="flex items-center justify-center h-full text-base-content/50">
                <div className="text-center">
                  <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No files found</p>
                </div>
              </div>
            ) : (
              fileTree.map((node) => (
                <FileTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  selectedId={selectedFile?.id || null}
                  expandedIds={expandedIds}
                  onSelect={handleSelect}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        </div>

        {/* Right side - File preview */}
        <div className="flex-1 bg-base-100">
          <FilePreview file={selectedFile} isLoading={isLoadingContent} />
        </div>
      </div>
    </div>
  );
}
