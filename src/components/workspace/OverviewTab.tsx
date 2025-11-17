import AgentStatus from './AgentStatus';
import ActivityStream from './ActivityStream';
import StatsPanel from './StatsPanel';
import type { Activity } from './ActivityStream';

export interface OverviewTabProps {
  agentType: string;
  projectPath: string;
}

// Mock data for now - will be replaced with real data from backend
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'message',
    title: 'Welcome message sent',
    description: 'Agent is ready to help with your project',
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
  },
];

export default function OverviewTab({ agentType }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Agent Status & Stats */}
      <div className="lg:col-span-1 space-y-6">
        <AgentStatus
          agentType={agentType}
          status="idle"
        />

        <StatsPanel
          filesChanged={0}
          commits={0}
          messages={1}
          tasksCompleted={0}
          tasksTotal={0}
        />
      </div>

      {/* Right Column - Activity Stream */}
      <div className="lg:col-span-2">
        <ActivityStream activities={mockActivities} />
      </div>
    </div>
  );
}
