// TypeScript types for Tauri IPC commands
// Auto-generated to match Rust backend types

export interface Project {
  id: string;
  name: string;
  root_path: string;
  agent_type: string;
  status: string;
  prd_content: string | null;
  created_at: number;
  last_activity: number;
  settings: string | null;
}

export interface CreateProjectInput {
  name: string;
  root_path: string;
  agent_type: string;
  description?: string;
  initialize_git: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  root_path?: string;
  agent_type?: string;
  status?: string;
  prd_content?: string;
  settings?: string;
}

export interface AgentInfo {
  name: string;
  installed: boolean;
  version: string | null;
  command: string;
}

// Tauri command wrapper types
export interface TauriCommands {
  create_project: (input: CreateProjectInput) => Promise<Project>;
  get_projects: () => Promise<Project[]>;
  get_project: (id: string) => Promise<Project | null>;
  update_project: (id: string, updates: UpdateProjectInput) => Promise<Project>;
  delete_project: (id: string) => Promise<boolean>;
  detect_agents: () => Promise<AgentInfo[]>;
  select_folder: () => Promise<string | null>;
}
