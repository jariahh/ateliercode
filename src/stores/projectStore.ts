import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, CreateProjectInput, AgentType } from '../types/project';
import * as tauriApi from '../lib/tauri';

interface ProjectState {
  // State
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (input: CreateProjectInput) => Promise<Project>;
  loadProjects: () => Promise<void>;
  setCurrentProject: (projectId: string | null) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  archiveProject: (projectId: string) => void;
  getProject: (projectId: string) => Promise<Project | null | undefined>;
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
          // Use Tauri backend if available, otherwise fallback to mock
          let newProject: Project;

          if (tauriApi.isTauriAvailable()) {
            newProject = await tauriApi.createProject(input);
          } else {
            // Mock implementation for browser dev mode
            console.warn('Tauri not available. Using mock project creation.');
            newProject = {
              id: crypto.randomUUID(),
              name: input.name,
              path: input.path,
              description: input.description,
              agent: {
                type: input.agentType,
                installed: false,
                enabled: true,
              },
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: [],
            };
          }

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
          // Use Tauri backend if available
          if (tauriApi.isTauriAvailable()) {
            const projects = await tauriApi.getProjects();
            set({ projects, isLoading: false });
          } else {
            // In browser dev mode, use persisted state
            console.warn('Tauri not available. Using persisted state.');
            set({ isLoading: false });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Set the current active project
      setCurrentProject: async (projectId: string | null) => {
        if (projectId === null) {
          set({ currentProject: null });
          return;
        }

        // If using Tauri, fetch from backend to update last_activity
        if (tauriApi.isTauriAvailable()) {
          try {
            const project = await tauriApi.getProject(projectId);
            if (project) {
              set((state) => ({
                currentProject: project,
                projects: state.projects.map((p) =>
                  p.id === projectId ? project : p
                ),
              }));
            }
          } catch (error) {
            console.error('Failed to set current project:', error);
          }
        } else {
          // Fallback for browser dev mode
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
        }
      },

      // Update a project
      updateProject: async (projectId: string, updates: Partial<Project>) => {
        if (tauriApi.isTauriAvailable()) {
          try {
            const updatedProject = await tauriApi.updateProject(projectId, updates);
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === projectId ? updatedProject : p
              ),
              currentProject:
                state.currentProject?.id === projectId
                  ? updatedProject
                  : state.currentProject,
            }));
          } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
          }
        } else {
          // Fallback for browser dev mode
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
        }
      },

      // Delete a project
      deleteProject: async (projectId: string) => {
        if (tauriApi.isTauriAvailable()) {
          try {
            await tauriApi.deleteProject(projectId);
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== projectId),
              currentProject:
                state.currentProject?.id === projectId ? null : state.currentProject,
            }));
          } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
          }
        } else {
          // Fallback for browser dev mode
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== projectId),
            currentProject:
              state.currentProject?.id === projectId ? null : state.currentProject,
          }));
        }
      },

      // Archive a project
      archiveProject: (projectId: string) => {
        get().updateProject(projectId, { status: 'archived' });
      },

      // Get a specific project
      getProject: async (projectId: string) => {
        if (tauriApi.isTauriAvailable()) {
          try {
            return await tauriApi.getProject(projectId);
          } catch (error) {
            console.error('Failed to get project:', error);
            return null;
          }
        } else {
          // Fallback for browser dev mode
          return get().projects.find((p) => p.id === projectId);
        }
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
