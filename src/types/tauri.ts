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
  /** Project icon (emoji, icon name, or path to custom icon) */
  icon: string | null;
  /** Project color for theming (e.g., "purple", "blue", "green") */
  color: string | null;
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
  /** Project icon (emoji, icon name, or path to custom icon) */
  icon?: string;
  /** Project color for theming (e.g., "purple", "blue", "green") */
  color?: string;
}

export interface AgentInfo {
  name: string;
  installed: boolean;
  version: string | null;
  command: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  session_id: string | null;
  role: string;
  content: string;
  timestamp: number;
  metadata: string | null;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  session_id: string | null;
  event_type: string;
  description: string;
  data: string | null;
  timestamp: number;
}

export interface ProjectStats {
  commits: number;
  messages: number;
}

export interface ProjectAnalysisResult {
  suggested_name: string;
  suggested_description: string;
  detected_languages: string[];
  detected_frameworks: string[];
  file_count: number;
  has_git: boolean;
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
  analyze_project_directory: (path: string) => Promise<ProjectAnalysisResult>;
  send_message: (project_id: string, content: string) => Promise<ChatMessage>;
  get_messages: (project_id: string) => Promise<ChatMessage[]>;
}
