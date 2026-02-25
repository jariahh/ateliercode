import { GitBranch, MessageSquare } from 'lucide-react';

export interface StatsPanelProps {
  commits: number;
  messages: number;
}

export default function StatsPanel({
  commits,
  messages,
}: StatsPanelProps) {
  const stats = [
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
      </div>
    </div>
  );
}
