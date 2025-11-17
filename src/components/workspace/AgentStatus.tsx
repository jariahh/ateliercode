import { Bot, Circle, Zap } from 'lucide-react';

export interface AgentStatusProps {
  agentType: string;
  status: 'idle' | 'working' | 'error';
  currentTask?: string;
}

export default function AgentStatus({ agentType, status, currentTask }: AgentStatusProps) {
  const statusConfig = {
    idle: {
      color: 'text-info',
      bgColor: 'bg-info/10',
      label: 'Ready',
      icon: Circle,
    },
    working: {
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Working',
      icon: Zap,
    },
    error: {
      color: 'text-error',
      bgColor: 'bg-error/10',
      label: 'Error',
      icon: Circle,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">
            <Bot className="w-5 h-5" />
            Agent Status
          </h2>
          <div className={`badge ${config.bgColor} ${config.color} gap-2`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </div>
        </div>

        <div className="space-y-3 mt-2">
          <div>
            <div className="text-sm text-base-content/60">Current Agent</div>
            <div className="font-semibold text-base mt-1">{agentType}</div>
          </div>

          {currentTask && status === 'working' && (
            <div>
              <div className="text-sm text-base-content/60">Current Task</div>
              <div className="text-sm mt-1 flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
                {currentTask}
              </div>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-sm text-base-content/60 italic">
              Ready to start working on your project
            </div>
          )}
        </div>

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-primary btn-sm gap-2">
            <Zap className="w-4 h-4" />
            Start Agent
          </button>
        </div>
      </div>
    </div>
  );
}
