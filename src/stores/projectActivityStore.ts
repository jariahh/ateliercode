import { create } from 'zustand';

/**
 * Store for tracking project activity for the sidebar indicator.
 * When a session receives a message, we mark the project as having activity.
 * The activity indicator flashes for 30 seconds then stops.
 */

interface ProjectActivityState {
  // Map of projectId -> expiration timestamp
  activities: Map<string, number>;

  // Mark a project as having recent activity (flashes for 30 seconds)
  markActivity: (projectId: string) => void;

  // Check if a project currently has activity (not expired)
  hasActivity: (projectId: string) => boolean;

  // Clear expired activities (called periodically)
  clearExpired: () => void;

  // Clear activity for a specific project
  clearActivity: (projectId: string) => void;
}

const ACTIVITY_DURATION_MS = 30 * 1000; // 30 seconds

export const useProjectActivityStore = create<ProjectActivityState>((set, get) => ({
  activities: new Map(),

  markActivity: (projectId: string) => {
    const expiresAt = Date.now() + ACTIVITY_DURATION_MS;
    console.log('[ProjectActivityStore] Marking activity for project:', projectId, 'expires at:', new Date(expiresAt).toISOString());

    set((state) => {
      const newActivities = new Map(state.activities);
      newActivities.set(projectId, expiresAt);
      return { activities: newActivities };
    });
  },

  hasActivity: (projectId: string) => {
    const expiresAt = get().activities.get(projectId);
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => {
      const newActivities = new Map<string, number>();
      let cleared = 0;

      state.activities.forEach((expiresAt, projectId) => {
        if (now < expiresAt) {
          newActivities.set(projectId, expiresAt);
        } else {
          cleared++;
        }
      });

      if (cleared > 0) {
        console.log('[ProjectActivityStore] Cleared', cleared, 'expired activities');
      }

      return { activities: newActivities };
    });
  },

  clearActivity: (projectId: string) => {
    set((state) => {
      const newActivities = new Map(state.activities);
      newActivities.delete(projectId);
      return { activities: newActivities };
    });
  },
}));

// Set up periodic cleanup of expired activities
let cleanupInterval: NodeJS.Timeout | null = null;

export function startActivityCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    useProjectActivityStore.getState().clearExpired();
  }, 1000); // Check every second
}

export function stopActivityCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
