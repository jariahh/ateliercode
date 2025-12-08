-- Add icon and color customization to projects
-- Migration: V7__add_project_icon_and_color
-- Created: 2025-12-08

-- Add icon column (stores emoji, icon name, or path to custom icon)
ALTER TABLE projects ADD COLUMN icon TEXT;

-- Add color column (stores color name like "purple", "blue", "green")
ALTER TABLE projects ADD COLUMN color TEXT;
