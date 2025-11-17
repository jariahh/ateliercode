# Tauri IPC Commands Documentation

This document describes all available Tauri commands that connect the Rust backend to the React frontend.

## Project Commands

### `create_project`

Create a new project in the database and optionally initialize a git repository.

**Parameters:**
- `input: CreateProjectInput` - Project creation details
  - `name: string` - Project name
  - `root_path: string` - Absolute path to project directory
  - `agent_type: string` - Type of AI agent (e.g., "claude-code", "aider", "copilot")
  - `description?: string` - Optional project description (stored as PRD content)
  - `initialize_git: boolean` - Whether to run `git init` in the project directory

**Returns:** `Promise<Project>` - The created project

**Example:**
```typescript
import { createProject } from '@/lib/tauri-api';

const project = await createProject({
  name: "My New Project",
  root_path: "/path/to/project",
  agent_type: "claude-code",
  description: "A sample project description",
  initialize_git: true
});
```

---

### `get_projects`

Retrieve all projects from the database, ordered by last activity (most recent first).

**Parameters:** None

**Returns:** `Promise<Project[]>` - Array of all projects

**Example:**
```typescript
import { getProjects } from '@/lib/tauri-api';

const projects = await getProjects();
console.log(`Found ${projects.length} projects`);
```

---

### `get_project`

Get a single project by its ID.

**Parameters:**
- `id: string` - Project UUID

**Returns:** `Promise<Project | null>` - The project if found, null otherwise

**Example:**
```typescript
import { getProject } from '@/lib/tauri-api';

const project = await getProject("some-uuid-here");
if (project) {
  console.log(`Project: ${project.name}`);
} else {
  console.log("Project not found");
}
```

---

### `update_project`

Update an existing project. Only provided fields will be updated.

**Parameters:**
- `id: string` - Project UUID
- `updates: UpdateProjectInput` - Fields to update
  - `name?: string` - New project name
  - `root_path?: string` - New project path
  - `agent_type?: string` - New agent type
  - `status?: string` - New status (e.g., "idle", "running", "completed")
  - `prd_content?: string` - New PRD content
  - `settings?: string` - New settings (JSON string)

**Returns:** `Promise<Project>` - The updated project

**Example:**
```typescript
import { updateProject } from '@/lib/tauri-api';

const updated = await updateProject("project-id", {
  status: "running",
  prd_content: "Updated project requirements..."
});
```

---

### `delete_project`

Delete a project from the database.

**Parameters:**
- `id: string` - Project UUID

**Returns:** `Promise<boolean>` - True if deleted, false if not found

**Example:**
```typescript
import { deleteProject } from '@/lib/tauri-api';

const deleted = await deleteProject("project-id");
if (deleted) {
  console.log("Project deleted successfully");
}
```

---

## Agent Detection Commands

### `detect_agents`

Detect which AI coding agents are installed on the system.

**Parameters:** None

**Returns:** `Promise<AgentInfo[]>` - Array of agent information

**Agent Info Structure:**
```typescript
interface AgentInfo {
  name: string;           // Display name (e.g., "Claude Code")
  installed: boolean;     // Whether the agent is available
  version: string | null; // Version string if available
  command: string;        // Command name (e.g., "claude-code")
}
```

**Detected Agents:**
- Claude Code (`claude-code`)
- Aider (`aider`)
- GitHub Copilot (`gh copilot`)

**Example:**
```typescript
import { detectAgents } from '@/lib/tauri-api';

const agents = await detectAgents();
const installed = agents.filter(a => a.installed);

console.log(`Installed agents: ${installed.map(a => a.name).join(', ')}`);
```

---

## File System Commands

### `select_folder`

Open the native operating system folder picker dialog.

**Parameters:** None

**Returns:** `Promise<string | null>` - Selected folder path, or null if cancelled

**Example:**
```typescript
import { selectFolder } from '@/lib/tauri-api';

const folderPath = await selectFolder();
if (folderPath) {
  console.log(`Selected folder: ${folderPath}`);
} else {
  console.log("User cancelled folder selection");
}
```

---

## Error Handling

All commands return `Result<T, String>` from Rust, which translates to thrown errors in TypeScript. Wrap calls in try-catch blocks:

```typescript
import { createProject } from '@/lib/tauri-api';

try {
  const project = await createProject({
    name: "Test Project",
    root_path: "/invalid/path",
    agent_type: "claude-code",
    initialize_git: false
  });
  console.log("Project created:", project.id);
} catch (error) {
  console.error("Failed to create project:", error);
  // Error will be a string message from the Rust backend
}
```

---

## State Management

The database connection is managed as Tauri application state and is automatically passed to all commands. You don't need to manage the database connection from the frontend.

---

## Logging

All commands include logging on the Rust side. Check the application logs for debugging:
- Development: Logs appear in the terminal/console
- Production: Logs are written to the application's log directory

---

## Database Schema

Projects are stored with the following structure:

```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL,
    prd_content TEXT,
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    settings TEXT
);
```

Timestamps are Unix timestamps (seconds since epoch).
