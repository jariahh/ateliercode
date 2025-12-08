-- Add agent_sessions table for backward compatibility
-- Migration: V4__add_agent_sessions
-- Created: 2025-11-20

-- Create agent_sessions table for legacy code compatibility
-- In the new architecture, session data comes from the CLI via plugins,
-- but old code still queries this table
CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT,
    agent_type TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL,
    exit_code INTEGER,
    claude_session_id TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_project ON agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_claude_session ON agent_sessions(claude_session_id);
