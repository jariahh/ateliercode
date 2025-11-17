# AtelierCode - Technical Architecture

> Deep dive into the technical architecture and design decisions

**Last Updated:** 2025-11-16  
**Version:** 1.0

---

## 📐 Architecture Overview

AtelierCode is a **desktop-first, local-first** application built with Tauri (Rust + React). All data is stored locally by default, with optional cloud sync for Pro users.
```
┌─────────────────────────────────────────────────────────────┐
│                    ATELIERCODE                              │
│                  Desktop Application                         │
│                  (Tauri v2 Framework)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  FRONTEND (React + TypeScript)                        │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ UI Layer (shadcn/ui + Tailwind)                 │  │ │
│  │  │ • Project Wizard                                │  │ │
│  │  │ • Main Workspace (6 tabs)                       │  │ │
│  │  │ • Settings                                      │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ State Management (Zustand)                      │  │ │
│  │  │ • Project store                                 │  │ │
│  │  │ • Agent store                                   │  │ │
│  │  │ • UI store                                      │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ Components                                      │  │ │
│  │  │ • Monaco Editor (code viewing/editing)          │  │ │
│  │  │ • xterm.js (terminal emulation)                 │  │ │
│  │  │ • React Router (navigation)                     │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                            │                                 │
│                            │ Tauri IPC                       │
│                            │ (invoke commands, listen events)│
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  BACKEND (Rust)                                       │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ Tauri Core                                      │  │ │
│  │  │ • Commands (frontend → backend)                 │  │ │
│  │  │ • Events (backend → frontend)                   │  │ │
│  │  │ • Window management                             │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ Agent Manager                                   │  │ │
│  │  │ • Detect installed agents                       │  │ │
│  │  │ • Spawn processes (PTY)                         │  │ │
│  │  │ • Capture output                                │  │ │
│  │  │ • Parse events                                  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ File System Manager                             │  │ │
│  │  │ • Watch directories                             │  │ │
│  │  │ • Calculate diffs                               │  │ │
│  │  │ • Read/write files                              │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │ Database (SQLite)                               │  │ │
│  │  │ • Projects                                      │  │ │
│  │  │ • Tasks                                         │  │ │
│  │  │ • Chat history                                  │  │ │
│  │  │ • Activity logs                                 │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Optional (Pro Tier Only):
                            │
                            ↓ WebSocket
                ┌───────────────────────┐
                │   Cloud Services      │
                │   • Sync              │
                │   • Mobile API        │
                │   • Voice API         │
                └───────────────────────┘
```

---

## 🏗️ Technology Stack

### Desktop Application

#### Frontend
```yaml
Language: TypeScript 5.x
  - Strict mode enabled
  - Path aliases configured
  - Type-safe Tauri IPC

Framework: React 18
  - Hooks-based (no class components)
  - Concurrent features
  - Suspense for data loading

Build Tool: Vite 5
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds
  - Plugin ecosystem

UI Library: shadcn/ui
  - Radix UI primitives (accessible)
  - Tailwind CSS styling
  - Copy-paste components
  - Customizable

State Management: Zustand
  - Simple, lightweight
  - No boilerplate
  - DevTools support
  - TypeScript-first

Router: React Router v6
  - Declarative routing
  - Nested routes
  - Code splitting

Code Editor: Monaco Editor
  - VS Code's editor
  - Syntax highlighting
  - IntelliSense
  - Diff view

Terminal: xterm.js
  - Full terminal emulation
  - Copy/paste support
  - ANSI color support

Other Key Libraries:
  - @tanstack/react-query: Server state
  - date-fns: Date formatting
  - react-hotkeys-hook: Keyboard shortcuts
  - react-virtuoso: Virtual scrolling
  - react-markdown: Markdown rendering
  - diff: Text diffing
  - framer-motion: Animations
  - lucide-react: Icons
```

#### Backend (Rust)
```yaml
Language: Rust 1.75+
  - Async/await (tokio)
  - Type safety
  - Memory safety
  - Performance

Framework: Tauri 2.x
  - Desktop app framework
  - IPC between frontend/backend
  - Native APIs
  - Small bundle size

Key Crates:
  Core:
    - tauri: Framework
    - tokio: Async runtime
    - serde: JSON serialization
    - serde_json: JSON handling
  
  Database:
    - sqlx: Async SQL toolkit
    - rusqlite: SQLite driver
  
  File System:
    - notify: File watcher
    - walkdir: Directory traversal
    - ignore: Gitignore support
    - git2: Git operations
  
  Process Management:
    - pty-process: PTY spawning
    - subprocess: Process handling
  
  Networking (Pro):
    - reqwest: HTTP client
    - tungstenite: WebSocket
    - tokio-tungstenite: Async WebSocket
  
  Utilities:
    - which: Binary detection
    - regex: Pattern matching
    - anyhow: Error handling
    - thiserror: Custom errors
```

