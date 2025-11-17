import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, CreateProjectInput, AgentType } from '../types/project';

interface ProjectState {
  // State
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (input: CreateProjectInput) => Promise<Project>;
  loadProjects: () => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  archiveProject: (projectId: string) => void;
  getProject: (projectId: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      projects: [],
      isLoading: false,
      error: null,

      // Create a new project
      createProject: async (input: CreateProjectInput) => {
        set({ isLoading: true, error: null });

        try {
          // In the future, this will call the Tauri backend
          // For now, create a mock project
          const newProject: Project = {
            id: crypto.randomUUID(),
            name: input.name,
            path: input.path,
            description: input.description,
            agent: {
              type: input.agentType,
              installed: checkAgentInstalled(input.agentType),
              enabled: true,
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
          };

          set((state) => ({
            projects: [...state.projects, newProject],
            currentProject: newProject,
            isLoading: false,
          }));

          return newProject;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Load all projects
      loadProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          // In the future, this will call the Tauri backend to load projects
          // For now, we're using the persisted state
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Set the current active project
      setCurrentProject: (projectId: string | null) => {
        if (projectId === null) {
          set({ currentProject: null });
          return;
        }

        const project = get().projects.find((p) => p.id === projectId);
        if (project) {
          const updatedProject = {
            ...project,
            lastOpenedAt: new Date().toISOString(),
          };

          set((state) => ({
            currentProject: updatedProject,
            projects: state.projects.map((p) =>
              p.id === projectId ? updatedProject : p
            ),
          }));
        }
      },

      // Update a project
      updateProject: (projectId: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
              : state.currentProject,
        }));
      },

      // Delete a project
      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProject:
            state.currentProject?.id === projectId ? null : state.currentProject,
        }));
      },

      // Archive a project
      archiveProject: (projectId: string) => {
        get().updateProject(projectId, { status: 'archived' });
      },

      // Get a specific project
      getProject: (projectId: string) => {
        return get().projects.find((p) => p.id === projectId);
      },
    }),
    {
      name: 'ateliercode-projects',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
      }),
    }
  )
);

// Helper function to check if an agent is installed
// This will be replaced with actual Tauri backend calls
function checkAgentInstalled(agentType: AgentType): boolean {
  // Mock implementation - will be replaced with actual checks
  const mockInstalledAgents: AgentType[] = ['claude-code'];
  return mockInstalledAgents.includes(agentType);
}
