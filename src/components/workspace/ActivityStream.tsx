import { Clock, FileCode, GitCommit, MessageSquare, CheckCircle } from 'lucide-react';

export interface Activity {
  id: string;
  type: 'file_change' | 'commit' | 'message' | 'task_complete';
  title: string;
  description?: string;
  timestamp: Date;
}

export interface ActivityStreamProps {
  activities: Activity[];
}

const activityConfig = {
  file_change: {
    icon: FileCode,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  commit: {
    icon: GitCommit,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  message: {
    icon: MessageSquare,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  task_complete: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ActivityStream({ activities }: ActivityStreamProps) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg">
            <Clock className="w-5 h-5" />
            Recent Activity
          </h2>
          {activities.length > 0 && (
            <span className="badge badge-neutral">{activities.length}</span>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-1">Start working to see your activity here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-base-300 hover:bg-base-100/50 transition-colors"
                >
                  <div className={`rounded-full ${config.bgColor} p-2 h-fit`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-base-content">{activity.title}</div>
                    {activity.description && (
                      <div className="text-xs text-base-content/60 mt-1 truncate">
                        {activity.description}
                      </div>
                    )}
                    <div className="text-xs text-base-content/50 mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
