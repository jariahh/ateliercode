import { FileCode, GitBranch, MessageSquare, CheckCircle } from 'lucide-react';

export interface StatsPanelProps {
  filesChanged: number;
  commits: number;
  messages: number;
  tasksCompleted: number;
  tasksTotal: number;
}

export default function StatsPanel({
  filesChanged,
  commits,
  messages,
  tasksCompleted,
  tasksTotal,
}: StatsPanelProps) {
  const stats = [
    {
      label: 'Files Changed',
      value: filesChanged,
      icon: FileCode,
      color: 'text-primary',
    },
    {
      label: 'Commits',
      value: commits,
      icon: GitBranch,
      color: 'text-secondary',
    },
    {
      label: 'Messages',
      value: messages,
      icon: MessageSquare,
      color: 'text-accent',
    },
    {
      label: 'Tasks',
      value: `${tasksCompleted}/${tasksTotal}`,
      icon: CheckCircle,
      color: 'text-success',
    },
  ];

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg mb-4">Project Stats</h2>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat bg-base-300 rounded-lg p-4">
                <div className="stat-figure">
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="stat-title text-xs text-base-content/70">{stat.label}</div>
                <div className="stat-value text-2xl text-base-content">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {tasksTotal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-base-content/60">Progress</span>
              <span className="font-semibold text-base-content">
                {Math.round((tasksCompleted / tasksTotal) * 100)}%
              </span>
            </div>
            <progress
              className="progress progress-success w-full"
              value={tasksCompleted}
              max={tasksTotal}
            ></progress>
          </div>
        )}
      </div>
    </div>
  );
}
