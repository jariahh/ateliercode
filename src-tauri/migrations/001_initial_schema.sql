-- AtelierCode Initial Schema
-- Migration: 001_initial_schema
-- Created: 2025-11-17

-- Projects table
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

-- Tasks table
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

-- Chat messages table
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT, -- JSON
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Agent sessions table
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

-- Activity log table
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

-- File changes table
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

-- Code review comments table
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

-- Settings table
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
CREATE INDEX idx_agent_sessions_project ON agent_sessions(project_id, started_at DESC);
CREATE INDEX idx_review_comments_file_change ON review_comments(file_change_id, timestamp);
