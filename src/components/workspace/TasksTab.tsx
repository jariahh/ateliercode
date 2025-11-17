import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, ListTodo, Clock, CalendarDays } from 'lucide-react';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
}

function TaskCard({ task, onToggleComplete }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityColors = {
    high: 'badge-error',
    medium: 'badge-warning',
    low: 'badge-info',
  };

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  const statusColors = {
    todo: 'badge-ghost',
    in_progress: 'badge-primary',
    completed: 'badge-success',
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`card bg-base-100 border border-base-300 hover:shadow-lg transition-all duration-200 ${
        task.status === 'completed' ? 'opacity-75' : ''
      }`}
    >
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className="mt-1 hover:scale-110 transition-transform"
            aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <Circle className="w-5 h-5 text-base-content/40 hover:text-base-content/70" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-semibold text-base ${
                  task.status === 'completed' ? 'line-through text-base-content/60' : ''
                }`}
              >
                {task.title}
              </h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="btn btn-ghost btn-xs btn-square"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`badge badge-sm ${priorityColors[task.priority]}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </span>
              <span className={`badge badge-sm ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
            </div>

            {/* Created date */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-base-content/60">
              <CalendarDays className="w-3 h-3" />
              <span>{formatDate(task.createdAt)}</span>
            </div>

            {/* Expanded description */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-base-300">
                <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrioritySectionProps {
  priority: TaskPriority;
  tasks: Task[];
  onToggleComplete: (id: string) => void;
}

function PrioritySection({ priority, tasks, onToggleComplete }: PrioritySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const priorityInfo = {
    high: { label: 'High Priority', color: 'text-error', icon: '🔴' },
    medium: { label: 'Medium Priority', color: 'text-warning', icon: '🟡' },
    low: { label: 'Low Priority', color: 'text-info', icon: '🔵' },
  };

  const info = priorityInfo[priority];
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{info.icon}</span>
          <div className="text-left">
            <h3 className={`font-bold text-lg ${info.color}`}>{info.label}</h3>
            <p className="text-sm text-base-content/60">
              {completedCount} of {totalCount} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="radial-progress text-sm" style={{ '--value': progressPercent, '--size': '3rem' } as any}>
              {Math.round(progressPercent)}%
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </div>
      </button>

      {/* Task Cards */}
      {!isCollapsed && (
        <div className="space-y-3 pl-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasAnyTasks: boolean;
}

function EmptyState({ hasAnyTasks }: EmptyStateProps) {
  if (hasAnyTasks) return null;

  return (
    <div className="card bg-base-200 border-2 border-dashed border-base-300">
      <div className="card-body items-center text-center py-16">
        <div className="w-20 h-20 rounded-full bg-base-300/50 flex items-center justify-center mb-4">
          <ListTodo className="w-10 h-10 text-base-content/30" />
        </div>
        <h3 className="text-xl font-bold mb-2">No tasks yet</h3>
        <p className="text-base-content/60 max-w-md mb-4">
          Start organizing your work by creating tasks. Track your progress and keep your project on schedule.
        </p>
        <div className="flex gap-2 text-sm text-base-content/50">
          <Clock className="w-4 h-4" />
          <span>Tasks will appear here once created</span>
        </div>
      </div>
    </div>
  );
}

// Mock data - 6 sample tasks across different priorities and statuses
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Fix authentication bug in login flow',
    description: 'Users are experiencing intermittent login failures. Need to investigate the token refresh mechanism and add better error handling.',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: '2',
    title: 'Database migration for user preferences',
    description: 'Create and run migration to add new fields for user theme preferences, language settings, and notification preferences.',
    status: 'todo',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: '3',
    title: 'Implement dark mode toggle',
    description: 'Add a toggle switch in settings to allow users to switch between light and dark themes. Should persist preference in localStorage.',
    status: 'completed',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    id: '4',
    title: 'Update API documentation',
    description: 'Document the new endpoints for task management, including examples and response schemas. Update the OpenAPI specification file.',
    status: 'in_progress',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
  },
  {
    id: '5',
    title: 'Add unit tests for TasksTab component',
    description: 'Write comprehensive tests covering task creation, completion toggling, priority filtering, and edge cases.',
    status: 'todo',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: '6',
    title: 'Optimize bundle size',
    description: 'Analyze bundle and identify opportunities to reduce size. Consider lazy loading, code splitting, and removing unused dependencies.',
    status: 'todo',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const handleToggleComplete = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'completed' ? 'todo' : 'completed',
            }
          : task
      )
    );
  };

  // Group tasks by priority
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
  const lowPriorityTasks = tasks.filter(t => t.priority === 'low');

  // Calculate overall stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="w-6 h-6" />
            Tasks
          </h2>
          <p className="text-base-content/60 mt-1">
            Manage and track your project tasks
          </p>
        </div>
        <div className="stats shadow bg-base-200">
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">Total</div>
            <div className="stat-value text-2xl">{totalTasks}</div>
          </div>
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">In Progress</div>
            <div className="stat-value text-2xl text-primary">{inProgressTasks}</div>
          </div>
          <div className="stat py-3 px-4">
            <div className="stat-title text-xs">Completed</div>
            <div className="stat-value text-2xl text-success">{completedTasks}</div>
          </div>
        </div>
      </div>

      {/* Empty State or Task Sections */}
      {totalTasks === 0 ? (
        <EmptyState hasAnyTasks={false} />
      ) : (
        <div className="space-y-6">
          <PrioritySection
            priority="high"
            tasks={highPriorityTasks}
            onToggleComplete={handleToggleComplete}
          />
          <PrioritySection
            priority="medium"
            tasks={mediumPriorityTasks}
            onToggleComplete={handleToggleComplete}
          />
          <PrioritySection
            priority="low"
            tasks={lowPriorityTasks}
            onToggleComplete={handleToggleComplete}
          />
        </div>
      )}
    </div>
  );
}
