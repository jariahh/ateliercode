import { useState, useEffect } from 'react';
import AgentStatus from './AgentStatus';
import ActivityStream from './ActivityStream';
import StatsPanel from './StatsPanel';
import type { Activity } from './ActivityStream';
import { getActivities } from '../../api/activity';
import { getProjectStats } from '../../api/stats';
import type { ActivityLog, ProjectStats } from '../../types/tauri';

export interface OverviewTabProps {
  projectId: string;
  agentType: string;
  projectPath: string;
}

export default function OverviewTab({ projectId, agentType }: OverviewTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [projectId]);

  async function loadStats() {
    try {
      setIsLoadingStats(true);
      const projectStats = await getProjectStats(projectId);
      setStats(projectStats);
    } catch (error) {
      console.error('Failed to load project stats:', error);
      // Set default stats on error
      setStats({
        files_changed: 0,
        commits: 0,
        messages: 0,
        tasks_completed: 0,
        tasks_total: 0,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function loadActivities() {
    try {
      setIsLoading(true);
      const activityLogs = await getActivities(projectId, 20);

      // Convert ActivityLog to Activity format
      const convertedActivities: Activity[] = activityLogs.map((log: ActivityLog) => ({
        id: log.id,
        type: log.event_type as 'file_change' | 'commit' | 'message' | 'task_complete',
        title: log.description,
        description: log.data ? parseActivityData(log.data) : undefined,
        timestamp: new Date(log.timestamp * 1000), // Convert Unix timestamp to Date
      }));

      setActivities(convertedActivities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function parseActivityData(data: string): string | undefined {
    try {
      const parsed = JSON.parse(data);
      if (parsed.preview) return parsed.preview;
      if (parsed.title) return parsed.title;
      if (parsed.file_count) return `${parsed.file_count} files`;
      return undefined;
    } catch {
      return undefined;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Agent Status & Stats */}
      <div className="lg:col-span-1 space-y-6">
        <AgentStatus
          agentType={agentType}
          status="idle"
        />

        {isLoadingStats ? (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">Project Stats</h2>
              <div className="flex justify-center items-center h-32">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            </div>
          </div>
        ) : stats ? (
          <StatsPanel
            filesChanged={stats.files_changed}
            commits={stats.commits}
            messages={stats.messages}
            tasksCompleted={stats.tasks_completed}
            tasksTotal={stats.tasks_total}
          />
        ) : (
          <StatsPanel
            filesChanged={0}
            commits={0}
            messages={0}
            tasksCompleted={0}
            tasksTotal={0}
          />
        )}
      </div>

      {/* Right Column - Activity Stream */}
      <div className="lg:col-span-2">
        {isLoading ? (
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-4 text-base-content/60">Loading activities...</p>
              </div>
            </div>
          </div>
        ) : (
          <ActivityStream activities={activities} />
        )}
      </div>
    </div>
  );
}
