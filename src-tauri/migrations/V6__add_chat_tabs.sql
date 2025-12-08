-- Add chat_tabs table for tracking open chat tabs per project
-- Migration: V6__add_chat_tabs
-- Created: 2025-12-08

-- Chat tabs (UI state - which tabs are open in a project)
CREATE TABLE IF NOT EXISTS chat_tabs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,           -- 'claude-code', 'gemini', 'chatgpt', etc.
    session_id TEXT,                    -- Links to agent_sessions.id (null = new tab, not started)
    cli_session_id TEXT,                -- CLI's session ID for resume capability
    label TEXT,                         -- Custom tab name (null = use agent name)
    tab_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,  -- Is this the currently selected tab?
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_tabs_project ON chat_tabs(project_id, tab_order);
CREATE INDEX IF NOT EXISTS idx_chat_tabs_active ON chat_tabs(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_tabs_session ON chat_tabs(session_id);
