-- AtelierCode Plugin-Based Architecture Schema
-- Migration: 001_initial_schema
-- Created: 2025-11-19
-- Architecture: Multi-chat, multi-agent, plugin-based

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    settings TEXT -- JSON: project-level settings
);

-- Available agents for each project (many-to-many)
CREATE TABLE project_agents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    plugin_name TEXT NOT NULL, -- "claude-code", "aider", "gemini"
    display_name TEXT, -- Optional custom name: "Claude (Backend)"
    is_active BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    settings TEXT, -- JSON: plugin-specific settings
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, plugin_name, display_name)
);

-- Chat sessions (UI concept - each chat tab)
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    project_agent_id TEXT NOT NULL, -- Which agent this chat uses
    cli_session_id TEXT, -- Optional: CLI's internal session ID for resume
    name TEXT NOT NULL, -- User-given name or auto-generated
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata TEXT, -- JSON: additional chat-specific data
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_agent_id) REFERENCES project_agents(id) ON DELETE CASCADE
);

-- Active agent processes (runtime state, ephemeral)
CREATE TABLE agent_processes (
    id TEXT PRIMARY KEY,
    chat_session_id TEXT NOT NULL,
    cli_session_id TEXT, -- Set when CLI reports its session ID
    process_id INTEGER,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL, -- 'running', 'stopped', 'error'
    exit_code INTEGER,
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- ============================================================================
-- File Management (App-Managed, Not Plugin)
-- ============================================================================

-- File changes detected by our file watcher
CREATE TABLE file_changes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chat_session_id TEXT, -- Which chat caused this change (if known)
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'created', 'modified', 'deleted'
    diff TEXT, -- Unified diff format
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL
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

-- ============================================================================
-- Activity & Analytics
-- ============================================================================

-- Activity log for tracking all agent activity
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chat_session_id TEXT,
    event_type TEXT NOT NULL, -- 'chat_created', 'agent_started', 'file_changed', etc.
    description TEXT NOT NULL,
    data TEXT, -- JSON: event-specific data
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL
);

-- Tasks table (optional - for project management)
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

-- Settings table (app-level settings)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Projects
CREATE INDEX idx_projects_last_activity ON projects(last_activity DESC);

-- Project Agents
CREATE INDEX idx_project_agents_project ON project_agents(project_id);
CREATE INDEX idx_project_agents_active ON project_agents(project_id, is_active);

-- Chat Sessions
CREATE INDEX idx_chat_sessions_project ON chat_sessions(project_id, last_activity DESC);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(project_agent_id);
CREATE INDEX idx_chat_sessions_cli_session ON chat_sessions(cli_session_id);

-- Agent Processes
CREATE INDEX idx_agent_processes_chat ON agent_processes(chat_session_id);
CREATE INDEX idx_agent_processes_status ON agent_processes(status);

-- File Changes
CREATE INDEX idx_file_changes_project ON file_changes(project_id, timestamp DESC);
CREATE INDEX idx_file_changes_chat ON file_changes(chat_session_id);
CREATE INDEX idx_file_changes_reviewed ON file_changes(reviewed, approved);

-- Review Comments
CREATE INDEX idx_review_comments_file_change ON review_comments(file_change_id, timestamp);
CREATE INDEX idx_review_comments_resolved ON review_comments(resolved);

-- Activity Log
CREATE INDEX idx_activity_log_project ON activity_log(project_id, timestamp DESC);
CREATE INDEX idx_activity_log_chat ON activity_log(chat_session_id, timestamp DESC);
CREATE INDEX idx_activity_log_event_type ON activity_log(event_type, timestamp DESC);

-- Tasks
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_tasks_status ON tasks(status, priority);