---

## 🗄️ Data Architecture

### Local Database (SQLite)

**Location:** 
- macOS: `~/Library/Application Support/com.ateliercode.app/db.sqlite`
- Linux: `~/.local/share/com.ateliercode.app/db.sqlite`
- Windows: `%APPDATA%\com.ateliercode.app\db.sqlite`

**Schema:**
```sql
-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    agent_type TEXT NOT NULL, -- 'claude-code', 'aider', 'copilot'
    status TEXT NOT NULL, -- 'active', 'idle', 'paused', 'completed'
    prd_content TEXT, -- Markdown PRD
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    settings TEXT, -- JSON
    UNIQUE(root_path)
);

-- Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL, -- 'high', 'medium', 'low'
    status TEXT NOT NULL, -- 'todo', 'in_progress', 'completed', 'blocked'
    estimated_hours REAL,
    actual_hours REAL,
    files_affected TEXT, -- JSON array
    depends_on TEXT, -- JSON array of task IDs
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Chat messages
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT, -- JSON
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Agent sessions
CREATE TABLE agent_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT,
    agent_type TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'stopped'
    exit_code INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Activity log
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL, -- 'file_changed', 'test_run', 'error', etc.
    description TEXT NOT NULL,
    data TEXT, -- JSON
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE SET NULL
);

-- File changes
CREATE TABLE file_changes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'added', 'modified', 'deleted'
    diff TEXT, -- Unified diff format
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

-- Code review comments
CREATE TABLE review_comments (
    id TEXT PRIMARY KEY,
    file_change_id TEXT NOT NULL,
    line_number INTEGER,
    author TEXT NOT NULL, -- 'user' or 'assistant'
    comment TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (file_change_id) REFERENCES file_changes(id) ON DELETE CASCADE
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_last_activity ON projects(last_activity DESC);
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_chat_messages_project ON chat_messages(project_id, timestamp);
CREATE INDEX idx_activity_log_project ON activity_log(project_id, timestamp DESC);
CREATE INDEX idx_file_changes_session ON file_changes(session_id, timestamp DESC);
```

**Migration Strategy:**
- Use `sqlx` migrations
- Versioned migration files
- Automatic migration on app start
- Rollback support

---

## 🔌 Agent Integration

### Agent Adapter Architecture

Each AI agent (Claude Code, Aider, etc.) has an adapter that implements a common interface:
```rust
/// Trait that all agent adapters must implement
pub trait AgentAdapter: Send + Sync {
    /// Agent name (e.g., "claude-code")
    fn name(&self) -> &str;
    
    /// Detect if agent is installed on system
    fn detect() -> bool where Self: Sized;
    
    /// Get agent version
    fn version() -> Option<String> where Self: Sized;
    
    /// Start the agent
    fn start(
        &mut self,
        working_dir: &Path,
        args: Vec<String>,
        env: HashMap<String, String>,
    ) -> Result<Child>;
    
    /// Parse a line of output from the agent
    fn parse_output(&self, line: &str) -> Vec<OutputEvent>;
    
    /// Send input to the agent
    fn send_input(&mut self, input: &str) -> Result<()>;
    
    /// Stop the agent gracefully
    fn stop(&mut self) -> Result<()>;
    
    /// Get current status
    fn status(&self) -> AgentStatus;
}

/// Events that can be extracted from agent output
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputEvent {
    Text { content: String },
    FileChanged { path: PathBuf, action: FileAction },
    TestResult { passed: usize, failed: usize },
    TaskStarted { description: String },
    TaskCompleted { description: String },
    Error { message: String },
    PromptForInput { prompt: String },
    Working { status: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileAction {
    Added,
    Modified,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Idle,
    Starting,
    Running,
    Working,
    WaitingForInput,
    Stopping,
    Stopped,
    Error { message: String },
}
```

### Process Management

