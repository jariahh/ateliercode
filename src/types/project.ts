export type AgentType = 'claude-code' | 'aider' | 'github-copilot' | 'cursor';

export type ProjectStatus = 'active' | 'archived' | 'paused';

export interface AgentConfig {
  type: AgentType;
  model?: string;
  apiKey?: string;
  installed: boolean;
  enabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  agent: AgentConfig;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  tags?: string[];
  gitRepo?: string;
  branch?: string;
}

export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string;
  agentType: AgentType;
  initGit?: boolean;
  template?: string;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalSessions: number;
  totalTokens: number;
}

// Agent info from backend detection
export interface AgentInfo {
  name: string;
  installed: boolean;
  version: string | null;
  command: string;
}

// Error types
export interface TauriError {
  message: string;
  code?: string;
}
