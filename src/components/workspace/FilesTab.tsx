import { useState } from 'react';
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
} from 'lucide-react';

// File type icons mapping
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-blue-500" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-500" />;
    case 'md':
    case 'txt':
      return <FileText className="w-4 h-4 text-gray-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="w-4 h-4 text-purple-500" />;
    case 'html':
    case 'css':
      return <FileType className="w-4 h-4 text-orange-500" />;
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

// Format date
const formatDate = (date: Date): string => {
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

// File/Folder structure types
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: FileNode[];
  content?: string; // For file preview
}

// Mock file structure
const mockFileStructure: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    modified: new Date(Date.now() - 1000 * 60 * 60 * 2),
    children: [
      {
        id: '1-1',
        name: 'components',
        type: 'folder',
        modified: new Date(Date.now() - 1000 * 60 * 30),
        children: [
          {
            id: '1-1-1',
            name: 'workspace',
            type: 'folder',
            modified: new Date(Date.now() - 1000 * 60 * 15),
            children: [
              {
                id: '1-1-1-1',
                name: 'FilesTab.tsx',
                type: 'file',
                size: 8456,
                modified: new Date(Date.now() - 1000 * 60 * 5),
                content: `import { useState } from 'react';
import { File, Folder } from 'lucide-react';

export default function FilesTab() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="file-browser">
      <h2>File Browser</h2>
      {/* File tree implementation */}
    </div>
  );
}`,
              },
              {
                id: '1-1-1-2',
                name: 'OverviewTab.tsx',
                type: 'file',
                size: 2341,
                modified: new Date(Date.now() - 1000 * 60 * 60),
                content: `import AgentStatus from './AgentStatus';
import ActivityStream from './ActivityStream';
import StatsPanel from './StatsPanel';

export default function OverviewTab({ agentType }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <AgentStatus agentType={agentType} status="idle" />
        <StatsPanel />
      </div>
    </div>
  );
}`,
              },
              {
                id: '1-1-1-3',
                name: 'AgentStatus.tsx',
                type: 'file',
                size: 1823,
                modified: new Date(Date.now() - 1000 * 60 * 60 * 3),
              },
            ],
          },
          {
            id: '1-1-2',
            name: 'ui',
            type: 'folder',
            modified: new Date(Date.now() - 1000 * 60 * 60 * 12),
            children: [
              {
                id: '1-1-2-1',
                name: 'Button.tsx',
                type: 'file',
                size: 1234,
                modified: new Date(Date.now() - 1000 * 60 * 60 * 12),
              },
              {
                id: '1-1-2-2',
                name: 'Card.tsx',
                type: 'file',
                size: 987,
                modified: new Date(Date.now() - 1000 * 60 * 60 * 12),
              },
            ],
          },
        ],
      },
      {
        id: '1-2',
        name: 'pages',
        type: 'folder',
        modified: new Date(Date.now() - 1000 * 60 * 60 * 4),
        children: [
          {
            id: '1-2-1',
            name: 'Workspace.tsx',
            type: 'file',
            size: 5678,
            modified: new Date(Date.now() - 1000 * 60 * 60 * 4),
            content: `import { useParams } from 'react-router-dom';
import { useState } from 'react';
import FilesTab from '../components/workspace/FilesTab';

export default function Workspace() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="workspace">
      <h1>Project Workspace</h1>
      {activeTab === 'files' && <FilesTab />}
    </div>
  );
}`,
          },
          {
            id: '1-2-2',
            name: 'Home.tsx',
            type: 'file',
            size: 3421,
            modified: new Date(Date.now() - 1000 * 60 * 60 * 24),
          },
        ],
      },
      {
        id: '1-3',
        name: 'stores',
        type: 'folder',
        modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        children: [
          {
            id: '1-3-1',
            name: 'projectStore.ts',
            type: 'file',
            size: 4532,
            modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          },
        ],
      },
      {
        id: '1-4',
        name: 'types',
        type: 'folder',
        modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        children: [
          {
            id: '1-4-1',
            name: 'project.ts',
            type: 'file',
            size: 876,
            modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
          },
        ],
      },
      {
        id: '1-5',
        name: 'App.tsx',
        type: 'file',
        size: 2134,
        modified: new Date(Date.now() - 1000 * 60 * 60 * 24),
        content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Workspace from './pages/Workspace';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workspace/:id" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  );
}`,
      },
      {
        id: '1-6',
        name: 'main.tsx',
        type: 'file',
        size: 456,
        modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    ],
  },
  {
    id: '2',
    name: 'public',
    type: 'folder',
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    children: [
      {
        id: '2-1',
        name: 'vite.svg',
        type: 'file',
        size: 1234,
        modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      },
    ],
  },
  {
    id: '3',
    name: 'package.json',
    type: 'file',
    size: 1567,
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24),
    content: `{
  "name": "ateliercode",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "typescript": "^5.3.3",
    "vite": "^5.0.7"
  }
}`,
  },
  {
    id: '4',
    name: 'tsconfig.json',
    type: 'file',
    size: 876,
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
  },
  {
    id: '5',
    name: 'README.md',
    type: 'file',
    size: 2345,
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    content: `# AtelierCode

A modern AI-powered code workspace for collaborative development.

## Features

- AI Agent Integration
- Real-time Code Collaboration
- File Management
- Task Tracking
- Project Overview

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tech Stack

- React + TypeScript
- Vite
- TailwindCSS + DaisyUI
- Tauri
`,
  },
  {
    id: '6',
    name: 'vite.config.ts',
    type: 'file',
    size: 432,
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: '7',
    name: 'tailwind.config.js',
    type: 'file',
    size: 678,
    modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
];

// File tree item component
interface FileTreeItemProps {
  node: FileNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: FileNode) => void;
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
              <FolderOpen className="w-4 h-4 text-yellow-600" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-600" />
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
  file: FileNode | null;
}

function FilePreview({ file }: FilePreviewProps) {
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

// Main FilesTab component
export default function FilesTab() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '1-1', '1-1-1']));
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSelect = (node: FileNode) => {
    setSelectedFile(node);
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

          {/* File tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {mockFileStructure.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedFile?.id || null}
                expandedIds={expandedIds}
                onSelect={handleSelect}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>

        {/* Right side - File preview */}
        <div className="flex-1 bg-base-100">
          <FilePreview file={selectedFile} />
        </div>
      </div>
    </div>
  );
}