**PTY (Pseudo-Terminal) Handling:**
```rust
use pty_process::{Command, Pty};

pub struct AgentProcess {
    pty: Pty,
    child: Child,
    stdout_reader: BufReader<File>,
    stdin_writer: File,
}

impl AgentProcess {
    pub fn spawn(
        command: &str,
        args: &[String],
        working_dir: &Path,
    ) -> Result<Self> {
        // Create PTY
        let pty = Pty::new()?;
        pty.resize(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        
        // Spawn process
        let mut cmd = Command::new(command);
        cmd.args(args);
        cmd.current_dir(working_dir);
        
        let child = pty.spawn(cmd)?;
        
        // Set up readers/writers
        let stdout_reader = BufReader::new(pty.master.try_clone()?);
        let stdin_writer = pty.master.try_clone()?;
        
        Ok(Self {
            pty,
            child,
            stdout_reader,
            stdin_writer,
        })
    }
    
    pub fn read_line(&mut self) -> Result<Option<String>> {
        let mut line = String::new();
        match self.stdout_reader.read_line(&mut line) {
            Ok(0) => Ok(None), // EOF
            Ok(_) => Ok(Some(line)),
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    pub fn write_line(&mut self, line: &str) -> Result<()> {
        writeln!(self.stdin_writer, "{}", line)?;
        self.stdin_writer.flush()?;
        Ok(())
    }
}
```

### Output Parsing

Each adapter parses agent-specific output patterns:
```rust
impl AgentAdapter for ClaudeCodeAdapter {
    fn parse_output(&self, line: &str) -> Vec<OutputEvent> {
        let mut events = vec![];
        
        // File operations
        if let Some(caps) = Regex::new(r"Created (.+)")
            .unwrap()
            .captures(line)
        {
            events.push(OutputEvent::FileChanged {
                path: PathBuf::from(&caps[1]),
                action: FileAction::Added,
            });
        }
        
        // Test results
        else if let Some(caps) = Regex::new(r"(\d+) passing, (\d+) failing")
            .unwrap()
            .captures(line)
        {
            events.push(OutputEvent::TestResult {
                passed: caps[1].parse().unwrap_or(0),
                failed: caps[2].parse().unwrap_or(0),
            });
        }
        
        // Always include raw text
        events.push(OutputEvent::Text {
            content: line.to_string(),
        });
        
        events
    }
}
```

---

## 📡 IPC Communication

### Tauri Commands (Frontend → Backend)
```rust
// Backend (Rust)
#[tauri::command]
async fn create_project(
    name: String,
    root_path: String,
    agent_type: String,
) -> Result<Project, String> {
    // Implementation
}

#[tauri::command]
async fn start_agent(
    project_id: String,
    task_id: Option<String>,
) -> Result<(), String> {
    // Implementation
}

#[tauri::command]
async fn send_message(
    project_id: String,
    content: String,
) -> Result<(), String> {
    // Implementation
}
```
```typescript
// Frontend (TypeScript)
import { invoke } from '@tauri-apps/api/tauri';

// Create project
const project = await invoke<Project>('create_project', {
  name: 'My API',
  rootPath: '/Users/jariah/projects/my-api',
  agentType: 'claude-code',
});

// Start agent
await invoke('start_agent', {
  projectId: project.id,
  taskId: null,
});

// Send message
await invoke('send_message', {
  projectId: project.id,
  content: 'Add JWT authentication',
});
```

### Tauri Events (Backend → Frontend)
```rust
// Backend (Rust)
use tauri::Manager;

// Emit event to frontend
app.emit_all("agent_output", AgentOutputPayload {
    project_id: project.id.clone(),
    event: OutputEvent::Text {
        content: "Working on authentication...".to_string(),
    },
})?;

app.emit_all("file_changed", FileChangedPayload {
    project_id: project.id.clone(),
    path: "src/auth/jwt.ts".to_string(),
    change_type: "added".to_string(),
})?;
```
```typescript
// Frontend (TypeScript)
import { listen } from '@tauri-apps/api/event';

// Listen for agent output
const unlisten = await listen<AgentOutputPayload>(
  'agent_output',
  (event) => {
    console.log('Agent output:', event.payload);
    // Update UI
  }
);

// Listen for file changes
await listen<FileChangedPayload>('file_changed', (event) => {
  console.log('File changed:', event.payload);
  // Refresh file list
});

// Clean up
unlisten();
```

---

## 📁 File System

### File Watcher
```rust
use notify::{Watcher, RecursiveMode, Event};

pub struct FileSystemWatcher {
    watcher: RecommendedWatcher,
    project_path: PathBuf,
}

impl FileSystemWatcher {
    pub fn new(project_path: PathBuf, tx: Sender<Event>) -> Result<Self> {
        let mut watcher = notify::recommended_watcher(move |res| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        })?;
        
        watcher.watch(&project_path, RecursiveMode::Recursive)?;
        
        Ok(Self {
            watcher,
            project_path,
        })
    }
}
```

