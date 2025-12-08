-- Add agent_type column to projects table for backward compatibility
-- Migration: 002_add_agent_type_to_projects
-- Created: 2025-11-20

-- Add agent_type column if it doesn't exist
ALTER TABLE projects ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'claude-code';

-- Add status column if it doesn't exist
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Add prd_content column if it doesn't exist
ALTER TABLE projects ADD COLUMN prd_content TEXT;
