-- Add backward compatibility for old code
-- Migration: 003_add_legacy_compat
-- Created: 2025-11-20

-- Add session_id alias column to activity_log for backward compatibility
-- This allows old queries using session_id to work
ALTER TABLE activity_log ADD COLUMN session_id TEXT;

-- Create chat_messages table for backward compatibility
-- This is for legacy code that still references it
-- In the new architecture, messages come from the CLI via plugins
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    session_id TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