### Git Diff Calculation
```rust
use git2::{Repository, Diff};

pub fn calculate_diff(
    repo_path: &Path,
    file_path: &Path,
) -> Result<String> {
    let repo = Repository::open(repo_path)?;
    
    // Get HEAD tree
    let head = repo.head()?;
    let tree = head.peel_to_tree()?;
    
    // Get working directory
    let mut opts = DiffOptions::new();
    opts.pathspec(file_path);
    
    let diff = repo.diff_tree_to_workdir(Some(&tree), Some(&mut opts))?;
    
    // Format as unified diff
    let mut diff_string = Vec::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        diff_string.extend_from_slice(line.content());
        true
    })?;
    
    Ok(String::from_utf8(diff_string)?)
}
```

---

## 🌐 Cloud Services (Optional - Pro Tier)

### WebSocket Relay
```rust
// Axum WebSocket handler
use axum::{
    extract::{ws::{WebSocket, WebSocketUpgrade}, State},
    response::Response,
};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            // Handle message
            // Relay between desktop and mobile
        }
    }
}
```

### State Sync
```rust
// Sync project state to cloud
pub async fn sync_project(
    project: &Project,
    pool: &PgPool,
) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO projects (id, user_id, name, data, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
            name = EXCLUDED.name,
            data = EXCLUDED.data,
            updated_at = NOW()
        "#,
        project.id,
        project.user_id,
        project.name,
        serde_json::to_value(project)?
    )
    .execute(pool)
    .await?;
    
    Ok(())
}
```

---

## 🔒 Security

### Local Security
```yaml
Database Encryption:
  - SQLite with SQLCipher (optional)
  - Encrypted at rest
  - User password as key

Code Access:
  - Agent runs with user permissions
  - No elevation required
  - Sandboxed where possible

API Keys:
  - Stored in system keychain
  - Never in plain text
  - Per-user encryption
```

### Cloud Security (Pro)
```yaml
Authentication:
  - JWT tokens (short-lived)
  - Refresh tokens (rotating)
  - Secure HTTP-only cookies

Transport:
  - TLS 1.3 only
  - Certificate pinning
  - WebSocket over TLS (WSS)

Authorization:
  - Role-based access control
  - Project-level permissions
  - API rate limiting
```

---

## 📊 Performance

### Optimization Strategies
```yaml
Frontend:
  - Virtual scrolling (react-virtuoso)
  - Code splitting (React.lazy)
  - Memoization (React.memo, useMemo)
  - Debounced search
  - Lazy loading Monaco editor

Backend:
  - Async/await everywhere
  - Connection pooling (SQLite)
  - Indexed database queries
  - Incremental diff calculation
  - Efficient file watching

Bundle Size:
  - Tauri: ~10MB total
  - No Chromium bundled
  - Tree-shaking
  - Compression
```

### Performance Targets
```yaml
App Launch: <2 seconds
Project Switch: <500ms
File Open: <200ms
Diff Calculation: <1 second
Search: <100ms (incremental)
Memory Usage: <200MB average
CPU Usage: <20% average (idle <5%)
```

---

## 🧪 Testing Strategy
```yaml
Unit Tests:
  - Rust: cargo test
  - TypeScript: Vitest
  - Coverage target: >80%

Integration Tests:
  - Tauri commands
  - Database operations
  - Agent adapters
  - File system operations

E2E Tests:
  - WebDriver (Tauri)
  - Critical user flows
  - Cross-platform

Manual Testing:
  - Real projects
  - Multiple agents
  - Various file sizes
  - Edge cases
```

---

## 🚀 Deployment

### Build Process
```yaml
Development:
  npm run tauri dev
  - Hot reload
  - DevTools enabled
  - Debug logging

Production:
  npm run tauri build
  - Optimized build
  - Code signing
  - Installer generation
  
Platforms:
  - macOS: .dmg, .app
  - Linux: .deb, .AppImage
  - Windows: .msi, .exe
```

### Auto-Updates (Tauri Updater)
```rust
use tauri::updater;

pub async fn check_for_updates(app: AppHandle) -> Result<()> {
    let update = app.updater().check().await?;
    
    if let Some(update) = update {
        println!("Update available: {}", update.version);
        update.download_and_install().await?;
    }
    
    Ok(())
}
```

---

## 📚 Further Reading

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [React Docs](https://react.dev)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/)

---

**This architecture is designed to be:**
- 🚀 Fast (native performance)
- 🔒 Secure (local-first, sandboxed)
- 💪 Reliable (Rust safety guarantees)
- 📦 Small (10MB bundle)
- 🎨 Beautiful (React + modern UI)
- 🔧 Extensible (plugin system ready)

Let's build it! 🛠️

---

_Last updated: 2025-11-16_