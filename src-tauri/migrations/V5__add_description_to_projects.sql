-- Add description column to projects table
-- Migration: V5__add_description_to_projects
-- Created: 2025-11-28

ALTER TABLE projects ADD COLUMN description TEXT;
