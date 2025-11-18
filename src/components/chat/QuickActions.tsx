import { Code2, FlaskConical, RefreshCw, FileText, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (action: string) => void;
  disabled?: boolean;
}

const quickActions = [
  {
    id: 'explain',
    icon: FileText,
    label: 'Explain this code',
    prompt: 'Please explain what this code does and how it works.',
  },
  {
    id: 'tests',
    icon: FlaskConical,
    label: 'Add tests',
    prompt: 'Please write comprehensive unit tests for the current code.',
  },
  {
    id: 'refactor',
    icon: RefreshCw,
    label: 'Refactor',
    prompt: 'Please refactor this code to improve readability and maintainability.',
  },
  {
    id: 'optimize',
    icon: Sparkles,
    label: 'Optimize',
    prompt: 'Please optimize this code for better performance.',
  },
  {
    id: 'document',
    icon: Code2,
    label: 'Add documentation',
    prompt: 'Please add comprehensive documentation and comments to this code.',
  },
];

export default function QuickActions({ onActionClick, disabled }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 border-t border-base-300 bg-base-100">
      <span className="text-xs text-base-content/60 self-center mr-2">Quick actions:</span>
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onActionClick(action.prompt)}
            disabled={disabled}
            className="btn btn-xs btn-outline gap-1"
            title={action.label}
          >
            <Icon className="w-3 h-3" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
