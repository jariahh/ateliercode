import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../services/backend/types';
import { getBackend } from '../services/backend';

interface ProjectState {
  // State
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (input: CreateProjectInput) => Promise<Project>;
  loadProjects: () => Promise<void>;
  clearProjects: () => void;
  setCurrentProject: (projectId: string | null) => Promise<void>;
  updateProject: (projectId: string, updates: UpdateProjectInput) => Promise<void>;
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
          const backend = getBackend();
          const newProject = await backend.projects.create(input);

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
          const backend = getBackend();
          const projects = await backend.projects.list();
          set({ projects, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
          console.error('Failed to load projects:', error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Clear all projects (used when disconnecting from remote machine)
      clearProjects: () => {
        set({ projects: [], currentProject: null, error: null });
      },

      // Set the current active project
      setCurrentProject: async (projectId: string | null) => {
        if (projectId === null) {
          set({ currentProject: null });
          return;
        }

        try {
          const backend = getBackend();
          const project = await backend.projects.get(projectId);
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
          // Fallback to local state
          const project = get().projects.find((p) => p.id === projectId);
          if (project) {
            set({ currentProject: project });
          }
        }
      },

      // Update a project
      updateProject: async (projectId: string, updates: UpdateProjectInput) => {
        try {
          const backend = getBackend();
          const updatedProject = await backend.projects.update(projectId, updates);
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
      },

      // Delete a project
      deleteProject: async (projectId: string) => {
        try {
          const backend = getBackend();
          await backend.projects.delete(projectId);
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== projectId),
            currentProject:
              state.currentProject?.id === projectId ? null : state.currentProject,
          }));
        } catch (error) {
          console.error('Failed to delete project:', error);
          throw error;
        }
      },

      // Archive a project
      archiveProject: (projectId: string) => {
        get().updateProject(projectId, { status: 'archived' });
      },

      // Get a specific project
      getProject: async (projectId: string) => {
        try {
          const backend = getBackend();
          return await backend.projects.get(projectId);
        } catch (error) {
          console.error('Failed to get project:', error);
          return null;
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
